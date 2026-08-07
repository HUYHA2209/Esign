package com.spring.esign.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.spring.esign.dto.response.AuditTrailResponse;
import com.spring.esign.entity.*;
import com.spring.esign.enums.AuditEvent;
import com.spring.esign.repository.AuditChainRepository;
import com.spring.esign.repository.AuditTrailRepository;
import com.spring.esign.repository.DocumentRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuditTrailService {
    AuditTrailRepository auditTrailRepository;
    AuditChainRepository auditChainRepository;
    DocumentRepository documentRepository;
    ApplicationEventPublisher eventPublisher;

    /**
     * Publish một AuditLogEvent. Event sẽ được xử lý SAU KHI transaction cha commit
     * thành công → tránh deadlock do FK lock trên bảng Document.
     *
     * Nếu transaction cha rollback → event bị hủy → audit không ghi (đúng ý nghĩa:
     * chỉ ghi audit cho các thao tác thành công).
     *
     * IP và deviceFingerprint được resolve ngay tại đây (trong context HTTP
     * request),
     * vì sau khi commit, request context có thể đã bị xóa.
     */
    public void logEvent(
            Document doc,
            AuditEvent eventType,
            User user,
            DocumentSigner ds,
            String pdfHashBefore,
            String pdfHashAfter,
            String credentialId,
            String digitalSignature,
            String messageHash,
            String ip,
            String deviceFingerprint) {

        String resolvedSignerName = "Hệ thống";
        String resolvedSignerEmail = "system@esign.com";
        String resolvedOrganizationName = null;

        if (user != null) {
            resolvedSignerName = user.getFullName() != null ? user.getFullName() : user.getEmail();
            resolvedSignerEmail = user.getEmail();
        }

        if (ds != null) {
            if (user == null) {
                resolvedSignerName = ds.getSignerName() != null ? ds.getSignerName() : ds.getSignerEmail();
            }
            resolvedSignerEmail = ds.getSignerEmail();
            if (ds.getAccount() != null
                    && ds.getAccount().getAccountType() == com.spring.esign.enums.AccountType.ORGANIZATION) {
                resolvedOrganizationName = ds.getAccount().getAccountName();
            }
        } else if (doc.getAccount() != null
                && doc.getAccount().getAccountType() == com.spring.esign.enums.AccountType.ORGANIZATION) {
            resolvedOrganizationName = doc.getAccount().getAccountName();
        }

        // Resolve IP và User-Agent NGAY BÂY GIỜ (trong request context)
        if (ip == null) {
            ip = resolveClientIp();
        }
        if (deviceFingerprint == null) {
            deviceFingerprint = resolveUserAgent();
        }

        AuditLogEvent event = AuditLogEvent.builder()
                .documentId(doc.getDocumentId())
                .eventType(eventType)
                .signerName(resolvedSignerName)
                .signerEmail(resolvedSignerEmail)
                .organizationName(resolvedOrganizationName)
                .signerIp(ip)
                .deviceFingerprint(deviceFingerprint)
                .pdfHashBefore(pdfHashBefore)
                .pdfHashAfter(pdfHashAfter)
                .credentialId(credentialId)
                .digitalSignature(digitalSignature)
                .messageToSignHash(messageHash)
                .timestamp(LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS))
                .build();

        eventPublisher.publishEvent(event);
    }

    /**
     * Listener xử lý AuditLogEvent SAU KHI transaction cha commit thành công.
     * ví dụ dễ hiểu thì cái ví dụ luông compeleted doc phải chạy xong thì mới ghi log còn bất kì
     * việc gì làm gián đoạn luồng này thì cx sẽ không thể ghi được log nữa
     * Chạy trong transaction riêng (REQUIRES_NEW) → không deadlock với transaction
     * cha
     * vì transaction cha đã kết thúc và giải phóng tất cả lock.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    // chạy tự động khi phát ra AuditLogEvent + sự kiện cha thành công
    public void handleAuditEvent(AuditLogEvent event) {
        try {
            Document doc = documentRepository.findById(event.getDocumentId()).orElse(null);
            if (doc == null) {
                log.error("Audit event bị bỏ qua: không tìm thấy document {}", event.getDocumentId());
                return;
            }

            AuditTrail auditTrail = AuditTrail.builder()
                    .document(doc)
                    .eventType(event.getEventType())
                    .eventDescription(getEventDescription(
                            event.getEventType(), event.getSignerName(), event.getOrganizationName()))
                    .signerName(event.getSignerName())
                    .signerEmail(event.getSignerEmail())
                    .signerIp(event.getSignerIp())
                    .deviceFingerprint(event.getDeviceFingerprint())
                    .pdfHashBefore(event.getPdfHashBefore())
                    .pdfHashAfter(event.getPdfHashAfter())
                    .credentialId(event.getCredentialId())
                    .digitalSignature(event.getDigitalSignature())
                    .messageToSignHash(event.getMessageToSignHash())
                    .keyAlgorithm(event.getEventType() == AuditEvent.SIGNED ? "WebAuthn-PAdES" : null)
                    .timestamp(event.getTimestamp())
                    .build();

            auditTrail = auditTrailRepository.save(auditTrail);

            // ── Audit Chain (Blockchain-like) ──
            AuditChain lastBlock = auditChainRepository
                    .findTopByAuditTrail_Document_DocumentIdOrderByCreatedAtDesc(doc.getDocumentId())
                    .orElse(null);

            String prevHash = (lastBlock == null) ? null : lastBlock.getEntryHash();

            String entryHash = hash(auditTrail.getAuditId() + "|" + auditTrail.getEventType()
                    + "|" + auditTrail.getTimestamp()
                    + "|" + auditTrail.getMessageToSignHash()
                    + "|" + auditTrail.getSignerEmail()
                    + "|" + auditTrail.getSignerIp()
                    + "|" + auditTrail.getPdfHashBefore()
                    + "|" + auditTrail.getPdfHashAfter()
                    + "|" + auditTrail.getCredentialId()
                    + "|" + prevHash);

            AuditChain chain = AuditChain.builder()
                    .auditTrail(auditTrail)
                    .prevHash(prevHash)
                    .entryHash(entryHash)
                    .build();
            auditChainRepository.save(chain);

            log.info("Audit logged: {} for document {}", event.getEventType(), event.getDocumentId());

        } catch (Exception e) {
            // Không throw — tránh ảnh hưởng business flow.
            // Audit failure chỉ ghi log, không crash ứng dụng.
            log.error("Lỗi khi ghi Audit Trail cho document {}: {}", event.getDocumentId(), e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteByDocumentId(Integer documentId) {
        auditChainRepository.deleteByAuditTrail_Document_DocumentId(documentId);
        auditTrailRepository.deleteByDocument_DocumentId(documentId);
    }

    // ─── Query Methods ──────────────────────────────────────────────────

    /**
     * Lấy danh sách Audit Trail cho 1 document, sắp xếp theo thời gian.
     */
    public List<AuditTrailResponse> getAuditTrails(Integer documentId) {
        List<AuditTrail> trails = auditTrailRepository.findByDocument_DocumentIdOrderByTimestampAsc(documentId);
        return trails.stream().map(this::toResponse).collect(Collectors.toList());
    }

    private AuditTrailResponse toResponse(AuditTrail trail) {
        return AuditTrailResponse.builder()
                .auditId(trail.getAuditId())
                .eventType(trail.getEventType() != null ? trail.getEventType().name() : null)
                .eventDescription(trail.getEventDescription())
                .signerEmail(trail.getSignerEmail())
                .signerName(trail.getSignerName())
                .signerIp(trail.getSignerIp())
                .deviceFingerprint(trail.getDeviceFingerprint())
                .pdfHashBefore(trail.getPdfHashBefore())
                .pdfHashAfter(trail.getPdfHashAfter())
                .credentialId(trail.getCredentialId())
                .digitalSignature(trail.getDigitalSignature())
                .messageToSignHash(trail.getMessageToSignHash())
                .keyAlgorithm(trail.getKeyAlgorithm())
                .timestamp(trail.getTimestamp())
                .build();
    }

    // ─── Internal Helpers ───────────────────────────────────────────────

    /**
     * Tự động lấy Client IP từ Request.
     * Ưu tiên header X-Forwarded-For (reverse proxy), fallback sang remoteAddr.
     */
    private String resolveClientIp() {
        try {
            ServletRequestAttributes attribs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attribs != null) {
                HttpServletRequest request = attribs.getRequest();
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                return ip != null ? ip.split(",")[0].trim() : null;
            }
        } catch (Exception e) {
            log.warn("Không thể lấy IP từ request: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Tự động lấy User-Agent từ Request header.
     */
    private String resolveUserAgent() {
        try {
            ServletRequestAttributes attribs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attribs != null) {
                HttpServletRequest request = attribs.getRequest();
                return request.getHeader("User-Agent");
            }
        } catch (Exception e) {
            log.warn("Không thể lấy User-Agent từ request: {}", e.getMessage());
        }
        return null;
    }

    private String hash(String mess) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] hash = messageDigest.digest(mess.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    private String getEventDescription(AuditEvent eventType, String signerName, String organizationName) {
        String name = (signerName != null && !signerName.isEmpty()) ? signerName : "Người dùng";
        if (organizationName != null && !organizationName.isEmpty()) {
            name = name + " (" + organizationName + ")";
        }
        switch (eventType) {
            case UPLOAD:
                return name + " đã tải lên tài liệu";
            case SENT:
                return name + " đã gửi tài liệu đi";
            case VIEWED:
                return name + " đã xem tài liệu";
            case SIGNED:
                return name + " đã ký số tài liệu thông qua WebAuthn/FIDO2 và file .p12 của hệ thống";
            case DECLINED:
                return name + " đã từ chối ký tài liệu";
            case COMPLETED:
                return "Tài liệu đã hoàn tất quá trình ký";
            case EXPIRED:
                return "Tài liệu đã hết hạn ký";
            case VOIDED:
                return name + " đã hủy bỏ tài liệu";
            case DOWNLOADED:
                return name + " đã tải xuống tài liệu";
            default:
                return "Sự kiện: " + eventType.name();
        }
    }
}

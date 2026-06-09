package com.spring.esign.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.spring.esign.dto.response.AuditTrailResponse;
import com.spring.esign.entity.*;
import com.spring.esign.enums.AuditEvent;
import com.spring.esign.repository.AuditChainRepository;
import com.spring.esign.repository.AuditTrailRepository;

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

    /**
     * Log một sự kiện vào Audit Trail và chuỗi Audit Chain.
     *
     * Nếu IP hoặc deviceFingerprint là null, tự động lấy từ HttpServletRequest
     * (sử dụng X-Forwarded-For cho IP và User-Agent cho device fingerprint).
     */
    @Transactional
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

        if (user != null) {
            resolvedSignerName = user.getFullName() != null ? user.getFullName() : user.getEmail();
            resolvedSignerEmail = user.getEmail();
        }

        if (ds != null) {
            if (user == null) {
                resolvedSignerName = ds.getSignerName() != null ? ds.getSignerName() : ds.getSignerEmail();
            }
            resolvedSignerEmail = ds.getSignerEmail();
        }

        // Auto-resolve IP và User-Agent từ Request nếu chưa được truyền vào
        if (ip == null) {
            ip = resolveClientIp();
        }
        if (deviceFingerprint == null) {
            deviceFingerprint = resolveUserAgent();
        }

        String eventDesc = getEventDescription(eventType, resolvedSignerName);

        AuditTrail auditTrail = AuditTrail.builder()
                .document(doc)
                .eventType(eventType)
                .eventDescription(eventDesc)
                .signerName(resolvedSignerName)
                .signerEmail(resolvedSignerEmail)
                .signerIp(ip)
                .deviceFingerprint(deviceFingerprint)
                // Document Integrity
                .pdfHashBefore(pdfHashBefore)
                .pdfHashAfter(pdfHashAfter)
                // WebAuthn Data
                .credentialId(credentialId)
                .digitalSignature(digitalSignature)
                .messageToSignHash(messageHash)
                .keyAlgorithm(eventType == AuditEvent.SIGNED ? "WebAuthn-PAdES" : null)
                .timestamp(LocalDateTime.now())
                .build();

        auditTrail = auditTrailRepository.save(auditTrail);

        AuditChain lastBlock = auditChainRepository
                .findTopByAuditTrail_Document_DocumentIdOrderByCreatedAtDesc(doc.getDocumentId())
                .orElse(null);

        String prevHash = (lastBlock == null) ? null : lastBlock.getEntryHash();

        String entryHash = hash(auditTrail.getAuditId() + "|" + auditTrail.getEventType()
                + "|" + auditTrail.getTimestamp()
                + "|" + auditTrail.getMessageToSignHash()
                + "|" + prevHash);

        AuditChain chain = AuditChain.builder()
                .auditTrail(auditTrail)
                .prevHash(prevHash)
                .entryHash(entryHash)
                .build();
        auditChainRepository.save(chain);
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

    private String getEventDescription(AuditEvent eventType, String signerName) {
        String name = (signerName != null && !signerName.isEmpty()) ? signerName : "Người dùng";
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

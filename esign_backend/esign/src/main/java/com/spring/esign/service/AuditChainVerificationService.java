package com.spring.esign.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.spring.esign.entity.AuditChain;
import com.spring.esign.entity.AuditTrail;
import com.spring.esign.repository.AuditChainRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuditChainVerificationService {
    AuditChainRepository auditChainRepository;

    /**
     * Kiểm tra tính toàn vẹn của toàn bộ chuỗi Audit Chain cho một Document.
     *
     * Duyệt qua tất cả các block theo thứ tự chainId.
     * Với mỗi block, tính lại entryHash từ dữ liệu AuditTrail + prevHash
     * rồi so sánh với entryHash đã lưu. Nếu có bất kỳ mismatch nào
     * → chuỗi đã bị can thiệp (tampered).
     *
     * @return Map chứa {"valid": true/false, "totalBlocks": N, "tamperedAt": null hoặc blockId}
     */
    public Map<String, Object> verifyChain(Integer documentId) {
        List<AuditChain> chain = auditChainRepository.findByAuditTrail_Document_DocumentIdOrderByChainIdAsc(documentId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("documentId", documentId);
        result.put("totalBlocks", chain.size());

        if (chain.isEmpty()) {
            result.put("valid", true);
            result.put("message", "Chưa có dữ liệu audit nào cho tài liệu này.");
            return result;
        }

        String expectedPrevHash = null;

        for (int i = 0; i < chain.size(); i++) {
            AuditChain block = chain.get(i);
            AuditTrail audit = block.getAuditTrail();

            // Kiểm tra prevHash liên kết
            if (i == 0) {
                // Block đầu tiên: prevHash phải là null
                if (block.getPrevHash() != null) {
                    result.put("valid", false);
                    result.put("tamperedAt", block.getChainId());
                    result.put("message", "Block đầu tiên có prevHash khác null — chuỗi bị can thiệp.");
                    return result;
                }
            } else {
                // Block tiếp theo: prevHash phải khớp entryHash của block trước
                if (!safeEquals(block.getPrevHash(), expectedPrevHash)) {
                    result.put("valid", false);
                    result.put("tamperedAt", block.getChainId());
                    result.put(
                            "message",
                            "Liên kết chuỗi bị đứt tại block " + block.getChainId()
                                    + " — dữ liệu có thể đã bị sửa đổi.");
                    return result;
                }
            }

            // Tính lại entryHash từ dữ liệu hiện tại
            String recomputedHash = computeEntryHash(audit, block.getPrevHash());

            if (!safeEquals(recomputedHash, block.getEntryHash())) {
                result.put("valid", false);
                result.put("tamperedAt", block.getChainId());
                result.put(
                        "message",
                        "Hash không khớp tại block " + block.getChainId() + " — dữ liệu audit đã bị thay đổi.");
                return result;
            }

            expectedPrevHash = block.getEntryHash();
        }

        result.put("valid", true);
        result.put("message", "Chuỗi audit hợp lệ. Không phát hiện sự can thiệp nào.");
        return result;
    }

    /**
     * Tính entryHash theo cùng công thức với AuditTrailService.logEvent().
     * SHA-256(auditId | eventType | timestamp | messageToSignHash | signerEmail | signerIp | pdfHashBefore | pdfHashAfter | credentialId | prevHash)
     */
    private String computeEntryHash(AuditTrail audit, String prevHash) {
        String input = audit.getAuditId() + "|" + audit.getEventType()
                + "|" + audit.getTimestamp()
                + "|" + audit.getMessageToSignHash()
                + "|" + audit.getSignerEmail()
                + "|" + audit.getSignerIp()
                + "|" + audit.getPdfHashBefore()
                + "|" + audit.getPdfHashAfter()
                + "|" + audit.getCredentialId()
                + "|" + prevHash;
        return hash(input);
    }

    private boolean safeEquals(String a, String b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.equals(b);
    }

    private String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}

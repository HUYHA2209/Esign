package com.spring.esign.service;

import java.time.LocalDateTime;

import com.spring.esign.enums.AuditEvent;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Event chứa toàn bộ dữ liệu cần thiết để ghi Audit Trail.
 * Dùng primitive/String thay vì JPA entity để tránh vấn đề detached entity
 * khi event được xử lý trong transaction riêng sau commit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditLogEvent {
    Integer documentId;
    AuditEvent eventType;
    String signerName;
    String signerEmail;
    String organizationName;
    String signerIp;
    String deviceFingerprint;
    String pdfHashBefore;
    String pdfHashAfter;
    String credentialId;
    String digitalSignature;
    String messageToSignHash;
    LocalDateTime timestamp;
}

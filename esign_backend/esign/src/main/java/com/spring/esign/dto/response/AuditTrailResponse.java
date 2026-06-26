package com.spring.esign.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditTrailResponse {
    Long auditId;
    String eventType;
    String eventDescription;
    String signerEmail;
    String signerName;
    String signerIp;
    String deviceFingerprint;
    String pdfHashBefore;
    String pdfHashAfter;
    String credentialId;
    String digitalSignature;
    String messageToSignHash;
    String keyAlgorithm;
    LocalDateTime timestamp;
}

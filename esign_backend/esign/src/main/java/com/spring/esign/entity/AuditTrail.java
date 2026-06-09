package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.spring.esign.enums.AuditEvent;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(
        name = "AUDIT_TRAIL",
        indexes = {@Index(name = "idx_audit_doc", columnList = "document_id")})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditTrail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    Long auditId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "account", "uploadedBy"})
    Document document;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    AuditEvent eventType;

    @Lob
    @Column(name = "event_description", columnDefinition = "TEXT")
    String eventDescription;

    @Column(name = "signer_email", length = 150)
    String signerEmail;

    @Column(name = "signer_name", length = 200)
    String signerName;

    @Column(name = "signer_ip", length = 45)
    String signerIp;

    @Column(name = "device_fingerprint", length = 512)
    String deviceFingerprint;

    // === Document Integrity ===
    @Column(name = "pdf_hash_before")
    String pdfHashBefore;

    @Column(name = "pdf_hash_after")
    String pdfHashAfter;

    // === WebAuthn Audit Data ===
    @Column(name = "credential_id")
    String credentialId;

    @Lob
    @Column(name = "digital_signature", columnDefinition = "TEXT")
    String digitalSignature;

    @Column(name = "message_to_sign_hash")
    String messageToSignHash;

    @Column(name = "key_algorithm", length = 50)
    String keyAlgorithm;

    // JSON data bổ sung (dùng cho mở rộng)
    @Lob
    @Column(name = "event_data", columnDefinition = "TEXT")
    String eventData;

    @Column(name = "timestamp", updatable = false)
    LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }
}

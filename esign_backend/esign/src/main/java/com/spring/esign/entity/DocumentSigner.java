package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.spring.esign.enums.SignatureFormat;
import com.spring.esign.enums.SignerStatus;
import com.spring.esign.enums.SigningMode;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "DOCUMENT_SIGNERS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DocumentSigner {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "doc_signer_id")
    Integer docSignerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "account", "uploadedBy"})
    Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User user;

    @Column(name = "signer_email", nullable = false, length = 150)
    String signerEmail;

    @Column(name = "signer_name", length = 200)
    String signerName;

    @Column(name = "role", length = 50)
    @Builder.Default
    String role = "signer";

    @Column(name = "signing_order")
    @Builder.Default
    Integer signingOrder = 1;

    // === Trạng thái ký ===

    @Enumerated(EnumType.STRING)
    @Column(name = "signing_mode")
    @Builder.Default
    SigningMode signingMode = SigningMode.PARALLEL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    SignerStatus status = SignerStatus.WAITING;

    @Column(name = "signed_at")
    LocalDateTime signedAt;

    @Column(name = "ip_address", length = 45)
    String ipAddress;

    // === Digital Signature / WebAuthn ===

    @Column(name = "credential_id")
    String credentialId;

    @Column(name = "key_algorithm", length = 50)
    String keyAlgorithm;

    @Column(name = "message_to_sign_hash")
    String messageToSignHash;

    @Lob
    @Column(name = "digital_signature", columnDefinition = "TEXT")
    String digitalSignature;

    @Column(name = "digital_signature_hash")
    String digitalSignatureHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_format")
    @Builder.Default
    SignatureFormat signatureFormat = SignatureFormat.WEBAUTHN;

    @Column(name = "device_fingerprint", length = 512)
    String deviceFingerprint;

    @Column(name = "sent_at")
    LocalDateTime sentAt;

    @Column(name = "opened_at")
    LocalDateTime openedAt;

    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

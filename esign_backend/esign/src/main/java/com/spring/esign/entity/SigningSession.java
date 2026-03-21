package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.spring.esign.enums.SessionStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "SIGNING_SESSIONS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SigningSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    Integer sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doc_signer_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "document"})
    DocumentSigner docSigner;

    // WebAuthn Challenge (nonce từ server cho mỗi lần ký)
    @Column(name = "challenge", nullable = false)
    String challenge;

    @Column(name = "rp_id")
    String rpId;

    @Column(name = "origin")
    String origin;

    @Column(name = "assertion_verified")
    @Builder.Default
    Boolean assertionVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    SessionStatus status = SessionStatus.ACTIVE;

    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @Column(name = "expires_at")
    LocalDateTime expiresAt;

    @Column(name = "used_at")
    LocalDateTime usedAt;

    @Column(name = "used_from_ip", length = 45)
    String usedFromIp;

    @Lob
    @Column(name = "used_from_ua", columnDefinition = "TEXT")
    String usedFromUa;

    @Column(name = "device_fingerprint", length = 512)
    String deviceFingerprint;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (expiresAt == null) expiresAt = LocalDateTime.now().plusMinutes(10);
    }
}

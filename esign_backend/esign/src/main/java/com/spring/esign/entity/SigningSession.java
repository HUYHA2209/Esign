package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import org.springframework.data.domain.Persistable;

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
public class SigningSession implements Persistable<String> {

    @Id
    @Column(name = "session_id")
    String sessionId;

    // Liên kết với User thay vì DocumentSigner — cho phép 1 session cover nhiều documents
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User user;

    // Group ID — nullable nếu ký đơn lẻ ngoài group
    @Column(name = "group_id")
    Integer groupId;

    // WebAuthn Challenge — SHA-256(message_to_sign) chứa hash tất cả documents
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

    @Transient
    @Builder.Default
    boolean isNewEntity = true;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        // TTL = 5 phút để đủ thời gian BE xử lý: nhúng ảnh chữ ký + PAdES sealing (.p12)
        if (expiresAt == null) expiresAt = LocalDateTime.now().plusMinutes(5);
    }

    @PostPersist
    @PostLoad
    protected void markNotNew() {
        this.isNewEntity = false;
    }

    @Override
    public String getId() {
        return sessionId;
    }

    @Override
    public boolean isNew() {
        return isNewEntity;
    }
}

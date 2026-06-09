package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.spring.esign.enums.InvitationStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "ORG_INVITATIONS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrgInvitation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    Account account;

    @Column(name = "invitee_email", nullable = false)
    String inviteeEmail;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    String token; // SecureRandom token

    // Khi accept, member luôn được gán role = MEMBER
    // ADMIN chỉ dành cho người tạo org
    // Permission preset
    Boolean canUpload;
    Boolean canSign;
    Boolean canViewDocs;
    Boolean canInvite;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by")
    User invitedBy;

    @Enumerated(EnumType.STRING)
    InvitationStatus status; // PENDING, ACCEPTED, EXPIRED, REVOKED

    LocalDateTime createdAt;
    LocalDateTime expiresAt; // Default: createdAt + 7 days

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.expiresAt = createdAt.plusDays(7);
        this.status = InvitationStatus.PENDING;
    }

    boolean notified = false;
}

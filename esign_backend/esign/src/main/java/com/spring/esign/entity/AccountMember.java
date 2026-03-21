package com.spring.esign.entity;

import jakarta.persistence.*;

import com.spring.esign.enums.MemberRole;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(
        name = "ACCOUNT_MEMBERS",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_account_user",
                    columnNames = {"account_id", "user_id"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AccountMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    Long memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    MemberRole role = MemberRole.MEMBER;

    // --- QUYỀN HẠN (PERMISSIONS) ---

    @Column(name = "can_upload")
    @Builder.Default
    Boolean canUpload = false;

    @Column(name = "can_sign")
    @Builder.Default
    Boolean canSign = false;

    @Column(name = "can_view_docs")
    @Builder.Default
    Boolean canViewDocs = false;

    @Column(name = "can_invite")
    @Builder.Default
    Boolean canInvite = false;
}

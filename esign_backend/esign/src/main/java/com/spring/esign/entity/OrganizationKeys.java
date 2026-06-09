package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(
        name = "ORGANIZATION_KEYS",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_org_user_key",
                        columnNames = {"account_id", "user_id"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrganizationKeys {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "org_key_id")
    Long orgKeyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false, foreignKey = @ForeignKey(name = "fk_org_keys_account"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "members", "owner"})
    Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_org_keys_user"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User user;

    @Column(name = "credential_id", nullable = false, unique = true, length = 256)
    String credentialId; // Base64URL encoded

    @Lob
    @Column(name = "public_key_cose", nullable = false)
    byte[] publicKeyCose;

    @Column(name = "algorithm", nullable = false, length = 50)
    String algorithm;

    @Column(name = "aaguid", length = 64)
    String aaguid;

    @Column(name = "counter")
    @Builder.Default
    Long counter = 0L;

    @Column(name = "is_active")
    @Builder.Default
    Boolean isActive = true;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (counter == null) counter = 0L;
    }
}

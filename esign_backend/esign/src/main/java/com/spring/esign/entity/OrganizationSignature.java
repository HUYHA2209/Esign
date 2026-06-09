package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.spring.esign.enums.SignatureType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(
        name = "ORGANIZATION_SIGNATURES",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_account_signature",
                        columnNames = {"account_id"}))
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrganizationSignature {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "org_signature_id")
    Long orgSignatureId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false, foreignKey = @ForeignKey(name = "fk_org_signatures_account"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "members", "owner"})
    Account account;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_type", nullable = false)
    SignatureType signatureType;

    @Column(name = "image_url", length = 512)
    String imageUrl;

    @Column(name = "image_hash", length = 256)
    String imageHash;

    @Column(name = "text_style", length = 256)
    String textStyle;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false, foreignKey = @ForeignKey(name = "fk_org_signatures_creator"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User createdBy;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

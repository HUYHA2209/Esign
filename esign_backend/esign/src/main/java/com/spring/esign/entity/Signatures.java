package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.spring.esign.enums.SignatureType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(
        name = "SIGNATURES",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_user_signature",
                        columnNames = {"user_id"}))
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Signatures {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "signature_id")
    Long signatureId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_signatures_user"))
    User user;

    @Column(name = "signature_type", nullable = false)
    SignatureType signatureType;

    @Column(name = "image_url")
    String imageUrl;

    @Column(name = "image_hash")
    String imageHash;

    @Column(name = "text_style")
    String textStyle;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

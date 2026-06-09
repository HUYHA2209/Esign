package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "USERS_KEYS")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UsersKeys {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "key_id")
    Long keyId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(name = "credential_id", nullable = false, unique = true)
    String credentialId; // Base64URL encoded

    // COSE Key bytes (serialized via CBOR bởi WebAuthn4J)
    @Lob
    @Column(name = "public_key_cose", nullable = false)
    byte[] publicKeyCose;

    @Column(name = "algorithm", nullable = false)
    String algorithm;

    // ID xác thực thiết bị
    @Column(name = "aaguid", length = 64)
    String aaguid;

    @Column(name = "attestation_format", length = 50)
    String attestationFormat;

    @Column(name = "counter")
    Long counter;

    @Column(name = "is_active")
    Boolean isActive;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (counter == null) counter = 0L;
    }
}

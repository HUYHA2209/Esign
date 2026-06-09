package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "SIGNATURE_PREPARES")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SignaturePrepare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "prepare_id")
    Long prepareId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signing_session_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    SigningSession signingSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "account", "uploadedBy"})
    Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doc_signer_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "document"})
    DocumentSigner docSigner;

    // JSON canonicalized message sẽ được ký
    // Ví dụ: {"document_id":123,"document_hash":"sha256:...","signer_email":"...","timestamp":"..."}
    @Lob
    @Column(name = "message_to_sign", nullable = false, columnDefinition = "TEXT")
    String messageToSign;

    // SHA-256 hash của message_to_sign — đây là cái signer ký bằng WebAuthn
    @Column(name = "message_to_sign_hash", nullable = false)
    String messageToSignHash;

    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

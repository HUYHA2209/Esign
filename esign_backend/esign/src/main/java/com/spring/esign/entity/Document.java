package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.spring.esign.enums.DocumentStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "DOCUMENTS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    Integer documentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "members", "owner"})
    Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User uploadedBy;

    @Column(name = "original_file_url", nullable = false)
    String originalFileUrl;

    @Column(name = "original_file_hash")
    String originalFileHash;

    @Column(name = "final_file_url")
    String finalFileUrl;

    @Column(name = "final_file_hash")
    String finalFileHash;

    @Column(name = "status")
    @Builder.Default
    DocumentStatus status = DocumentStatus.DRAFT;

    @Column(name = "expiration_at")
    LocalDateTime expirationAt;

    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Column(name = "complete_at")
    LocalDateTime completeAt;

    @Column(name = "cancelled_at")
    LocalDateTime cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User cancelledBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    @JsonIgnoreProperties({"documents"})
    DocumentGroup documentGroup;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = DocumentStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

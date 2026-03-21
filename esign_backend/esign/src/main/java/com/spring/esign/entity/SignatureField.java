package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.spring.esign.enums.FieldType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "SIGNATURE_FIELDS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SignatureField {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "field_id")
    Integer fieldId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "account", "uploadedBy"})
    Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doc_signer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "document"})
    DocumentSigner docSigner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") // id cua nguoi ky (registered user)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User user;

    @Column(name = "page_number", nullable = false)
    Integer pageNumber;

    @Column(name = "pos_x")
    Float posX;

    @Column(name = "pos_y")
    Float posY;

    @Column(name = "width")
    Float width;

    @Column(name = "height")
    Float height;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type")
    @Builder.Default
    FieldType fieldType = FieldType.SIGNATURE;

    @Column(columnDefinition = "TEXT")
    String value;

    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (fieldType == null) {
            fieldType = FieldType.SIGNATURE;
        }
    }
}

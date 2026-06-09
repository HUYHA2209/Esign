package com.spring.esign.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "DOCUMENT_GROUP")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DocumentGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_id")
    Integer groupId;

    @Column(name = "group_name")
    String groupName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    Account account;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "current_step")
    @Builder.Default
    Integer currentStep = 1;

    @Column(name = "group_status")
    @Builder.Default
    String gr_status = "DRAFT";

    @Column(name = "expires_at")
    LocalDateTime expiresAt;

    @ToString.Exclude
    @OneToMany(mappedBy = "documentGroup")
    List<Document> documents;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

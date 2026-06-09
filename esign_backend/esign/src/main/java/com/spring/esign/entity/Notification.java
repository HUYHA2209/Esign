package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.spring.esign.enums.Notifications;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "NOTIFICATIONS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    Long notificationId;

    @Column(name = "recipient_email", nullable = false)
    String recipientEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false)
    Notifications notificationType;

    @Column(nullable = false)
    String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    String message;

    @Column(name = "group_id")
    Integer groupId;

    @Column(name = "sender_name")
    String senderName;

    @Column(name = "sender_email")
    String senderEmail;

    @Column(name = "is_read")
    @Builder.Default
    Boolean isRead = false;

    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @Column(name = "read_at")
    LocalDateTime readAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

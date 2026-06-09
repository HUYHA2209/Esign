package com.spring.esign.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "ACTIVITY_LOGS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ActivityLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    Integer logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "forgotPassword"})
    User user;

    @Column(name = "action", length = 100)
    String action;

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "timestamp")
    LocalDateTime timestamp;

    @Column(name = "ip_address", length = 45)
    String ipAddress;

    @Lob
    @Column(name = "user_agent", columnDefinition = "TEXT")
    String userAgent;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }
}

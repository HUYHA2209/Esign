package com.spring.esign.entity;

import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity // danh dau 1 class la table
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    String id;

    @Column(name = "full_name", nullable = false)
    String fullName;

    @Column(name = "password_hash", nullable = false)
    @JsonIgnore
    String password;

    @Column(nullable = false, unique = true)
    String email;

    @Column(nullable = false)
    String phone;

    @Column(nullable = false)
    @Builder.Default
    boolean emailVerified = false;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
    @JsonIgnore
    ForgotPassword forgotPassword;
}

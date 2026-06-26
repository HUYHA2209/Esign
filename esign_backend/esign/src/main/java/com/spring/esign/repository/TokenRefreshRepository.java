package com.spring.esign.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spring.esign.entity.RefreshToken;

public interface TokenRefreshRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByToken(String token);

    void deleteByUser_Id(String userId);
}

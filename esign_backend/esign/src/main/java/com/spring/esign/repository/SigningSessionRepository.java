package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.SigningSession;
import com.spring.esign.entity.User;
import com.spring.esign.enums.SessionStatus;

@Repository
public interface SigningSessionRepository extends JpaRepository<SigningSession, String> {

    Optional<SigningSession> findByUserAndStatus(User user, SessionStatus status);

    List<SigningSession> findByUser(User user);

    Optional<SigningSession> findBySessionIdAndStatus(String sessionId, SessionStatus status);

    Optional<SigningSession> findTopByUserOrderByCreatedAtDesc(User user);
}

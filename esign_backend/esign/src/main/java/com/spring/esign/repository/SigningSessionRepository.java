package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.DocumentSigner;
import com.spring.esign.entity.SigningSession;
import com.spring.esign.enums.SessionStatus;

@Repository
public interface SigningSessionRepository extends JpaRepository<SigningSession, Integer> {

    Optional<SigningSession> findByDocSignerAndStatus(DocumentSigner docSigner, SessionStatus status);

    List<SigningSession> findByDocSigner(DocumentSigner docSigner);

    Optional<SigningSession> findTopByDocSignerOrderByCreatedAtDesc(DocumentSigner docSigner);
}

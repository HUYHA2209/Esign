package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.SignaturePrepare;
import com.spring.esign.entity.SigningSession;

@Repository
public interface SignaturePrepareRepository extends JpaRepository<SignaturePrepare, Long> {

    // Tìm tất cả prepares trong 1 session (group signing: N prepares per session)
    List<SignaturePrepare> findBySigningSession(SigningSession signingSession);

    List<SignaturePrepare> findBySigningSession_SessionId(String sessionId);

    Optional<SignaturePrepare> findBySigningSessionAndDocument_DocumentId(
            SigningSession signingSession, Integer documentId);
}

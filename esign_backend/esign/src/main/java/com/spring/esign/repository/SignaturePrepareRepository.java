package com.spring.esign.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.SignaturePrepare;
import com.spring.esign.entity.SigningSession;

@Repository
public interface SignaturePrepareRepository extends JpaRepository<SignaturePrepare, Long> {

    Optional<SignaturePrepare> findBySigningSession(SigningSession signingSession);

    Optional<SignaturePrepare> findBySigningSession_SessionId(Integer sessionId);
}

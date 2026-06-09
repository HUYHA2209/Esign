package com.spring.esign.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.Signatures;
import com.spring.esign.entity.User;

@Repository
public interface SignatureRepository extends JpaRepository<Signatures, Long> {
    Optional<Signatures> findByUser(User user);

    Optional<Signatures> findByUserId(String id);
}

package com.spring.esign.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.OrganizationSignature;

@Repository
public interface OrganizationSignatureRepository extends JpaRepository<OrganizationSignature, Long> {
    Optional<OrganizationSignature> findByAccount_AccountId(Long accountId);
}

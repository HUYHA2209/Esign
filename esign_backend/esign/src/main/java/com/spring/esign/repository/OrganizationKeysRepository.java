package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.OrganizationKeys;

@Repository
public interface OrganizationKeysRepository extends JpaRepository<OrganizationKeys, Long> {
    Optional<OrganizationKeys> findByCredentialId(String credentialId);

    List<OrganizationKeys> findByAccount_AccountId(Long accountId);

    Optional<OrganizationKeys> findByAccount_AccountIdAndUser_Id(Long accountId, String userId);

    boolean existsByAccount_AccountIdAndUser_Id(Long accountId, String userId);
}

package com.spring.esign.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spring.esign.entity.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {
    boolean existsByAccountUrl(String url);

    Optional<Account> findById(Long id);

    Optional<Account> findByAccountUrl(String accountUrl);

    Optional<Account> findByAccountIdAndIsDeletedFalse(Long accountId);
}

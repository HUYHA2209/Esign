package com.spring.esign.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spring.esign.entity.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {}

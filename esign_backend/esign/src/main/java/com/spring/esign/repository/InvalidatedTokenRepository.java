package com.spring.esign.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spring.esign.entity.InvalidatedToken;

public interface InvalidatedTokenRepository extends JpaRepository<InvalidatedToken, String> {}

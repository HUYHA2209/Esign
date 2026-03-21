package com.spring.esign.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.User;
import com.spring.esign.entity.UsersKeys;

@Repository
public interface UsersKeysRepository extends JpaRepository<UsersKeys, Long> {
    Optional<UsersKeys> findByCredentialId(String credentialId);

    Optional<UsersKeys> findByUserAndIsActiveTrue(User user);

    java.util.List<UsersKeys> findByUser(User user);
}

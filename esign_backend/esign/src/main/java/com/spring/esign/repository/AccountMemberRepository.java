package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.spring.esign.entity.AccountMember;
import com.spring.esign.entity.User;
import com.spring.esign.enums.AccountType;

public interface AccountMemberRepository extends JpaRepository<AccountMember, Long> {

    // JOIN FETCH account để tránh N+1 query riêng cho Account
    @EntityGraph(attributePaths = {"account"})
    Optional<AccountMember> findByUserAndAccount_AccountType(User user, AccountType accountType);

    @EntityGraph(attributePaths = {"account"})
    Optional<AccountMember> findByUserAndAccount_AccountId(User user, Long accountId);

    @EntityGraph(attributePaths = {"account"})
    List<AccountMember> findByUser(User user);
}

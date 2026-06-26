package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.spring.esign.entity.AccountMember;
import com.spring.esign.entity.User;
import com.spring.esign.enums.AccountType;
import com.spring.esign.enums.MemberRole;

public interface AccountMemberRepository extends JpaRepository<AccountMember, Long> {

    // JOIN FETCH account để tránh N+1 query riêng cho Account
    @EntityGraph(attributePaths = {"account"})
    Optional<AccountMember> findByUserAndAccount_AccountType(User user, AccountType accountType);

    @EntityGraph(attributePaths = {"account"})
    Optional<AccountMember> findByUserAndAccount_AccountId(User user, Long accountId);

    Optional<AccountMember> findByAccount_AccountIdAndUser_Id(Long accountId, String userId);

    @EntityGraph(attributePaths = {"account"})
    List<AccountMember> findByUser(User user);

    List<AccountMember> findByAccount_AccountIdAndCanSignTrue(Long accountId);

    @Query(
            value =
                    """
	SELECT CASE
			WHEN EXISTS (
				SELECT 1
				FROM account_members am
				WHERE am.account_id = :accountId
				AND am.user_id = :userId
				AND (am.can_invite = b'1' OR am.role = 'ADMIN')
			) THEN TRUE
			ELSE FALSE
		END
	""",
            nativeQuery = true)
    Long checkCanInvite(Long accountId, String userId);

    boolean existsByUserAndAccount_AccountId(User user, Long accountId);

    @EntityGraph(attributePaths = {"user"})
    List<AccountMember> findByAccount_AccountId(Long accountId);

    long countByAccount_AccountIdAndRole(Long accountId, MemberRole role);

    @Query(
            "SELECT am.account.accountName FROM AccountMember am WHERE am.user.id = :userId AND am.canSign = true AND am.account.accountType = 'ORGANIZATION'")
    List<String> findOrganizationNamesUserCanSign(
            @org.springframework.data.repository.query.Param("userId") String userId);

    @Query(
            "SELECT am FROM AccountMember am JOIN FETCH am.account WHERE am.user.id = :userId AND (am.account.accountType = 'PERSONAL' OR am.canSign = true)")
    List<AccountMember> findSignableAccountsByUserId(
            @org.springframework.data.repository.query.Param("userId") String userId);

    void deleteByAccount_AccountId(Long accountId);

    long countByAccount_AccountId(Long accountId);
}

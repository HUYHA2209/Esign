package com.spring.esign.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.spring.esign.entity.OrgInvitation;
import com.spring.esign.enums.InvitationStatus;

public interface OrgInvitationRepository extends JpaRepository<OrgInvitation, String> {
    Optional<OrgInvitation> findByAccount_AccountIdAndInviteeEmailAndStatus(
            Long accountId, String inviteeEmail, InvitationStatus status);

    Optional<OrgInvitation> findByToken(String token);

    @Query("SELECT i FROM OrgInvitation i " + "JOIN FETCH i.account "
            + "WHERE i.expiresAt BETWEEN :start AND :end "
            + "AND i.status = :status")
    List<OrgInvitation> findInvitationsWithAccount(LocalDateTime start, LocalDateTime end, InvitationStatus status);
}

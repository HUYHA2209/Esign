package com.spring.esign.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.spring.esign.entity.DocumentGroup;

public interface DocumentGroupRepository extends JpaRepository<DocumentGroup, Integer> {
    DocumentGroup findByGroupId(Integer groupId);

    DocumentGroup findByGroupIdAndAccount_AccountId(Integer groupId, Long accountId);

    @Query("SELECT d FROM DocumentGroup d WHERE d.account.accountId = :accountId AND d.gr_status IN :statuses")
    List<DocumentGroup> findByAccount_AccountIdAndGr_statusIn(
            @Param("accountId") Long accountId, @Param("statuses") List<String> statuses);

    @Query("SELECT d FROM DocumentGroup d WHERE d.gr_status = :status AND d.expiresAt <= :now")
    List<DocumentGroup> findByGrStatusAndExpiresAtBefore(
            @Param("status") String status, @Param("now") java.time.LocalDateTime now);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE DocumentGroup d SET d.gr_status = :newStatus WHERE d.groupId IN :groupIds")
    void updateStatusByGroupIds(@Param("groupIds") List<Integer> groupIds, @Param("newStatus") String newStatus);
}

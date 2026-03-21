package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.spring.esign.entity.Document;

public interface DocumentRepository extends JpaRepository<Document, Integer> {
    List<Document> findByAccount_AccountId(Long accountId);

    List<Document> findByDocumentGroup_GroupId(Integer groupId);

    @Query(
            "SELECT d FROM Document d LEFT JOIN FETCH d.documentGroup JOIN FETCH d.uploadedBy WHERE d.account.accountId = :accountId")
    List<Document> findByAccount_AccountIdWithGroupAndUser(@Param("accountId") Long accountId);

    @Query(
            "SELECT d FROM Document d LEFT JOIN FETCH d.documentGroup JOIN FETCH d.uploadedBy WHERE d.documentGroup.groupId = :groupId")
    List<Document> findByDocumentGroup_GroupIdWithGroupAndUser(@Param("groupId") Integer groupId);

    @Query("SELECT d FROM Document d JOIN FETCH d.account WHERE d.documentId = :documentId")
    Optional<Document> findByIdWithAccount(@Param("documentId") Integer documentId);
}

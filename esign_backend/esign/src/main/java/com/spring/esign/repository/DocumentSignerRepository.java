package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.DocumentSigner;

@Repository
public interface DocumentSignerRepository extends JpaRepository<DocumentSigner, Integer> {

    @Query("SELECT ds FROM DocumentSigner ds " + "JOIN FETCH ds.document d "
            + "JOIN FETCH d.uploadedBy "
            + "LEFT JOIN FETCH d.documentGroup "
            + "WHERE ds.signerEmail = :email")
    List<DocumentSigner> findBySignerEmailWithDocumentAndGroup(@Param("email") String email);

    @Query(
            """
				SELECT ds FROM DocumentSigner ds
				JOIN FETCH ds.document d
				JOIN FETCH d.uploadedBy
				LEFT JOIN FETCH d.documentGroup
				WHERE ds.signerEmail = :email
				AND (
					ds.account.accountId = :accountId
					OR (
						ds.account IS NULL
						AND (
							d.account.accountId = :accountId
							OR (
								:isPersonal = true
								AND d.account.accountId NOT IN (
									SELECT am.account.accountId FROM AccountMember am WHERE am.user.id = :userId
								)
							)
						)
					)
				)
			""")
    List<DocumentSigner> findReceivedDocumentsForWorkspace(
            @Param("email") String email,
            @Param("accountId") Long accountId,
            @Param("isPersonal") boolean isPersonal,
            @Param("userId") String userId);

    List<DocumentSigner> findByDocument_DocumentId(Integer documentId);

    void deleteByDocument_DocumentId(Integer documentId);

    // Find all signer records by email (used for recipient views)
    List<DocumentSigner> findBySignerEmail(String signerEmail);

    Optional<DocumentSigner> findByDocument_DocumentIdAndSignerEmail(Integer documentId, String signerEmail);

    @Modifying
    @Query("DELETE FROM DocumentSigner ds WHERE ds.document.documentId IN :documentIds")
    void deleteByDocument_DocumentIdIn(List<Integer> documentIds);

    @Query(
            """
				SELECT ds FROM DocumentSigner ds
				JOIN FETCH ds.document d
				JOIN FETCH d.uploadedBy
				LEFT JOIN FETCH d.documentGroup
				WHERE ds.signerEmail = :email
				AND d.documentId IN :ids
			""")
    List<DocumentSigner> findByEmailAndDocumentIdsWithFullFetch(
            @Param("email") String email, @Param("ids") List<Integer> ids);

    @Modifying
    @Query("DELETE FROM DocumentSigner ds WHERE ds.document.documentId IN :docIds AND ds.signerEmail IN :emails")
    void deleteByDocumentIdsAndEmails(@Param("docIds") List<Integer> docIds, @Param("emails") List<String> emails);

    @Query(
            """
			SELECT COUNT(ds)
			FROM DocumentSigner ds
			WHERE ds.signerEmail = :email
			AND ds.status = com.spring.esign.enums.SignerStatus.SIGNED
			AND ds.document.documentGroup.groupId = :groupId
			""")
    long countSignedDocumentsByUserAndGroup(@Param("email") String email, @Param("groupId") Integer groupId);

    @Query(
            "SELECT COUNT(ds) = 0 FROM DocumentSigner ds WHERE ds.document.documentId = :documentId AND ds.status <> com.spring.esign.enums.SignerStatus.SIGNED")
    boolean isAllSignersSignedForDocument(@Param("documentId") Integer documentId);
}

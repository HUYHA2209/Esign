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

    @Query(
            """
				SELECT ds FROM DocumentSigner ds
				JOIN FETCH ds.document d
				JOIN FETCH d.uploadedBy
				LEFT JOIN FETCH d.documentGroup
				LEFT JOIN FETCH ds.account a
				WHERE ds.signerEmail = :email
				AND (
					a.accountId = :accountId
					OR (:isPersonal = true AND a IS NULL)
				)
			""")
    List<DocumentSigner> findReceivedDocumentsForWorkspace(
            @Param("email") String email,
            @Param("accountId") Long accountId,
            @Param("isPersonal") boolean isPersonal,
            @Param("userId") String userId);

    List<DocumentSigner> findByDocument_DocumentId(Integer documentId);

    List<DocumentSigner> findByDocument_DocumentGroup_GroupId(Integer groupId);

    void deleteByDocument_DocumentId(Integer documentId);

    // Find all signer records by email (used for recipient views)
    List<DocumentSigner> findBySignerEmail(String signerEmail);

    @Query(
            """
		SELECT ds FROM DocumentSigner ds
		LEFT JOIN ds.account a
		WHERE ds.document.documentId = :documentId
		AND ds.signerEmail = :signerEmail
		AND (a.accountId = :accountId OR a IS NULL)
	""")
    Optional<DocumentSigner> findByDocumentIdAndSignerEmailAndAccountIdFallback(
            @Param("documentId") Integer documentId,
            @Param("signerEmail") String signerEmail,
            @Param("accountId") Long accountId);

    @Modifying
    @Query("DELETE FROM DocumentSigner ds WHERE ds.document.documentId IN :documentIds")
    void deleteByDocument_DocumentIdIn(List<Integer> documentIds);

    @Query(
            """
			SELECT ds FROM DocumentSigner ds
			JOIN FETCH ds.document d
			JOIN FETCH d.uploadedBy
			LEFT JOIN FETCH d.documentGroup
			LEFT JOIN FETCH ds.account a
			WHERE ds.signerEmail = :email
			AND d.documentId IN :ids
			AND (a.accountId = :accountId OR a IS NULL)
		""")
    List<DocumentSigner> findByEmailAndDocumentIdsAndAccountIdWithFullFetch(
            @Param("email") String email, @Param("ids") List<Integer> ids, @Param("accountId") Long accountId);

    @Query(
            """
			SELECT COUNT(ds)
			FROM DocumentSigner ds
			LEFT JOIN ds.account a
			WHERE ds.signerEmail = :email
			AND ds.status = com.spring.esign.enums.SignerStatus.SIGNED
			AND ds.document.documentGroup.groupId = :groupId
			AND (a.accountId = :accountId OR a IS NULL)
			""")
    long countSignedDocumentsByUserAndGroup(
            @Param("email") String email, @Param("groupId") Integer groupId, @Param("accountId") Long accountId);

    @Query(
            "SELECT COUNT(ds) = 0 FROM DocumentSigner ds WHERE ds.document.documentId = :documentId AND ds.status <> com.spring.esign.enums.SignerStatus.SIGNED")
    boolean isAllSignersSignedForDocument(@Param("documentId") Integer documentId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(
            "UPDATE DocumentSigner ds SET ds.status = :newStatus WHERE ds.document.documentGroup.groupId IN :groupIds AND ds.status IN :oldStatuses")
    void updateStatusByGroupIdsAndStatuses(
            @Param("groupIds") java.util.List<Integer> groupIds,
            @Param("oldStatuses") java.util.List<com.spring.esign.enums.SignerStatus> oldStatuses,
            @Param("newStatus") com.spring.esign.enums.SignerStatus newStatus);
}

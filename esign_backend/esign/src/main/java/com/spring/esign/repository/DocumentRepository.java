package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.spring.esign.entity.Document;

public interface DocumentRepository extends JpaRepository<Document, Integer> {

    // Batch count: number of documents per group (for getReceivedDocument
    // optimization)
    @Query("SELECT d.documentGroup.groupId, COUNT(d) FROM Document d "
            + "WHERE d.documentGroup.groupId IN :groupIds "
            + "GROUP BY d.documentGroup.groupId")
    List<Object[]> countDocumentsPerGroup(@Param("groupIds") java.util.Set<Integer> groupIds);

    List<Document> findByAccount_AccountId(Long accountId);

    @Query("SELECT d FROM Document d WHERE d.documentGroup.groupId = :groupId ORDER BY d.documentId ASC")
    List<Document> findByDocumentGroup_GroupId(@Param("groupId") Integer groupId);

    @Query("SELECT d FROM Document d WHERE d.documentGroup.groupId IN :groupIds")
    List<Document> findByDocumentGroup_GroupIdIn(@Param("groupIds") List<Integer> groupIds);

    @Query(
            "SELECT d FROM Document d LEFT JOIN FETCH d.documentGroup JOIN FETCH d.uploadedBy WHERE d.documentGroup.groupId IN :groupIds")
    List<Document> findByDocumentGroup_GroupIdInWithGroupAndUser(@Param("groupIds") List<Integer> groupIds);

    @Query(
            "SELECT d FROM Document d LEFT JOIN FETCH d.documentGroup JOIN FETCH d.uploadedBy WHERE d.account.accountId = :accountId")
    List<Document> findByAccount_AccountIdWithGroupAndUser(@Param("accountId") Long accountId);

    @Query(
            "SELECT d FROM Document d LEFT JOIN FETCH d.documentGroup JOIN FETCH d.uploadedBy WHERE d.documentGroup.groupId = :groupId")
    List<Document> findByDocumentGroup_GroupIdWithGroupAndUser(@Param("groupId") Integer groupId);

    @Query("SELECT d FROM Document d JOIN FETCH d.account WHERE d.documentId = :documentId")
    Optional<Document> findByIdWithAccount(@Param("documentId") Integer documentId);

    @Query(
            value =
                    """
							SELECT
								g.group_id,
								g.group_name,

								d.document_id,
								d.original_file_url,
								d.status,

								ds.doc_signer_id,
								ds.signer_email,
								ds.role,
								ds.signing_order,
								ds.signing_mode,

								fs.field_id,
								fs.field_type,
								fs.page_number,
								fs.pos_x,
								fs.pos_y,
								fs.width,
								fs.height,
								fs.value,

								ds.signer_name,
								ds.signing_mode

							FROM documents d
							JOIN document_group g ON d.group_id = g.group_id

							JOIN document_signers ds
								ON ds.document_id = d.document_id
								AND ds.signer_email = :email
								AND ((:accountId IS NULL AND ds.account_id IS NULL) OR (ds.account_id = :accountId))
							LEFT JOIN signature_fields fs
								ON fs.doc_signer_id = ds.doc_signer_id

							WHERE g.group_id = :groupId
						""",
            nativeQuery = true)
    List<Object[]> findReceivedDetail(
            @Param("groupId") Integer groupId, @Param("email") String email, @Param("accountId") Long accountId);

    @Query(
            """
								SELECT CASE WHEN COUNT(ds) > 0 THEN true ELSE false END
								FROM DocumentSigner ds
								JOIN ds.document d
								WHERE d.documentGroup.groupId = :groupId
								AND ds.signingOrder < :order
								AND ds.status <> com.spring.esign.enums.SignerStatus.SIGNED
						""")
    boolean existsUnsignedPreviousSigners(@Param("groupId") Integer groupId, @Param("order") Integer order);

    @Query(
            """
								SELECT CASE WHEN COUNT(ds) > 0 THEN true ELSE false END
								FROM DocumentSigner ds
								JOIN ds.document d
								WHERE d.documentGroup.groupId = :groupId
								AND ds.signingOrder > :order
								AND ds.status <> com.spring.esign.enums.SignerStatus.SIGNED
						""")
    boolean existsUnsignedNextSigners(@Param("groupId") Integer groupId, @Param("order") Integer order);

    @Query("SELECT COUNT(d) = 0 FROM Document d " + "WHERE d.documentGroup.groupId = :groupId "
            + "AND d.status <> com.spring.esign.enums.DocumentStatus.COMPLETED")
    boolean isAllDocumentsCompleted(Integer groupId);

    /**
     * Lấy finalFileUrl mới nhất trực tiếp từ DB (bypass Hibernate first-level
     * cache).
     * Dùng trong resolveInputPdf để phát hiện race condition khi có người khác ký
     * xong.
     */
    @Query(value = "SELECT final_file_url FROM documents WHERE document_id = :docId", nativeQuery = true)
    String findCurrentFinalFileUrl(@Param("docId") Integer docId);

    /**
     * Lấy finalFileUrl mới nhất với PESSIMISTIC_WRITE lock.
     * Khóa dòng document này lại để tránh TOCTOU (Time-of-Check to Time-of-Use) race condition
     * khi có 2 luồng cùng completeSignning tại đúng 1 miligiây.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d.finalFileUrl FROM Document d WHERE d.documentId = :docId")
    String findCurrentFinalFileUrlWithLock(@Param("docId") Integer docId);

    /**
     * Lấy documents thuộc account mà do user cụ thể upload.
     * Dùng cho org members KHÔNG có canViewDocs — chỉ thấy doc mình upload.
     */
    @Query(
            "SELECT d FROM Document d LEFT JOIN FETCH d.documentGroup JOIN FETCH d.uploadedBy WHERE d.account.accountId = :accountId AND d.uploadedBy.id = :userId")
    List<Document> findByAccount_AccountIdAndUploadedBy_Id(
            @Param("accountId") Long accountId, @Param("userId") String userId);

    List<Document> findByAccount_AccountIdAndStatusIn(
            Long accountId, List<com.spring.esign.enums.DocumentStatus> statuses);

    long countByAccount_AccountId(Long accountId);

    long countByAccount_AccountIdAndStatus(Long accountId, com.spring.esign.enums.DocumentStatus status);

    long countByAccount_AccountIdAndUploadedBy_Id(Long accountId, String userId);

    long countByAccount_AccountIdAndUploadedBy_IdAndStatus(
            Long accountId, String userId, com.spring.esign.enums.DocumentStatus status);

    List<Document> findTop5ByAccount_AccountIdOrderByCreatedAtDesc(Long accountId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(
            "UPDATE Document d SET d.status = :newStatus WHERE d.documentGroup.groupId IN :groupIds AND d.status = :oldStatus")
    void updateStatusByGroupIdsAndStatus(
            @Param("groupIds") List<Integer> groupIds,
            @Param("oldStatus") com.spring.esign.enums.DocumentStatus oldStatus,
            @Param("newStatus") com.spring.esign.enums.DocumentStatus newStatus);
}

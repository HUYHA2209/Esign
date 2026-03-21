package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.DocumentSigner;

@Repository
public interface DocumentSignerRepository extends JpaRepository<DocumentSigner, Integer> {
    List<DocumentSigner> findByDocument_DocumentId(Integer documentId);

    void deleteByDocument_DocumentId(Integer documentId);

    // Find all signer records by email (used for recipient views)
    List<DocumentSigner> findBySignerEmail(String signerEmail);

    Optional<DocumentSigner> findByDocument_DocumentIdAndSignerEmail(Integer documentId, String signerEmail);

    @Modifying
    @Query("DELETE FROM DocumentSigner ds WHERE ds.document.documentId IN :documentIds")
    void deleteByDocument_DocumentIdIn(List<Integer> documentIds);
}

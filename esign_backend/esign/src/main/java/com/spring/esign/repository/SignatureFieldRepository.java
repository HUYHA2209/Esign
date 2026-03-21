package com.spring.esign.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.SignatureField;

@Repository
public interface SignatureFieldRepository extends JpaRepository<SignatureField, Integer> {
    List<SignatureField> findByDocument_DocumentId(Integer documentId);

    void deleteByDocument_DocumentId(Integer documentId);

    @Modifying
    @Query("DELETE FROM SignatureField sf WHERE sf.document.documentId IN :documentIds")
    void deleteByDocument_DocumentIdIn(List<Integer> documentIds);
}

package com.spring.esign.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.spring.esign.entity.AuditTrail;

@Repository
public interface AuditTrailRepository extends JpaRepository<AuditTrail, Long> {

    List<AuditTrail> findByDocument_DocumentIdOrderByTimestampAsc(Integer documentId);

    @Modifying
    @Transactional
    void deleteByDocument_DocumentId(Integer documentId);
}

package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.AuditChain;

@Repository
public interface AuditChainRepository extends JpaRepository<AuditChain, Long> {

    // Lấy entry cuối cùng của chain cho 1 document (để lấy prev_hash)
    Optional<AuditChain> findTopByAuditTrail_Document_DocumentIdOrderByChainIdDesc(Integer documentId);

    // Lấy toàn bộ chain cho 1 document theo thứ tự để verify
    List<AuditChain> findByAuditTrail_Document_DocumentIdOrderByChainIdAsc(Integer documentId);
}

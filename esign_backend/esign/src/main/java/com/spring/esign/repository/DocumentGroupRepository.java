package com.spring.esign.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spring.esign.entity.DocumentGroup;

public interface DocumentGroupRepository extends JpaRepository<DocumentGroup, Integer> {
    DocumentGroup findByGroupId(Integer groupId);
}

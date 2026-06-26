package com.spring.esign.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.spring.esign.entity.Notification;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientEmailAndIsReadFalseOrderByCreatedAtDesc(String recipientEmail);

    List<Notification> findByRecipientEmailOrderByCreatedAtDesc(
            String recipientEmail, org.springframework.data.domain.Pageable pageable);

    long countByRecipientEmailAndIsReadFalse(String recipientEmail);

    @Modifying
    @Query(
            "UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.recipientEmail = :email AND n.isRead = false")
    void markAllAsReadByEmail(@Param("email") String email);
}

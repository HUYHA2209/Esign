package com.spring.esign.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.spring.esign.dto.response.NotificationDTO;
import com.spring.esign.entity.Notification;
import com.spring.esign.enums.Notifications;
import com.spring.esign.repository.NotificationRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationsService {
    SimpMessagingTemplate messagingTemplate;
    NotificationRepository notificationRepository;

    public void sendToUser(
            String recipientEmail,
            Notifications type,
            String title,
            String message,
            Integer groupId,
            String senderName,
            String senderEmail) {
        Notification notification = Notification.builder()
                .recipientEmail(recipientEmail)
                .notificationType(type)
                .title(title)
                .groupId(groupId)
                .senderEmail(senderEmail)
                .senderName(senderName)
                .message(message)
                .build();

        notification = notificationRepository.save(notification);

        NotificationDTO dto = NotificationDTO.builder()
                .notificationId(notification.getNotificationId())
                .groupId(notification.getGroupId())
                .title(notification.getTitle())
                .type(notification.getNotificationType().toString())
                .senderName(notification.getSenderName())
                .senderEmail(notification.getSenderEmail())
                .message(notification.getMessage())
                .build();

        try {
            messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/notifications", dto);
        } catch (Exception e) {
            log.error("Người dùng đang off", e.getMessage());
        }
    }

    public java.util.List<NotificationDTO> getRecentNotifications(String email) {
        java.util.List<Notification> notifications = notificationRepository.findByRecipientEmailOrderByCreatedAtDesc(
                email, org.springframework.data.domain.PageRequest.of(0, 5));

        return notifications.stream()
                .map(notification -> NotificationDTO.builder()
                        .notificationId(notification.getNotificationId())
                        .groupId(notification.getGroupId())
                        .title(notification.getTitle())
                        .type(notification.getNotificationType().toString())
                        .senderName(notification.getSenderName())
                        .senderEmail(notification.getSenderEmail())
                        .message(notification.getMessage())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }
}

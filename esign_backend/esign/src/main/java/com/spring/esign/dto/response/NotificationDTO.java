package com.spring.esign.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationDTO {
    Long notificationId;
    String type;
    String title;
    String message;
    Integer groupId;
    String senderName;
    String senderEmail;
    Boolean isRead;
    LocalDateTime timestamp;
}

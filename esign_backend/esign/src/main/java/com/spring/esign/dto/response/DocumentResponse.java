package com.spring.esign.dto.response;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.spring.esign.enums.DocumentStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DocumentResponse {
    Integer documentId;
    Integer groupId;
    String title;
    String originalFileUrl;
    DocumentStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String uploadedBy; // Full name of uploader
    String recipient; // Placeholder for recipient info if needed
    long fileCount; // useful for grouping
}

package com.spring.esign.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrgDashboardResponse {
    long totalMembers;
    long totalDocuments;
    long completedDocuments;
    long pendingDocuments;

    List<DocumentResponse> recentDocuments;
    List<ActivityDto> recentActivities;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ActivityDto {
        String type;
        String message;
        LocalDateTime timestamp;
    }
}

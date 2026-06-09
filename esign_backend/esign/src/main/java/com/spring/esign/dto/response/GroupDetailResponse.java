package com.spring.esign.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GroupDetailResponse {
    Integer groupId;
    String groupName;
    Integer currentStep;
    String groupStatus;
    LocalDateTime expiresAt;
    List<DocumentDetailResponse> documents;
}

package com.spring.esign.dto.response;

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
    List<DocumentResponse> documents;
    List<RecipientResponse> recipients;
    List<FieldResponse> fields;
}

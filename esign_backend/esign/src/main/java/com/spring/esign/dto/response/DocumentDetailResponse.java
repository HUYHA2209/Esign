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
public class DocumentDetailResponse {
    Integer documentId;
    String originalFileUrl;
    String status;
    List<RecipientResponse> recipients;
    List<FieldResponse> fields;
}

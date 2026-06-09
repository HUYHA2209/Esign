package com.spring.esign.dto.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DocumentReceivedResponse {
    Integer documentId;
    String fileName; // tên file hiển thị (parse từ originalFileUrl)
    String status; // PENDING / COMPLETED

    // Chỉ trả fields được gán cho signer hiện tại (KHÔNG trả hết)
    List<FieldReceivedResponse> fields;
}

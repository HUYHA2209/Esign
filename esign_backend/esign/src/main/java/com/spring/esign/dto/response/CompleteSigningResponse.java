package com.spring.esign.dto.response;

import java.time.Instant;
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
public class CompleteSigningResponse {
    /**
     * Trạng thái hoàn tất: true nếu verify + seal thành công
     */
    Boolean success;

    /**
     * Thông báo kết quả
     */
    String message;

    /**
     * Danh sách document đã ký thành công (documentId + finalFileUrl)
     */
    List<SignedDocumentInfo> signedDocuments;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SignedDocumentInfo {
        Long documentId;
        String fileName;
        String fileHash;
        String hashAlgorithm;
        Instant signedAt;
    }
}

package com.spring.esign.dto.request;

import java.util.Map;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PrepareSigningRequest {
    /**
     * Giá trị các field mà signer đã điền trên FE.
     * Key   = fieldId (Integer dạng String — "12", "13", ...)
     * Value = giá trị (Base64 image cho SIGNATURE, text cho TEXT/NAME/EMAIL/DATE, ...)
     *
     * Ví dụ:
     * {
     *   "12": "data:image/png;base64,iVBORw0KGgo...",
     *   "13": "Nguyễn Văn A",
     *   "14": "2026-04-14"
     * }
     *
     * BE sẽ dùng fieldId để tra DB lấy tọa độ (posX, posY, width, height, pageNumber)
     * rồi vẽ value lên đúng vị trí trên PDF (Pre-seal) trước khi hash.
     */
    Map<String, String> fieldValues;
}

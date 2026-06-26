package com.spring.esign.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpsertFieldRequest {
    Integer id; // null = new field, non-null = DB fieldId to update
    String type;
    Integer page;
    Integer documentId; // target document
    Float x, y, width, height;
    String recipientEmail; // link to signer by email
    Long accountId; // link to signer by accountId (null for personal)
}

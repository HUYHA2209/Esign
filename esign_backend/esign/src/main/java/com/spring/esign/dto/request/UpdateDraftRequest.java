package com.spring.esign.dto.request;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateDraftRequest {
    String documentName;
    Integer currentStep;
    Boolean enableSigningOrder;
    List<UpsertSignerRequest> upsertSigners; // Signers to create/update
    List<String> deletedSignerEmails; // Signer emails to remove
    List<UpsertFieldRequest> upsertFields; // Fields to create/update
    List<Integer> deletedFieldIds; // Field DB IDs to remove
}

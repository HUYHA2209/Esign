package com.spring.esign.dto.request;

import java.util.List;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SaveDraftDocumentRequest {
    Integer groupId;
    String documentName;
    Integer currentStep;
    Integer totalFiles;
    List<FieldRequest> fields;
    List<ExistingFileRequest> existingFiles;
    List<SignerDto> recipients;
}

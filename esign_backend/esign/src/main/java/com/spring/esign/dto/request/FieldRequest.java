package com.spring.esign.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;

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
public class FieldRequest {
    String id;
    String type;

    @JsonAlias({"page", "pageNumber"})
    Integer page;

    Integer fileIndex;
    String fileId;
    Integer documentId; // Real DB primary key - preferred for file→document mapping

    Float x;
    Float y;
    Float width;
    Float height;

    Integer fontSize;

    Integer recipientId;
    Integer recipientIndex;
}

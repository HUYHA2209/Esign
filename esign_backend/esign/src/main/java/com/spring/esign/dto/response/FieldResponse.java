package com.spring.esign.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FieldResponse {
    Integer fieldId;
    String type;
    Integer page;
    Integer fileIndex;
    Float x;
    Float y;
    Float width;
    Float height;
    Integer recipientId; // signer id for mapping
}

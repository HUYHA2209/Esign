package com.spring.esign.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SignatureResponse {
    Long signatureId;
    String imageUrl;
    String signatureType;
    String textStyle;
}

package com.spring.esign.dto.request;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SignatureCreationRequest {
    String imageBase64;
    String signatureType; // DRAWN, UPLOADED, TYPED
    String textStyle;
    String imageHash;
}

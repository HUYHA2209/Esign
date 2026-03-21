package com.spring.esign.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WebAuthnRegistrationStartResponse {
    private String optionsJson; // Raw JSON of PublicKeyCredentialCreationOptions
}

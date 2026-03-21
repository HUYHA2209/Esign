package com.spring.esign.dto.request;

import lombok.Data;

@Data
public class WebAuthnRegistrationFinishRequest {
    private String credentialJson; // The JSON response from navigator.credentials.create()
}

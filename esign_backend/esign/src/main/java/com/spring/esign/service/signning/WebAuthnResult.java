package com.spring.esign.service.signning;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WebAuthnResult {
    String credentialIdBase64;
    String digitalSignatureBase64;
}

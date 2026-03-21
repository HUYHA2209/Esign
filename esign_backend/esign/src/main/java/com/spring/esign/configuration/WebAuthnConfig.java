package com.spring.esign.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.webauthn4j.WebAuthnManager;

@Configuration
public class WebAuthnConfig {
    // phan chinh cua thu vien dung de xac thuc
    @Bean
    public WebAuthnManager webAuthnManager() {
        return WebAuthnManager.createNonStrictWebAuthnManager();
    }
}

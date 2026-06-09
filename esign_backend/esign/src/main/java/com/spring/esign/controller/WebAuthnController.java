package com.spring.esign.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spring.esign.dto.request.WebAuthnAuthenticationFinishRequest;
import com.spring.esign.dto.request.WebAuthnRegistrationFinishRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.WebAuthnAuthenticationStartResponse;
import com.spring.esign.dto.response.WebAuthnRegistrationStartResponse;
import com.spring.esign.service.WebAuthnService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/webauthn")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WebAuthnController {

    WebAuthnService webAuthnService;

    @GetMapping("/status")
    public ApiResponse<Boolean> getPasskeyStatus() {
        return ApiResponse.<Boolean>builder()
                .result(webAuthnService.getPasskeyStatus())
                .build();
    }

    @PostMapping("/register/start")
    public ApiResponse<WebAuthnRegistrationStartResponse> startRegistration() {
        return ApiResponse.<WebAuthnRegistrationStartResponse>builder()
                .result(webAuthnService.startRegistration())
                .build();
    }

    @PostMapping("/register/finish")
    public ApiResponse<String> finishRegistration(@RequestBody WebAuthnRegistrationFinishRequest request) {
        webAuthnService.finishRegistration(request);
        return ApiResponse.<String>builder().result("Registration successful").build();
    }

    @PostMapping("/login/start")
    public ApiResponse<WebAuthnAuthenticationStartResponse> startAuthentication() {
        return ApiResponse.<WebAuthnAuthenticationStartResponse>builder()
                .result(webAuthnService.startAuthentication())
                .build();
    }

    @PostMapping("/login/finish")
    public ApiResponse<String> finishAuthentication(@RequestBody WebAuthnAuthenticationFinishRequest request) {
        webAuthnService.finishAuthentication(request);
        return ApiResponse.<String>builder().result("Authentication successful").build();
    }
}

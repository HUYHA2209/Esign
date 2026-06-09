package com.spring.esign.controller;

import org.springframework.web.bind.annotation.*;

import com.spring.esign.dto.request.WebAuthnRegistrationFinishRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.WebAuthnRegistrationStartResponse;
import com.spring.esign.service.OrgWebAuthnService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/organizations/{orgUrl}/webauthn")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrgWebAuthnController {

    OrgWebAuthnService orgWebAuthnService;

    @GetMapping("/status")
    public ApiResponse<Boolean> getPasskeyStatus(@PathVariable String orgUrl) {
        return ApiResponse.<Boolean>builder()
                .result(orgWebAuthnService.getPasskeyStatus(orgUrl))
                .build();
    }

    @PostMapping("/register/start")
    public ApiResponse<WebAuthnRegistrationStartResponse> startRegistration(@PathVariable String orgUrl) {
        return ApiResponse.<WebAuthnRegistrationStartResponse>builder()
                .result(orgWebAuthnService.startRegistration(orgUrl))
                .build();
    }

    @PostMapping("/register/finish")
    public ApiResponse<String> finishRegistration(
            @PathVariable String orgUrl, @RequestBody WebAuthnRegistrationFinishRequest request) {
        orgWebAuthnService.finishRegistration(orgUrl, request);
        return ApiResponse.<String>builder()
                .result("Organization PassKey registered successfully")
                .build();
    }

    @PostMapping("/login/start")
    public ApiResponse<com.spring.esign.dto.response.WebAuthnAuthenticationStartResponse> startAuthentication(
            @PathVariable String orgUrl) {
        return ApiResponse.<com.spring.esign.dto.response.WebAuthnAuthenticationStartResponse>builder()
                .result(orgWebAuthnService.startAuthentication(orgUrl))
                .build();
    }

    @PostMapping("/login/finish")
    public ApiResponse<String> finishAuthentication(
            @PathVariable String orgUrl,
            @RequestBody com.spring.esign.dto.request.WebAuthnAuthenticationFinishRequest request) {
        orgWebAuthnService.finishAuthentication(orgUrl, request);
        return ApiResponse.<String>builder()
                .result("Organization PassKey authenticated successfully")
                .build();
    }
}

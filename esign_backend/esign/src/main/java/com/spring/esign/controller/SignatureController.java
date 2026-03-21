package com.spring.esign.controller;

import org.springframework.web.bind.annotation.*;

import com.spring.esign.dto.request.SignatureCreationRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.SignatureResponse;
import com.spring.esign.service.SignatureService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/signature")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SignatureController {

    SignatureService signatureService;

    @PostMapping
    public ApiResponse<String> saveSignature(@RequestBody SignatureCreationRequest request) {
        signatureService.saveSignature(request);
        return ApiResponse.<String>builder()
                .result("Signature saved successfully")
                .build();
    }

    @GetMapping
    public ApiResponse<SignatureResponse> getSignature() {
        return ApiResponse.<com.spring.esign.dto.response.SignatureResponse>builder()
                .result(signatureService.getSignature())
                .build();
    }
}

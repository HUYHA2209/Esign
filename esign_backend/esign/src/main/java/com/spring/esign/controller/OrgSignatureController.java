package com.spring.esign.controller;

import org.springframework.web.bind.annotation.*;

import com.spring.esign.dto.request.SignatureCreationRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.SignatureResponse;
import com.spring.esign.service.OrgSignatureService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/organizations/{orgUrl}/signature")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrgSignatureController {

    OrgSignatureService orgSignatureService;

    @PostMapping
    public ApiResponse<String> saveOrgSignature(
            @PathVariable String orgUrl, @RequestBody SignatureCreationRequest request) {
        orgSignatureService.saveOrgSignature(orgUrl, request);
        return ApiResponse.<String>builder()
                .result("Organization signature saved successfully")
                .build();
    }

    @GetMapping
    public ApiResponse<SignatureResponse> getOrgSignature(@PathVariable String orgUrl) {
        return ApiResponse.<SignatureResponse>builder()
                .result(orgSignatureService.getOrgSignature(orgUrl))
                .build();
    }
}

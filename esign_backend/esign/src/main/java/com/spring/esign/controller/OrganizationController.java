package com.spring.esign.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spring.esign.dto.request.OrganizationCreationRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.service.OrganizationService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrganizationController {
    OrganizationService organizationService;

    @PostMapping("/create")
    public ApiResponse<Void> createOrganization(@RequestBody OrganizationCreationRequest request) {
        organizationService.createOrganization(request);
        return ApiResponse.<Void>builder().build();
    }
}

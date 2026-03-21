package com.spring.esign.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spring.esign.dto.request.CheckOtpRequest;
import com.spring.esign.dto.request.EmailRequest;
import com.spring.esign.dto.request.ResetPasswordRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.CheckOtpResponse;
import com.spring.esign.service.EmailService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/forgot-password")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ForgotPasswordController {

    EmailService emailService;

    // send mail for email verification
    @PostMapping("/verifyMail")
    public ApiResponse<Void> verifyEmail(@RequestBody EmailRequest emailRequest) {
        emailService.sendSimpleMessage(emailRequest.getEmail());
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/verifyOtp")
    public ApiResponse<CheckOtpResponse> verifyOtp(@RequestBody CheckOtpRequest checkOtpRequest) {
        return ApiResponse.<CheckOtpResponse>builder()
                .result(emailService.verifyOtp(checkOtpRequest))
                .build();
    }

    @PostMapping("/resetPassword")
    public ApiResponse<Void> resetPassword(@RequestBody ResetPasswordRequest resetPasswordRequest) {
        return ApiResponse.<Void>builder()
                .message(emailService.resetPassword(resetPasswordRequest))
                .build();
    }
}

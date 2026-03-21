package com.spring.esign.controller;

import java.text.ParseException;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.nimbusds.jose.JOSEException;
import com.spring.esign.dto.request.*;
import com.spring.esign.dto.response.AccountResponse;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.AuthenticationResponse;
import com.spring.esign.dto.response.IntrospectResponse;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.service.AuthenticationService;
import com.spring.esign.service.RateLimitService;
import com.spring.esign.util.CookieUtil;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {
    AuthenticationService authenticationService;
    CookieUtil cookieUtil;
    RateLimitService rateLimitService;

    @PostMapping("/register")
    public ApiResponse<String> register(
            @Valid @RequestBody UserCreationRequest request, HttpServletRequest httpRequest) {

        // Rate limit: 3 lần/giờ/IP
        String clientIp = getClientIp(httpRequest);
        if (!rateLimitService.isRegisterAllowed(clientIp)) {
            throw new AppException(ErrorCode.RATE_LIMIT_EXCEEDED);
        }

        authenticationService.register(request);

        return ApiResponse.<String>builder()
                .result("Đăng ký thành công! Vui lòng kiểm tra email để nhập mã OTP xác minh.")
                .build();
    }

    @PostMapping("/verify-email")
    public ApiResponse<AuthenticationResponse> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request, HttpServletResponse response) {

        // Rate limit: 5 lần nhập sai/email
        if (!rateLimitService.isVerifyOtpAllowed(request.getEmail())) {
            throw new AppException(ErrorCode.RATE_LIMIT_EXCEEDED);
        }

        AuthenticationResponse authResponse = authenticationService.verifyEmail(request.getEmail(), request.getOtp());

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                cookieUtil
                        .createRefreshTokenCookie(authResponse.getRefreshToken(), 7 * 24 * 60 * 60L)
                        .toString());
        authResponse.setRefreshToken(null);

        return ApiResponse.<AuthenticationResponse>builder()
                .result(authResponse)
                .build();
    }

    @PostMapping("/resend-otp")
    public ApiResponse<String> resendOtp(@Valid @RequestBody ResendOtpRequest request) {

        // Rate limit: 3 lần/5 phút/email
        if (!rateLimitService.isResendOtpAllowed(request.getEmail())) {
            throw new AppException(ErrorCode.RATE_LIMIT_EXCEEDED);
        }

        authenticationService.resendOtp(request.getEmail());

        return ApiResponse.<String>builder()
                .result("Mã OTP mới đã được gửi đến email của bạn.")
                .build();
    }

    @PostMapping("/introspect")
    public IntrospectResponse introspectResponse(@RequestBody IntrospectRequest introspectRequest)
            throws ParseException, JOSEException {
        return authenticationService.introspectResponse(introspectRequest);
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthenticationResponse> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = cookieUtil.getRefreshTokenFromRequest(request);

        if (refreshToken == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        AuthenticationResponse authenticationResponse = authenticationService.refreshToken(refreshToken);

        response.addHeader(
                org.springframework.http.HttpHeaders.SET_COOKIE,
                cookieUtil
                        .createRefreshTokenCookie(authenticationResponse.getRefreshToken(), 7 * 24 * 60 * 60L)
                        .toString());
        authenticationResponse.setRefreshToken(null);

        return ApiResponse.<AuthenticationResponse>builder()
                .result(authenticationResponse)
                .build();
    }

    @PostMapping("/login")
    public ApiResponse<AuthenticationResponse> login(
            @RequestBody AuthenticationRequest authenticationRequest,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {

        // Rate limit: 5 lần/phút/email
        if (!rateLimitService.isLoginAllowed(authenticationRequest.getEmail())) {
            throw new AppException(ErrorCode.RATE_LIMIT_EXCEEDED);
        }

        AuthenticationResponse authenticationResponse = authenticationService.login(authenticationRequest);

        response.addHeader(
                org.springframework.http.HttpHeaders.SET_COOKIE,
                cookieUtil
                        .createRefreshTokenCookie(authenticationResponse.getRefreshToken(), 7 * 24 * 60 * 60L)
                        .toString());
        authenticationResponse.setRefreshToken(null);

        return ApiResponse.<AuthenticationResponse>builder()
                .result(authenticationResponse)
                .build();
    }

    @PostMapping("/workspace")
    public ApiResponse<AuthenticationResponse> switchWorkSpace(@RequestBody SwitchAccountRequest switchAccountRequest) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserId = authentication.getName();

        AuthenticationResponse authenticationResponse =
                authenticationService.switchAccount(currentUserId, switchAccountRequest.getAccountId());

        return ApiResponse.<AuthenticationResponse>builder()
                .result(authenticationResponse)
                .build();
    }

    @GetMapping("/workspace")
    public ApiResponse<List<AccountResponse>> getAllAccount() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserId = authentication.getName();
        return ApiResponse.<List<AccountResponse>>builder()
                .result(authenticationService.getAllAccount(currentUserId))
                .build();
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            jakarta.servlet.http.HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response,
            @RequestBody LogoutRequest logoutRequest)
            throws JOSEException, ParseException {
        String refreshToken = cookieUtil.getRefreshTokenFromRequest(request);

        if (refreshToken != null) {
            authenticationService.logout(refreshToken, logoutRequest);
        }

        response.addHeader(
                org.springframework.http.HttpHeaders.SET_COOKIE,
                cookieUtil.deleteRefreshTokenCookie().toString());

        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePass(@RequestBody NewPasswordRequest request) {
        var authenticate = SecurityContextHolder.getContext().getAuthentication();
        String userId = authenticate.getName();
        authenticationService.changePass(request, userId);
        return ApiResponse.<Void>builder().build();
    }

    /**
     * Lấy IP client (hỗ trợ proxy)
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

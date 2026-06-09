package com.spring.esign.controller;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.*;

import com.spring.esign.dto.request.CompleteSigningRequest;
import com.spring.esign.dto.request.PrepareSigningRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.CompleteSigningResponse;
import com.spring.esign.dto.response.SessionSignningAuthResponse;
import com.spring.esign.service.signning.SignningService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/signning")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SignningController {
    SignningService signningService;

    /**
     * Bước 1: Prepare signing session
     * - Nhận fieldValues từ FE
     * - BE vẽ visuals lên PDF (Pre-seal), hash bản đã vẽ
     * - Sinh WebAuthn challenge dựa trên hash mới
     * - Trả về sessionId + webAuthnOptions cho FE gọi navigator.credentials.get()
     */
    @PostMapping("/prepare/{groupId}")
    public ApiResponse<SessionSignningAuthResponse> prepare(
            @PathVariable Integer groupId, @RequestBody PrepareSigningRequest request) {
        return ApiResponse.<SessionSignningAuthResponse>builder()
                .result(signningService.prepareSignning(groupId, request.getFieldValues()))
                .build();
    }

    /**
     * Bước 3: Complete signing
     * - Nhận WebAuthn assertion từ FE (sau khi user xác thực sinh trắc học)
     * - BE verify assertion, nếu hợp lệ:
     *   → Lấy bản pre-sealed → Append Audit page → PAdES seal → Upload final
     */
    @PostMapping("/complete")
    public ApiResponse<CompleteSigningResponse> complete(
            @RequestBody CompleteSigningRequest request, HttpServletRequest httpServletRequest) throws Exception {

        String ip = httpServletRequest.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = httpServletRequest.getRemoteAddr();
        }
        String ua = httpServletRequest.getHeader("User-Agent");

        return ApiResponse.<CompleteSigningResponse>builder()
                .result(signningService.completeSignning(
                        request.getSessionId(),
                        request.getGroupId(),
                        request.getCredentialJson(),
                        ip,
                        ua,
                        request.getDeviceFingerprint()))
                .build();
    }

    @GetMapping("/check-order/{groupId}")
    public ApiResponse<Boolean> checkOrder(@PathVariable Integer groupId) {
        return ApiResponse.<Boolean>builder()
                .result(signningService.checkOrder(groupId))
                .build();
    }

    @PostMapping("/{groupId}/decline")
    public ApiResponse<Void> decline(
            @PathVariable Integer groupId,
            @RequestBody(required = false) com.spring.esign.dto.request.DeclineRequest request,
            HttpServletRequest httpServletRequest) {

        String ip = httpServletRequest.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = httpServletRequest.getRemoteAddr();
        }

        // Sinh fake device fingerprint từ User-Agent nếu FE ko gửi
        String deviceFingerprint = httpServletRequest.getHeader("User-Agent");

        signningService.declineSignning(groupId, request != null ? request.getReason() : null, ip, deviceFingerprint);

        return ApiResponse.<Void>builder().message("Đã từ chối ký tài liệu").build();
    }
}

package com.spring.esign.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.spring.esign.dto.request.*;
import com.spring.esign.dto.request.UpdateProfileRequest;
import com.spring.esign.dto.response.*;
import com.spring.esign.service.UserService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {
    UserService userService;

    @GetMapping("/search")
    public ApiResponse<List<UserSearchResponse>> searchUserByEmail(@RequestParam String email) {
        return ApiResponse.<List<UserSearchResponse>>builder()
                .result(userService.searchUserByEmail(email))
                .build();
    }

    @GetMapping("/my-info")
    public ApiResponse<InfoResponse> getMyInfo() {
        return ApiResponse.<InfoResponse>builder()
                .result(userService.getMyInfo())
                .build();
    }

    @PutMapping("/my-info")
    public ApiResponse<InfoResponse> updateMyInfo(@RequestBody UpdateProfileRequest request) {
        return ApiResponse.<InfoResponse>builder()
                .result(userService.updateMyInfo(request))
                .build();
    }

    @DeleteMapping("/me")
    public ApiResponse<String> deleteMyAccount(jakarta.servlet.http.HttpServletResponse response) {
        userService.deleteMyAccount();

        // Clear refresh token cookie
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from(
                        "refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString());

        return ApiResponse.<String>builder()
                .result("Tài khoản đã được xóa vĩnh viễn")
                .build();
    }
}

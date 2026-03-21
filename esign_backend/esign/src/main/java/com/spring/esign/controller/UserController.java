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
}

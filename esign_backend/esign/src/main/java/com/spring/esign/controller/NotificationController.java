package com.spring.esign.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.NotificationDTO;
import com.spring.esign.entity.User;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.UserRepository;
import com.spring.esign.service.NotificationsService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationController {

    NotificationsService notificationsService;
    UserRepository userRepository;

    @GetMapping("/recent")
    public ApiResponse<List<NotificationDTO>> getRecentNotifications() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<NotificationDTO> recentNotifications = notificationsService.getRecentNotifications(user.getEmail());

        return ApiResponse.<List<NotificationDTO>>builder()
                .result(recentNotifications)
                .build();
    }
}

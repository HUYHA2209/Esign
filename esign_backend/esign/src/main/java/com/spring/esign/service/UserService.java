package com.spring.esign.service;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.spring.esign.dto.request.UpdateProfileRequest;
import com.spring.esign.dto.response.InfoResponse;
import com.spring.esign.dto.response.UserSearchResponse;
import com.spring.esign.entity.User;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;

    public List<UserSearchResponse> searchUserByEmail(String email) {
        // FindByEmailKey no longer returns Entity, it returns UserSearchResponse
        // directly!
        return userRepository.findEmailByKey(email);
    }

    public InfoResponse getMyInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userID = authentication.getName();
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return InfoResponse.builder()
                .email(user.getEmail())
                .name(user.getFullName())
                .phone(user.getPhone())
                .build();
    }

    public InfoResponse updateMyInfo(UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userID = authentication.getName();
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        userRepository.updateProfile(userID, request.getName(), request.getPhone());
        return InfoResponse.builder()
                .email(user.getEmail())
                .name(request.getName())
                .phone(request.getPhone())
                .build();
    }
}

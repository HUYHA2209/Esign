package com.spring.esign.service;

import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RateLimitService {

    RedisTemplate<String, String> redisTemplate;

    private static final String RATE_PREFIX = "rate:";

    /**
     * Kiểm tra xem action có được phép không.
     * Nếu chưa vượt giới hạn → tăng counter và cho phép.
     * Nếu vượt → từ chối.
     *
     * @param action      tên action (login, register, resend-otp)
     * @param identifier  email hoặc IP
     * @param maxAttempts số lần tối đa
     * @param windowSeconds thời gian cửa sổ (giây)
     * @return true nếu được phép, false nếu bị giới hạn
     */
    public boolean isAllowed(String action, String identifier, int maxAttempts, long windowSeconds) {
        String key = RATE_PREFIX + action + ":" + identifier.toLowerCase().trim();

        String current = redisTemplate.opsForValue().get(key);

        if (current != null && Integer.parseInt(current) >= maxAttempts) {
            return false;
        }

        Long newCount = redisTemplate.opsForValue().increment(key);

        // Đặt TTL khi lần đầu ghi key
        if (newCount != null && newCount == 1) {
            redisTemplate.expire(key, windowSeconds, TimeUnit.SECONDS);
        }

        return true;
    }

    /**
     * Login: tối đa 5 lần/phút/email
     */
    public boolean isLoginAllowed(String email) {
        return isAllowed("login", email, 5, 60);
    }

    /**
     * Register: tối đa 3 lần/giờ/IP
     */
    public boolean isRegisterAllowed(String ip) {
        return isAllowed("register", ip, 5, 3600);
    }

    /**
     * Resend OTP: tối đa 3 lần/5 phút/email
     */
    public boolean isResendOtpAllowed(String email) {
        return isAllowed("resend-otp", email, 5, 300);
    }

    /**
     * Verify OTP: tối đa 5 lần nhập sai/email (mỗi OTP session)
     */
    public boolean isVerifyOtpAllowed(String email) {
        return isAllowed("verify-otp", email, 5, 300);
    }
}

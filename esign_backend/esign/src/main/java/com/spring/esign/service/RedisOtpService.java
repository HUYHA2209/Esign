package com.spring.esign.service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RedisOtpService {

    RedisTemplate<String, String> redisTemplate;

    private static final String OTP_PREFIX = "otp:verify:";
    private static final long OTP_TTL_MINUTES = 5;
    private static final SecureRandom secureRandom = new SecureRandom();

    /**
     * Tạo OTP 6 số, lưu vào Redis với TTL 5 phút
     */
    public int generateAndSaveOtp(String email) {
        int otp = secureRandom.nextInt(100_000, 999_999);
        String key = OTP_PREFIX + email.toLowerCase().trim();
        redisTemplate.opsForValue().set(key, String.valueOf(otp), OTP_TTL_MINUTES, TimeUnit.MINUTES);
        return otp;
    }

    /**
     * Lấy OTP từ Redis (null nếu hết hạn hoặc không tồn tại)
     */
    public String getOtp(String email) {
        String key = OTP_PREFIX + email.toLowerCase().trim();
        return redisTemplate.opsForValue().get(key);
    }

    /**
     * Xác minh OTP: so khớp và xóa nếu đúng
     */
    public boolean verifyOtp(String email, int otp) {
        String storedOtp = getOtp(email);
        if (storedOtp != null && storedOtp.equals(String.valueOf(otp))) {
            deleteOtp(email);
            return true;
        }
        return false;
    }

    /**
     * Xóa OTP (sau khi verify thành công)
     */
    public void deleteOtp(String email) {
        String key = OTP_PREFIX + email.toLowerCase().trim();
        redisTemplate.delete(key);
    }
}

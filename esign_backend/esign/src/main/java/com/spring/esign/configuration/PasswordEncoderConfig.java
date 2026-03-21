package com.spring.esign.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Tách riêng PasswordEncoder ra khỏi SecurityConfig để tránh circular dependency.
 *
 * Vòng tròn bị phá:
 *   SecurityConfig → CustomJWTDecoder → AuthenticationService → EmailService → PasswordEncoder (bean)
 *   ← nếu PasswordEncoder nằm trong SecurityConfig thì tạo vòng tròn!
 *
 * Giờ PasswordEncoderConfig không inject bất kỳ dependency nào → an toàn.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}

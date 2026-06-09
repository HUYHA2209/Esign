package com.spring.esign.configuration;

import java.security.Principal;
import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import com.nimbusds.jwt.SignedJWT;
import com.spring.esign.entity.User;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            List<String> authHeaders = accessor.getNativeHeader("Authorization");
            if (authHeaders != null && !authHeaders.isEmpty()) {
                String token = authHeaders.get(0).replace("Bearer ", "");
                try {
                    SignedJWT signedJWT = SignedJWT.parse(token);
                    String userId = signedJWT.getJWTClaimsSet().getSubject();

                    User user = userRepository
                            .findById(userId)
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

                    if (user != null) {
                        Principal principal = new UsernamePasswordAuthenticationToken(user.getEmail(), null, List.of());
                        accessor.setUser(principal);
                        log.info("WebSocket authenticated: {}", user.getEmail());
                    }
                } catch (Exception e) {
                    log.error("WebSocket auth failed: {}", e.getMessage());
                }
            }
        }
        return message;
    }
}

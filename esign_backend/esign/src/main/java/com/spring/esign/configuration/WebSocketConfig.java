package com.spring.esign.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocketMessageBroker // Bật STOMP message broker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    /**
     *  Cấu hình message broker:
     *     - Broker là "trung tâm phân phối" message
     *     - Quy định prefix cho từng hướng message
     *     vd: SUBSCRIBE
     *         destination:/user/NguyenVanA/queue/messages
     *         id:sub-0
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Broker sẽ ngay lập tức chộp lấy và Broadcast (phát thanh)
        // về cho các Client đang Subscribe (nghe) kênh đó.
        // dùng sendTo(/topic/mess); -> gửi tin nhắn từ controller vứt ra đi đâu
        config.enableSimpleBroker("/topic", "/queue");

        // ddinh nghia cai nay can xu ly logic nen nem thang vao ham @MessageMapping
        // vd : (/app/notifi)
        config.setApplicationDestinationPrefixes("/app");

        // (6) Prefix để gửi message đến một USER cụ thể
        //     → /user/{username}/queue/private
        config.setUserDestinationPrefix("/user");
    }

    /**
     *  Đăng ký endpoint WebSocket:
     *     - URL mà client dùng để kết nối
     *     - Cấu hình CORS, SockJS fallback
     */
    // còn cái này chỉ để client mở kết nối web socket
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins("http://localhost:5173").withSockJS();
    }

    @Override // ← Thêm method mới
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthInterceptor);
    }
}

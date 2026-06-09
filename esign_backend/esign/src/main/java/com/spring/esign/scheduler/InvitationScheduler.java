package com.spring.esign.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.spring.esign.service.InvitationService;

@Component
public class InvitationScheduler {
    // Sử dụng Logger để ghi nhận lịch sử chạy job (Rất quan trọng trong dự án lớn)
    private static final Logger log = LoggerFactory.getLogger(InvitationScheduler.class);

    private final InvitationService invitationService;

    public InvitationScheduler(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    /**
     * Lấy cấu hình cron từ file application.yml thông qua SpEL ${...}
     */
    @Scheduled(cron = "${app.cron.invitation-expiration-check}")
    public void checkInvitationsJob() {
        log.info("=== [CRON JOB] Bắt đầu tiến trình kiểm tra thư mời hết hạn ===");

        try {
            // Chỉ làm nhiệm vụ gọi Service xử lý
            invitationService.processUpcomingExpiredInvitations();
            log.info("=== [CRON JOB] Tiến trình kiểm tra kết thúc thành công ===");
        } catch (Exception e) {
            log.error("=== [CRON JOB] Có lỗi xảy ra trong quá trình quét thư mời: {} ===", e.getMessage(), e);
        }
    }
}

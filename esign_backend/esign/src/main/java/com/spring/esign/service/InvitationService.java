package com.spring.esign.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.mail.MessagingException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.spring.esign.enums.InvitationStatus;
import com.spring.esign.repository.OrgInvitationRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InvitationService {
    OrgInvitationRepository orgInvitationRepository;
    NotificationsService notificationsService;
    EmailService emailService;

    @Transactional // Đảm bảo tính toàn vẹn dữ liệu khi quét và cập nhật hàng loạt
    public void processUpcomingExpiredInvitations() throws MessagingException {
        LocalDate noticeThreshold = LocalDate.now().plusDays(1);
        LocalDateTime startOfExpirationDay = noticeThreshold.atStartOfDay();
        LocalDateTime endOfExpirationDay = noticeThreshold.atTime(LocalTime.MAX);

        // 1. Lấy danh sách từ repo
        var expiringInvitations = orgInvitationRepository.findInvitationsWithAccount(
                startOfExpirationDay, endOfExpirationDay, InvitationStatus.PENDING);

        // 2. Xử lý gửi thông báo & cập nhật trạng thái
        for (var invite : expiringInvitations) {
            emailService.sendInvitationExpiredWarning(
                    invite.getInviteeEmail(), invite.getAccount().getAccountName());
            invite.setNotified(true);
            orgInvitationRepository.save(invite);
        }
    }
}

package com.spring.esign.service;

import java.security.SecureRandom;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.spring.esign.dto.request.CheckOtpRequest;
import com.spring.esign.dto.request.MailBody;
import com.spring.esign.dto.request.ResetPasswordRequest;
import com.spring.esign.dto.response.CheckOtpResponse;
import com.spring.esign.entity.ForgotPassword;
import com.spring.esign.entity.User;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.ForgotPasswordRepository;
import com.spring.esign.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@org.springframework.transaction.annotation.Transactional
public class EmailService {

    JavaMailSender mailSender;
    UserRepository userRepository;
    ForgotPasswordRepository forgotPasswordRepository;
    PasswordEncoder passwordEncoder;

    private static final SecureRandom secureRandom = new SecureRandom();

    @NonFinal
    @Value("${spring.mail.username}")
    protected String senderEmail;

    // ====== FORGOT PASSWORD (giữ nguyên logic cũ) ======

    public void sendSimpleMessage(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Integer otp = generateOtp();
        java.util.Date expiryDate = new java.util.Date(System.currentTimeMillis() + 1000 * 60 * 5);

        ForgotPassword fp = forgotPasswordRepository
                .findByUser(user)
                .orElse(ForgotPassword.builder().user(user).build());

        fp.setOtp(otp);
        fp.setExpiredAt(expiryDate);

        forgotPasswordRepository.save(fp);

        MailBody mailBody = MailBody.builder()
                .to(email)
                .subject("Verify your email")
                .text("Your OTP is: " + otp)
                .build();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(mailBody.to());
        message.setFrom(senderEmail);
        message.setSubject(mailBody.subject());
        message.setText(mailBody.text());

        mailSender.send(message);
    }

    private Integer generateOtp() {
        return secureRandom.nextInt(100_000, 999_999);
    }

    public CheckOtpResponse verifyOtp(CheckOtpRequest checkOtpRequest) {
        User user = userRepository
                .findByEmail(checkOtpRequest.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        ForgotPassword fp = forgotPasswordRepository
                .findByOtpAndUser(checkOtpRequest.getOtp(), user)
                .orElseThrow(() -> new AppException(ErrorCode.OTP_NOT_FOUND));

        if (fp.getExpiredAt().before(new java.util.Date())) {
            forgotPasswordRepository.deleteById(fp.getFpid());
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        return CheckOtpResponse.builder().isOtpValid(true).build();
    }

    public String resetPassword(ResetPasswordRequest request) {
        User user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        ForgotPassword fp = forgotPasswordRepository
                .findByOtpAndUser(request.getOtp(), user)
                .orElseThrow(() -> new AppException(ErrorCode.OTP_NOT_FOUND));

        if (fp.getExpiredAt().before(new java.util.Date())) {
            forgotPasswordRepository.deleteById(fp.getFpid());
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        String encodedPassword = passwordEncoder.encode(request.getResetPassword());

        userRepository.updatePassword(request.getEmail(), encodedPassword);

        return "Change password successed";
    }

    // ====== EMAIL VERIFICATION (mới - dùng Redis OTP) ======

    /**
     * Gửi email chứa OTP xác minh đăng ký
     */
    public void sendVerificationEmail(String email, int otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setFrom(senderEmail);
        message.setSubject("eSign - Xác minh email đăng ký");
        message.setText("Xin chào,\n\n"
                + "Cảm ơn bạn đã đăng ký tài khoản eSign.\n"
                + "Mã OTP xác minh của bạn là: " + otp + "\n\n"
                + "Mã này có hiệu lực trong 5 phút.\n"
                + "Nếu bạn không thực hiện đăng ký, vui lòng bỏ qua email này.\n\n"
                + "Trân trọng,\nĐội ngũ eSign");

        mailSender.send(message);
    }

    // ====== DOCUMENT EMAIL (giữ nguyên) ======

    public void sendDocumentEmail(String toEmail, String documentName, String messageContent, String link) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setFrom(senderEmail);
        message.setSubject("Yêu cầu ký tài liệu: " + documentName);

        String text = "Xin chào,\n\n" + "Bạn có một yêu cầu ký tài liệu từ hệ thống eSign.\n"
                + "Tài liệu: "
                + documentName + "\n\n";

        if (messageContent != null && !messageContent.trim().isEmpty()) {
            text += "Tin nhắn: " + messageContent + "\n\n";
        }

        text += "Vui lòng truy cập đường dẫn sau để xem và ký tài liệu:\n" + link + "\n\n"
                + "Trân trọng,\nĐội ngũ eSign";

        message.setText(text);
        mailSender.send(message);
    }

    public void sendInviteOrg(String toEmail, String token, String orgName) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        String url = "http://localhost:5173/invitations?token=" + token;

        helper.setTo(toEmail);
        helper.setSubject("Thư mời vào tổ chức");

        String htmlContent = "<h3>Chào bạn,</h3>"
                + "<p>Vui lòng click vào link dưới đây để xác nhận tham gia tổ chức:" + orgName
                + ". Lưu ý: Link này sẽ hết hạn sau <b>7 ngày</b>.</p>"
                + "<a href='" + url + "'>Xác nhận tham gia ngay</a>";

        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    public void sendInvitationExpiredWarning(String toEmail, String orgName) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(toEmail);
        helper.setSubject("Nhắc nhở hạn thư mới tham gia tổ chức");

        String htmlContent = "<h3>Chào bạn,</h3>"
                + "<p>Vui lòng kiểm tra lại hòm thư , thư mời vào tổ chức :" + orgName
                + " sẽ hết hạn vào ngày mai . Bạn hãy thực hiện thao tác trước khi thư hết hạn";

        helper.setText(htmlContent, true);

        mailSender.send(message);
        ;
    }
}

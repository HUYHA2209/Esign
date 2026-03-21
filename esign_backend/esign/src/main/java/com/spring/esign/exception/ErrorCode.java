package com.spring.esign.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
    USER_EXISTED(1001, "User already exists", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED(1002, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    USER_NOT_EXISTED(1004, "User does not exist", HttpStatus.NOT_FOUND),
    TOKEN_REFRESH_NOT_EXISTED(1003, "Token does not exist", HttpStatus.UNAUTHORIZED),
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    OTP_EXPIRED(1005, "OTP is expired", HttpStatus.BAD_REQUEST),
    OTP_NOT_FOUND(1006, "OTP is not found", HttpStatus.NOT_FOUND),
    PASSWORD_NOT_MATCH(1007, "Password not match", HttpStatus.BAD_REQUEST),
    USER_NO_PERMISSION(1008, "User has no permission", HttpStatus.FORBIDDEN),
    EMAIL_NOT_VERIFIED(1009, "Email chưa được xác minh. Vui lòng kiểm tra email và nhập mã OTP", HttpStatus.FORBIDDEN),
    INVALID_EMAIL_DOMAIN(1010, "Email domain không hợp lệ hoặc là email tạm thời", HttpStatus.BAD_REQUEST),
    RATE_LIMIT_EXCEEDED(1011, "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau", HttpStatus.TOO_MANY_REQUESTS),
    INVALID_INPUT(1012, "Dữ liệu đầu vào không hợp lệ", HttpStatus.BAD_REQUEST),
    OTP_INVALID(1013, "Mã OTP không chính xác", HttpStatus.BAD_REQUEST);

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private int code = 1000;
    private String message;
    private HttpStatusCode statusCode;
}

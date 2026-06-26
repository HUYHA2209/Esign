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
    OTP_INVALID(1013, "Mã OTP không chính xác", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST(1014, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    DOCUMENT_NOT_FOUND(1015, "Không tìm thấy tài liệu", HttpStatus.NOT_FOUND),
    INVALID_SIGNER(1016, "Người nhận không hợp lệ", HttpStatus.BAD_REQUEST),
    MISSING_SIGNATURE(1017, "Tài liệu hoặc người nhận đang thiếu trường chữ ký", HttpStatus.BAD_REQUEST),
    ACCOUNT_MEMBER_NOT_FOUND(1018, "Khong tim thay thong tin tai khoan", HttpStatus.NOT_FOUND),
    NOT_YOU_TO_SIGN(1019, "Chưa đến lượt bạn", HttpStatus.FORBIDDEN),
    SIGNATURE_NOT_FOUND(1020, "Ban chua co chu ki hay tao va thu lai", HttpStatus.NOT_FOUND),
    CREDENTIAL_NOT_FOUND(1021, "Không tìm thấy chứng thực hợp lệ", HttpStatus.NOT_FOUND),
    AUDITCHAIN_NOT_CREATE(1022, "AuditChain chua dc tao", HttpStatus.NOT_FOUND),
    INVALID_SIGNING_ORDER(1023, "Chưa đến lượt kí", HttpStatus.FORBIDDEN),
    USER_SIGNED(1024, "Người dùng đã từng kí tài liệu", HttpStatus.BAD_REQUEST),
    ACC_URL_EXISTS(1025, "URL nayf đã tồn taị vui lòng nhập url khác", HttpStatus.IM_USED),
    ORGINVITATION_NOT_FOUND(1026, "Không tìm thấy thư mời từ tổ chức", HttpStatus.NOT_FOUND),
    INVITATION_ALREADY_EXISTS(1027, "Người này đang nhận được thư mời", HttpStatus.BAD_REQUEST),
    USER_ALREADY_MEMBER(1028, "Người này đã tồn tại trong tổ chức", HttpStatus.BAD_REQUEST),
    ORG_NOT_FOUND(1029, "Không tìm thấy tổ chức", HttpStatus.NOT_FOUND),
    INVITATION_IS_EXPIRED(1030, "Thư mời hết hạn", HttpStatus.NOT_FOUND),
    CANNOT_REMOVE_LAST_ADMIN(1031, "Không thể xóa hoặc hạ quyền quản trị viên cuối cùng", HttpStatus.FORBIDDEN),
    MEMBER_NOT_FOUND(1032, "Không tìm thấy thành viên", HttpStatus.NOT_FOUND),
    DOCUMENT_CANNOT_CANCEL(1033, "Tài liệu không thể hủy ở trạng thái hiện tại", HttpStatus.CONFLICT),
    DOCUMENT_CANNOT_DELETE(
            1034, "Không thể xóa tài liệu đang trong quá trình ký hoặc đã hoàn tất", HttpStatus.CONFLICT),
    LEAVE_ALL_ORGS_FIRST(1037, "Vui lòng rời hoặc xóa tất cả tổ chức trước khi xóa tài khoản", HttpStatus.BAD_REQUEST),
    ORGANIZATION_DELETED(1036, "Tổ chức này đã bị xóa hoặc không hoạt động", HttpStatus.FORBIDDEN),
    DOCUMENT_VERSION_CONFLICT(
            1038,
            "Tài liệu đã được cập nhật bởi một người ký khác. Vui lòng ký phiên bản mới nhất.",
            HttpStatus.CONFLICT);

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private int code = 1000;
    private String message;
    private HttpStatusCode statusCode;
}

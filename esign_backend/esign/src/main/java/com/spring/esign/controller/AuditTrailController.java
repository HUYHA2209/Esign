package com.spring.esign.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.AuditTrailResponse;
import com.spring.esign.entity.AccountMember;
import com.spring.esign.entity.Document;
import com.spring.esign.entity.DocumentSigner;
import com.spring.esign.entity.User;
import com.spring.esign.enums.MemberRole;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.DocumentRepository;
import com.spring.esign.repository.DocumentSignerRepository;
import com.spring.esign.repository.UserRepository;
import com.spring.esign.service.AuditChainVerificationService;
import com.spring.esign.service.AuditTrailService;
import com.spring.esign.util.PermissionChecker;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@Slf4j
@RequestMapping("/documents")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuditTrailController {

    AuditTrailService auditTrailService;
    AuditChainVerificationService auditChainVerificationService;
    DocumentRepository documentRepository;
    DocumentSignerRepository documentSignerRepository;
    UserRepository userRepository;
    PermissionChecker permissionChecker;

    /**
     * GET /documents/{documentId}/audit-trails
     *
     * Lấy toàn bộ lịch sử sự kiện (Audit Trail) của 1 tài liệu.
     *
     * Quyền xem:
     * - Người upload (owner)
     * - ADMIN của workspace
     * - Người ký (signer) của tài liệu đó
     */
    @GetMapping("/{documentId}/audit-trails")
    public ApiResponse<List<AuditTrailResponse>> getAuditTrails(@PathVariable Integer documentId) {
        authorizeAuditAccess(documentId);
        List<AuditTrailResponse> trails = auditTrailService.getAuditTrails(documentId);
        return ApiResponse.<List<AuditTrailResponse>>builder().result(trails).build();
    }

    /**
     * POST /documents/{documentId}/audit-trails/verify
     *
     * Kiểm tra tính toàn vẹn (blockchain verification) của chuỗi Audit Chain.
     * Trả về kết quả: Hợp lệ (valid=true) hoặc Bị can thiệp (valid=false).
     *
     * Quyền xem: tương tự GET audit-trails.
     */
    @PostMapping("/{documentId}/audit-trails/verify")
    public ResponseEntity<Map<String, Object>> verifyAuditChain(@PathVariable Integer documentId) {
        authorizeAuditAccess(documentId);
        Map<String, Object> result = auditChainVerificationService.verifyChain(documentId);
        return ResponseEntity.ok(result);
    }

    // ─── Permission Helper ──────────────────────────────────────────────

    /**
     * Kiểm tra quyền truy cập audit trail:
     * 1. ADMIN workspace → luôn được xem
     * 2. Người upload document → luôn được xem
     * 3. Signer của document → được xem
     */
    private void authorizeAuditAccess(Integer documentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        Document document = documentRepository
                .findById(documentId)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));

        Long accountId = document.getAccount() != null ? document.getAccount().getAccountId() : null;

        // Check 1: ADMIN
        if (accountId != null) {
            try {
                AccountMember member = permissionChecker.requireMembership(accountId, userId);
                if (member.getRole() == MemberRole.ADMIN) {
                    return; // ADMIN → cho phép
                }
            } catch (AppException ignored) {
                // Không phải member → tiếp tục kiểm tra
            }
        }

        // Check 2: Người upload
        if (document.getUploadedBy() != null && document.getUploadedBy().getId().equals(userId)) {
            return; // Owner → cho phép
        }

        // Check 3: Signer
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        List<DocumentSigner> signers = documentSignerRepository.findByDocument_DocumentId(documentId);
        boolean isSigner = signers.stream().anyMatch(ds -> ds.getSignerEmail().equalsIgnoreCase(user.getEmail()));
        if (isSigner) {
            return; // Signer → cho phép
        }

        throw new AppException(ErrorCode.USER_NO_PERMISSION);
    }
}

package com.spring.esign.util;

import org.springframework.stereotype.Service;

import com.spring.esign.entity.AccountMember;
import com.spring.esign.enums.MemberRole;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.AccountMemberRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PermissionChecker {
    AccountMemberRepository accountMemberRepository;

    public AccountMember requireMembership(Long accountId, String userId) {
        return accountMemberRepository
                .findByAccount_AccountIdAndUser_Id(accountId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NO_PERMISSION));
    }

    public void requirePermission(Long accountId, String userId, String perm) {
        AccountMember m = requireMembership(accountId, userId);
        if (m.getRole() == MemberRole.ADMIN) return;

        boolean allowed =
                switch (perm) {
                    case "SIGN" -> Boolean.TRUE.equals(m.getCanSign());
                    case "UPLOAD" -> Boolean.TRUE.equals(m.getCanUpload());
                    case "VIEW" -> Boolean.TRUE.equals(m.getCanViewDocs());
                    case "INVITE" -> Boolean.TRUE.equals(m.getCanInvite());
                    default -> false;
                };

        if (!allowed) throw new AppException(ErrorCode.USER_NO_PERMISSION);
    }

    public void requireAdmin(Long accountId, String userId) {
        AccountMember m = requireMembership(accountId, userId);
        if (m.getRole() != MemberRole.ADMIN) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }
    }
}

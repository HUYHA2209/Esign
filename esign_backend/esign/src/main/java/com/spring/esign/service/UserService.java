package com.spring.esign.service;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.spring.esign.dto.request.UpdateProfileRequest;
import com.spring.esign.dto.response.InfoResponse;
import com.spring.esign.dto.response.UserSearchResponse;
import com.spring.esign.entity.AccountMember;
import com.spring.esign.entity.User;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.AccountMemberRepository;
import com.spring.esign.repository.TokenRefreshRepository;
import com.spring.esign.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;

    AccountMemberRepository accountMemberRepository;

    TokenRefreshRepository tokenRefreshRepository;
    com.spring.esign.repository.UsersKeysRepository usersKeysRepository;
    com.spring.esign.repository.SigningSessionRepository signingSessionRepository;
    com.spring.esign.repository.DocumentGroupRepository documentGroupRepository;
    com.spring.esign.repository.DocumentRepository documentRepository;

    public List<UserSearchResponse> searchUserByEmail(String email) {
        List<UserSearchResponse> responses = userRepository.findEmailByKey(email);
        for (UserSearchResponse response : responses) {
            List<AccountMember> memberships = accountMemberRepository.findSignableAccountsByUserId(response.getId());
            List<UserSearchResponse.WorkspaceInfo> workspaces = memberships.stream()
                    .map(m -> new UserSearchResponse.WorkspaceInfo(
                            m.getAccount().getAccountId(),
                            m.getAccount().getAccountName(),
                            m.getAccount().getAccountType().name()))
                    .collect(java.util.stream.Collectors.toList());
            response.setWorkspaces(workspaces);

            List<String> orgs = memberships.stream()
                    .filter(m -> m.getAccount().getAccountType() == com.spring.esign.enums.AccountType.ORGANIZATION)
                    .map(m -> m.getAccount().getAccountName())
                    .collect(java.util.stream.Collectors.toList());
            response.setAccountNames(orgs);
        }
        return responses;
    }

    public InfoResponse getMyInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userID = authentication.getName();
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return InfoResponse.builder()
                .email(user.getEmail())
                .name(user.getFullName())
                .phone(user.getPhone())
                .build();
    }

    public InfoResponse updateMyInfo(UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userID = authentication.getName();
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        userRepository.updateProfile(userID, request.getName(), request.getPhone());
        return InfoResponse.builder()
                .email(user.getEmail())
                .name(request.getName())
                .phone(request.getPhone())
                .build();
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteMyAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userID = authentication.getName();
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // 1. Kiểm tra Tổ chức
        List<AccountMember> memberships = accountMemberRepository.findByUser(user);
        boolean isInOrg = memberships.stream()
                .anyMatch(m -> m.getAccount().getAccountType() == com.spring.esign.enums.AccountType.ORGANIZATION);
        if (isInOrg) {
            throw new AppException(ErrorCode.LEAVE_ALL_ORGS_FIRST);
        }

        // 2. Tìm Personal Account
        AccountMember personalMembership = memberships.stream()
                .filter(m -> m.getAccount().getAccountType() == com.spring.esign.enums.AccountType.PERSONAL)
                .findFirst()
                .orElse(null);

        if (personalMembership != null) {
            Long personalAccountId = personalMembership.getAccount().getAccountId();

            // Lấy các DocumentGroup PENDING
            List<com.spring.esign.entity.DocumentGroup> pendingGroups =
                    documentGroupRepository.findByAccount_AccountIdAndGr_statusIn(
                            personalAccountId, List.of("PENDING"));
            for (com.spring.esign.entity.DocumentGroup group : pendingGroups) {
                group.setGr_status("VOID");
                documentGroupRepository.save(group);
            }

            // Lấy các DocumentGroup DRAFT và xóa cứng
            List<com.spring.esign.entity.DocumentGroup> draftGroups =
                    documentGroupRepository.findByAccount_AccountIdAndGr_statusIn(personalAccountId, List.of("DRAFT"));
            documentGroupRepository.deleteAll(draftGroups);
        }

        // 3. Xóa các Token, Session, Passkeys
        tokenRefreshRepository.deleteByUser_Id(userID);
        usersKeysRepository.deleteAll(usersKeysRepository.findByUser(user));
        signingSessionRepository.deleteAll(signingSessionRepository.findByUser(user));

        // 4. Cập nhật User (Soft Delete)
        user.setEmail("deleted_" + java.util.UUID.randomUUID().toString() + "@esign.local");
        user.setPassword(java.util.UUID.randomUUID().toString());
        user.setFullName("Người dùng đã xóa");
        user.setPhone("");
        userRepository.save(user);
    }
}

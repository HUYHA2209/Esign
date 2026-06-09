package com.spring.esign.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.mail.MessagingException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nimbusds.jose.*;
import com.spring.esign.dto.request.*;
import com.spring.esign.dto.response.MemberResponse;
import com.spring.esign.dto.response.UserSearchResponse;
import com.spring.esign.dto.response.VerifyTokenInvitationOrgResponse;
import com.spring.esign.entity.*;
import com.spring.esign.enums.AccountType;
import com.spring.esign.enums.DocumentStatus;
import com.spring.esign.enums.InvitationStatus;
import com.spring.esign.enums.MemberRole;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.mapper.OrganizationMapper;
import com.spring.esign.repository.*;
import com.spring.esign.util.PermissionChecker;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrganizationService {

    UserRepository userRepository;
    OrganizationMapper organizationMapper;
    AccountRepository accountRepository;
    AccountMemberRepository accountMemberRepository;
    OrgInvitationRepository orgInvitationRepository;
    OrganizationKeysRepository organizationKeysRepository;
    PermissionChecker permissionChecker;
    SecureRandom secureRandom = new SecureRandom();
    EmailService emailService;
    DocumentRepository documentRepository;
    ActivityLogRepository activityLogRepository;

    @Transactional
    public void createOrganization(OrganizationCreationRequest request) {
        // 1. Lấy user đang đăng nhập
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // 2. Map request → Account entity
        if (accountRepository.existsByAccountUrl(request.getAccountUrl())) {
            throw new AppException(ErrorCode.ACC_URL_EXISTS);
        }
        Account account = organizationMapper.toAccount(request);
        account.setOwner(user);
        account.setAccountType(AccountType.ORGANIZATION);

        // 3. Lưu account
        Account savedAccount = accountRepository.save(account);

        // 4. Tự động thêm owner vào bảng AccountMember với role ADMIN
        //    và đủ quyền (owner có tất cả quyền)
        AccountMember ownerMember = AccountMember.builder()
                .account(savedAccount)
                .user(user)
                .role(MemberRole.ADMIN)
                .canUpload(true)
                .canSign(true)
                .canViewDocs(true)
                .canInvite(true)
                .build();

        accountMemberRepository.save(ownerMember);

        log.info("Created organization [{}] for user [{}]", savedAccount.getAccountName(), userId);
    }

    public void inviteMember(Long accountId, InvitationRequest request) throws MessagingException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        Account account =
                accountRepository.findById(accountId).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        if (account.getAccountType() == AccountType.PERSONAL) throw new AppException(ErrorCode.ORG_NOT_FOUND);
        if (account.isDeleted()) throw new AppException(ErrorCode.ORGANIZATION_DELETED);

        Long checked = accountMemberRepository.checkCanInvite(accountId, userId);
        if (checked == 0) throw new AppException(ErrorCode.USER_NO_PERMISSION);

        User userRecipient = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        OrgInvitation orgInvitation = orgInvitationRepository
                .findByAccount_AccountIdAndInviteeEmailAndStatus(
                        accountId, request.getEmail(), InvitationStatus.PENDING)
                .orElse(null);
        if (orgInvitation != null) throw new AppException(ErrorCode.INVITATION_ALREADY_EXISTS);

        // check xem user đã tồn tại trong tổ chức chưa
        boolean isMember = accountMemberRepository.existsByUserAndAccount_AccountId(userRecipient, accountId);
        if (isMember) {
            throw new AppException(ErrorCode.USER_ALREADY_MEMBER);
        }

        OrgInvitation orgInvitation1 = OrgInvitation.builder()
                .account(Account.builder().accountId(accountId).build())
                .invitedBy(User.builder().id(userId).build())
                .inviteeEmail(request.getEmail())
                .token(generateToken())
                .canInvite(request.getCanInvite())
                .canSign(request.getCanSign())
                .canUpload(request.getCanUpload())
                .canViewDocs(request.getCanViewDocs())
                .build();

        emailService.sendInviteOrg(request.getEmail(), orgInvitation1.getToken(), account.getAccountName());

        orgInvitationRepository.save(orgInvitation1);
    }

    private String generateToken() {
        byte[] bytes = new byte[32]; // 32 bytes = 64 hex chars
        secureRandom.nextBytes(bytes);

        StringBuilder sb = new StringBuilder(64);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public VerifyTokenInvitationOrgResponse verifyToken(String token) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User loggedInUser =
                userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        OrgInvitation orgInvitation = orgInvitationRepository
                .findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.ORGINVITATION_NOT_FOUND));

        if (!loggedInUser.getEmail().equals(orgInvitation.getInviteeEmail())) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        Account account = accountRepository
                .findById(orgInvitation.getAccount().getAccountId())
                .orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        if (account.isDeleted()) throw new AppException(ErrorCode.ORGANIZATION_DELETED);

        if (orgInvitation.getStatus() == InvitationStatus.PENDING) {
            if (LocalDateTime.now().isAfter(orgInvitation.getExpiresAt())) {
                orgInvitation.setStatus(InvitationStatus.EXPIRED);
                orgInvitationRepository.save(orgInvitation);
                throw new AppException(ErrorCode.INVITATION_IS_EXPIRED);
            }
        } else {
            throw new RuntimeException("Not pending");
        }

        return VerifyTokenInvitationOrgResponse.builder()
                .accountName(account.getAccountName())
                .ownerName(orgInvitation.getInvitedBy().getFullName())
                .canInvite(orgInvitation.getCanInvite())
                .canSign(orgInvitation.getCanSign())
                .canUpload(orgInvitation.getCanUpload())
                .canViewDocs(orgInvitation.getCanViewDocs())
                .build();
    }

    @Transactional
    public void acceptInvite(String token) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User loggedInUser =
                userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        OrgInvitation orgInvitation = orgInvitationRepository
                .findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.ORGINVITATION_NOT_FOUND));

        if (!loggedInUser.getEmail().equals(orgInvitation.getInviteeEmail())) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        if (orgInvitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Not pending");
        }

        if (java.time.LocalDateTime.now().isAfter(orgInvitation.getExpiresAt())) {
            orgInvitation.setStatus(InvitationStatus.EXPIRED);
            orgInvitationRepository.save(orgInvitation);
            throw new AppException(ErrorCode.INVITATION_IS_EXPIRED);
        }

        // 5. BỔ SUNG: Kiểm tra xem user đã là thành viên của tổ chức này chưa (Tránh duplicate)
        boolean isAlreadyMember = accountMemberRepository.existsByUserAndAccount_AccountId(
                loggedInUser, orgInvitation.getAccount().getAccountId());
        if (isAlreadyMember) {
            throw new AppException(ErrorCode.USER_ALREADY_MEMBER); // Định nghĩa thêm ErrorCode này nếu chưa có
        }

        orgInvitation.setStatus(InvitationStatus.ACCEPTED);
        orgInvitationRepository.save(orgInvitation);

        AccountMember accountMember = AccountMember.builder()
                .user(loggedInUser)
                .account(orgInvitation.getAccount())
                .role(MemberRole.MEMBER)
                .canInvite(orgInvitation.getCanInvite())
                .canViewDocs(orgInvitation.getCanViewDocs())
                .canSign(orgInvitation.getCanSign())
                .canUpload(orgInvitation.getCanUpload())
                .build();

        accountMemberRepository.save(accountMember);
    }

    @Transactional
    public void rejectInvite(String token) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User loggedInUser =
                userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        OrgInvitation orgInvitation = orgInvitationRepository
                .findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.ORGINVITATION_NOT_FOUND));

        if (!loggedInUser.getEmail().equals(orgInvitation.getInviteeEmail())) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        if (orgInvitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("Not pending");
        }

        if (java.time.LocalDateTime.now().isAfter(orgInvitation.getExpiresAt())) {
            orgInvitation.setStatus(InvitationStatus.EXPIRED);
            orgInvitationRepository.save(orgInvitation);
            throw new AppException(ErrorCode.INVITATION_IS_EXPIRED);
        }

        // 5. BỔ SUNG: Kiểm tra xem user đã là thành viên của tổ chức này chưa (Tránh duplicate)
        boolean isAlreadyMember = accountMemberRepository.existsByUserAndAccount_AccountId(
                loggedInUser, orgInvitation.getAccount().getAccountId());
        if (isAlreadyMember) {
            throw new AppException(ErrorCode.USER_ALREADY_MEMBER); // Định nghĩa thêm ErrorCode này nếu chưa có
        }

        orgInvitation.setStatus(InvitationStatus.REJECT);
        orgInvitationRepository.save(orgInvitation);
    }

    public List<MemberResponse> listMembers(Long accountId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        // Check if the caller is a member
        permissionChecker.requireMembership(accountId, userId);

        List<AccountMember> members = accountMemberRepository.findByAccount_AccountId(accountId);
        List<OrganizationKeys> orgKeys = organizationKeysRepository.findByAccount_AccountId(accountId);
        Map<String, OrganizationKeys> userToKeyMap =
                orgKeys.stream().collect(Collectors.toMap(k -> k.getUser().getId(), k -> k, (k1, k2) -> k1));

        return members.stream()
                .map(m -> {
                    OrganizationKeys key = userToKeyMap.get(m.getUser().getId());
                    return MemberResponse.builder()
                            .memberId(m.getMemberId())
                            .userId(m.getUser().getId())
                            .email(m.getUser().getEmail())
                            .fullName(m.getUser().getFullName())
                            .role(m.getRole().name())
                            .canViewDocs(m.getCanViewDocs())
                            .canSign(m.getCanSign())
                            .canUpload(m.getCanUpload())
                            .canInvite(m.getCanInvite())
                            .passkeyRegistered(key != null && Boolean.TRUE.equals(key.getIsActive()))
                            .passkeyCreatedAt(key != null ? key.getCreatedAt() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateMember(Long accountId, Long memberId, UpdateMemberRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        // Only ADMIN can update permissions
        permissionChecker.requireAdmin(accountId, userId);

        AccountMember targetMember = accountMemberRepository
                .findById(memberId)
                .orElseThrow(() -> new AppException(ErrorCode.MEMBER_NOT_FOUND));

        if (!targetMember.getAccount().getAccountId().equals(accountId)) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        }

        // Check if trying to demote the last ADMIN
        if (targetMember.getRole() == MemberRole.ADMIN
                && request.getRole() != null
                && request.getRole().equals(MemberRole.MEMBER.name())) {
            long adminCount = accountMemberRepository.countByAccount_AccountIdAndRole(accountId, MemberRole.ADMIN);
            if (adminCount <= 1) {
                throw new AppException(ErrorCode.CANNOT_REMOVE_LAST_ADMIN);
            }
        }

        if (request.getRole() != null) {
            targetMember.setRole(MemberRole.valueOf(request.getRole()));
        }
        if (request.getCanViewDocs() != null) {
            targetMember.setCanViewDocs(request.getCanViewDocs());
        }
        if (request.getCanSign() != null) {
            targetMember.setCanSign(request.getCanSign());
        }
        if (request.getCanUpload() != null) {
            targetMember.setCanUpload(request.getCanUpload());
        }
        if (request.getCanInvite() != null) {
            targetMember.setCanInvite(request.getCanInvite());
        }

        accountMemberRepository.save(targetMember);
    }

    @Transactional
    public void removeMember(Long accountId, Long memberId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        // Only ADMIN can remove members
        permissionChecker.requireAdmin(accountId, userId);

        AccountMember targetMember = accountMemberRepository
                .findById(memberId)
                .orElseThrow(() -> new AppException(ErrorCode.MEMBER_NOT_FOUND));

        if (!targetMember.getAccount().getAccountId().equals(accountId)) {
            throw new AppException(ErrorCode.MEMBER_NOT_FOUND);
        }

        // Check if trying to remove the last ADMIN
        if (targetMember.getRole() == MemberRole.ADMIN) {
            long adminCount = accountMemberRepository.countByAccount_AccountIdAndRole(accountId, MemberRole.ADMIN);
            if (adminCount <= 1) {
                throw new AppException(ErrorCode.CANNOT_REMOVE_LAST_ADMIN);
            }
        }

        accountMemberRepository.delete(targetMember);
    }

    public List<UserSearchResponse> getMemberCanSign(Long orgId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        // Check if the caller is a member
        permissionChecker.requireMembership(orgId, userId);

        List<AccountMember> members = accountMemberRepository.findByAccount_AccountId(orgId);

        return members.stream()
                .filter(m -> m.getCanSign() != null && m.getCanSign() || m.getRole() == MemberRole.ADMIN)
                .map(m -> UserSearchResponse.builder()
                        .id(m.getUser().getId())
                        .email(m.getUser().getEmail())
                        .fullName(m.getUser().getFullName())
                        .build())
                .collect(Collectors.toList());
    }

    // ─── XÓA TỔ CHỨC (SOFT DELETE) ────────────────────────────────────────
    @Transactional
    public void deleteOrganization(Long orgId) {
        // 1. Lấy user đang đăng nhập
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // 2. Tìm Organization, kiểm tra tồn tại và chưa bị xóa
        Account account = accountRepository
                .findByAccountIdAndIsDeletedFalse(orgId)
                .orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        // 3. Chỉ cho phép xóa ORGANIZATION, không phải PERSONAL
        if (account.getAccountType() == AccountType.PERSONAL) {
            throw new AppException(ErrorCode.ORG_NOT_FOUND);
        }

        // 4. Kiểm tra quyền: Chỉ Owner mới được xóa tổ chức
        if (!account.getOwner().getId().equals(userId)) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        // 5. Soft delete: Đánh dấu tổ chức đã bị xóa
        account.setDeleted(true);
        accountRepository.save(account);

        // 6. Xóa tất cả liên kết thành viên khỏi tổ chức
        accountMemberRepository.deleteByAccount_AccountId(orgId);

        // 7. Hủy các tài liệu PENDING và DRAFT → chuyển sang VOID
        List<DocumentStatus> statusesToVoid = List.of(DocumentStatus.PENDING, DocumentStatus.DRAFT);
        List<Document> documentsToVoid = documentRepository.findByAccount_AccountIdAndStatusIn(orgId, statusesToVoid);

        for (Document doc : documentsToVoid) {
            doc.setStatus(DocumentStatus.VOID);
            doc.setCancelledAt(LocalDateTime.now());
            doc.setCancelledBy(user);
        }
        if (!documentsToVoid.isEmpty()) {
            documentRepository.saveAll(documentsToVoid);
        }

        // 8. Ghi Activity Log hệ thống
        ActivityLog activityLog = ActivityLog.builder()
                .user(user)
                .action("DELETE_ORGANIZATION")
                .description("Admin " + user.getFullName() + " đã xóa tổ chức " + account.getAccountName()
                        + " vào thời gian " + LocalDateTime.now())
                .build();
        activityLogRepository.save(activityLog);

        log.info(
                "Organization [{}] (id={}) has been soft-deleted by user [{}]",
                account.getAccountName(),
                orgId,
                userId);
    }

    private Long extractAccountId(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            return (Long) jwtToken.getTokenAttributes().get("accountId");
        } else if (authentication.getCredentials() instanceof Jwt jwt) {
            return (Long) jwt.getClaims().get("accountId");
        }
        return null;
    }
}

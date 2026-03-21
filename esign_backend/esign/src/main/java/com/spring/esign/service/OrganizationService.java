package com.spring.esign.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nimbusds.jose.*;
import com.spring.esign.dto.request.*;
import com.spring.esign.entity.*;
import com.spring.esign.enums.AccountType;
import com.spring.esign.enums.MemberRole;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.mapper.OrganizationMapper;
import com.spring.esign.repository.*;

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

    @Transactional
    public void createOrganization(OrganizationCreationRequest request) {
        // 1. Lấy user đang đăng nhập
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // 2. Map request → Account entity
        Account account = organizationMapper.toAccount(request);
        account.setOwner(user);
        account.setAccountType(AccountType.ORGANIZATION); // luôn là ORGANIZATION

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
}

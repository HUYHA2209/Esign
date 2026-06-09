package com.spring.esign.service;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.spring.esign.dto.request.SignatureCreationRequest;
import com.spring.esign.dto.response.SignatureResponse;
import com.spring.esign.entity.Account;
import com.spring.esign.entity.OrganizationSignature;
import com.spring.esign.entity.User;
import com.spring.esign.enums.SignatureType;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.AccountRepository;
import com.spring.esign.repository.OrganizationSignatureRepository;
import com.spring.esign.repository.UserRepository;
import com.spring.esign.util.PermissionChecker;
import com.spring.esign.util.StoragePathResolver;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class OrgSignatureService {

    OrganizationSignatureRepository orgSignatureRepository;
    AccountRepository accountRepository;
    UserRepository userRepository;
    MinioService minioService;
    StoragePathResolver storagePathResolver;
    PermissionChecker permissionChecker;

    @Transactional
    public void saveOrgSignature(String orgUrl, SignatureCreationRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        Account account =
                accountRepository.findByAccountUrl(orgUrl).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        // Only ADMIN can save or update the organization signature
        permissionChecker.requireAdmin(account.getAccountId(), userId);

        User creator = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String base64Image = request.getImageBase64();
        Optional<OrganizationSignature> existingSig =
                orgSignatureRepository.findByAccount_AccountId(account.getAccountId());
        OrganizationSignature signature = existingSig.orElse(null);

        String imageUrl = signature != null ? signature.getImageUrl() : null;

        if (base64Image != null && base64Image.startsWith("data:image/")) {
            try {
                int commaIndex = base64Image.indexOf(",");
                String metaData = base64Image.substring(0, commaIndex);
                String base64Data = base64Image.substring(commaIndex + 1);

                String ext = ".png";
                String contentType = "image/png";
                if (metaData.contains("svg+xml")) {
                    ext = ".svg";
                    contentType = "image/svg+xml";
                }

                byte[] decodedBytes;
                if (metaData.contains("base64")) {
                    decodedBytes = Base64.getDecoder().decode(base64Data);
                } else {
                    decodedBytes =
                            java.net.URLDecoder.decode(base64Data, "UTF-8").getBytes();
                }

                ByteArrayInputStream is = new ByteArrayInputStream(decodedBytes);
                String objectName = storagePathResolver.orgSignatureImage(account.getAccountId(), ext);

                if (signature != null && signature.getImageUrl() != null) {
                    try {
                        minioService.removeFile(StoragePathResolver.BUCKET_SIGNATURES, signature.getImageUrl());
                    } catch (Exception e) {
                        log.warn("Could not remove old organization signature file", e);
                    }
                }

                minioService.uploadFile(
                        is, StoragePathResolver.BUCKET_SIGNATURES, objectName, contentType, decodedBytes.length);
                imageUrl = objectName;
            } catch (Exception e) {
                log.error("Failed to upload organization signature image to MinIO", e);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
        }

        if (signature != null) {
            signature.setImageUrl(imageUrl);
            signature.setSignatureType(SignatureType.valueOf(request.getSignatureType()));
            signature.setTextStyle(request.getTextStyle());
            signature.setImageHash(request.getImageHash());
            signature.setUpdatedAt(LocalDateTime.now());
            signature.setCreatedBy(creator);
        } else {
            signature = OrganizationSignature.builder()
                    .account(account)
                    .signatureType(SignatureType.valueOf(request.getSignatureType()))
                    .imageUrl(imageUrl)
                    .imageHash(request.getImageHash())
                    .textStyle(request.getTextStyle())
                    .createdAt(LocalDateTime.now())
                    .createdBy(creator)
                    .build();
        }

        orgSignatureRepository.save(signature);
        log.info("Saved organization signature for orgUrl {}", orgUrl);
    }

    public SignatureResponse getOrgSignature(String orgUrl) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        Account account =
                accountRepository.findByAccountUrl(orgUrl).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        // Any member in the organization can view the signature (e.g. read-only display or for signing)
        permissionChecker.requireMembership(account.getAccountId(), userId);

        OrganizationSignature signature = orgSignatureRepository
                .findByAccount_AccountId(account.getAccountId())
                .orElse(null);

        if (signature == null || signature.getImageUrl() == null) {
            return null;
        }

        String presignedUrl = minioService.getPresignedUrl("signatures", signature.getImageUrl());

        return SignatureResponse.builder()
                .signatureId(signature.getOrgSignatureId())
                .imageUrl(presignedUrl)
                .signatureType(signature.getSignatureType().toString().toUpperCase())
                .textStyle(signature.getTextStyle())
                .build();
    }
}

package com.spring.esign.service;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.spring.esign.dto.request.SignatureCreationRequest;
import com.spring.esign.dto.response.SignatureResponse;
import com.spring.esign.entity.Signatures;
import com.spring.esign.entity.User;
import com.spring.esign.enums.SignatureType;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.SignatureRepository;
import com.spring.esign.repository.UserRepository;
import com.spring.esign.util.StoragePathResolver;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class SignatureService {

    SignatureRepository signatureRepository;
    UserRepository userRepository;
    MinioService minioService;
    StoragePathResolver storagePathResolver;

    public void saveSignature(SignatureCreationRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String base64Image = request.getImageBase64();
        Optional<Signatures> existingSig = signatureRepository.findByUser(user);
        Signatures signature = existingSig.orElse(null);

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
                String objectName = storagePathResolver.signatureImage(userId, ext);

                if (signature != null && signature.getImageUrl() != null) {
                    try {
                        minioService.removeFile(StoragePathResolver.BUCKET_SIGNATURES, signature.getImageUrl());
                    } catch (Exception e) {
                        log.warn("Could not remove old signature file", e);
                    }
                }

                minioService.uploadFile(
                        is, StoragePathResolver.BUCKET_SIGNATURES, objectName, contentType, decodedBytes.length);
                imageUrl = objectName;
            } catch (Exception e) {
                log.error("Failed to upload signature image to MinIO", e);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
            }
        }

        if (signature != null) {
            signature.setImageUrl(imageUrl);
            signature.setSignatureType(SignatureType.valueOf(request.getSignatureType()));
            signature.setTextStyle(request.getTextStyle());
            signature.setImageHash(request.getImageHash());
        } else {
            signature = Signatures.builder()
                    .user(user)
                    .signatureType(SignatureType.valueOf(request.getSignatureType()))
                    .imageUrl(imageUrl)
                    .imageHash(request.getImageHash())
                    .textStyle(request.getTextStyle())
                    .build();
        }

        signatureRepository.save(signature);
        log.info("Saved signature for user {}", userId);
    }

    public SignatureResponse getSignature() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Signatures signature = signatureRepository.findByUser(user).orElse(null);

        if (signature == null || signature.getImageUrl() == null) {
            return null;
        }

        String presignedUrl = minioService.getPresignedUrl("signatures", signature.getImageUrl());

        return SignatureResponse.builder()
                .signatureId(signature.getSignatureId())
                .imageUrl(presignedUrl)
                .signatureType(signature.getSignatureType().toString().toUpperCase())
                .textStyle(signature.getTextStyle())
                .build();
    }
}

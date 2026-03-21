package com.spring.esign.service;

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

    public void saveSignature(SignatureCreationRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        String base64Image = request.getImageBase64();

        Optional<Signatures> existingSig = signatureRepository.findByUser(user);

        Signatures signature;
        if (existingSig.isPresent()) {
            signature = existingSig.get();
            signature.setImageBase64(base64Image);
            signature.setSignatureType(SignatureType.valueOf(request.getSignatureType()));
            signature.setTextStyle(request.getTextStyle());
            signature.setImageHash(request.getImageHash());
        } else {
            signature = Signatures.builder()
                    .user(user)
                    .signatureType(SignatureType.valueOf(request.getSignatureType()))
                    .imageBase64(base64Image)
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

        if (signature == null) {
            return null;
        }

        return SignatureResponse.builder()
                .signatureId(signature.getSignatureId())
                .imageBase64(signature.getImageBase64())
                .signatureType(signature.getSignatureType().toString().toUpperCase())
                .textStyle(signature.getTextStyle())
                .build();
    }
}

package com.spring.esign.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CompleteSigningRequest {
    /**
     * ID phiên ký, lấy từ response của /prepare
     */
    String sessionId;

    /**
     * ID nhóm tài liệu đang ký
     */
    Integer groupId;

    /**
     * WebAuthn Assertion dạng JSON string — output của credentialToJSON() ở FE.
     * Chứa: id, rawId, type, response { authenticatorData, clientDataJSON, signature, userHandle }
     */
    String credentialJson;

    /**
     * Client device fingerprint generated from Javascript
     */
    String deviceFingerprint;
}

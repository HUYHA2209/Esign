package com.spring.esign.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MemberResponse {
    Long memberId;
    String userId;
    String email;
    String fullName;
    String role;
    Boolean canViewDocs;
    Boolean canSign;
    Boolean canUpload;
    Boolean canInvite;
    Boolean passkeyRegistered;
    java.time.LocalDateTime passkeyCreatedAt;
}

package com.spring.esign.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateMemberRequest {
    String role; // "ADMIN" | "MEMBER" — nullable means keep current
    Boolean canViewDocs;
    Boolean canSign;
    Boolean canUpload;
    Boolean canInvite;
}

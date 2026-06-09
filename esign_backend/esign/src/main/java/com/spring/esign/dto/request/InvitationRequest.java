package com.spring.esign.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InvitationRequest {
    String email;
    Boolean canUpload;
    Boolean canSign;
    Boolean canViewDocs;
    Boolean canInvite;
}

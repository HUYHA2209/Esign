package com.spring.esign.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VerifyTokenInvitationOrgResponse {
    String accountName;
    String ownerName;
    Boolean canSign;
    Boolean canViewDocs;
    Boolean canUpload;
    Boolean canInvite;
}

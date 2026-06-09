package com.spring.esign.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AccountResponse {
    Long accountId;
    String accountName;
    String accountType;
    String accountUrl;
    String role; // Role của user trong công ty đó (ADMIN, MEMBER...)
    Boolean canViewDocs;
    Boolean canSign;
    Boolean canUpload;
    Boolean canInvite;
}

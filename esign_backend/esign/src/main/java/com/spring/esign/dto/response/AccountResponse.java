package com.spring.esign.dto.response;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AccountResponse {
    String accountName;
    String accountType;
    String role; // Role của user trong công ty đó (ADMIN, MEMBER...)
}

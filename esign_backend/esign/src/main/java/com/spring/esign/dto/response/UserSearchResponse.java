package com.spring.esign.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserSearchResponse {
    String id;
    String email;
    String fullName;
    java.util.List<String> accountNames;
    java.util.List<WorkspaceInfo> workspaces;

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class WorkspaceInfo {
        Long accountId;
        String accountName;
        String accountType;
    }

    public UserSearchResponse(String id, String email, String fullName) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
    }
}

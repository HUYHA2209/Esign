package com.spring.esign.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrganizationCreationRequest {
    String accountUrl;
    String accountName;
    String accountType;
}

package com.spring.esign.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpsertSignerRequest {
    Integer id; // null = new, non-null = update existing
    String email;
    String name;
    String role;
    Integer signingOrder;
}

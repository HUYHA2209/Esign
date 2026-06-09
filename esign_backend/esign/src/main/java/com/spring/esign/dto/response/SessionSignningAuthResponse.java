package com.spring.esign.dto.response;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionSignningAuthResponse {
    String sessionId;
    Map<String, Object> webAuthnOptions;
}

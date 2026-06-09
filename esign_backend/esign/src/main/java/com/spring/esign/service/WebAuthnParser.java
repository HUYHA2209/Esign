package com.spring.esign.service;

import java.util.Base64;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webauthn4j.data.AuthenticationRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebAuthnParser {
    private final ObjectMapper objectMapper;

    public AuthenticationRequest parseAuthenticationRequest(String json) throws Exception {
        log.debug("[WebAuthnParser] Received JSON length: {}", json != null ? json.length() : "null");

        JsonNode root = objectMapper.readTree(json);

        JsonNode idNode = root.get("id");
        JsonNode response = root.get("response");

        if (idNode == null || response == null) {
            log.error("[WebAuthnParser] Missing fields - id: {}, response: {}", idNode, response);
            throw new IllegalArgumentException("Invalid WebAuthn payload: missing 'id' or 'response'");
        }

        if (!"public-key".equals(root.path("type").asText())) {
            throw new IllegalArgumentException("Invalid credential type");
        }

        byte[] credentialId = Base64.getUrlDecoder().decode(idNode.asText());

        byte[] authenticatorData =
                Base64.getUrlDecoder().decode(response.path("authenticatorData").asText());

        byte[] clientDataJSON =
                Base64.getUrlDecoder().decode(response.path("clientDataJSON").asText());

        byte[] signature =
                Base64.getUrlDecoder().decode(response.path("signature").asText());

        byte[] userHandle = null;
        if (!response.path("userHandle").isMissingNode()
                && !response.path("userHandle").isNull()) {
            userHandle =
                    Base64.getUrlDecoder().decode(response.path("userHandle").asText());
        }

        log.debug(
                "[WebAuthnParser] Parsed successfully - credentialId length: {}, authenticatorData length: {}",
                credentialId.length,
                authenticatorData.length);

        return new AuthenticationRequest(credentialId, userHandle, authenticatorData, clientDataJSON, signature);
    }
}

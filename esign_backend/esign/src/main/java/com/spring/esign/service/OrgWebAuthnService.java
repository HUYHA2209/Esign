package com.spring.esign.service;

import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.esign.dto.request.WebAuthnRegistrationFinishRequest;
import com.spring.esign.dto.response.WebAuthnRegistrationStartResponse;
import com.spring.esign.entity.Account;
import com.spring.esign.entity.OrganizationKeys;
import com.spring.esign.entity.User;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.AccountRepository;
import com.spring.esign.repository.OrganizationKeysRepository;
import com.spring.esign.repository.UserRepository;
import com.spring.esign.util.PermissionChecker;
import com.webauthn4j.WebAuthnManager;
import com.webauthn4j.authenticator.AuthenticatorImpl;
import com.webauthn4j.converter.util.ObjectConverter;
import com.webauthn4j.data.*;
import com.webauthn4j.data.attestation.authenticator.AAGUID;
import com.webauthn4j.data.attestation.authenticator.AttestedCredentialData;
import com.webauthn4j.data.attestation.authenticator.COSEKey;
import com.webauthn4j.data.attestation.statement.COSEAlgorithmIdentifier;
import com.webauthn4j.data.client.Origin;
import com.webauthn4j.data.client.challenge.Challenge;
import com.webauthn4j.data.client.challenge.DefaultChallenge;
import com.webauthn4j.server.ServerProperty;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrgWebAuthnService {

    UserRepository userRepository;
    AccountRepository accountRepository;
    OrganizationKeysRepository organizationKeysRepository;
    WebAuthnManager webAuthnManager;
    ObjectMapper objectMapper;
    PermissionChecker permissionChecker;

    ConcurrentHashMap<String, Challenge> challengeStore = new ConcurrentHashMap<>();

    // Configuration (same as personal WebAuthn)
    String rpId = "localhost";
    String rpName = "Esign Service";
    String originUrl = "http://localhost:5173";

    public WebAuthnRegistrationStartResponse startRegistration(String orgUrl) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Account account =
                accountRepository.findByAccountUrl(orgUrl).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        // Require sign permission in this organization (Admin or member with canSign =
        // true)
        permissionChecker.requirePermission(account.getAccountId(), userId, "SIGN");

        // Challenge unique per user per organization
        String challengeKey = userId + "_" + account.getAccountId();
        Challenge challenge = new DefaultChallenge();
        challengeStore.put(challengeKey, challenge);

        PublicKeyCredentialRpEntity rp = new PublicKeyCredentialRpEntity(rpId, rpName);
        PublicKeyCredentialUserEntity userEntity =
                new PublicKeyCredentialUserEntity(userId.getBytes(), user.getFullName(), user.getFullName());

        List<PublicKeyCredentialParameters> pubKeyCredParams = List.of(
                new PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.ES256),
                new PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.RS256));

        AuthenticatorSelectionCriteria authenticatorSelection = new AuthenticatorSelectionCriteria(null, true, null);

        PublicKeyCredentialCreationOptions options = new PublicKeyCredentialCreationOptions(
                rp,
                userEntity,
                challenge,
                pubKeyCredParams,
                null,
                Collections.emptyList(),
                authenticatorSelection,
                AttestationConveyancePreference.NONE,
                null);

        try {
            ObjectConverter converter = new ObjectConverter();
            String json = converter.getJsonConverter().writeValueAsString(options);
            return WebAuthnRegistrationStartResponse.builder().optionsJson(json).build();
        } catch (Exception e) {
            log.error("Error creating organization WebAuthn options", e);
            throw new RuntimeException("Failed to create organization registration options");
        }
    }

    public void finishRegistration(String orgUrl, WebAuthnRegistrationFinishRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Account account =
                accountRepository.findByAccountUrl(orgUrl).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        permissionChecker.requirePermission(account.getAccountId(), userId, "SIGN");

        String challengeKey = userId + "_" + account.getAccountId();
        Challenge challenge = challengeStore.remove(challengeKey);
        if (challenge == null) {
            throw new RuntimeException("Challenge expired or not found");
        }

        try {
            RegistrationRequest registrationRequest = parseRegistrationRequest(request.getCredentialJson());
            ServerProperty serverProperty =
                    new ServerProperty(new Origin(originUrl + "/o/" + orgUrl), rpId, challenge, null);
            RegistrationParameters registrationParameters = new RegistrationParameters(serverProperty, null, false);

            RegistrationData response = webAuthnManager.validate(registrationRequest, registrationParameters);

            AttestedCredentialData attestedData =
                    response.getAttestationObject().getAuthenticatorData().getAttestedCredentialData();

            byte[] credentialId = attestedData.getCredentialId();
            String credentialIdBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(credentialId);

            ObjectConverter objConverter = new ObjectConverter();
            byte[] coseKeyBytes = objConverter.getCborConverter().writeValueAsBytes(attestedData.getCOSEKey());

            String aaguid = attestedData.getAaguid().toString();

            // Upsert / Overwrite if user already registered key for this org (due to
            // uk_org_user_key unique constraint)
            OrganizationKeys key = organizationKeysRepository
                    .findByAccount_AccountIdAndUser_Id(account.getAccountId(), userId)
                    .orElse(null);

            if (key == null) {
                key = OrganizationKeys.builder()
                        .account(account)
                        .user(user)
                        .credentialId(credentialIdBase64)
                        .publicKeyCose(coseKeyBytes)
                        .algorithm(String.valueOf(
                                attestedData.getCOSEKey().getAlgorithm().getValue()))
                        .aaguid(aaguid)
                        .counter(response.getAttestationObject()
                                .getAuthenticatorData()
                                .getSignCount())
                        .isActive(true)
                        .build();
            } else {
                key.setCredentialId(credentialIdBase64);
                key.setPublicKeyCose(coseKeyBytes);
                key.setAlgorithm(
                        String.valueOf(attestedData.getCOSEKey().getAlgorithm().getValue()));
                key.setAaguid(aaguid);
                key.setCounter(
                        response.getAttestationObject().getAuthenticatorData().getSignCount());
                key.setIsActive(true);
            }

            organizationKeysRepository.save(key);
            log.info("Saved organization key for user {} in org {}", userId, orgUrl);

        } catch (Exception e) {
            log.error("Organization WebAuthn registration failed", e);
            throw new RuntimeException("Registration failed: " + e.getMessage());
        }
    }

    public boolean getPasskeyStatus(String orgUrl) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        Account account =
                accountRepository.findByAccountUrl(orgUrl).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        permissionChecker.requireMembership(account.getAccountId(), userId);

        return organizationKeysRepository.existsByAccount_AccountIdAndUser_Id(account.getAccountId(), userId);
    }

    public com.spring.esign.dto.response.WebAuthnAuthenticationStartResponse startAuthentication(String orgUrl) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Account account =
                accountRepository.findByAccountUrl(orgUrl).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        permissionChecker.requireMembership(account.getAccountId(), userId);

        Challenge challenge = new DefaultChallenge();
        String challengeKey = userId + "_" + account.getAccountId();
        challengeStore.put(challengeKey, challenge);

        OrganizationKeys orgKey = organizationKeysRepository
                .findByAccount_AccountIdAndUser_Id(account.getAccountId(), userId)
                .orElseThrow(() -> new RuntimeException("No organization passkeys found"));

        byte[] credentialId = Base64.getUrlDecoder().decode(orgKey.getCredentialId());
        PublicKeyCredentialDescriptor descriptor =
                new PublicKeyCredentialDescriptor(PublicKeyCredentialType.PUBLIC_KEY, credentialId, null);

        PublicKeyCredentialRequestOptions options = new PublicKeyCredentialRequestOptions(
                challenge, 0L, rpId, List.of(descriptor), UserVerificationRequirement.PREFERRED, null);

        try {
            ObjectConverter converter = new ObjectConverter();
            String json = converter.getJsonConverter().writeValueAsString(options);
            return com.spring.esign.dto.response.WebAuthnAuthenticationStartResponse.builder()
                    .optionsJson(json)
                    .build();
        } catch (Exception e) {
            log.error("Error creating org authentication options", e);
            throw new RuntimeException("Failed to create org authentication options");
        }
    }

    public void finishAuthentication(
            String orgUrl, com.spring.esign.dto.request.WebAuthnAuthenticationFinishRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        Account account =
                accountRepository.findByAccountUrl(orgUrl).orElseThrow(() -> new AppException(ErrorCode.ORG_NOT_FOUND));

        String challengeKey = userId + "_" + account.getAccountId();
        Challenge challenge = challengeStore.remove(challengeKey);
        if (challenge == null) {
            throw new RuntimeException("Challenge expired or not found");
        }

        try {
            com.webauthn4j.data.AuthenticationRequest authenticationRequest =
                    parseAuthenticationRequest(request.getCredentialJson());
            OrganizationKeys orgKey = organizationKeysRepository
                    .findByAccount_AccountIdAndUser_Id(account.getAccountId(), userId)
                    .orElseThrow(() -> new RuntimeException("Passkey not found"));

            ObjectConverter objConverter = new ObjectConverter();
            COSEKey coseKey = objConverter.getCborConverter().readValue(orgKey.getPublicKeyCose(), COSEKey.class);

            AAGUID aaguid = (orgKey.getAaguid() != null && !orgKey.getAaguid().isEmpty())
                    ? new AAGUID(orgKey.getAaguid())
                    : AAGUID.NULL;
            AttestedCredentialData attestedCredentialData =
                    new AttestedCredentialData(aaguid, authenticationRequest.getCredentialId(), coseKey);

            AuthenticatorImpl authenticator = new AuthenticatorImpl(attestedCredentialData, null, orgKey.getCounter());

            ServerProperty serverProperty =
                    new ServerProperty(new Origin(originUrl + "/o/" + orgUrl), rpId, challenge, null);
            AuthenticationParameters authenticationParameters =
                    new AuthenticationParameters(serverProperty, authenticator, null, false);

            AuthenticationData response = webAuthnManager.validate(authenticationRequest, authenticationParameters);

            long signCount = response.getAuthenticatorData().getSignCount();
            if (signCount > 0 && signCount <= orgKey.getCounter()) {
                throw new RuntimeException("Invalid passkey counter");
            }
            orgKey.setCounter(signCount);
            organizationKeysRepository.save(orgKey);
            log.info("Org passkey authenticated successfully for user {} in org {}", userId, orgUrl);
        } catch (Exception e) {
            log.error("Org WebAuthn auth failed", e);
            throw new RuntimeException("Authentication failed: " + e.getMessage());
        }
    }

    private RegistrationRequest parseRegistrationRequest(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode response = root.get("response");
            String attestationObjectB64 = response.get("attestationObject").asText();
            String clientDataJSONB64 = response.get("clientDataJSON").asText();

            byte[] attestationObject = Base64.getUrlDecoder().decode(attestationObjectB64);
            byte[] clientDataJSON = Base64.getUrlDecoder().decode(clientDataJSONB64);

            return new RegistrationRequest(attestationObject, clientDataJSON);
        } catch (Exception e) {
            throw new RuntimeException("Invalid JSON format", e);
        }
    }

    private com.webauthn4j.data.AuthenticationRequest parseAuthenticationRequest(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode response = root.get("response");
            byte[] credentialId = Base64.getUrlDecoder().decode(root.get("id").asText());
            byte[] clientDataJSON =
                    Base64.getUrlDecoder().decode(response.get("clientDataJSON").asText());
            byte[] authenticatorData = Base64.getUrlDecoder()
                    .decode(response.get("authenticatorData").asText());
            byte[] signature =
                    Base64.getUrlDecoder().decode(response.get("signature").asText());

            return new com.webauthn4j.data.AuthenticationRequest(
                    credentialId, authenticatorData, clientDataJSON, (String) null, signature);
        } catch (Exception e) {
            throw new RuntimeException("Invalid JSON format", e);
        }
    }
}

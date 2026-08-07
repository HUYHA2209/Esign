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
import com.spring.esign.dto.request.WebAuthnAuthenticationFinishRequest;
import com.spring.esign.dto.request.WebAuthnRegistrationFinishRequest;
import com.spring.esign.dto.response.WebAuthnAuthenticationStartResponse;
import com.spring.esign.dto.response.WebAuthnRegistrationStartResponse;
import com.spring.esign.entity.User;
import com.spring.esign.entity.UsersKeys;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.UserRepository;
import com.spring.esign.repository.UsersKeysRepository;
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
public class WebAuthnService {

    UserRepository userRepository;
    UsersKeysRepository usersKeysRepository;
    WebAuthnManager webAuthnManager;
    ObjectMapper objectMapper;
    WebAuthnParser webAuthnParser;

    ConcurrentHashMap<String, Challenge> challengeStore = new ConcurrentHashMap<>();

    public Boolean getPasskeyStatus() {
        org.springframework.security.core.Authentication authentication =
                org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication();
        String userId = authentication.getName();
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new com.spring.esign.exception.AppException(
                        com.spring.esign.exception.ErrorCode.USER_NOT_EXISTED));
        return !usersKeysRepository.findByUserAndIsActiveTrue(user).isEmpty();
    }

    // User Configuration
    String rpId = "localhost"; // ten mien
    String rpName = "Esign Service"; // ten ung dung
    String originUrl = "http://localhost:5173"; // Frontend URL

    public WebAuthnRegistrationStartResponse startRegistration() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Generate Challenge
        // challenge la interface cua WebAuthn4j
        // DefaultChallenge() laf 1 implement cua change
        Challenge challenge = new DefaultChallenge();
        challengeStore.put(userId, challenge);

        // RP Entity
        // khai báo danh tính ứng dung
        PublicKeyCredentialRpEntity rp = new PublicKeyCredentialRpEntity(rpId, rpName);

        // User Entity
        // khai báo danh tính người dùng
        String webAuthnUserId = userId + "@personal";
        String displayName = user.getFullName() + " (Cá nhân)";
        PublicKeyCredentialUserEntity userEntity =
                new PublicKeyCredentialUserEntity(webAuthnUserId.getBytes(), displayName, displayName);

        // PubKey Cred Params
        // khai báo thuật toán
        List<PublicKeyCredentialParameters> pubKeyCredParams = List.of(
                new PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.ES256),
                new PublicKeyCredentialParameters(PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.RS256));

        // Authenticator Selection
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
            // Convert to JSON
            // WebAuthn4J has its own object converter or we use Jackson
            // To ensure compatibility with frontend's navigator.credentials.create, we pass
            // the options.
            // However, challenge is byte array, implementation needs to handle
            // serialization correctly for frontend.
            // Simple way: return the object and let Jackson serialize (might need module)
            // or use webauthn4j object converter to json string
            ObjectConverter converter = new ObjectConverter();
            String json = converter.getJsonConverter().writeValueAsString(options);
            return WebAuthnRegistrationStartResponse.builder().optionsJson(json).build();
        } catch (Exception e) {
            log.error("Error creating options", e);
            throw new RuntimeException("Failed to create registration options");
        }
    }

    public void finishRegistration(WebAuthnRegistrationFinishRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Challenge challenge = challengeStore.remove(userId);
        if (challenge == null) {
            throw new RuntimeException("Challenge expired or not found");
        }

        try {

            RegistrationRequest registrationRequest = parseRegistrationRequest(request.getCredentialJson());

            ServerProperty serverProperty = new ServerProperty(
                    new Origin(originUrl), rpId, challenge, null // token binding
                    );

            RegistrationParameters registrationParameters =
                    new RegistrationParameters(serverProperty, null, false); // userVerificationRequired=false
            // for
            // test

            RegistrationData response = webAuthnManager.validate(registrationRequest, registrationParameters);

            // Save to DB
            byte[] credentialId = response.getAttestationObject()
                    .getAuthenticatorData()
                    .getAttestedCredentialData()
                    .getCredentialId();
            String credentialIdBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(credentialId);

            // Store COSE Key as Base64 for now, or just toString() if useful.
            // Ideally we need to convert to PEM if we want to use it easily with standard
            // crypto libs,
            // but COSE is what WebAuthn uses.
            // I'll store the COSE key structure as JSON if possible, or just the Algorithm.
            // For now, let's store the raw COSE key structure as a string/base64
            // representation.

            // But wait, the Entity expects "public_key_pem". I should probably rename it or
            // populate it reasonably.
            // Let's store the COSE key key parameters.
            // However, to keep it simple and working:

            // Serialize COSE Key bytes thật (CBOR format) thay vì placeholder
            ObjectConverter objConverter = new ObjectConverter();
            byte[] coseKeyBytes = objConverter
                    .getCborConverter()
                    .writeValueAsBytes(response.getAttestationObject()
                            .getAuthenticatorData()
                            .getAttestedCredentialData()
                            .getCOSEKey());

            UsersKeys key = UsersKeys.builder()
                    .user(user)
                    .credentialId(credentialIdBase64)
                    .publicKeyCose(coseKeyBytes)
                    .algorithm(String.valueOf(response.getAttestationObject()
                            .getAuthenticatorData()
                            .getAttestedCredentialData()
                            .getCOSEKey()
                            .getAlgorithm()
                            .getValue()))
                    .counter(response.getAttestationObject()
                            .getAuthenticatorData()
                            .getSignCount())
                    .build();

            usersKeysRepository.save(key);

        } catch (Exception e) {
            log.error("Registration failed", e);
            throw new RuntimeException("Registration failed: " + e.getMessage());
        }
    }

    private RegistrationRequest parseRegistrationRequest(String json) {
        // Implement parsing logic using Jackson to Map, then extract and decode
        // Base64Url
        try {
            // This is a simplified parser.
            // Expecting: { "id": "...", "rawId": "...", "response": { "attestationObject":
            // "...", "clientDataJSON": "..." }, "type": "public-key" }
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

    // ================= AUTENTICATION FLOW =================

    public WebAuthnAuthenticationStartResponse startAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // 1. Generate Challenge
        Challenge challenge = new DefaultChallenge();
        challengeStore.put(userId, challenge);

        // 2. Get registered credentials for user (Allow List)
        List<UsersKeys> keys = usersKeysRepository.findByUser(user);
        if (keys.isEmpty()) {
            throw new RuntimeException("No registered passkeys found for user");
        }

        List<PublicKeyCredentialDescriptor> allowCredentials = keys.stream()
                .map(key -> {
                    byte[] credIdInfo = Base64.getUrlDecoder().decode(key.getCredentialId());
                    return new PublicKeyCredentialDescriptor(
                            PublicKeyCredentialType.PUBLIC_KEY, credIdInfo, Collections.emptySet() // transports
                            );
                })
                .toList();

        // 3. Create Assertion Options
        PublicKeyCredentialRequestOptions options = new PublicKeyCredentialRequestOptions(
                challenge,
                60000L, // timeout
                rpId,
                allowCredentials,
                UserVerificationRequirement.PREFERRED, // User verification
                null // extensions
                );

        try {
            ObjectConverter converter = new ObjectConverter();
            String json = converter.getJsonConverter().writeValueAsString(options);
            return new com.spring.esign.dto.response.WebAuthnAuthenticationStartResponse(json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create authentication options", e);
        }
    }

    public void finishAuthentication(WebAuthnAuthenticationFinishRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        Challenge challenge = challengeStore.remove(userId);
        if (challenge == null) {
            throw new RuntimeException("Challenge expired or not found");
        }

        try {
            // 1. Parse Assertion Request -> AuthenticationRequest
            AuthenticationRequest authenticationRequest =
                    webAuthnParser.parseAuthenticationRequest(request.getCredentialJson());

            // 2. Find the credential in DB
            byte[] credentialId = authenticationRequest.getCredentialId();
            String credentialIdBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(credentialId);

            UsersKeys key = usersKeysRepository
                    .findByCredentialId(credentialIdBase64)
                    .orElseThrow(() -> new RuntimeException("Credential not found"));

            // Check if key belongs to user
            if (!key.getUser().getId().equals(userId)) {
                throw new RuntimeException("Credential does not belong to user");
            }

            // 3. Verify the WebAuthn assertion using stored public key
            if (key.getPublicKeyCose() == null || key.getPublicKeyCose().length == 0) {
                log.warn("COSE key is empty. User needs to re-register their passkey.");
                throw new RuntimeException("Passkey không hợp lệ. Vui lòng đăng ký lại.");
            }

            // 3a. Deserialize COSE key from stored CBOR bytes
            ObjectConverter objConverter = new ObjectConverter();
            COSEKey coseKey = objConverter.getCborConverter().readValue(key.getPublicKeyCose(), COSEKey.class);

            // 3b. Build AttestedCredentialData from stored credential
            AAGUID aaguid =
                    (key.getAaguid() != null && !key.getAaguid().isEmpty()) ? new AAGUID(key.getAaguid()) : AAGUID.NULL;
            AttestedCredentialData attestedCredentialData = new AttestedCredentialData(aaguid, credentialId, coseKey);

            // 3c. Build Authenticator from stored data
            AuthenticatorImpl authenticator = new AuthenticatorImpl(attestedCredentialData, null, key.getCounter());

            // 3d. Build ServerProperty
            ServerProperty serverProperty = new ServerProperty(new Origin(originUrl), rpId, challenge, null);

            // 3e. Build AuthenticationParameters
            AuthenticationParameters authenticationParameters =
                    new AuthenticationParameters(serverProperty, authenticator, null, false);

            // 3f. Validate the assertion (verifies signature with public key, origin, rpId,
            // challenge, counter)
            AuthenticationData authenticationData =
                    webAuthnManager.validate(authenticationRequest, authenticationParameters);

            log.info("WebAuthn assertion verified for user {} with credential {}", userId, credentialIdBase64);

            // Update Counter from actual authenticator response
            long newCounter = authenticationData.getAuthenticatorData().getSignCount();

            // Nhiều authenticator hiện đại (Windows Hello, Touch ID, Android)
            // không hỗ trợ sign counting → luôn trả về signCount = 0.
            // Chỉ kiểm tra replay nếu authenticator thực sự dùng counter (newCounter > 0).
            if (newCounter > 0) {
                if (newCounter <= key.getCounter()) {
                    throw new RuntimeException("Potential replay attack detected");
                }
                key.setCounter(newCounter);
                usersKeysRepository.save(key);
            } else if (key.getCounter() > 0) {
                // Authenticator trước đây có counter > 0 mà giờ trả 0 → đáng nghi
                log.warn(
                        "Counter went from {} to 0 for credential {} — possible cloned key",
                        key.getCounter(),
                        credentialIdBase64);
            }

        } catch (Exception e) {
            log.error("Authentication failed at step: {}", e.getClass().getSimpleName(), e);
            throw new RuntimeException("Authentication failed: " + e.getMessage(), e);
        }
    }
}

package com.spring.esign.service;

import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.spring.esign.dto.request.*;
import com.spring.esign.dto.response.AccountResponse;
import com.spring.esign.dto.response.AuthenticationResponse;
import com.spring.esign.dto.response.IntrospectResponse;
import com.spring.esign.entity.*;
import com.spring.esign.enums.AccountType;
import com.spring.esign.enums.MemberRole;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.mapper.UserMapper;
import com.spring.esign.repository.*;
import com.spring.esign.util.EmailDomainValidator;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {

    UserRepository userRepository;
    UserMapper userMapper;
    TokenRefreshRepository tokenRefreshRepository;
    InvalidatedTokenRepository invalidatedTokenRepository;

    AccountRepository accountRepository;
    AccountMemberRepository accountMemberRepository;

    RedisOtpService redisOtpService;
    EmailService emailService;
    EmailDomainValidator emailDomainValidator;

    @NonFinal
    @Value("${jwt.signerKey}")
    protected String SIGN_KEY;

    public IntrospectResponse introspectResponse(IntrospectRequest request) throws JOSEException, ParseException {
        var token = request.getToken();
        boolean isValid = true;

        try {
            verifyToken(token);
        } catch (AppException e) {
            isValid = false;
        }

        return IntrospectResponse.builder().valid(isValid).build();
    }

    // ====== REGISTER (MỚI: không trả JWT, gửi OTP qua Redis) ======
    @Transactional
    public void register(UserCreationRequest request) {
        // 1. Validate email domain
        if (!emailDomainValidator.isValidEmailDomain(request.getEmail())) {
            throw new AppException(ErrorCode.INVALID_EMAIL_DOMAIN);
        }

        // 2. Check trùng email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        // 3. Tạo user (emailVerified = false)
        var user = userMapper.toUser(request);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmailVerified(false);

        user = userRepository.save(user);

        // 4. Tạo Account + AccountMember
        Account account = Account.builder()
                .owner(user)
                .accountName(user.getFullName())
                .accountType(AccountType.PERSONAL)
                .build();

        account = accountRepository.save(account);

        AccountMember accountMember = AccountMember.builder()
                .account(account)
                .user(user)
                .role(MemberRole.ADMIN)
                .canInvite(true)
                .canSign(true)
                .canUpload(true)
                .canViewDocs(true)
                .build();
        accountMemberRepository.save(accountMember);

        // 5. Tạo OTP và gửi email xác minh
        int otp = redisOtpService.generateAndSaveOtp(request.getEmail());
        emailService.sendVerificationEmail(request.getEmail(), otp);

        // KHÔNG trả JWT — user phải verify email trước
    }

    // ====== VERIFY EMAIL (MỚI) ======
    @Transactional
    public AuthenticationResponse verifyEmail(String email, int otp) {
        // 1. Kiểm tra OTP từ Redis
        boolean isValid = redisOtpService.verifyOtp(email, otp);
        if (!isValid) {
            throw new AppException(ErrorCode.OTP_INVALID);
        }

        // 2. Cập nhật emailVerified = true
        User user = userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        user.setEmailVerified(true);
        userRepository.save(user);

        // 3. Tìm AccountMember và trả JWT
        AccountMember member = accountMemberRepository
                .findByUserAndAccount_AccountType(user, AccountType.PERSONAL)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));

        return AuthenticationResponse.builder()
                .token(generateToken(member))
                .refreshToken(generateRefreshToken(member))
                .autheticated(true)
                .build();
    }

    // ====== RESEND OTP (MỚI) ======
    public void resendOtp(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (user.isEmailVerified()) {
            throw new AppException(ErrorCode.USER_EXISTED); // Email đã xác minh
        }

        int otp = redisOtpService.generateAndSaveOtp(email);
        emailService.sendVerificationEmail(email, otp);
    }

    // ====== LOGIN (CẬP NHẬT: thêm check emailVerified) ======
    public AuthenticationResponse login(AuthenticationRequest request) {
        var user = userRepository
                .findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!authenticated) throw new AppException(ErrorCode.UNAUTHENTICATED);

        // CHECK: Email đã xác minh chưa?
        if (!user.isEmailVerified()) {
            // Gửi lại OTP tự động để user có thể verify
            int otp = redisOtpService.generateAndSaveOtp(request.getEmail());
            emailService.sendVerificationEmail(request.getEmail(), otp);
            throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        AccountMember member = accountMemberRepository
                .findByUserAndAccount_AccountType(user, AccountType.PERSONAL)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));

        return AuthenticationResponse.builder()
                .token(generateToken(member))
                .refreshToken(generateRefreshToken(member))
                .autheticated(true)
                .build();
    }

    private String generateToken(AccountMember member) {
        JWSHeader jwsHeader = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet.Builder jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(member.getUser().getId())
                .issuer("esign.com")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(60 * 60 * 60 * 3, ChronoUnit.SECONDS).toEpochMilli()))
                .jwtID(UUID.randomUUID().toString());

        jwtClaimsSet.claim("accountId", member.getAccount().getAccountId());
        jwtClaimsSet.claim("scope", member.getRole().name());
        jwtClaimsSet.claim("type", member.getAccount().getAccountType().name());

        Payload payload = new Payload(jwtClaimsSet.build().toJSONObject());

        JWSObject jwsObject = new JWSObject(jwsHeader, payload);
        try {
            jwsObject.sign(new MACSigner(SIGN_KEY.getBytes()));
            return jwsObject.serialize();
        } catch (Exception e) {
            AuthenticationService.log.error("Cannot creat token", e);
            throw new RuntimeException(e);
        }
    }

    private SignedJWT verifyToken(String token) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(SIGN_KEY.getBytes());

        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expitytime = signedJWT.getJWTClaimsSet().getExpirationTime();

        var verified = signedJWT.verify(verifier);

        if (!(verified && expitytime.after(new Date()))) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        if (invalidatedTokenRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID()))
            throw new AppException((ErrorCode.UNAUTHENTICATED));

        return signedJWT;
    }

    private String generateRefreshToken(AccountMember accountMember) {
        String tokenValue = UUID.randomUUID().toString();
        Instant expirytime = Instant.now().plus(7, ChronoUnit.DAYS);

        tokenRefreshRepository.save(RefreshToken.builder()
                .token(tokenValue)
                .exprityDate(Date.from(expirytime))
                .user(accountMember.getUser())
                .accountId(accountMember.getAccount().getAccountId())
                .revoked(false)
                .build());
        return tokenValue;
    }

    @Transactional
    public AuthenticationResponse refreshToken(String token) {
        var tokenRefresh = tokenRefreshRepository
                .findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_REFRESH_NOT_EXISTED));

        if (tokenRefresh.isRevoked() || tokenRefresh.getExprityDate().before(new Date())) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        tokenRefresh.setRevoked(true);

        User user = tokenRefresh.getUser();
        Long accountID = tokenRefresh.getAccountId();

        AccountMember accountMember = accountMemberRepository
                .findByUserAndAccount_AccountId(user, accountID)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));

        String newToken = generateToken(accountMember);
        String newFreshToken = generateRefreshToken(accountMember);

        return AuthenticationResponse.builder()
                .refreshToken(newFreshToken)
                .token(newToken)
                .autheticated(true)
                .build();
    }

    public AuthenticationResponse switchAccount(String userId, Long accountId) {

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        AccountMember member = accountMemberRepository
                .findByUserAndAccount_AccountId(user, accountId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));

        return AuthenticationResponse.builder()
                .token(generateToken(member))
                .autheticated(true)
                .refreshToken(generateRefreshToken(member))
                .build();
    }

    public List<AccountResponse> getAllAccount(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<AccountMember> memberships = accountMemberRepository.findByUser(user);

        return memberships.stream()
                .map(member -> AccountResponse.builder()
                        .accountName(member.getAccount().getAccountName())
                        .accountType(member.getAccount().getAccountType().name())
                        .role(member.getRole().name())
                        .build())
                .collect(Collectors.toList());
    }

    // logout
    public void logout(String refreshToken, LogoutRequest logoutRequest) throws JOSEException, ParseException {
        try {
            var signJwt = verifyToken(logoutRequest.getToken());
            String jit = signJwt.getJWTClaimsSet().getJWTID();
            Date expiry = signJwt.getJWTClaimsSet().getExpirationTime();

            InvalidatedToken invalidatedToken =
                    InvalidatedToken.builder().id(jit).expirytime(expiry).build();

            invalidatedTokenRepository.save(invalidatedToken);
        } catch (AppException e) {
            log.info("Token already expired");
        }

        var token = tokenRefreshRepository.findByToken(refreshToken).orElse(null);

        if (token != null) {
            token.setRevoked(true);
            tokenRefreshRepository.save(token);
        }
    }

    // Change - password
    public void changePass(NewPasswordRequest passwordRequest, String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        boolean authenticated = passwordEncoder.matches(passwordRequest.getOldPass(), user.getPassword());
        if (!authenticated) throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);

        userRepository.updatePassword(user.getEmail(), passwordEncoder.encode(passwordRequest.getNewPass()));
    }
}

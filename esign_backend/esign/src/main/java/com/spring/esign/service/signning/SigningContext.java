package com.spring.esign.service.signning;

import java.util.List;

import com.spring.esign.entity.DocumentSigner;
import com.spring.esign.entity.SigningSession;
import com.spring.esign.entity.User;
import com.spring.esign.enums.SigningMode;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SigningContext {
    User user;
    SigningSession session;
    List<DocumentSigner> documentSignerList;
    SigningMode signingMode;
    int signingOrder;
    boolean isLastSigner;
    String ip;
    String ua;
    String deviceFingerprint;
}

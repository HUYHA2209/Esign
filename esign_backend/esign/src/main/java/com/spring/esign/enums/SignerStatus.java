package com.spring.esign.enums;

public enum SignerStatus {
    WAITING,
    VIEWED,
    SIGNED,
    DECLINED,
    EXPIRED;

    public boolean canSign() {
        return this == WAITING || this == VIEWED;
    }
}

package com.spring.esign.enums;

public enum SignatureType {
    DRAWN("drawn"),
    UPLOADED("uploaded"),
    TYPED("typed");

    private final String value;

    SignatureType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    @Override
    public String toString() {
        return value;
    }
}

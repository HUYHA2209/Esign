package com.spring.esign.enums;

public enum DocumentStatus {
    DRAFT("draft"),
    PENDING("pending"),
    COMPLETED("completed"),
    DECLINED("declined"),
    EXPIRED("expired"),
    VOID("void");

    private final String value;

    DocumentStatus(String value) {
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

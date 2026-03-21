package com.spring.esign.dto.request;

import lombok.Builder;

@Builder
public record MailBody(String to, String subject, String text) {}

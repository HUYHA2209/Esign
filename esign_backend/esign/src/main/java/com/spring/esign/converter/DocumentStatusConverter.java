package com.spring.esign.converter;

import java.util.stream.Stream;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import com.spring.esign.enums.DocumentStatus;

@Converter(autoApply = true)
public class DocumentStatusConverter implements AttributeConverter<DocumentStatus, String> {

    @Override
    public String convertToDatabaseColumn(DocumentStatus status) {
        if (status == null) {
            return null;
        }
        return status.getValue();
    }

    @Override
    public DocumentStatus convertToEntityAttribute(String code) {
        if (code == null) {
            return null;
        }

        return Stream.of(DocumentStatus.values())
                .filter(c -> c.getValue().equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown status: " + code));
    }
}

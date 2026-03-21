package com.spring.esign.converter;

import java.util.stream.Stream;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import com.spring.esign.enums.SignatureType;

@Converter(autoApply = true)
public class SignatureTypeConverter implements AttributeConverter<SignatureType, String> {

    @Override
    public String convertToDatabaseColumn(SignatureType type) {
        if (type == null) {
            return null;
        }
        return type.getValue();
    }

    @Override
    public SignatureType convertToEntityAttribute(String code) {
        if (code == null) {
            return null;
        }

        return Stream.of(SignatureType.values())
                .filter(c -> c.getValue().equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown signature type: " + code));
    }
}

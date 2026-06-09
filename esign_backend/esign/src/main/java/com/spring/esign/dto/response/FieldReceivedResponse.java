package com.spring.esign.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FieldReceivedResponse {
    Integer fieldId;
    String type; // SIGNATURE, TEXT, DATE, EMAIL, NAME, CHECKBOX, INITIAL, NUMBER
    Integer page;
    Float x;
    Float y;
    Float width;
    Float height;
    String value; // null nếu chưa điền, có giá trị nếu đã lưu trước đó
}

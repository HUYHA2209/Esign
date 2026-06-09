package com.spring.esign.dto.response;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GroupReceivedDetailResponse {
    Integer groupId;
    String groupName;

    // Thông tin signer hiện tại (lấy từ token)
    String signerEmail;
    String signerName;
    String signerRole; // "signer"

    Integer singerOrder;
    String signningMode;

    // Danh sách document trong group (chỉ chứa thông tin liên quan đến signer này)
    List<DocumentReceivedResponse> documents;
}

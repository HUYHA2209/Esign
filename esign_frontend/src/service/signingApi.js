import apiClient from "./apiClient";

// Bước 1: Tạo session ký — Gửi fieldValues để BE vẽ lên PDF (Pre-seal), tính hash bản đã vẽ, sinh WebAuthn Challenge
// POST /signning/prepare/{groupId}
// Body:
//   fieldValues : Object — { [fieldId]: value } — giá trị user điền (Base64 ảnh hoặc text)
//                          fieldId là Integer, value là string (Base64 ảnh hoặc text)
// Response: { sessionId, webAuthnOptions: { challenge, allowCredentials, rpId, timeout, ... }, documents }
export const prepareGroupSigning = async (groupId, fieldValues = {}) => {
    const response = await apiClient.post(`/signning/prepare/${groupId}`, {
        fieldValues,   // Object plain: { "12": "data:image/png;base64,...", "13": "Nguyễn Văn A" }
    });
    return response.data.result;
};

// Bước 3: Hoàn tất ký — Gửi WebAuthn assertion (không cần fieldValues vì đã gửi ở bước Prepare)
// POST /signning/complete
// Body:
//   sessionId    : Integer  — ID phiên ký lấy từ prepare
//   groupId      : Integer  — ID nhóm tài liệu
//   credentialJson: string  — WebAuthn assertion JSON (output của credentialToJSON)
//   deviceFingerprint: string — Client identifier string
export const completeGroupSigning = async (sessionId, groupId, credentialJson, deviceFingerprint) => {
    const response = await apiClient.post('/signning/complete', {
        sessionId,
        groupId,
        credentialJson: JSON.stringify(credentialJson),
        deviceFingerprint,
    });
    return response.data;
};

export const checkOrder = async (groupId) => {
    const response = await apiClient.get(`/signning/check-order/${groupId}`);
    return response.data.result;
};

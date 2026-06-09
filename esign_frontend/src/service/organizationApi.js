import apiClient from './apiClient';

// Tạo tổ chức mới
export const createOrganization = async (data) => {
    const response = await apiClient.post('/organizations/create', data);
    return response.data;
};

// Lấy chi tiết tổ chức theo URL slug
export const getOrganizationByUrl = async (orgUrl) => {
    const response = await apiClient.get(`/organizations/${orgUrl}`);
    return response.data;
};

// Cập nhật thông tin tổ chức
export const updateOrganization = async (orgUrl, data) => {
    const response = await apiClient.put(`/organizations/${orgUrl}`, data);
    return response.data;
};

// Xóa tổ chức
export const deleteOrganization = async (orgId) => {
    const response = await apiClient.delete(`/organizations/${orgId}`);
    return response.data;
};

// Mời thành viên vào tổ chức
export const inviteMember = async (orgId, data) => {
    const response = await apiClient.post(`/organizations/${orgId}/invitations`, data);
    return response.data;
};

// Lấy danh sách thành viên
export const getMembers = async (orgId) => {
    const response = await apiClient.get(`/organizations/${orgId}/members`);
    return response.data;
};

// Xóa thành viên khỏi tổ chức
export const removeMember = async (orgId, memberId) => {
    const response = await apiClient.delete(`/organizations/${orgId}/members/${memberId}`);
    return response.data;
};

// Cập nhật thông tin/vai trò thành viên
export const updateMember = async (orgId, memberId, data) => {
    const response = await apiClient.put(`/organizations/${orgId}/members/${memberId}`, data);
    return response.data;
};

// Xác thực token lời mời
export const verifyInvitation = async (token) => {
    const response = await apiClient.get(`/organizations/invitations/verify?token=${token}`);
    return response.data;
};

// Chấp nhận lời mời
export const acceptInvitation = async (token) => {
    const response = await apiClient.post(`/organizations/invitations/${token}/accept`);
    return response.data;
};

// Từ chối lời mời
export const rejectInvitation = async (token) => {
    const response = await apiClient.post(`/organizations/invitations/${token}/reject`);
    return response.data;
};

// Lấy danh sách thành viên có quyền ký
export const getOrganizationSigners = async (orgId) => {
    const response = await apiClient.get(`/organizations/${orgId}/signers`);
    return response.data;
};

// Lấy chữ ký tổ chức
export const getOrgSignature = async (orgUrl) => {
    const response = await apiClient.get(`/organizations/${orgUrl}/signature`);
    return response.data;
};

// Lưu chữ ký tổ chức
export const saveOrgSignature = async (orgUrl, data) => {
    const response = await apiClient.post(`/organizations/${orgUrl}/signature`, data);
    return response.data;
};

// Lấy trạng thái đăng ký PassKey của thành viên trong tổ chức
export const getOrgPasskeyStatus = async (orgUrl) => {
    const response = await apiClient.get(`/organizations/${orgUrl}/webauthn/status`);
    return response.data;
};

// Bắt đầu đăng ký PassKey tổ chức
export const startOrgPasskeyRegistration = async (orgUrl) => {
    const response = await apiClient.post(`/organizations/${orgUrl}/webauthn/register/start`);
    return response.data;
};

// Hoàn tất đăng ký PassKey tổ chức
export const finishOrgPasskeyRegistration = async (orgUrl, credentialJson) => {
    const response = await apiClient.post(`/organizations/${orgUrl}/webauthn/register/finish`, {
        credentialJson: JSON.stringify(credentialJson)
    });
    return response.data;
};

// Bắt đầu xác thực PassKey tổ chức
export const startOrgAuthentication = async (orgUrl) => {
    const response = await apiClient.post(`/organizations/${orgUrl}/webauthn/login/start`);
    return response.data;
};

// Hoàn tất xác thực PassKey tổ chức
export const finishOrgAuthentication = async (orgUrl, credentialJson) => {
    const response = await apiClient.post(`/organizations/${orgUrl}/webauthn/login/finish`, {
        credentialJson: JSON.stringify(credentialJson)
    });
    return response.data;
};

export default {
    getOrganizationByUrl,
    verifyInvitation,
    acceptInvitation,
    rejectInvitation,
    getMembers,
    removeMember,
    updateMember,
    getOrganizationSigners,
    getOrgSignature,
    saveOrgSignature,
    getOrgPasskeyStatus,
    startOrgPasskeyRegistration,
    finishOrgPasskeyRegistration
};

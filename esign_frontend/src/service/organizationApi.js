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
export const deleteOrganization = async (orgUrl) => {
    const response = await apiClient.delete(`/organizations/${orgUrl}`);
    return response.data;
};

// Mời thành viên vào tổ chức
export const inviteMember = async (orgUrl, data) => {
    const response = await apiClient.post(`/organizations/${orgUrl}/members/invite`, data);
    return response.data;
};

// Xóa thành viên khỏi tổ chức
export const removeMember = async (orgUrl, memberId) => {
    const response = await apiClient.delete(`/organizations/${orgUrl}/members/${memberId}`);
    return response.data;
};

// Cập nhật vai trò thành viên
export const updateMemberRole = async (orgUrl, memberId, role) => {
    const response = await apiClient.put(`/organizations/${orgUrl}/members/${memberId}/role`, { role });
    return response.data;
};

export default { getOrganizationByUrl };

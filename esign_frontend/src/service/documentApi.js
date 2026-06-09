import apiClient from "./apiClient";

export const uploadDocument = async (data) => {
    try {
        const response = await apiClient.post("/documents/upload", data);
        return response.data.result;
    } catch (error) {
        throw error;
    }
}

export const sendDocument = async (groupId, payload) => {
    try {
        const response = await apiClient.post(`/documents/groups/${groupId}/send`, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const uploadDocuments = async (files, documentName, groupId = null) => {
    try {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f.file));
        formData.append('documentName', documentName);
        if (groupId) formData.append('groupId', groupId);

        const response = await apiClient.post("/documents/uploads-file", formData);
        return response.data.result; // groupId
    } catch (error) {
        throw error;
    }
}

export const updateDraft = async (groupId, payload) => {
    try {
        const response = await apiClient.put(`/documents/groups/${groupId}/update-draft`, payload);
        return response.data.result;
    } catch (error) {
        throw error;
    }
}


export const getMyDocuments = async () => {
    const response = await apiClient.get('/documents/get-document');
    return response.data.result;
};

export const getDocument = async (id) => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data.result;
};

export const downloadDocumentsFile = async (id, action = null) => {
    const url = action ? `/documents/${id}/download?action=${action}` : `/documents/${id}/download`;
    const response = await apiClient.get(url, {
        responseType: 'blob'
    });
    return response.data;
};

export const downloadDocumentsFileToRecipients = async (id, action = null) => {
    const url = action ? `/documents/${id}/download-to-recipients?action=${action}` : `/documents/${id}/download-to-recipients`;
    const response = await apiClient.get(url, {
        responseType: 'blob'
    });
    return response.data;
};

export const getDocumentsGroup = async (groupId) => {
    const response = await apiClient.get(`/documents/groups/${groupId}`);
    return response.data.result;
};

export const getGroupDetail = async (groupId) => {
    const response = await apiClient.get(`/documents/groups/${groupId}/detail`);
    return response.data.result;
};

export const getReceivedGroupDetail = async (groupId) => {
    const response = await apiClient.get(`/documents/groups/${groupId}/received`);
    return response.data.result;
};

export const getReceivedDocuments = async () => {
    const response = await apiClient.get('/documents/received');
    return response.data.result;
};

export const deleteDocument = async (id) => {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data.result;
};

export const deleteDocumentGroup = async (groupId) => {
    const response = await apiClient.delete(`/documents/groups/${groupId}`);
    return response.data.result;
};

export const cancelGroup = async (groupId, payload) => {
    const response = await apiClient.post(`/documents/groups/${groupId}/cancel`, payload);
    return response.data;
};

// --- Signing APIs ---
export const completeSign = async (payload) => {
    const response = await apiClient.post('/documents/sign/complete', payload);
    return response.data;
};

export const rejectSign = async (groupId, payload) => {
    const response = await apiClient.post(`/signning/${groupId}/decline`, payload);
    return response.data;
};

// --- Audit Trail APIs ---
export const getAuditTrails = async (documentId) => {
    const response = await apiClient.get(`/documents/${documentId}/audit-trails`);
    return response.data.result;
};

export const verifyAuditChain = async (documentId) => {
    const response = await apiClient.post(`/documents/${documentId}/audit-trails/verify`);
    return response.data;
};
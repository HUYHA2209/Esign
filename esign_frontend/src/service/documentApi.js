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

export const saveDraft = async (formData) => {
    try {
        const response = await apiClient.post("/documents/save-draft", formData);
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

export const downloadDocumentsFile = async (id) => {
    // For blob responses, we might want the headers too if needed, but the caller expects a blob.
    // Usually response.data is the blob for responseType: 'blob'
    const response = await apiClient.get(`/documents/${id}/download`, {
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
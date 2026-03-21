import apiClient from "./apiClient";

export const saveSignature = async (data) => {
    const response = await apiClient.post("/signature", data);
    return response.data;
};

export const getSignature = async () => {
    const response = await apiClient.get("/signature");
    return response.data;
};

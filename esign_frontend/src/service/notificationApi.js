import apiClient from "./apiClient";

export const getUnreadNotifications = async () => {
    const response = await apiClient.get("/notifications/unread");
    return response.data.result;
};

export const getRecentNotifications = async () => {
    const response = await apiClient.get("/notifications/recent");
    return response.data.result;
};

export const getUnreadCount = async () => {
    const response = await apiClient.get("/notifications/unread/count");
    return response.data.result;
};

export const markAllAsRead = async () => {
    const response = await apiClient.put("/notifications/mark-read");
    return response.data.result;
};

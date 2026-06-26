import apiClient from "./apiClient";

// Register api calls
export const registerUser = async (userData) => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
}

//Login
export const loginUser = async (loginData) => {
    const response = await apiClient.post("/auth/login", loginData);
    return response.data;
}

// Verify Email OTP
export const verifyEmail = async (email, otp) => {
    const response = await apiClient.post("/auth/verify-email", { email, otp });
    return response.data;
}

// Resend OTP
export const resendOtp = async (email) => {
    const response = await apiClient.post("/auth/resend-otp", { email });
    return response.data;
}

// get workSpace
export const getWorkSpaces = async () => {
    const response = await apiClient.get("/auth/workspace");
    return response.data;
};

// switch workSpace
export const switchWorkSpace = async (accountId) => {
    const response = await apiClient.post("/auth/workspace", { accountId });
    return response.data;
};

// delete workSpace (Backend placeholder)
export const deleteWorkSpace = async (accountId) => {
    const response = await apiClient.delete(`/auth/workspace/${accountId}`);
    return response.data;
};

// Logout
export const logoutUser = async () => {
    const token = sessionStorage.getItem("token");
    try {
        await apiClient.post("/auth/logout", { token });
    } finally {
        sessionStorage.removeItem("token");
    }
};

// change-password
export const changePass = async (passData) => {
    const response = await apiClient.post("/auth/change-password", passData);
    return response.data;
}

// Tìm kiếm User theo Email (Để backend tự implement API này)
export const searchUsersByEmail = async (email) => {
    const response = await apiClient.get("/users/search", { params: { email } });
    return response.data.result; // Truy cập vào thuộc tính result của ApiResponse
}

export const getUserProfile = async () => {
    const response = await apiClient.get("/users/my-info");
    return response.data.result;
}

export const updateUserProfile = async (profile) => {
    const response = await apiClient.put("/users/my-info", profile);
    return response.data.result;
}

export const deleteAccount = async () => {
    const response = await apiClient.delete("/users/me");
    return response.data;
}


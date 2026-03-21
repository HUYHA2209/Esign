import axios from "axios";

const API_URL = "http://localhost:8000/esign/forgot-password";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    }
});

export const verifyMail = async (email) => {
    try {
        const response = await api.post("/verifyMail", { email });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const verifyOtp = async (email, otp) => {
    try {
        const response = await api.post("/verifyOtp", { email, otp });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const resetPassword = async (email, resetPassword, otp) => {
    try {
        const response = await api.post("/resetPassword", { email, resetPassword, otp });
        return response.data;
    } catch (error) {
        throw error;
    }
}

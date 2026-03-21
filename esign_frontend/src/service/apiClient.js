import axios from "axios";

const API_URL = "http://localhost:8000/esign";

// Centralized API instance with credentials support for cookies
const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Essential for sending/receiving cookies (refreshToken)
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
    (config) => {
        // Skip attaching token for auth endpoints to avoid issues
        if (
            config.url.includes("/auth/login") ||
            config.url.includes("/auth/register") ||
            config.url.includes("/auth/refresh")
        ) {
            return config;
        }

        const token = sessionStorage.getItem("token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle 401 & Auto-Refresh
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Skip refresh logic for login/register/refresh or if already retried
        if (
            !originalRequest ||
            originalRequest.url.includes("/auth/login") ||
            originalRequest.url.includes("/auth/register") ||
            originalRequest.url.includes("/auth/refresh") ||
            originalRequest._retry
        ) {
            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh token
                // Backend expects POST to /auth/refresh, cookie is sent automatically via withCredentials
                const response = await apiClient.post("/auth/refresh");

                // Assuming backend returns: { result: { token: 'new_token', ... } }
                const newAccessToken = response.data.result.token;

                if (newAccessToken) {
                    sessionStorage.setItem("token", newAccessToken);

                    // Update header and retry original request
                    originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed (token expired or invalid)
                console.error("Token refresh failed:", refreshError);
                sessionStorage.removeItem("token");
                // Optional: Redirect to login or let the app handle the auth state change
                // window.location.href = "/login"; 
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;

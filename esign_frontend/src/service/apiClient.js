import axios from "axios";

const API_URL = "http://localhost:8000/esign";

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Các biến để xử lý các request làm mới đồng thời
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request Interceptor
apiClient.interceptors.request.use(
    (config) => {
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
    (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

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
            // Nếu đang trong quá trình refresh, đưa request này vào hàng đợi (queue)
            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                .then(token => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return apiClient(originalRequest);
                })
                .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await apiClient.post("/auth/refresh");
                const newAccessToken = response.data.result.token;
                
                if (newAccessToken) {
                    sessionStorage.setItem("token", newAccessToken);
                    
                    // Cập nhật token cho request ban đầu
                    originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
                    
                    // Giải quyết (resolve) tất cả các request đang chờ trong hàng đợi với token mới
                    processQueue(null, newAccessToken);
                    
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Từ chối (reject) tất cả các request trong hàng đợi nếu việc làm mới thất bại
                processQueue(refreshError, null);
                
                sessionStorage.removeItem("token");
                // window.location.href = "/login"; 
                
                return Promise.reject(refreshError);
            } finally {
                // Luôn đặt lại cờ trạng thái dù thành công hay thất bại
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
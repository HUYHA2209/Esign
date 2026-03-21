import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    const token = sessionStorage.getItem("token");

    // Nếu không có token, chuyển hướng về trang login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Nếu có token, cho phép truy cập vào các route con
    return <Outlet />;
};

export default ProtectedRoute;

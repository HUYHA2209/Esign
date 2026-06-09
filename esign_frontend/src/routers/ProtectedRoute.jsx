import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import NotificationListener from '../components/NotificationListener';

const ProtectedRoute = () => {
    const token = sessionStorage.getItem("token");
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <>
            <NotificationListener />
            <Outlet />
        </>
    );
};

export default ProtectedRoute;

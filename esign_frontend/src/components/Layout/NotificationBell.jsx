import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Clock, MailOpen, AlertCircle, FileSignature } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRecentNotifications, getUnreadCount, markAllAsRead } from '../../service/notificationApi';
import { useNavigate } from 'react-router-dom';

const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return "Vừa xong";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
};

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchUnreadCount = async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count || 0);
        } catch (error) {
            console.error("Failed to fetch unread count", error);
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await getRecentNotifications();
            setNotifications(data || []);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchUnreadCount();

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        if (nextState) {
            fetchNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const handleNotificationClick = (notif) => {
        setIsOpen(false);
        // Tùy thuộc vào loại thông báo để điều hướng (Routing)
        if (notif.groupId) {
            navigate(`/document/${notif.groupId}`);
        } else {
            // Default routing
            navigate("/");
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'DOCUMENT_RECEIVED': return <FileSignature className="w-5 h-5 text-blue-500" />;
            case 'SIGNING_REMINDER': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'DOCUMENT_COMPLETED': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'DOCUMENT_DECLINED': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'DOCUMENT_VOIDED': return <AlertCircle className="w-5 h-5 text-slate-500" />;
            default: return <Bell className="w-5 h-5 text-primary-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={toggleDropdown}
                className={`relative p-3 rounded-2xl transition-all ${isOpen ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-400 hover:bg-secondary-50 hover:text-secondary-700'}`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="absolute top-full right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-premium border border-secondary-100 z-50 overflow-hidden flex flex-col"
                        style={{ maxHeight: 'calc(100vh - 100px)' }}
                    >
                        <div className="p-4 border-b border-secondary-50 flex items-center justify-between bg-secondary-50/30">
                            <h3 className="font-bold text-secondary-900 text-sm">Thông báo</h3>
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleMarkAllRead}
                                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                                >
                                    <MailOpen className="w-3.5 h-3.5" />
                                    Đánh dấu đã đọc
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto max-h-[400px] flex flex-col">
                            {loading ? (
                                <div className="p-8 flex justify-center items-center">
                                    <div className="w-6 h-6 border-2 border-secondary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mb-3 text-secondary-300">
                                        <Bell className="w-8 h-8" />
                                    </div>
                                    <p className="text-secondary-500 text-sm font-medium">Bạn không có thông báo mới nào</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div 
                                        key={notif.notificationId}
                                        onClick={() => handleNotificationClick(notif)}
                                        className="p-4 border-b border-secondary-50 hover:bg-secondary-50 cursor-pointer transition-colors flex gap-4 items-start"
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(notif.notificationType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-secondary-900 mb-1">{notif.title}</p>
                                            <p className="text-xs text-secondary-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                                            <p className="text-[10px] font-bold text-secondary-400 mt-2 uppercase tracking-wider">
                                                {formatTimeAgo(notif.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;

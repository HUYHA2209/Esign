import React from 'react';
import {
    FileSignature, Home, FileText, Layout, Settings, ChevronRight, LogOut
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../../service/userApi';
import { motion } from 'framer-motion';


const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        }
        sessionStorage.clear();
        navigate('/');
    };


    const menuItems = [
        { id: 'dashboard', path: '/dashboard', icon: Home, label: 'Workspace' },
        { id: 'signature', path: '/signature', icon: FileSignature, label: 'Chữ ký' },
        { id: 'documents', path: '/documents', icon: FileText, label: 'Tài liệu' },
        { id: 'templates', path: '/templates', icon: Layout, label: 'Mẫu' },
        { id: 'settings', path: '/settings', icon: Settings, label: 'Cài đặt' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="w-64 flex flex-col bg-white border-r border-secondary-200/50 shadow-sm z-30 transition-all duration-300">
            {/* Brand */}
            <div className="h-20 flex items-center px-6 gap-3">
                <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-6 transition-transform">
                    <FileSignature className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span
                        className="text-lg font-bold text-secondary-900 tracking-tight cursor-pointer font-display"
                        onClick={() => navigate('/dashboard')}
                    >
                        E-Sign
                    </span>
                    <span className="text-[10px] text-secondary-400 font-medium tracking-widest uppercase">Enterprise</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
                <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-2 mb-4">
                    Main Menu
                </p>
                <div className="space-y-1.5">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`w-full group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                                    ${active
                                        ? 'bg-primary-50 text-primary-600 shadow-sm'
                                        : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-900'
                                    }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-colors duration-300 ${active ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-400 group-hover:bg-white group-hover:text-secondary-600'}`}>
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                </div>
                                <span className="flex-1 text-left">{item.label}</span>
                                {active && (
                                    <motion.div
                                        layoutId="active-nav"
                                        className="w-1.5 h-1.5 rounded-full bg-primary-600"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-secondary-100 bg-secondary-50/50">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-secondary-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                >
                    <div className="p-1.5 rounded-lg bg-secondary-100 text-secondary-400 group-hover:bg-red-100 group-hover:text-red-600">
                        <LogOut className="w-4 h-4" />
                    </div>
                    <span>Đăng xuất</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

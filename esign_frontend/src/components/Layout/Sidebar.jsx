import React from 'react';
import {
    FileSignature, Home, FileText, Layout, Settings, ChevronRight, LogOut
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../../service/userApi';


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
        <div className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-white border-r border-slate-100 shadow-sm">
            {/* Brand */}
            <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <FileSignature className="w-4 h-4 text-white" />
                </div>
                <span
                    className="text-base font-bold text-slate-800 tracking-tight cursor-pointer"
                    onClick={() => navigate('/dashboard')}
                >
                    DigiSign
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">
                    Menu
                </p>
                <div className="space-y-0.5">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                                    ${active
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                            >
                                <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* User Info at Bottom */}
            <div className="p-3 border-t border-slate-100">
                <div className="flex items-center gap-3 px-3 py-2">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

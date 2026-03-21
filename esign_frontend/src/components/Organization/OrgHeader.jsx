import React, { useState } from 'react';
import {
    Settings, Bell, Search, ChevronDown,
    LogOut, User, Globe, Plus
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../../service/userApi';

const OrgHeader = ({ orgUrl, orgName }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const handleLogout = async () => {
        try { await logoutUser(); } catch (_) { }
        sessionStorage.clear();
        navigate('/');
    };

    return (
        <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-40">
            {/* Left: Org name + Search */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => navigate(`/o/${orgUrl}`)}
                        className="text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                    >
                        {orgName}
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-52 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-300 transition-all">
                    <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        className="bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-full"
                    />
                </div>
            </div>

            {/* Right: Invite + Bell + Avatar */}
            <div className="flex items-center gap-2">
                {/* Invite button */}
                <button
                    onClick={() => navigate(`/o/${orgUrl}/members`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Mời thành viên
                </button>

                {/* Bell */}
                <button className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                </button>

                {/* Avatar dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow">
                            {orgName?.charAt(0).toUpperCase() || 'O'}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showMenu && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                            {/* Org info */}
                            <div className="p-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow">
                                        {orgName?.charAt(0).toUpperCase() || 'O'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800 text-sm truncate">{orgName}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <Globe className="w-3 h-3" />
                                            digisign.app/o/{orgUrl}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="py-1.5">
                                <button
                                    onClick={() => { setShowMenu(false); navigate(`/o/${orgUrl}/settings`); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    Cài đặt tổ chức
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); navigate('/profile'); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    <User className="w-4 h-4 text-slate-400" />
                                    Hồ sơ cá nhân
                                </button>
                                <div className="mx-4 border-t border-slate-100 my-1" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default OrgHeader;

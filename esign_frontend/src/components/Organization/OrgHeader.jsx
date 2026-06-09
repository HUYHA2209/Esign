import React, { useState, useRef, useEffect } from 'react';
import {
    Settings, Bell, Search, ChevronDown,
    LogOut, User, Globe, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, getWorkSpaces } from '../../service/userApi';
import { motion, AnimatePresence } from 'framer-motion';
import InviteMemberModal from '../Modal/InviteMemberModal';

const OrgHeader = ({ orgUrl, orgName }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const dropdownRef = useRef(null);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [currentOrgId, setCurrentOrgId] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [canInvite, setCanInvite] = useState(false);

    useEffect(() => {
        if (!orgUrl) return;
        const fetchOrgId = async () => {
            try {
                const res = await getWorkSpaces();
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setCurrentOrgId(ws.accountId);
                        setCurrentRole(ws.role);
                        setCanInvite(ws.canInvite);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch workspaces', err);
            }
        };
        fetchOrgId();
    }, [orgUrl]);

    const handleLogout = async () => {
        try { await logoutUser(); } catch (_) { }
        sessionStorage.clear();
        navigate('/');
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-secondary-100 px-8 flex items-center justify-between sticky top-0 z-40">
            {/* Left: Search Bar */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-secondary-50 border border-secondary-100 rounded-2xl px-4 py-2.5 w-64 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-500/30 transition-all duration-300">
                    <Search className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm nhanh..."
                        className="bg-transparent text-sm text-secondary-800 placeholder-secondary-400 focus:outline-none w-full font-medium"
                    />
                </div>
            </div>

            {/* Right: Actions & User Info */}
            <div className="flex items-center gap-4">
                {/* Invite Button */}
                {(currentRole === 'ADMIN' || canInvite) && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        Mời thành viên
                    </motion.button>
                )}

                {/* Notification Bell */}
                <button className="relative p-3 rounded-2xl text-secondary-400 hover:bg-secondary-50 hover:text-secondary-700 transition-all">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                </button>

                {/* Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-secondary-50 transition-all border border-transparent hover:border-secondary-100"
                    >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {orgName?.charAt(0).toUpperCase() || 'O'}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-secondary-400 transition-transform duration-300 ${showMenu ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ type: "spring", duration: 0.3 }}
                                className="absolute top-full right-0 mt-3 w-64 bg-white rounded-3xl shadow-premium border border-secondary-100 z-50 overflow-hidden p-2"
                            >
                                {/* Org Info Panel */}
                                <div className="p-4 border-b border-secondary-50 bg-secondary-50/50 rounded-2xl mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-base shadow">
                                            {orgName?.charAt(0).toUpperCase() || 'O'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-secondary-900 text-sm truncate">{orgName}</p>
                                            <p className="text-[10px] text-secondary-400 flex items-center gap-1 mt-0.5 font-medium">
                                                <Globe className="w-3 h-3" />
                                                /o/{orgUrl}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="space-y-0.5">
                                    <button
                                        onClick={() => { setShowMenu(false); navigate(`/o/${orgUrl}/settings`); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-secondary-600 hover:bg-secondary-50 rounded-xl transition-all"
                                    >
                                        <Settings className="w-4 h-4 text-secondary-400" />
                                        Cài đặt tổ chức
                                    </button>
                                    <button
                                        onClick={() => { setShowMenu(false); navigate(`/o/${orgUrl}/profile`); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-secondary-600 hover:bg-secondary-50 rounded-xl transition-all"
                                    >
                                        <User className="w-4 h-4 text-secondary-400" />
                                        Hồ sơ cá nhân
                                    </button>
                                    <div className="border-t border-secondary-50 my-1 mx-2" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <LogOut className="w-4 h-4 text-red-400" />
                                        Đăng xuất
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <InviteMemberModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                orgId={currentOrgId} 
            />
        </header>
    );
};

export default OrgHeader;

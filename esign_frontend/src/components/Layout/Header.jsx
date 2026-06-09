import React, { useEffect, useState, useRef } from 'react';
import {
    User, Plus, LogOut, Search, Bell, ChevronDown, UserPlus
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { logoutUser, getUserProfile, getWorkSpaces } from '../../service/userApi';
import AddOrganizationModal from '../Modal/AddOrganizationModal';
import InviteMemberModal from '../Modal/InviteMemberModal';
import { useCreateWorkspace } from '../../hooks/useCreateWorkspace';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
    const navigate = useNavigate();
    const { orgUrl } = useParams();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const dropdownRef = useRef(null);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [currentOrgId, setCurrentOrgId] = useState(null);

    useEffect(() => {
        if (!orgUrl) return;
        const fetchOrgId = async () => {
            try {
                const res = await getWorkSpaces();
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) setCurrentOrgId(ws.accountId);
                }
            } catch (err) {
                console.error('Failed to fetch workspaces', err);
            }
        };
        fetchOrgId();
    }, [orgUrl]);

    const { 
        isCreating, 
        showAddOrgModal, 
        setShowAddOrgModal, 
        handleAddOrganization 
    } = useCreateWorkspace((payload) => {
        navigate(`/o/${payload.accountUrl}/work-space`);
    });

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        }
        sessionStorage.clear();
        navigate('/');
    };

    const getInitials = (name) => {
        if (!name) return '';
        return name
            .trim()
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const profile = await getUserProfile();
                setUserProfile(profile);
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        };
        fetchUserProfile();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <header className="h-20 bg-white/85 backdrop-blur-md border-b border-secondary-100 px-8 flex items-center justify-between sticky top-0 z-40">
                {/* Left - Search Bar */}
                <div className="flex items-center">
                    <div className="flex items-center gap-3 bg-secondary-50 border border-secondary-100 rounded-2xl px-4 py-2.5 w-64 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-500/30 transition-all duration-300">
                        <Search className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhanh..."
                            className="bg-transparent text-sm text-secondary-800 placeholder-secondary-400 focus:outline-none w-full font-medium"
                        />
                    </div>
                </div>

                {/* Right - Actions & Profile */}
                <div className="flex items-center gap-3">
                    {/* Invite Member Button (Only in Organization Context) */}
                    {orgUrl && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsInviteModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-secondary-900 text-white text-sm font-bold rounded-2xl hover:bg-secondary-800 transition-all shadow-lg"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden md:inline">Mời thành viên</span>
                        </motion.button>
                    )}

                    {/* Add Workspace Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddOrgModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Thêm không gian</span>
                    </motion.button>

                    {/* Bell Notification */}
                    <button className="relative p-3 rounded-2xl text-secondary-400 hover:bg-secondary-50 hover:text-secondary-700 transition-all">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                    </button>

                    {/* Profile Menu Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-secondary-50 transition-all border border-transparent hover:border-secondary-100"
                        >
                            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                <span className="text-xs font-bold">{userProfile?.name ? getInitials(userProfile.name) : 'NV'}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-secondary-400 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showProfileMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    transition={{ type: "spring", duration: 0.3 }}
                                    className="absolute top-full right-0 mt-3 w-64 bg-white rounded-3xl shadow-premium border border-secondary-100 z-50 overflow-hidden p-2"
                                >
                                    <div className="px-4 py-4 border-b border-secondary-50 bg-secondary-50/50 rounded-2xl mb-1">
                                        <p className="font-bold text-secondary-900 text-sm truncate">{userProfile?.name || 'Nguyễn Văn A'}</p>
                                        <p className="text-[11px] text-secondary-400 truncate mt-0.5 font-medium">{userProfile?.email || 'nguyenvana@example.com'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                navigate('/profile');
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-secondary-600 hover:bg-secondary-50 rounded-xl transition-all"
                                        >
                                            <User className="w-4 h-4 text-secondary-400" />
                                            <span>Hồ sơ cá nhân</span>
                                        </button>
                                        <div className="border-t border-secondary-50 my-1 mx-2" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <LogOut className="w-4 h-4 text-red-400" />
                                            <span>Đăng xuất</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <AddOrganizationModal
                isOpen={showAddOrgModal}
                onClose={() => !isCreating && setShowAddOrgModal(false)}
                onSubmit={handleAddOrganization}
                isLoading={isCreating}
            />

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                orgId={currentOrgId}
            />
        </>
    );
};

export default Header;

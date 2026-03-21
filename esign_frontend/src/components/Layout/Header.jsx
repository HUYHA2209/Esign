import React, { useEffect, useState } from 'react';
import {
    User, Plus, LogOut, Search, Bell, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, getUserProfile } from '../../service/userApi';
import { createOrganization } from '../../service/organizationApi';
import AddOrganizationModal from '../Modal/AddOrganizationModal';
import { toast } from 'react-toastify';

const Header = () => {
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showAddOrgModal, setShowAddOrgModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

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


    const handleAddOrganization = async (data) => {
        const payload = {
            accountUrl: data.url.trim(),
            accountName: data.name.trim(),
            accountType: 'ORGANIZATION',
        };

        setIsCreating(true);
        try {
            await createOrganization(payload);
            toast.success(`Tổ chức "${payload.accountName}" đã được tạo thành công!`);
            setShowAddOrgModal(false);
            // Điều hướng vào trang tổ chức vừa tạo
            navigate(`/o/${payload.accountUrl}/work-space`);
        } catch (error) {
            const msg = error?.response?.data?.message || 'Tạo tổ chức thất bại. Vui lòng thử lại!';
            toast.error(msg);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-40">
                {/* Left - Search */}
                <div className="flex items-center">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-300 transition-all">
                        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm ..."
                            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-full"
                        />
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                    {/* Add Organization Button */}
                    <button
                        onClick={() => setShowAddOrgModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm tổ chức</span>
                    </button>

                    {/* Bell */}
                    <button className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                    </button>

                    {/* Profile Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow">
                                <span className="text-xs font-bold">{userProfile?.name ? getInitials(userProfile.name) : 'NV'}</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfileMenu && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                <div className="px-4 py-4 border-b border-slate-100">
                                    <p className="text-sm font-semibold text-slate-800">{userProfile?.name || 'Nguyễn Văn A'}</p>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{userProfile?.email || 'nguyenvana@example.com'}</p>
                                </div>
                                <div className="py-1.5">
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            navigate('/profile');
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span>Hồ sơ cá nhân</span>
                                    </button>
                                    <div className="mx-4 border-t border-slate-100 my-1" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Đăng xuất</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <AddOrganizationModal
                isOpen={showAddOrgModal}
                onClose={() => !isCreating && setShowAddOrgModal(false)}
                onSubmit={handleAddOrganization}
                isLoading={isCreating}
            />
        </>
    );
};

export default Header;

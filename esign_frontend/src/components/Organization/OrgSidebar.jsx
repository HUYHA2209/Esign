import React from 'react';
import {
    FileSignature, LayoutDashboard, FileText,
    Users, Settings, ChevronDown, Home, Fingerprint
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getWorkSpaces } from '../../service/userApi';

const OrgSidebar = ({ orgUrl, orgName }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentRole, setCurrentRole] = React.useState(null);
    const [permissions, setPermissions] = React.useState({
        canInvite: false,
        canSign: false,
        canUpload: false,
        canViewDocs: false
    });

    React.useEffect(() => {
        if (!orgUrl) return;
        const fetchRole = async () => {
            try {
                const res = await getWorkSpaces();
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setCurrentRole(ws.role);
                        setPermissions({
                            canInvite: ws.canInvite,
                            canSign: ws.canSign,
                            canUpload: ws.canUpload,
                            canViewDocs: ws.canViewDocs
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch workspace role in sidebar', err);
            }
        };
        fetchRole();
        // Force HMR update
        console.log("OrgSidebar rendered with role:", currentRole);
    }, [orgUrl]);

    const navGroups = [
        {
            label: 'Tổng quan',
            items: [
                { id: 'workspace', path: `/o/${orgUrl}/work-space`, icon: Home, label: 'Workspace' },
                { id: 'overview', path: `/o/${orgUrl}/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
                { id: 'documents', path: `/o/${orgUrl}/documents`, icon: FileText, label: 'Tài liệu' },
            ]
        },
        {
            label: 'Quản lý',
            items: [
                { id: 'members', path: `/o/${orgUrl}/members`, icon: Users, label: 'Thành viên' },
                { id: 'signature', path: `/o/${orgUrl}/signature`, icon: Fingerprint, label: 'Chữ ký tổ chức' },
                { id: 'settings', path: `/o/${orgUrl}/settings`, icon: Settings, label: 'Cài đặt' },
            ]
        }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-white border-r border-secondary-200/50 shadow-sm transition-all duration-300">
            <div className="h-20 flex items-center px-6 gap-3 border-b border-secondary-50">
                <div
                    className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-6 transition-transform cursor-pointer"
                    onClick={() => navigate(`/o/${orgUrl}/dashboard`)}
                >
                    <FileSignature className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span
                        className="text-lg font-bold text-secondary-900 tracking-tight cursor-pointer font-display"
                        onClick={() => navigate(`/o/${orgUrl}/dashboard`)}
                    >
                        E-Sign
                    </span>
                    <span className="text-[10px] text-secondary-400 font-medium tracking-widest uppercase">Organization</span>
                </div>
            </div>

            {/* Org Switcher / Home Link */}
            <div className="px-4 py-4 border-b border-secondary-50 bg-secondary-50/20">
                <button
                    onClick={() => navigate(`/o/${orgUrl}/dashboard`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-secondary-50 border border-secondary-100/50 hover:bg-secondary-100 transition-all duration-300 group"
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                        {orgName?.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-secondary-800 truncate">{orgName}</p>
                        <p className="text-[10px] text-secondary-400 truncate mt-0.5 font-medium">/o/{orgUrl}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-secondary-400 group-hover:text-secondary-600 flex-shrink-0 transition-transform" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
                {navGroups.map((group) => (
                    <div key={group.label} className="mb-6">
                        <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-2 mb-3">
                            {group.label}
                        </p>
                        <div className="space-y-1.5">
                            {group.items.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => navigate(item.path)}
                                        className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
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
                                                layoutId="active-nav-org"
                                                className="w-1.5 h-1.5 rounded-full bg-primary-600"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default OrgSidebar;

import React from 'react';
import {
    FileSignature, LayoutDashboard, FileText,
    Users, Settings, ChevronDown, Home
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const OrgSidebar = ({ orgUrl, orgName }) => {
    const navigate = useNavigate();
    const location = useLocation();

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
                { id: 'settings', path: `/o/${orgUrl}/settings`, icon: Settings, label: 'Cài đặt' },
            ]
        }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-white border-r border-slate-100 shadow-sm">
            {/* Brand */}
            <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <FileSignature className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold text-slate-800 tracking-tight">DigiSign</span>
            </div>

            {/* Org Switcher */}
            <div className="px-3 py-3 border-b border-slate-100">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors group"
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow">
                        {orgName?.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-slate-800 truncate">{orgName}</p>
                        <p className="text-[11px] text-slate-400 truncate">/o/{orgUrl}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-2">
                {navGroups.map((group) => (
                    <div key={group.label} className="mb-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
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
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default OrgSidebar;

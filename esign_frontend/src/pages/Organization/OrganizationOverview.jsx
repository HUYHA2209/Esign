import React, { useState, useEffect } from 'react';
import {
    FileText, Users, CheckCircle2, Clock, TrendingUp,
    ArrowUpRight, FilePlus, UserPlus,
    Activity, Zap, ShieldCheck
} from 'lucide-react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getOrganizationDashboard, getMembers } from '../../service/organizationApi';

const formatDate = (dateString) => {
    const d = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ── Stat Card ── */
const StatCard = ({ icon: Icon, label, value, change, color, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative bg-white rounded-[32px] p-8 shadow-premium border border-secondary-100 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-12 -mt-12 opacity-5 ${color}`} />
        <div className={`inline-flex p-4 rounded-2xl mb-6 shadow-sm ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div className="flex items-end justify-between">
            <div>
                <p className="text-3xl font-bold text-secondary-900 font-display leading-none">{value < 10 && value > 0 ? `0${value}` : value}</p>
                <p className="text-sm font-bold text-secondary-400 mt-2 uppercase tracking-widest">{label}</p>
            </div>
            {change && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                    <TrendingUp className="w-3.5 h-3.5" />{change}
                </span>
            )}
        </div>
    </motion.div>
);

/* ── Document Row ── */
const DocRow = ({ name, status, date, assignee }) => {
    const statusStyle = {
        'PENDING': 'bg-amber-50 text-amber-600 border-amber-100',
        'COMPLETED': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'DRAFT': 'bg-primary-50 text-primary-600 border-primary-100',
        'DECLINED': 'bg-red-50 text-red-600 border-red-100',
        'VOID': 'bg-secondary-100 text-secondary-600 border-secondary-200'
    };
    return (
        <div className="flex items-center gap-5 px-8 py-5 hover:bg-secondary-50 transition-all cursor-pointer group border-b border-secondary-50 last:border-0">
            <div className="w-12 h-12 rounded-2xl bg-secondary-50 border border-secondary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-md transition-all">
                <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-secondary-900 truncate group-hover:text-primary-600 transition-colors font-display">{name}</p>
                <p className="text-xs font-bold text-secondary-400 mt-1 uppercase tracking-wider">{date}</p>
            </div>
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border uppercase tracking-wider ${statusStyle[status] || 'bg-secondary-50 text-secondary-500 border-secondary-200'}`}>
                {status}
            </span>
            <div className="w-10 h-10 rounded-2xl premium-gradient p-0.5 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                    <span className="text-[10px] font-bold text-primary-600">{assignee}</span>
                </div>
            </div>
        </div>
    );
};

/* ── Member Card ── */
const MemberCard = ({ name, role, avatar, color, docs }) => (
    <div className="flex items-center gap-4 p-4 rounded-[24px] hover:bg-secondary-50 transition-all border border-transparent hover:border-secondary-100">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
            {avatar}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-secondary-900 truncate font-display">{name}</p>
            <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{role}</p>
        </div>
    </div>
);

/* ── Main Component ── */
const OrganizationOverview = () => {
    const { orgId, orgUrl, orgName } = useOutletContext();
    const navigate = useNavigate();

    const [data, setData] = useState({
        stats: { totalMembers: 0, totalDocuments: 0, completedDocuments: 0, pendingDocuments: 0 },
        recentDocs: [],
        recentActivities: [],
        members: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orgId) return;
        const fetchData = async () => {
            try {
                setLoading(true);
                const [dashRes, membersRes] = await Promise.all([
                    getOrganizationDashboard(orgId),
                    getMembers(orgId)
                ]);

                setData({
                    stats: {
                        totalMembers: dashRes.result.totalMembers,
                        totalDocuments: dashRes.result.totalDocuments,
                        completedDocuments: dashRes.result.completedDocuments,
                        pendingDocuments: dashRes.result.pendingDocuments
                    },
                    recentDocs: dashRes.result.recentDocuments || [],
                    recentActivities: dashRes.result.recentActivities || [],
                    members: membersRes.result.slice(0, 4) // Show top 4 members
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orgId]);

    const getIconForActivity = (type) => {
        switch (type) {
            case 'COMPLETED': return { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' };
            case 'VIEWED': return { icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-100' };
            case 'CREATED': return { icon: FilePlus, color: 'text-blue-500 bg-blue-50 border-blue-100' };
            case 'JOINED': return { icon: UserPlus, color: 'text-primary-500 bg-primary-50 border-primary-100' };
            default: return { icon: Activity, color: 'text-secondary-500 bg-secondary-50 border-secondary-100' };
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full">Đang tải dữ liệu...</div>;
    }

    const activity = [
        { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 border-emerald-100', msg: '"Hợp đồng dịch vụ" đã được ký xong', time: '5 phút trước' },
        { icon: UserPlus, color: 'text-primary-500 bg-primary-50 border-primary-100', msg: 'Phạm Thị D vừa tham gia tổ chức', time: '1 giờ trước' },
        { icon: FilePlus, color: 'text-blue-500 bg-blue-50 border-blue-100', msg: 'Tài liệu mới "Biên bản bàn giao" được tạo', time: '3 giờ trước' },
        { icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-100', msg: '"NDA bảo mật" đã được gửi đến 3 người', time: 'Hôm qua' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Page title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 font-display">Tổng quan hệ thống</h1>
                    <p className="text-secondary-400 font-medium mt-1">Hoạt động mới nhất tại <span className="text-primary-600 font-bold">{orgName}</span></p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Users} label="Thành viên" value={data.stats.totalMembers} color="bg-primary-500" index={0} />
                <StatCard icon={FileText} label="Tài liệu" value={data.stats.totalDocuments} color="bg-blue-500" index={1} />
                <StatCard icon={CheckCircle2} label="Đã hoàn tất" value={data.stats.completedDocuments} color="bg-emerald-500" index={2} />
                <StatCard icon={Clock} label="Đang chờ ký" value={data.stats.pendingDocuments} color="bg-amber-500" index={3} />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Recent documents */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden"
                >
                    <div className="flex items-center justify-between px-8 py-6 border-b border-secondary-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-secondary-900 font-display">Tài liệu gần đây</h2>
                        </div>
                        <button
                            onClick={() => navigate(`/o/${orgUrl}/documents`)}
                            className="px-4 py-2 text-xs font-bold text-primary-600 hover:bg-primary-50 rounded-xl flex items-center gap-2 transition-all uppercase tracking-widest"
                        >
                            Xem tất cả <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-secondary-50">
                        {data.recentDocs.length === 0 ? (
                            <div className="p-8 text-center text-secondary-500 text-sm">Chưa có tài liệu nào</div>
                        ) : (
                            data.recentDocs.map((d, i) => (
                                <DocRow 
                                    key={i} 
                                    name={d.title} 
                                    status={d.status} 
                                    date={formatDate(d.createdAt)} 
                                    assignee={d.uploadedBy ? d.uploadedBy.substring(0, 2).toUpperCase() : 'SYS'} 
                                />
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Right column */}
                <div className="space-y-8">
                    {/* Members */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-8 py-6 border-b border-secondary-50">
                            <h2 className="text-lg font-bold text-secondary-900 font-display">Thành viên</h2>
                            <button
                                onClick={() => navigate(`/o/${orgUrl}/members`)}
                                className="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                            >
                                <ArrowUpRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {data.members.length === 0 ? (
                                <div className="p-4 text-center text-secondary-500 text-sm">Chưa có thành viên</div>
                            ) : (
                                data.members.map((m, i) => (
                                    <MemberCard 
                                        key={i} 
                                        name={m.fullName || m.email} 
                                        role={m.role === 'OWNER' ? 'Chủ sở hữu' : m.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'} 
                                        avatar={(m.fullName || m.email).substring(0, 2).toUpperCase()} 
                                        color={m.role === 'OWNER' ? 'from-indigo-400 to-purple-500' : 'from-emerald-400 to-teal-500'} 
                                    />
                                ))
                            )}
                        </div>
                        <div className="px-8 pb-6">
                            <button 
                                onClick={() => navigate(`/o/${orgUrl}/members`)}
                                className="w-full py-3 bg-secondary-50 text-secondary-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-secondary-100 transition-all border border-secondary-100">
                                Quản lý thành viên
                            </button>
                        </div>
                    </motion.div>

                    {/* Activity feed */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden"
                    >
                        <div className="px-8 py-6 border-b border-secondary-50 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                            <h2 className="text-lg font-bold text-secondary-900 font-display">Luồng hoạt động</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {data.recentActivities.length === 0 ? (
                                <div className="text-center text-secondary-500 text-sm">Chưa có hoạt động nào</div>
                            ) : (
                                data.recentActivities.map((a, i) => {
                                    const { icon: ActivityIcon, color } = getIconForActivity(a.type);
                                    return (
                                        <div key={i} className="flex items-start gap-4 group">
                                            <div className={`p-3 rounded-2xl flex-shrink-0 border transition-all group-hover:scale-110 ${color}`}>
                                                <ActivityIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-secondary-800 leading-relaxed group-hover:text-primary-600 transition-colors">{a.message}</p>
                                                <p className="text-[10px] font-bold text-secondary-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock className="w-3 h-3" /> {formatDate(a.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationOverview;

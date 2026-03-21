import React from 'react';
import {
    FileText, Users, CheckCircle2, Clock, TrendingUp,
    MoreHorizontal, ArrowUpRight, FilePlus, UserPlus,
    Activity, Zap, Star
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

/* ── Stat Card ── */
const StatCard = ({ icon: Icon, label, value, change, color }) => (
    <div className={`relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all`}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-10 ${color}`} />
        <div className={`inline-flex p-2.5 rounded-xl mb-4 ${color} bg-opacity-10`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        {change && (
            <span className="absolute bottom-4 right-4 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />{change}
            </span>
        )}
    </div>
);

/* ── Document Row ── */
const DocRow = ({ name, status, date, assignee }) => {
    const statusStyle = {
        'Chờ ký': 'bg-amber-50 text-amber-600',
        'Hoàn tất': 'bg-emerald-50 text-emerald-600',
        'Đã gửi': 'bg-blue-50 text-blue-600',
    };
    return (
        <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{date}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[status] || 'bg-slate-100 text-slate-500'}`}>
                {status}
            </span>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {assignee}
            </div>
        </div>
    );
};

/* ── Member Row ── */
const MemberCard = ({ name, role, avatar, color, docs }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
            {avatar}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
            <p className="text-xs text-slate-400">{role}</p>
        </div>
        <span className="text-xs text-slate-400">{docs} tài liệu</span>
    </div>
);

/* ── Main Component ── */
const OrganizationOverview = () => {
    const { orgUrl } = useParams();
    const navigate = useNavigate();

    const orgName = orgUrl
        ? orgUrl.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Tổ chức';

    const docs = [
        { name: 'Hợp đồng dịch vụ Q1/2025', status: 'Chờ ký', date: 'Hôm nay, 09:30', assignee: 'NV' },
        { name: 'Biên bản bàn giao dự án', status: 'Hoàn tất', date: 'Hôm qua, 14:15', assignee: 'TB' },
        { name: 'Thỏa thuận bảo mật NDA', status: 'Đã gửi', date: '10/03/2025', assignee: 'LC' },
        { name: 'Phụ lục hợp đồng số 3', status: 'Chờ ký', date: '09/03/2025', assignee: 'PD' },
        { name: 'Báo cáo kiểm toán 2024', status: 'Hoàn tất', date: '07/03/2025', assignee: 'NV' },
    ];

    const members = [
        { name: 'Nguyễn Văn A', role: 'Chủ sở hữu', avatar: 'NV', color: 'from-indigo-400 to-purple-500', docs: 12 },
        { name: 'Trần Thị B', role: 'Quản trị viên', avatar: 'TB', color: 'from-emerald-400 to-teal-500', docs: 8 },
        { name: 'Lê Văn C', role: 'Thành viên', avatar: 'LC', color: 'from-amber-400 to-orange-500', docs: 5 },
        { name: 'Phạm Thị D', role: 'Thành viên', avatar: 'PD', color: 'from-pink-400 to-rose-500', docs: 3 },
    ];

    const activity = [
        { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50', msg: '"Hợp đồng dịch vụ" đã được ký xong', time: '5 phút trước' },
        { icon: UserPlus, color: 'text-indigo-500 bg-indigo-50', msg: 'Phạm Thị D vừa tham gia tổ chức', time: '1 giờ trước' },
        { icon: FilePlus, color: 'text-blue-500 bg-blue-50', msg: 'Tài liệu mới "Biên bản bàn giao" được tạo', time: '3 giờ trước' },
        { icon: Zap, color: 'text-amber-500 bg-amber-50', msg: '"NDA bảo mật" đã được gửi đến 3 người', time: 'Hôm qua' },
    ];

    return (
        <div className="space-y-7">
            {/* Page title */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-400 mt-1">Tổng quan hoạt động của {orgName}</p>
                </div>
                <button
                    onClick={() => navigate(`/o/${orgUrl}/documents`)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                >
                    <FilePlus className="w-4 h-4" />
                    Tạo tài liệu
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Thành viên" value="12" change="+2" color="bg-indigo-500" />
                <StatCard icon={FileText} label="Tài liệu" value="48" change="+7" color="bg-blue-500" />
                <StatCard icon={CheckCircle2} label="Đã ký xong" value="36" change="75%" color="bg-emerald-500" />
                <StatCard icon={Clock} label="Chờ ký" value="8" color="bg-amber-500" />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent documents */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <h2 className="text-sm font-semibold text-slate-800">Tài liệu gần đây</h2>
                        <button
                            onClick={() => navigate(`/o/${orgUrl}/documents`)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {docs.map((d, i) => <DocRow key={i} {...d} />)}
                    </div>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                    {/* Members */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="text-sm font-semibold text-slate-800">Thành viên</h2>
                            <button
                                onClick={() => navigate(`/o/${orgUrl}/members`)}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                            >
                                Quản lý <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="p-3 space-y-1">
                            {members.map((m, i) => <MemberCard key={i} {...m} />)}
                        </div>
                    </div>

                    {/* Activity feed */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h2 className="text-sm font-semibold text-slate-800">Hoạt động</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {activity.map((a, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${a.color}`}>
                                        <a.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-700 leading-snug">{a.msg}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{a.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationOverview;

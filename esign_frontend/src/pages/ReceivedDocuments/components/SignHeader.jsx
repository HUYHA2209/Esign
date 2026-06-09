import React from 'react';
import { FileSignature, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SignHeader = ({ documentTitle, role, fieldsRemaining, onComplete, isSigning, canComplete }) => {
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-md border-b border-secondary-100 px-6 py-4 flex items-center justify-between shadow-premium">
            <div className="flex items-center gap-6">
                <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: '#f8fafc' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/documents')}
                    className="p-2.5 rounded-xl text-secondary-400 hover:text-primary-600 transition-colors border border-transparent hover:border-secondary-100"
                >
                    <ArrowLeft className="w-5 h-5" />
                </motion.button>

                {/* LOGO */}
                <div className="hidden md:flex items-center gap-3 pr-6 border-r border-secondary-100">
                    <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <FileSignature className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-secondary-900 tracking-tight font-display">
                        E-Sign
                    </span>
                </div>

                {/* TITLE & ROLE */}
                <div className="flex items-center gap-4">
                    <h1 className="text-secondary-900 font-bold text-base max-w-[200px] md:max-w-[400px] truncate font-display">
                        {documentTitle}
                    </h1>
                    <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" />
                        {role}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Progress Info */}
                <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-secondary-50 rounded-xl border border-secondary-100">
                    <Clock className="w-4 h-4 text-secondary-400" />
                    <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">
                        {fieldsRemaining === 0 ? (
                            <span className="text-emerald-600">Đã hoàn thành tất cả</span>
                        ) : (
                            <span>Còn <span className="text-primary-600">{fieldsRemaining}</span> trường cần ký</span>
                        )}
                    </p>
                </div>

                {/* Action Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onComplete}
                    disabled={!canComplete || isSigning}
                    className={`relative inline-flex items-center justify-center px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                        canComplete 
                        ? 'premium-gradient text-white shadow-primary-500/30' 
                        : 'bg-secondary-100 text-secondary-400 shadow-none'
                    }`}
                >
                    {isSigning ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Đang ký...</span>
                        </div>
                    ) : (
                        <span>Hoàn tất ký</span>
                    )}
                </motion.button>
            </div>
        </nav>
    );
};

export default SignHeader;

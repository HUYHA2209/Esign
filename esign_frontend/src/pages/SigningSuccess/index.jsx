import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Share2, Home, Loader2, FileSignature, ChevronDown } from 'lucide-react';
import { getSignature } from '../../service/signatureApi';
import { getUserProfile } from '../../service/userApi';

const SigningSuccess = () => {
    const { id: groupId, orgUrl } = useParams();
    const navigate = useNavigate();
    const [savedSignature, setSavedSignature] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

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
        const fetchData = async () => {
            try {
                const [sigResponse, profileResponse] = await Promise.all([
                    getSignature(),
                    getUserProfile()
                ]);
                
                if (sigResponse?.result) {
                    setSavedSignature(sigResponse.result);
                }
                if (profileResponse) {
                    setUserProfile(profileResponse);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="h-20 bg-white/80 backdrop-blur-md border-b border-secondary-100 px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <FileSignature className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-secondary-900 tracking-tight font-display">
                        E-Sign
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-sm font-bold text-secondary-900">{userProfile?.name || 'User'}</span>
                        <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Cá nhân</span>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-xs">
                        {userProfile?.name ? getInitials(userProfile.name) : 'NV'}
                    </div>
                </div>
            </nav>

            <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl -z-10" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl w-full text-center space-y-8"
                >
                    {/* Signature Card */}
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-[32px] p-8 shadow-premium border border-secondary-100 relative group"
                    >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-secondary-50 border border-secondary-100 rounded-full text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                            {groupId ? `Group ID: ${groupId}` : 'Document Signed'}
                        </div>
                        
                        <div className="aspect-[16/9] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-secondary-200 overflow-hidden">
                            {loading ? (
                                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                            ) : savedSignature?.imageBase64 ? (
                                <img 
                                    src={savedSignature.imageBase64} 
                                    alt="Your Signature" 
                                    className="max-w-[80%] max-h-[80%] object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-secondary-300">
                                    <FileSignature className="w-12 h-12" />
                                    <span className="text-xs font-medium">No signature preview</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Success Message */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3">
                            <h1 className="text-4xl font-bold text-secondary-900 font-display">Tài liệu đã ký</h1>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-orange-500 bg-orange-50 w-fit mx-auto px-4 py-2 rounded-full border border-orange-100">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-wider">Đang xử lý tài liệu</span>
                        </div>

                        <p className="text-secondary-500 font-medium max-w-sm mx-auto leading-relaxed">
                            Tất cả người nhận đã hoàn tất ký. Tài liệu đang được hệ thống xử lý và bạn sẽ sớm nhận được bản sao qua email.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-secondary-700 font-bold text-sm rounded-2xl shadow-sm border border-secondary-200 hover:bg-secondary-50 transition-all"
                        >
                            <Share2 className="w-4 h-4" />
                            Chia sẻ
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(orgUrl ? `/o/${orgUrl}/documents` : '/documents')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-3.5 premium-gradient text-white font-bold text-sm rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/35 transition-all"
                        >
                            <Home className="w-4 h-4" />
                            Quay lại trang chủ
                        </motion.button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default SigningSuccess;

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, User, CheckCircle2, Shield, FileText, Upload, Users, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { verifyInvitation, acceptInvitation, rejectInvitation } from '../../service/organizationApi';

const cardVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.05, y: -20 }
};

export default function InvitationLink() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invitationData, setInvitationData] = useState(null);

  useEffect(() => {
    if (!token) {
      toast.error('Link lời mời không hợp lệ hoặc đã thiếu token.');
      navigate('/login');
      return;
    }

    const fetchInvitation = async () => {
      try {
        const response = await verifyInvitation(token);
        if (response.code === 1000) {
          setInvitationData(response.result);
        } else {
          toast.error(response.message || 'Không thể xác thực lời mời.');
          navigate('/login');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lấy thông tin lời mời.');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token, navigate]);

  const handleAction = async (action) => {
    setIsProcessing(true);
    try {
      if (action === 'accept') {
        await acceptInvitation(token);
        toast.success('Bạn đã chấp nhận lời mời tham gia tổ chức!');
        navigate('/dashboard');
      } else {
        await rejectInvitation(token);
        toast.info('Bạn đã từ chối lời mời tham gia tổ chức.');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau!');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mb-4"></div>
        <p className="text-white font-medium">Đang tải thông tin lời mời...</p>
      </div>
    );
  }

  const permissions = [
    { key: 'canViewDocs', label: 'Xem tài liệu', icon: FileText, active: invitationData.canViewDocs },
    { key: 'canUpload', label: 'Tải lên tài liệu', icon: Upload, active: invitationData.canUpload },
    { key: 'canSign', label: 'Ký tài liệu', icon: CheckCircle2, active: invitationData.canSign },
    { key: 'canInvite', label: 'Mời thành viên', icon: Users, active: invitationData.canInvite },
  ];

  return (
    <div className="min-h-screen bg-secondary-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-primary-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-primary-900/30 rounded-full blur-[120px] pointer-events-none"></div>
      
      <motion.div 
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary-500/10 overflow-hidden relative z-10"
      >
        <div className="premium-gradient p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md mb-4 shadow-lg">
              <Building2 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold font-display mb-2">Lời Mời Tham Gia Tổ Chức</h2>
            <p className="text-primary-100 text-lg">Bạn đã nhận được một lời mời mới trên hệ thống E-Sign</p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="space-y-8">
            
            {/* Info Section */}
            <div className="bg-secondary-50 rounded-2xl p-6 border border-secondary-100">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Tên Tổ Chức / Công Ty</label>
                  <div className="flex items-center gap-2 text-secondary-900 font-bold text-lg">
                    <Building2 className="w-5 h-5 text-primary-500" />
                    {invitationData.accountName}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Được mời bởi</label>
                  <div className="flex items-center gap-2 text-secondary-900 font-bold text-lg">
                    <User className="w-5 h-5 text-primary-500" />
                    {invitationData.ownerName}
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-secondary-900">Các quyền hạn được cấp</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {permissions.map((perm) => (
                  <div 
                    key={perm.key} 
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      perm.active 
                        ? 'bg-primary-50 border-primary-200 text-primary-900 shadow-sm' 
                        : 'bg-secondary-50/50 border-secondary-100 text-secondary-400 opacity-60'
                    }`}
                  >
                    <perm.icon className={`w-5 h-5 ${perm.active ? 'text-primary-500' : 'text-secondary-400'}`} />
                    <span className="font-semibold text-sm">{perm.label}</span>
                    {perm.active && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-secondary-100">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAction('reject')}
                disabled={isProcessing}
                className="flex-1 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold py-4 rounded-2xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Từ Chối Lời Mời
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAction('accept')}
                disabled={isProcessing}
                className="flex-1 premium-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Chấp Nhận Tham Gia
                  </>
                )}
              </motion.button>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}

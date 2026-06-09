import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkSpaces, switchWorkSpace, deleteWorkSpace } from '../../service/userApi';
import { Briefcase, Calendar, Shield, ArrowRight, Star, Trash2, AlertTriangle, User, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import AddOrganizationModal from '../../components/Modal/AddOrganizationModal';
import { useCreateWorkspace } from '../../hooks/useCreateWorkspace';

export default function Dashboard() {
  const navigate = useNavigate();
  const [workSpace, setWorkSpace] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { 
      isCreating, 
      showAddOrgModal, 
      setShowAddOrgModal, 
      handleAddOrganization 
  } = useCreateWorkspace((payload) => {
      navigate(`/o/${payload.accountUrl}/dashboard`);
  });

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await getWorkSpaces();
        if (response && response.result) {
          const formattedWorkspaces = response.result.map((item) => ({
            id: item.accountId,
            type: item.accountType.toLowerCase(),
            name: item.accountName,
            initial: item.accountName ? item.accountName.charAt(0).toUpperCase() : '?',
            role: item.role,
            url: item.accountUrl,
            createdTime: '18/12/2024' // Mock data
          }));
          setWorkSpace(formattedWorkspaces);

          const personalWorkspace = formattedWorkspaces.find(ws => ws.type === 'personal');
          if (personalWorkspace) {
            setCurrentWorkspace(personalWorkspace);
          } else if (formattedWorkspaces.length > 0) {
            setCurrentWorkspace(formattedWorkspaces[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch workspaces", error);
      }
    }
    fetchWorkspaces();
  }, [])


  const handleSwitchWorkspace = async (workspace) => {
    try {
      const res = await switchWorkSpace(workspace.id);
      if (res && res.result) {
        sessionStorage.setItem('token', res.result.token);
        setCurrentWorkspace(workspace);

        if (workspace.type === 'personal') {
          navigate('/dashboard');
        } else {
          navigate(`/o/${workspace.url}/dashboard`);
        }
      }
    } catch (error) {
      console.error("Failed to switch workspace", error);
    }
  };

  const confirmDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    setIsDeleting(true);
    try {
        await deleteWorkSpace(workspaceToDelete.id);
        setWorkSpace(workSpace.filter(ws => ws.id !== workspaceToDelete.id));
        toast.success(`Đã xóa không gian làm việc "${workspaceToDelete.name}" thành công!`);
        setWorkspaceToDelete(null);
    } catch (error) {
        console.error("Failed to delete workspace", error);
        toast.error("Không thể xóa không gian làm việc. Vui lòng thử lại!");
    } finally {
        setIsDeleting(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-secondary-900 font-display mb-2">Không gian làm việc</h2>
        <p className="text-secondary-500 font-medium">Quản lý và chuyển đổi giữa các không gian làm việc của bạn</p>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {workSpace.map((ws, index) => (
          <motion.div
            key={index}
            onClick={() => handleSwitchWorkspace(ws)}
            variants={itemAnim}
            whileHover={{ y: -8 }}
            className="group relative bg-white rounded-[32px] p-8 shadow-premium border border-secondary-100 hover:border-primary-100 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 group-hover:bg-primary-100 transition-colors"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500 text-white ${
                  ws.type === 'personal' 
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/25' 
                    : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/25'
                  }`}>
                  {ws.type === 'personal' ? (
                    <User className="w-7 h-7" />
                  ) : (
                    <Building2 className="w-7 h-7" />
                  )}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-secondary-900 font-display mb-2 group-hover:text-primary-600 transition-colors">{ws.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    ws.type === 'personal' 
                      ? 'bg-primary-50 text-primary-700 border-primary-100/30' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100/30'
                    }`}>
                    {ws.type === 'personal' ? 'Cá nhân' : 'Tổ chức'}
                  </span>
                  {ws.type === 'personal' && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-secondary-50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1">Vai trò</span>
                  <span className="text-sm font-bold text-secondary-700">{ws.role}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-1">Ngày tạo</span>
                  <span className="text-sm font-bold text-secondary-700">{ws.createdTime}</span>
                </div>
              </div>

              <div className="absolute top-6 right-6 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 z-20">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg">
                  <ArrowRight className="w-5 h-5" />
                </div>
                {ws.type !== 'personal' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setWorkspaceToDelete(ws); }}
                    className="w-10 h-10 bg-white border border-red-100 rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add New Workspace Card */}
        <motion.div
          variants={itemAnim}
          whileHover={{ y: -8 }}
          onClick={() => setShowAddOrgModal(true)}
          className="group border-2 border-dashed border-secondary-200 rounded-[32px] p-8 flex flex-col items-center justify-center text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all duration-300 cursor-pointer"
        >
          <div className="w-16 h-16 bg-secondary-50 rounded-2xl flex items-center justify-center mb-6 text-secondary-400 group-hover:bg-primary-100 group-hover:text-primary-600 transition-all">
            <span className="text-3xl font-light">+</span>
          </div>
          <h3 className="text-xl font-bold text-secondary-800 mb-2">Thêm không gian</h3>
          <p className="text-sm text-secondary-500 font-medium">Tạo không gian làm việc mới cho tổ chức của bạn</p>
        </motion.div>
      </motion.div>

      <AddOrganizationModal
        isOpen={showAddOrgModal}
        onClose={() => !isCreating && setShowAddOrgModal(false)}
        onSubmit={handleAddOrganization}
        isLoading={isCreating}
      />

      <AnimatePresence>
        {workspaceToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-secondary-950/40 backdrop-blur-sm" 
              onClick={() => !isDeleting && setWorkspaceToDelete(null)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative bg-white rounded-[32px] shadow-premium border border-red-100 w-full max-w-md overflow-hidden z-10"
            >
              <div className="flex items-center gap-5 px-8 py-6 border-b border-red-50 bg-red-50/30">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                      <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-red-700 font-display">Xóa không gian</h3>
                      <p className="text-xs font-medium text-red-500">Hành động này không thể hoàn tác</p>
                  </div>
              </div>
              <div className="p-8">
                  <p className="text-sm font-medium text-secondary-600 leading-relaxed mb-8">
                      Bạn có chắc chắn muốn xóa không gian làm việc <span className="font-black text-secondary-900">{workspaceToDelete.name}</span>? Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn.
                  </p>
                  <div className="flex justify-end gap-3 pt-4 border-t border-secondary-50">
                      <button 
                        onClick={() => setWorkspaceToDelete(null)}
                        disabled={isDeleting}
                        className="px-5 py-3 text-sm font-bold text-secondary-500 hover:text-secondary-800 transition-colors disabled:opacity-50"
                      >
                          Hủy bỏ
                      </button>
                      <button 
                        onClick={confirmDeleteWorkspace} 
                        disabled={isDeleting} 
                        className="px-6 py-3.5 text-sm font-bold bg-red-600 text-white rounded-2xl shadow-lg shadow-red-500/25 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                          {isDeleting ? (
                              <>
                                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                  Đang xóa...
                              </>
                          ) : (
                              <>
                                  <Trash2 className="w-4 h-4" />
                                  Xóa vĩnh viễn
                              </>
                          )}
                      </button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

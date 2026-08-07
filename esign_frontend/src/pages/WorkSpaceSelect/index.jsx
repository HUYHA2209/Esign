
/*import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, User, Building2, ChevronRight, Plus } from 'lucide-react';
import { getWorkSpaces } from '../../service/userApi';

const WorkspaceSelector = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const [workspaces, setWorkspaces] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await getWorkSpaces();
        if (response && response.result) {
          setWorkspaces(response.result.map((item) => ({
            type: item.accountType ? item.accountType.toLowerCase() : 'personal',
            name: item.accountName,
            initial: item.accountName ? item.accountName.charAt(0).toUpperCase() : '?',
            role: item.role,
            id: item.accountId // Assuming usage later
          })));
        }
      } catch (error) {
        console.error("Failed to fetch workspaces", error);
        // alert("Không thể tải danh sách không gian làm việc."); 
      }
    };

    fetchWorkspaces();
  }, []);

  const handleSelectWorkspace = (workspace) => {
    console.log('Selected workspace:', workspace);
    // Navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-8">
    
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <FileSignature className="w-10 h-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-800">E-Sign</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Chào Nguyễn Văn A, chọn không gian làm việc của bạn
          </h1>
          <p className="text-gray-500">
            Bạn là thành viên của {workspaces.length} tổ chức
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {workspaces.map((workspace, index) => (
            <button
              key={index}
              onClick={() => handleSelectWorkspace(workspace)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${hoveredIndex === index ? 'bg-gray-100 shadow-md' : 'bg-white hover:bg-gray-50'
                } border-2 border-transparent hover:border-blue-200`}
            >
              <div className="flex items-center space-x-4">
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${workspace.type === 'personal'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-blue-100'
                  }`}>
                  {workspace.type === 'personal' ? (
                    <User className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-xl font-bold text-blue-700">
                      {workspace.initial}
                    </span>
                  )}
                </div>

                
                <div className="text-left">
                  <div className="font-bold text-gray-900 text-lg">
                    {workspace.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {workspace.role}
                  </div>
                </div>
              </div>

              
              <ChevronRight className={`w-6 h-6 text-gray-400 transition-transform ${hoveredIndex === index ? 'translate-x-1 text-blue-600' : ''
                }`} />
            </button>
          ))}
        </div>

        
        <div className="pt-6 border-t border-gray-200">
          <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold transition mx-auto">
            <Plus className="w-5 h-5" />
            <span>Tạo tổ chức mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSelector;*/
import React, { useEffect, useState } from 'react';
import { getWorkSpaces } from '../../service/userApi';
import { Briefcase, Calendar, Shield } from 'lucide-react';

export default function Dashboard() {
  const [workSpace, setWorkSpace] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await getWorkSpaces();
        if (response && response.result) {
          const formattedWorkspaces = response.result.map((item) => ({
            type: item.accountType.toLowerCase(),
            name: item.accountName,
            initial: item.accountName ? item.accountName.charAt(0).toUpperCase() : '?',
            role: item.role,
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Danh sách không gian làm việc</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workSpace.map((ws, index) => (
          <div
            key={index}
            className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 h-48 border border-slate-200 overflow-hidden cursor-pointer"
          >
            {/* Default State */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 transition-opacity duration-300 group-hover:opacity-0">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center">{ws.name}</h3>
            </div>

            {/* Hover State */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
              <h3 className="text-2xl font-bold mb-4">{ws.name}</h3>

              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 opacity-80" />
                <span className="font-medium">Vai trò: {ws.role}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 opacity-80" />
                <span className="font-medium">Ngày tạo: {ws.createdTime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

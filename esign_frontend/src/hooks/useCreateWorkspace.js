import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createOrganization } from '../service/organizationApi';
import { switchWorkSpace } from '../service/userApi';

export const useCreateWorkspace = (onSuccessCallback) => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [showAddOrgModal, setShowAddOrgModal] = useState(false);

    const handleAddOrganization = async (data) => {
        const payload = {
            accountUrl: data.url.trim(),
            accountName: data.name.trim(),
            accountType: data.type || 'ORGANIZATION',
        };

        setIsCreating(true);
        try {
            const res = await createOrganization(payload);
            const newAccountId = res?.result;

            toast.success(`Không gian "${payload.accountName}" đã được tạo thành công!`);
            setShowAddOrgModal(false);
            
            // Tự động chuyển đổi session token sang tổ chức mới
            if (newAccountId) {
                try {
                    const switchRes = await switchWorkSpace(newAccountId);
                    if (switchRes && switchRes.result) {
                        sessionStorage.setItem('token', switchRes.result.token);
                    }
                } catch (switchError) {
                    console.error('Không thể tự động chuyển không gian làm việc', switchError);
                }
            }
            
            if (onSuccessCallback) {
                onSuccessCallback(payload);
            } else {
                navigate(`/o/${payload.accountUrl}/dashboard`);
            }
        } catch (error) {
            const msg = error?.response?.data?.message || 'Tạo thất bại. Vui lòng thử lại!';
            toast.error(msg);
        } finally {
            setIsCreating(false);
        }
    };

    return {
        isCreating,
        showAddOrgModal,
        setShowAddOrgModal,
        handleAddOrganization
    };
};

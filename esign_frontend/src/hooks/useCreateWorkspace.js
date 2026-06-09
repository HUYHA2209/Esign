import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createOrganization } from '../service/organizationApi';

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
            await createOrganization(payload);
            toast.success(`Không gian "${payload.accountName}" đã được tạo thành công!`);
            setShowAddOrgModal(false);
            
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

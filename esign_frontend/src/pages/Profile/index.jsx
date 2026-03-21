import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getUserProfile, updateUserProfile } from '../../service/userApi';


const Profile = () => {
    const defaultForm = { name: '', email: '', phone: '', avatar: null };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const profile = await getUserProfile();
                setFormData(profile || defaultForm);
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        };
        fetchUserProfile();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const updated = await updateUserProfile({ name: formData.name, phone: formData.phone });
            setFormData({ ...formData, name: updated.name, phone: updated.phone });
            toast.success("Cập nhật hồ sơ thành công!");
        } catch (err) {
            console.error('Failed to update profile', err);
            toast.error('Cập nhật hồ sơ thất bại');
        }
    };

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

    return (
        <div className="max-w-4xl">
            <div className="mb-10 border-b border-slate-100 pb-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Profile</h1>
                <p className="text-slate-500 text-lg">Here you can edit your personal details.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Avatar Section */}
                <div>
                    <label className="block text-base font-semibold text-slate-900 mb-3">Avatar</label>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-lg text-2xl font-bold text-white uppercase">
                             {getInitials(formData.name)}
                        </div>
                        <button
                            type="button"
                            className="px-6 py-2.5 bg-slate-100 text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Upload Avatar
                        </button>
                    </div>
                </div>

                {/* Full Name */}
                <div>
                    <label className="block text-base font-semibold text-slate-900 mb-2">Full Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-base font-semibold text-slate-900 mb-2">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed shadow-sm"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-base font-semibold text-slate-900 mb-2">Phone</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    />
                </div>

                {/* Save Button */}
                <button
                    type="submit"
                    className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md"
                >
                    Save Changes
                </button>
            </form>
        </div>
    );
};

export default Profile;

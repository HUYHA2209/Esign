import React, { useState, useRef } from 'react';
import { PenTool, Trash2, Edit2, CheckCircle2, Type, Upload, Eraser, Image as ImageIcon, Save } from 'lucide-react';
import SignaturePad from '../../components/SignaturePad/SignaturePad';
import { toast } from 'react-toastify';
import { saveSignature, getSignature } from '../../service/signatureApi';
import { motion, AnimatePresence } from 'framer-motion';

import { startRegistration, finishRegistration, startAuthentication, finishAuthentication, getPasskeyStatus } from '../../service/webAuthnApi';
import { base64urlToBuffer, credentialToJSON } from '../../utils/webauthn';

const Signature = () => {
    const [signature, setSignature] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [creationTab, setCreationTab] = useState('draw');
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [typedName, setTypedName] = useState('Nguyễn Văn A');
    const [selectedFont, setSelectedFont] = useState(0);
    const [passkeyStatus, setPasskeyStatus] = useState(false);

    const fonts = ["Dancing Script", "Great Vibes", "Sacramento"];

    React.useEffect(() => {
        const fetchSignature = async () => {
            try {
                const response = await getSignature();
                if (response && response.result && response.result.imageUrl) {
                    setSignature(response.result.imageUrl);
                }
            } catch (error) {
                console.error("Failed to fetch signature", error);
            }
        };
        const fetchPasskeyStatus = async () => {
            try {
                const response = await getPasskeyStatus();
                if (response) {
                    setPasskeyStatus(response.result);
                }
            } catch (error) {
                console.error("Failed to fetch passkey status", error);
            }
        };
        fetchSignature();
        fetchPasskeyStatus();
    }, []);

    const authenticatePasskey = async () => {
        try {
            const startResponse = await startAuthentication();
            const optionsJson = startResponse.result.optionsJson;
            const options = JSON.parse(optionsJson);

            if (options.challenge) options.challenge = base64urlToBuffer(options.challenge);
            if (options.allowCredentials) {
                options.allowCredentials = options.allowCredentials.map(c => ({
                    ...c,
                    id: base64urlToBuffer(c.id)
                }));
            }

            const credential = await navigator.credentials.get({ publicKey: options });

            const credentialJson = credentialToJSON(credential);
            await finishAuthentication(credentialJson);

            toast.success("Xác thực Passkey thành công!");
            return true;
        } catch (error) {
            console.error("Auth Error", error);
            if (error.name === 'NotAllowedError') {
                toast.info("Bạn đã hủy xác thực.");
            } else {
                toast.error("Xác thực thất bại: " + error.message);
            }
            return false;
        }
    };

    const registerPasskey = async () => {
        try {
            if (!window.PublicKeyCredential) {
                toast.error("Trình duyệt không hỗ trợ WebAuthn");
                return false;
            }

            const startResponse = await startRegistration();
            const optionsJson = startResponse.result.optionsJson;
            const options = JSON.parse(optionsJson);

            if (options.challenge) {
                const challengeVal = (typeof options.challenge === 'string') ? options.challenge : options.challenge.value;
                options.challenge = base64urlToBuffer(challengeVal);
            }
            if (options.user && options.user.id) {
                const userIdVal = (typeof options.user.id === 'string') ? options.user.id : options.user.id;
                options.user.id = base64urlToBuffer(userIdVal);
            }

            if (options.excludeCredentials) {
                options.excludeCredentials = options.excludeCredentials.map(c => ({
                    ...c,
                    id: base64urlToBuffer(c.id)
                }));
            }

            const credential = await navigator.credentials.create({ publicKey: options });

            const credentialJson = credentialToJSON(credential);
            await finishRegistration(credentialJson);

            toast.success("Đăng ký Passkey thành công!");
            return true;

        } catch (error) {
            if (error.name === 'NotAllowedError') {
                console.log("User cancelled WebAuthn registration");
                toast.info("Bạn cần đăng ký Passkey để tiếp tục.");
            } else {
                console.error("WebAuthn Error", error);
                toast.error("Đăng ký Passkey thất bại: " + error.message);
            }
            return false;
        }
    };

    const renderTypedSignatureToPng = (text, fontFamily, color) => {
        return new Promise(async (resolve) => {
            await document.fonts.ready;

            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = color || '#000000';
            ctx.font = `48px "${fontFamily}", cursive`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);

            resolve(canvas.toDataURL('image/png'));
        });
    };

    const handleSaveSignature = async () => {
        let finalSignature = null;
        let signatureType = '';

        if (creationTab === 'draw' && padRef.current) {
            finalSignature = padRef.current.getDataURL();
            signatureType = 'DRAWN';
        } else if (creationTab === 'type') {
            if (!typedName || !typedName.trim()) {
                toast.error("Vui lòng nhập tên trước khi lưu!");
                return;
            }
            const fontFamily = fonts[selectedFont] || 'Dancing Script';
            finalSignature = await renderTypedSignatureToPng(typedName, fontFamily, selectedColor);
            signatureType = 'TYPED';
        } else if (creationTab === 'upload') {
            signatureType = 'UPLOADED';
            finalSignature = signature;
        }

        if (!finalSignature) {
            toast.error("Vui lòng tạo chữ ký trước khi lưu!");
            return;
        }

        if (passkeyStatus) {
            const verified = await authenticatePasskey();
            if (!verified) return;
        } else {
            const isRegistered = await registerPasskey();
            if (!isRegistered) {
                toast.error("Bạn phải tạo Passkey để lưu chữ ký!");
                return;
            }
            setPasskeyStatus(true);
        }

        try {
            const base64Data = finalSignature.split(',')[1];
            if (!base64Data) {
                toast.error("Lỗi dữ liệu chữ ký");
                return;
            }
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const hashBuffer = await window.crypto.subtle.digest('SHA-256', bytes);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            await saveSignature({
                imageBase64: finalSignature,
                signatureType: signatureType,
                textStyle: selectedFont.toString(),
                imageHash: hashHex
            });

            setSignature(finalSignature);
            setIsEditing(false);
            toast.success("Đã lưu chữ ký thành công!");

        } catch (error) {
            console.error("Save signature error", error);
            toast.error("Lưu chữ ký thất bại: " + (error.message || "Lỗi không xác định"));
        }
    };

    const padRef = useRef(null);

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 font-display">Chữ ký cá nhân</h1>
                    <p className="text-secondary-400 font-medium mt-1">Quản lý duy nhất một chữ ký số định danh chính chủ của bạn</p>
                </div>
            </div>

            {/* VIEW MODE */}
            {!isEditing && (
                <div className="bg-white rounded-[32px] shadow-premium border border-secondary-100 min-h-[400px] flex flex-col items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/30 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    
                    {signature ? (
                        <div className="text-center w-full max-w-xl z-10">
                            <div className="mb-8 p-12 bg-secondary-50 border border-secondary-100 rounded-[24px] flex items-center justify-center relative group">
                                <img src={signature} alt="My Signature" className="h-32 object-contain select-none filter drop-shadow-sm transition-transform duration-500 group-hover:scale-105" />
                                <span className="absolute top-3 right-3 text-[10px] font-bold text-secondary-400 uppercase tracking-widest bg-white border border-secondary-200 px-3 py-1 rounded-full">Hiện tại</span>
                            </div>
                            <div className="flex justify-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg shadow-primary-500/25 transition-all font-bold text-sm"
                                >
                                    <Edit2 className="w-4 h-4" /> Thay đổi chữ ký
                                </motion.button>
                            </div>
                            <div className="mt-8 inline-flex items-center gap-2 text-emerald-600 bg-emerald-50/50 border border-emerald-100 py-2 px-4 rounded-full">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Bảo vệ bởi hệ thống Passkey</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center max-w-md z-10">
                            <div className="w-20 h-20 bg-secondary-50 border border-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-secondary-400 shadow-inner">
                                <PenTool className="w-8 h-8 text-primary-600" />
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 font-display mb-2">Chưa tạo chữ ký cá nhân</h3>
                            <p className="text-secondary-400 font-medium mb-8 leading-relaxed">Bạn chưa thiết lập chữ ký nào trên hệ thống. Hãy tạo chữ ký ngay để tiến hành ký kết văn bản hợp pháp trực tuyến.</p>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsEditing(true)}
                                className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg shadow-primary-500/25 transition-all font-bold text-base"
                            >
                                + Thiết lập chữ ký mới
                            </motion.button>
                        </div>
                    )}
                </div>
            )}

            {/* EDIT MODE */}
            {isEditing && (
                <div className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden">
                    {/* Toolbar / Tabs */}
                    <div className="border-b border-secondary-100 bg-secondary-50/30 p-2 flex gap-1">
                        {[
                            { id: 'draw', label: 'Vẽ trực tiếp', icon: PenTool },
                            { id: 'type', label: 'Tạo từ bàn phím', icon: Type },
                            { id: 'upload', label: 'Tải tệp hình ảnh', icon: Upload }
                        ].map(tab => {
                            const active = creationTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setCreationTab(tab.id)}
                                    className={`flex-1 py-3.5 text-xs font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 relative ${
                                        active 
                                            ? 'bg-white text-primary-600 shadow-sm border border-secondary-100' 
                                            : 'text-secondary-500 hover:text-secondary-800'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Canvas Area */}
                    <div className="p-8 min-h-[400px] bg-white flex flex-col justify-center">
                        {creationTab === 'draw' && (
                            <div className="h-full flex flex-col gap-6">
                                <div className="flex-1 bg-secondary-50/50 border-2 border-dashed border-secondary-200 rounded-2xl relative cursor-crosshair hover:border-primary-400 transition-colors group min-h-[300px]">
                                    <SignaturePad ref={padRef} color={selectedColor} />
                                    <div className="absolute top-4 right-4">
                                        <button 
                                            onClick={() => padRef.current && padRef.current.clear()} 
                                            className="p-3 bg-white shadow-md border border-secondary-100 rounded-xl text-secondary-500 hover:text-red-500 transition-all hover:scale-105" 
                                            title="Xóa vẽ nháp"
                                        >
                                            <Eraser className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-center gap-3">
                                    {['#000000', '#4361ee', '#e63946'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                                                selectedColor === color 
                                                    ? 'border-primary-500 ring-4 ring-primary-100' 
                                                    : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {creationTab === 'type' && (
                            <div className="max-w-xl w-full mx-auto space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-1">Nhập họ & tên</label>
                                    <input
                                        type="text"
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        className="w-full text-center text-3xl font-bold py-4 border-b-2 border-secondary-200 focus:border-primary-500 outline-none transition-colors bg-transparent text-secondary-800"
                                        placeholder="VD: Nguyễn Văn A"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {fonts.map((font, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedFont(idx)}
                                            className={`p-8 border rounded-2xl text-center text-4xl cursor-pointer transition-all hover:scale-[1.01] hover:bg-secondary-50 ${
                                                selectedFont === idx 
                                                    ? 'border-primary-500 bg-primary-50/20 text-primary-600 shadow-sm' 
                                                    : 'border-secondary-100 text-secondary-700'
                                            }`}
                                            style={{ fontFamily: `"${font}", cursive`, color: selectedColor }}
                                        >
                                            {typedName || 'Chữ ký mẫu'}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center gap-3">
                                    {['#000000', '#4361ee', '#e63946'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                                                selectedColor === color 
                                                    ? 'border-primary-500 ring-4 ring-primary-100' 
                                                    : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {creationTab === 'upload' && (
                            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-secondary-200 rounded-[24px] bg-secondary-50/50 hover:bg-primary-50/10 hover:border-primary-400 transition-all cursor-pointer min-h-[300px] relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setSignature(reader.result);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                {signature && creationTab === 'upload' ? (
                                    <div className="relative p-6 bg-white border border-secondary-100 rounded-2xl shadow-sm">
                                        <img src={signature} alt="Uploaded signature" className="max-h-60 max-w-full object-contain" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-secondary-100 flex items-center justify-center mb-6 text-primary-600">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-secondary-900 font-display mb-1">Tải lên tệp ảnh chữ ký</h3>
                                        <p className="text-secondary-400 font-medium mb-6 max-w-sm text-center text-sm">Hỗ trợ định dạng PNG hoặc JPG. Khuyên dùng hình ảnh nền trong suốt.</p>
                                        <button className="px-6 py-2.5 bg-white border border-secondary-200 rounded-xl text-secondary-700 font-bold text-xs hover:bg-secondary-50 transition-all shadow-sm">
                                            Chọn từ máy tính
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-6 bg-secondary-50/50 border-t border-secondary-100 flex justify-end gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 text-sm font-bold text-secondary-500 hover:text-secondary-800 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSaveSignature}
                            className="px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold shadow-lg shadow-primary-500/25 transition-all flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Lưu chữ ký
                        </motion.button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Signature;

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    PenTool, Trash2, Edit2, CheckCircle2, Type, Upload,
    Eraser, Image as ImageIcon, Save, Shield, ShieldCheck,
    ShieldAlert, Key, Users, Check, AlertCircle, Building2
} from 'lucide-react';
import SignaturePad from '../../components/SignaturePad/SignaturePad';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkSpaces } from '../../service/userApi';
import {
    getOrgSignature, saveOrgSignature, getMembers,
    getOrgPasskeyStatus, startOrgPasskeyRegistration, finishOrgPasskeyRegistration,
    startOrgAuthentication, finishOrgAuthentication
} from '../../service/organizationApi';
import { base64urlToBuffer, credentialToJSON } from '../../utils/webauthn';

const OrganizationSignature = () => {
    const { orgUrl } = useParams();
    const navigate = useNavigate();

    // Permissions & Workspace Context
    const [currentOrgId, setCurrentOrgId] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [canSign, setCanSign] = useState(false);
    const [isLoadingContext, setIsLoadingContext] = useState(true);

    // Organization Signature State
    const [signature, setSignature] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [creationTab, setCreationTab] = useState('draw');
    const [selectedColor, setSelectedColor] = useState('#e63946'); // Default red color for business stamps/seals
    const [typedName, setTypedName] = useState('CÔNG TY TNHH DIGISIGN');
    const [selectedFont, setSelectedFont] = useState(0);
    const [imageHash, setImageHash] = useState('');

    // Member Passkey State (For non-admin who has canSign = true)
    const [passkeyStatus, setPasskeyStatus] = useState(false);
    const [isLoadingPasskey, setIsLoadingPasskey] = useState(false);

    // Admin view state: members list
    const [members, setMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);

    const fonts = ["Dancing Script", "Great Vibes", "Sacramento"];
    const padRef = useRef(null);

    // 1. Initial Load: Get Workspace context (role, canSign, etc.)
    useEffect(() => {
        const initContext = async () => {
            setIsLoadingContext(true);
            try {
                const res = await getWorkSpaces();
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setCurrentOrgId(ws.accountId);
                        setCurrentRole(ws.role);
                        setCanSign(ws.canSign);

                        // If user is Admin, load members list to show PassKey status
                        if (ws.role === 'ADMIN') {
                            fetchMembersList(ws.accountId);
                        } else if (ws.canSign) {
                            // If user is authorized signer, load their Passkey status
                            fetchPasskeyStatus();
                        }
                    } else {
                        toast.error("Không tìm thấy thông tin tổ chức!");
                        navigate('/dashboard');
                    }
                }
            } catch (err) {
                console.error("Failed to load workspace context", err);
                toast.error("Lỗi khi tải thông tin tổ chức");
            } finally {
                setIsLoadingContext(false);
            }
        };

        const fetchSignature = async () => {
            try {
                const response = await getOrgSignature(orgUrl);
                if (response && response.result && response.result.imageUrl) {
                    setSignature(response.result.imageUrl);
                    if (response.result.textStyle) {
                        setSelectedFont(parseInt(response.result.textStyle) || 0);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch organization signature", error);
            }
        };

        if (orgUrl) {
            initContext();
            fetchSignature();
        }
    }, [orgUrl]);

    // Fetch members list for Admin view
    const fetchMembersList = async (orgId) => {
        setIsLoadingMembers(true);
        try {
            const res = await getMembers(orgId);
            if (res && res.result) {
                // Filter only members who have canSign = true
                const signers = res.result.filter(m => m.canSign);
                setMembers(signers);
            }
        } catch (error) {
            console.error("Failed to fetch organization members", error);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    // Fetch personal Passkey status for the organization
    const fetchPasskeyStatus = async () => {
        try {
            const res = await getOrgPasskeyStatus(orgUrl);
            if (res) {
                setPasskeyStatus(res.result);
            }
        } catch (error) {
            console.error("Failed to fetch Passkey status", error);
        }
    };

    // Passkey registration for organization
    const handleRegisterPasskey = async () => {
        setIsLoadingPasskey(true);
        try {
            if (!window.PublicKeyCredential) {
                toast.error("Trình duyệt của bạn không hỗ trợ WebAuthn/Passkey!");
                return;
            }

            const startResponse = await startOrgPasskeyRegistration(orgUrl);
            const optionsJson = startResponse.result.optionsJson;
            const options = JSON.parse(optionsJson);

            if (options.challenge) {
                const challengeVal = (typeof options.challenge === 'string') ? options.challenge : options.challenge.value;
                options.challenge = base64urlToBuffer(challengeVal);
            }
            if (options.user && options.user.id) {
                options.user.id = base64urlToBuffer(options.user.id);
            }
            if (options.excludeCredentials) {
                options.excludeCredentials = options.excludeCredentials.map(c => ({
                    ...c,
                    id: base64urlToBuffer(c.id)
                }));
            }

            const credential = await navigator.credentials.create({ publicKey: options });
            const credentialJson = credentialToJSON(credential);

            await finishOrgPasskeyRegistration(orgUrl, credentialJson);

            toast.success("Kích hoạt Passkey cho tổ chức thành công!");
            setPasskeyStatus(true);
            fetchPasskeyStatus();
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                toast.info("Bạn đã hủy quy trình đăng ký vân tay/FaceID.");
            } else {
                console.error("Org WebAuthn Error", error);
                toast.error("Kích hoạt Passkey thất bại: " + error.message);
            }
        } finally {
            setIsLoadingPasskey(false);
        }
    };

    const authenticatePasskey = async () => {
        try {
            const startResponse = await startOrgAuthentication(orgUrl);
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
            await finishOrgAuthentication(orgUrl, credentialJson);

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

            const startResponse = await startOrgPasskeyRegistration(orgUrl);
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
            await finishOrgPasskeyRegistration(orgUrl, credentialJson);

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

    // Helper to render typed signature text as PNG
    const renderTypedSignatureToPng = (text, fontFamily, color) => {
        return new Promise(async (resolve) => {
            await document.fonts.ready;

            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = color || '#e63946';
            ctx.font = `44px "${fontFamily}", cursive`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);

            resolve(canvas.toDataURL('image/png'));
        });
    };

    // Save signature
    const handleSaveSignature = async () => {
        let finalSignature = null;
        let signatureType = '';

        if (creationTab === 'draw' && padRef.current) {
            finalSignature = padRef.current.getDataURL();
            signatureType = 'DRAWN';
        } else if (creationTab === 'type') {
            if (!typedName || !typedName.trim()) {
                toast.error("Vui lòng nhập tên/thông tin con dấu!");
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
            toast.error("Vui lòng thiết lập hình ảnh con dấu/chữ ký!");
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
                toast.error("Lỗi định dạng ảnh!");
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

            await saveOrgSignature(orgUrl, {
                imageBase64: finalSignature,
                signatureType: signatureType,
                textStyle: selectedFont.toString(),
                imageHash: hashHex
            });

            setSignature(finalSignature);
            setIsEditing(false);
            toast.success("Đã lưu chữ ký đại diện tổ chức thành công!");
            
            // Reload member list to reflect the new Passkey status
            if (currentOrgId) {
                fetchMembersList(currentOrgId);
            }
        } catch (error) {
            console.error("Save signature error", error);
            toast.error("Lưu chữ ký thất bại: " + (error.message || "Lỗi không xác định"));
        }
    };



    if (isLoadingContext) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-secondary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Role check and UI partitioning
    const isAdmin = currentRole === 'ADMIN';
    const isSigner = canSign === true;

    // CASE C: Member has NO sign permission and is not Admin
    if (!isAdmin && !isSigner) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto mt-16 p-8 bg-white border border-secondary-100 rounded-[32px] shadow-premium text-center"
            >
                <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-secondary-900 font-display mb-2">Không có quyền truy cập</h3>
                <p className="text-secondary-500 font-medium leading-relaxed mb-6">
                    Bạn không có quyền ký tài liệu hoặc thao tác chữ ký trong tổ chức này. Vui lòng liên hệ Quản trị viên (Admin) để được cấp quyền `canSign`.
                </p>
                <button
                    onClick={() => navigate(`/o/${orgUrl}/work-space`)}
                    className="px-6 py-2.5 bg-secondary-900 hover:bg-secondary-800 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                >
                    Quay lại Workspace
                </button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-secondary-100 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 font-display flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-primary-600" />
                        Chữ ký con dấu tổ chức
                    </h1>
                    <p className="text-secondary-400 font-medium mt-1">
                        {isAdmin
                            ? "Thiết lập con dấu hoặc chữ ký số chính thức đại diện cho tư cách pháp nhân tổ chức"
                            : "Xem con dấu tổ chức và cấu hình khóa xác thực PassKey công việc cá nhân"
                        }
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Visual Signature (2/3 width on large screens) */}
                <div className="lg:col-span-2 space-y-8">
                    {!isEditing ? (
                        <div className="bg-white rounded-[32px] shadow-premium border border-secondary-100 p-8 relative overflow-hidden min-h-[350px] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary-50/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />

                            <div>
                                <h3 className="text-base font-bold text-secondary-900 font-display mb-4">Chữ ký/Con dấu đại diện chính thức</h3>
                                {signature ? (
                                    <div className="p-8 bg-secondary-50 border border-secondary-100 rounded-[24px] flex items-center justify-center min-h-[220px] relative group">
                                        <img src={signature} alt="Organization Seal" className="h-32 object-contain select-none transition-transform duration-500 group-hover:scale-105" />
                                        <span className="absolute top-3 right-3 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                                            <Check className="w-3.5 h-3.5" /> Hoạt động
                                        </span>
                                    </div>
                                ) : (
                                    <div className="border border-dashed border-secondary-200 rounded-[24px] flex flex-col items-center justify-center p-12 min-h-[220px] text-center bg-secondary-50/30">
                                        <ImageIcon className="w-10 h-10 text-secondary-300 mb-3" />
                                        <p className="text-sm font-bold text-secondary-800">Chưa thiết lập con dấu tổ chức</p>
                                        <p className="text-xs text-secondary-400 max-w-xs mt-1">Quản trị viên cần tải lên hoặc vẽ con dấu đỏ của công ty để các thành viên sử dụng khi ký.</p>
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg shadow-primary-500/25 transition-all font-bold text-xs"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> {signature ? "Thay đổi con dấu" : "Thiết lập con dấu"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden">
                            <div className="border-b border-secondary-100 bg-secondary-50/30 p-2 flex gap-1">
                                {[
                                    { id: 'draw', label: 'Vẽ trực tiếp', icon: PenTool },
                                    { id: 'type', label: 'Tạo từ bàn phím', icon: Type },
                                    { id: 'upload', label: 'Tải ảnh con dấu', icon: Upload }
                                ].map(tab => {
                                    const active = creationTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setCreationTab(tab.id)}
                                            className={`flex-1 py-3 text-xs font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 relative ${active
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

                            <div className="p-8 min-h-[300px] bg-white flex flex-col justify-center">
                                {creationTab === 'draw' && (
                                    <div className="space-y-6">
                                        <div className="bg-secondary-50/50 border-2 border-dashed border-secondary-200 rounded-2xl relative cursor-crosshair min-h-[250px]">
                                            <SignaturePad ref={padRef} color={selectedColor} />
                                            <div className="absolute top-4 right-4">
                                                <button
                                                    onClick={() => padRef.current && padRef.current.clear()}
                                                    className="p-2.5 bg-white shadow-md border border-secondary-100 rounded-xl text-secondary-500 hover:text-red-500 transition-all hover:scale-105"
                                                    title="Xóa nháp"
                                                >
                                                    <Eraser className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-center gap-3">
                                            {['#e63946', '#000000', '#4361ee'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setSelectedColor(color)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${selectedColor === color ? 'border-primary-500 ring-4 ring-primary-100' : 'border-transparent'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {creationTab === 'type' && (
                                    <div className="max-w-xl w-full mx-auto space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest px-1">Nhập thông tin doanh nghiệp</label>
                                            <input
                                                type="text"
                                                value={typedName}
                                                onChange={(e) => setTypedName(e.target.value)}
                                                className="w-full text-center text-xl font-bold py-3 border-b-2 border-secondary-200 focus:border-primary-500 outline-none bg-transparent text-secondary-800"
                                                placeholder="CÔNG TY TNHH DIGISIGN"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            {fonts.map((font, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setSelectedFont(idx)}
                                                    className={`p-6 border rounded-2xl text-center text-2xl cursor-pointer transition-all hover:bg-secondary-50 ${selectedFont === idx
                                                            ? 'border-primary-500 bg-primary-50/20 text-primary-600'
                                                            : 'border-secondary-100 text-secondary-700'
                                                        }`}
                                                    style={{ fontFamily: `"${font}", cursive`, color: selectedColor }}
                                                >
                                                    {typedName || 'Chữ ký tổ chức'}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-center gap-3">
                                            {['#e63946', '#000000', '#4361ee'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setSelectedColor(color)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${selectedColor === color ? 'border-primary-500 ring-4 ring-primary-100' : 'border-transparent'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {creationTab === 'upload' && (
                                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-secondary-200 rounded-[24px] bg-secondary-50/50 min-h-[250px] relative">
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
                                            <div className="relative p-4 bg-white border border-secondary-100 rounded-2xl shadow-sm">
                                                <img src={signature} alt="Uploaded seal" className="max-h-48 object-contain" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-secondary-100 flex items-center justify-center mb-4 text-primary-600">
                                                    <ImageIcon className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-sm font-bold text-secondary-900">Tải lên tệp con dấu chính thức</h4>
                                                <p className="text-xs text-secondary-400 mt-1 mb-4 text-center max-w-xs">PNG hoặc JPG nền trong suốt (transparent) để có kết quả hiển thị tốt nhất trên hợp đồng.</p>
                                                <button className="px-5 py-2 bg-white border border-secondary-200 rounded-xl text-secondary-700 font-bold text-[10px] hover:bg-secondary-50 transition-all shadow-sm">
                                                    Chọn từ thiết bị
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="px-8 py-5 bg-secondary-50/50 border-t border-secondary-100 flex justify-end gap-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-2.5 text-xs font-bold text-secondary-500 hover:text-secondary-800"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleSaveSignature}
                                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 transition-all text-xs flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4" />
                                    Lưu con dấu
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: PassKey Registration Status or Members List */}
                <div className="space-y-8">
                    {/* A. If user is MEMBER with canSign = true -> PassKey Registration Card */}
                    {!isAdmin && isSigner && (
                        <div className="bg-white rounded-[32px] shadow-premium border border-secondary-100 p-8 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-secondary-50">
                                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-secondary-900 font-display">Bảo mật & Ký số</h4>
                                    <p className="text-[10px] font-medium text-secondary-400 uppercase tracking-widest mt-0.5">Xác thực PassKey công việc</p>
                                </div>
                            </div>

                            {passkeyStatus ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800">Passkey đã kích hoạt</p>
                                            <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">
                                                Thiết bị xác thực sinh trắc học của bạn đã sẵn sàng sử dụng để thực hiện ký số cho tổ chức này.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-secondary-400 font-medium">
                                        * Mọi lần đóng dấu tổ chức đều được mã hóa bằng khóa bảo mật này và lưu lại thông tin của bạn vào Audit Trail để chống chối bỏ.
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-800">Chưa đăng ký PassKey</p>
                                            <p className="text-[11px] text-amber-600 mt-1 leading-relaxed">
                                                Bạn chưa kích hoạt khóa xác thực vân tay/FaceID cho tổ chức này. Vui lòng đăng ký để có thể thực hiện ký tài liệu.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRegisterPasskey}
                                        disabled={isLoadingPasskey}
                                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoadingPasskey ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Key className="w-4 h-4" /> Kích hoạt khóa bảo mật
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* B. If user is ADMIN -> Show Members PassKey Status List */}
                    {isAdmin && (
                        <div className="bg-white rounded-[32px] shadow-premium border border-secondary-100 p-8 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-secondary-50">
                                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-secondary-900 font-display">Thành viên có quyền ký</h4>
                                    <p className="text-[10px] font-medium text-secondary-400 uppercase tracking-widest mt-0.5">Trạng thái khóa bảo mật PassKey</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {isLoadingMembers ? (
                                    <div className="py-8 text-center text-secondary-400 text-xs">Đang tải danh sách...</div>
                                ) : members.length === 0 ? (
                                    <div className="py-8 text-center text-secondary-400 text-xs">Chưa có thành viên nào có quyền ký.</div>
                                ) : (
                                    <div className="divide-y divide-secondary-50 max-h-[300px] overflow-y-auto scrollbar-hide">
                                        {members.map(m => (
                                            <div key={m.memberId} className="py-3 flex items-center justify-between gap-3 text-xs">
                                                <div className="min-w-0">
                                                    <p className="font-bold text-secondary-800 truncate">{m.fullName || m.email}</p>
                                                    <p className="text-[10px] text-secondary-400 truncate">{m.email}</p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {m.passkeyRegistered ? (
                                                        <span className="text-[9px] font-bold px-2.5 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                                            <Shield className="w-3 h-3" /> Đã Khóa
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold px-2.5 py-1 rounded-full border border-amber-100 bg-amber-50 text-amber-600 uppercase tracking-wider flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Chưa Khóa
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizationSignature;

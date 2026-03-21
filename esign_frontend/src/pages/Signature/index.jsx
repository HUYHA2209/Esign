import React, { useState, useRef } from 'react';
import { PenTool, Trash2, Edit2, CheckCircle2, Type, Upload, Eraser, Image as ImageIcon, Save } from 'lucide-react';
import SignaturePad from '../../components/SignaturePad/SignaturePad';
import { toast } from 'react-toastify';
import { saveSignature, getSignature } from '../../service/signatureApi';

import { startRegistration, finishRegistration, startAuthentication, finishAuthentication } from '../../service/webAuthnApi';
import { base64urlToBuffer, credentialToJSON } from '../../utils/webauthn';

const Signature = () => {
    const [signature, setSignature] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [creationTab, setCreationTab] = useState('draw');
    const [selectedColor, setSelectedColor] = useState('black');
    const [typedName, setTypedName] = useState('Nguyễn Văn A');
    const [selectedFont, setSelectedFont] = useState(0);

    const fonts = ["Dancing Script", "Great Vibes", "Sacramento"];

    React.useEffect(() => {
        const fetchSignature = async () => {
            try {
                const response = await getSignature();
                if (response && response.result) {
                    setSignature(response.result.imageBase64);
                }
            } catch (error) {
                console.error("Failed to fetch signature", error);
            }
        };
        fetchSignature();
    }, []);

    const authenticatePasskey = async () => {
        try {
            // 1. Start Auth
            const startResponse = await startAuthentication();
            const optionsJson = startResponse.result.optionsJson;
            const options = JSON.parse(optionsJson);

            // Fix parsing
            if (options.challenge) options.challenge = base64urlToBuffer(options.challenge);
            if (options.allowCredentials) {
                options.allowCredentials = options.allowCredentials.map(c => ({
                    ...c,
                    id: base64urlToBuffer(c.id)
                }));
            }

            // 2. Browser Prompt
            const credential = await navigator.credentials.get({ publicKey: options });

            // 3. Finish Auth
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
            // 1. Check support
            if (!window.PublicKeyCredential) {
                toast.error("Trình duyệt không hỗ trợ WebAuthn");
                return false;
            }

            // 2. Start Registration
            const startResponse = await startRegistration();
            const optionsJson = startResponse.result.optionsJson;

            // 3. Parse Options
            const options = JSON.parse(optionsJson);

            // Fix parsing: values from backend (WebAuthn4J) are likely Base64URL strings
            if (options.challenge) {
                // Handle if it's string or object (just in case)
                const challengeVal = (typeof options.challenge === 'string') ? options.challenge : options.challenge.value;
                options.challenge = base64urlToBuffer(challengeVal);
            }
            if (options.user && options.user.id) {
                const userIdVal = (typeof options.user.id === 'string') ? options.user.id : options.user.id; // user.id from webauthn4j is usually string
                options.user.id = base64urlToBuffer(userIdVal);
            }

            // Also excludeCredentials if any
            if (options.excludeCredentials) {
                options.excludeCredentials = options.excludeCredentials.map(c => ({
                    ...c,
                    id: base64urlToBuffer(c.id)
                }));
            }

            // 4. Create Credential
            const credential = await navigator.credentials.create({ publicKey: options });

            // 5. Finish Registration
            const credentialJson = credentialToJSON(credential);
            await finishRegistration(credentialJson);

            toast.success("Đăng ký Passkey thành công!");
            return true;

        } catch (error) {
            // Suppress error if user cancelled (NotAllowedError) to avoid frightening them if they just didn't want to register
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

    const handleSaveSignature = async () => {
        let finalSignature = null;
        let signatureType = '';

        if (creationTab === 'draw' && padRef.current) {
            finalSignature = padRef.current.getDataURL();
            signatureType = 'DRAWN';
        } else if (creationTab === 'type') {
            finalSignature = `data:image/svg+xml;utf8,${encodeURIComponent(`\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"600\" height=\"200\">\n<text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"Dancing Script, cursive\" font-size=48 fill=\"${selectedColor}\">${typedName}</text>\n</svg>`)} `;
            signatureType = 'TYPED';
        } else if (creationTab === 'upload') {
            signatureType = 'UPLOADED';
            finalSignature = signature;
        }

        if (!finalSignature) {
            toast.error("Vui lòng tạo chữ ký trước khi lưu!");
            return;
        }


        const isUpdate = !!signature;

        if (isUpdate) {
            const verified = await authenticatePasskey();
            if (!verified) return;
        } else {
            // New Signature: Mandatory Passkey Registration
            const isRegistered = await registerPasskey();
            if (!isRegistered) {
                toast.error("Bạn phải tạo Passkey để lưu chữ ký!");
                return; // Stop if registration failed or cancelled
            }
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

    const handleDeleteSignature = async () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa chữ ký này không?")) {
            // Require Auth
            const verified = await authenticatePasskey();
            if (!verified) return;

            setSignature(null);
            toast.info("Đã xóa chữ ký.");
        }
    };

    const padRef = useRef(null);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Chữ ký của bạn</h1>
                    <p className="text-slate-500">Mỗi tài khoản chỉ được sở hữu một chữ ký số duy nhất.</p>
                </div>
            </div>

            {/* VIEW MODE */}
            {!isEditing && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col items-center justify-center relative">
                    {signature ? (
                        <div className="text-center w-full max-w-2xl">
                            <div className="mb-8 p-10 border-2 border-slate-100 rounded-xl bg-slate-50/50">
                                <img src={signature} alt="My Signature" className="h-40 mx-auto object-contain" />
                            </div>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md transition-all font-medium"
                                >
                                    <Edit2 className="w-5 h-5" /> Thay đổi chữ ký
                                </button>
                                <button
                                    onClick={handleDeleteSignature}
                                    className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 border border-red-200 rounded-full hover:bg-red-50 hover:border-red-300 transition-all font-medium"
                                >
                                    <Trash2 className="w-5 h-5" /> Xóa
                                </button>
                            </div>
                            <div className="mt-8 flex items-center justify-center gap-2 text-green-600 bg-green-50 py-2 px-4 rounded-full mx-auto w-fit">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-sm font-medium">Chữ ký đang hoạt động</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                <PenTool className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có chữ ký</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-8">Bạn chưa tạo chữ ký nào. Hãy tạo ngay để bắt đầu ký tài liệu điện tử.</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all font-bold text-lg"
                            >
                                + Tạo chữ ký mới
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* EDIT MODE */}
            {isEditing && (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    {/* Toolbar */}
                    <div className="border-b border-slate-200 bg-slate-50 flex">
                        <button
                            onClick={() => setCreationTab('draw')}
                            className={`flex-1 py-4 text-sm font-bold text-center transition-colors flex items-center justify-center gap-2 relative
                                ${creationTab === 'draw' ? 'text-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {creationTab === 'draw' && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
                            <PenTool className="w-4 h-4" /> Vẽ tay
                        </button>
                        <button
                            onClick={() => setCreationTab('type')}
                            className={`flex-1 py-4 text-sm font-bold text-center transition-colors flex items-center justify-center gap-2 relative
                                ${creationTab === 'type' ? 'text-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {creationTab === 'type' && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
                            <Type className="w-4 h-4" /> Gõ từ
                        </button>
                        <button
                            onClick={() => setCreationTab('upload')}
                            className={`flex-1 py-4 text-sm font-bold text-center transition-colors flex items-center justify-center gap-2 relative
                                ${creationTab === 'upload' ? 'text-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {creationTab === 'upload' && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
                            <Upload className="w-4 h-4" /> Tải ảnh lên
                        </button>
                    </div>

                    {/* Canvas Area */}
                    <div className="p-8 min-h-[400px] bg-white">
                        {creationTab === 'draw' && (
                            <div className="h-full flex flex-col gap-4">
                                <div className="flex-1 bg-white border-2 border-dashed border-slate-300 rounded-xl relative cursor-crosshair hover:border-indigo-400 transition-colors group min-h-[300px]">
                                    <SignaturePad ref={padRef} color={selectedColor} />
                                    <div className="absolute top-4 right-4">
                                        <button onClick={() => padRef.current && padRef.current.clear()} className="p-2 bg-white shadow border rounded-lg hover:text-red-500 transition-colors" title="Xóa">
                                            <Eraser className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-center gap-4">
                                    {['#000000', '#4f46e5', '#dc2626'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {creationTab === 'type' && (
                            <div className="max-w-xl mx-auto space-y-8">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Nhập tên của bạn</label>
                                    <input
                                        type="text"
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        className="w-full text-center text-2xl font-bold py-4 border-b-2 border-slate-300 focus:border-indigo-600 outline-none transition-colors bg-transparent"
                                        placeholder="VD: Nguyễn Văn A"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {fonts.map((font, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedFont(idx)}
                                            className={`p-6 border rounded-xl text-center text-4xl cursor-pointer transition-all hover:bg-slate-50
                                                ${selectedFont === idx ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'}`}
                                            style={{ fontFamily: 'cursive' }}
                                        >
                                            {typedName || 'Chữ ký mẫu'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {creationTab === 'upload' && (
                            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-400 transition-all cursor-pointer min-h-[300px] relative">
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
                                    <img src={signature} alt="Uploaded" className="max-h-60 max-w-full object-contain" />
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 text-indigo-500">
                                            <ImageIcon className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Tải ảnh chữ ký lên</h3>
                                        <p className="text-slate-500 mb-8 max-w-md text-center">Kéo thả hình ảnh vào đây hoặc nhấn để chọn tập tin (JPG, PNG)</p>
                                        <button className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 shadow-sm">
                                            Chọn tập tin
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleSaveSignature}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            Lưu chữ ký
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Signature;

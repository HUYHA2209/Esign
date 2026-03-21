import React, { useEffect, useState } from 'react';
import { getReceivedDocuments } from '../../service/documentApi';
import { useNavigate } from 'react-router-dom';

export default function ReceivedDocuments() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await getReceivedDocuments();
                setDocs(data || []);
            } catch (e) {
                console.error('Failed to load received documents', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Tài liệu gửi tới bạn</h2>
            {loading ? (
                <div>Đang tải...</div>
            ) : docs.length === 0 ? (
                <div>Không có tài liệu nào gửi tới bạn.</div>
            ) : (
                <div className="space-y-3">
                    {docs.map(d => (
                        <div key={d.documentId} className="p-3 border rounded flex justify-between items-center">
                            <div>
                                <div className="font-medium">{d.title || 'Tài liệu'}</div>
                                <div className="text-sm text-gray-500">Gửi bởi: {d.uploadedBy || 'Người gửi'}</div>
                                <div className="text-sm text-gray-500">Trạng thái ký: {d.signerStatus}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => navigate(`/document-editor/${d.groupId || d.documentId}`)} className="btn btn-sm">Mở</button>
                                <button onClick={() => navigate(`/documents/${d.documentId}/download`)} className="btn btn-outline btn-sm">Tải</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

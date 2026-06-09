import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'react-toastify';

const NotificationListener = () => {
    const [stompClient, setStompClient] = useState(null);

    useEffect(() => {
        const token = sessionStorage.getItem("token");
        if (!token) return;

        const client = new Client({
            // WebSocket endpoint
            webSocketFactory: () => new SockJS('http://localhost:8000/esign/ws'),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => {
                // Bỏ comment nếu muốn xem log stomp
                // console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('[WebSocket] Connected');
                // Subscribe theo cấu hình backend: /user/queue/notifications
                client.subscribe('/user/queue/notifications', (message) => {
                    if (message.body) {
                        try {
                            const notification = JSON.parse(message.body);
                            // Hiển thị thông báo (toast)
                            toast.info(`🔔 ${notification.title}\n${notification.message}`, {
                                position: "top-right",
                                autoClose: 5000,
                                hideProgressBar: false,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                                style: { whiteSpace: 'pre-line' }
                            });
                        } catch (e) {
                            console.error('[WebSocket] Error parsing notification', e);
                        }
                    }
                });
            },
            onStompError: (frame) => {
                console.error('[WebSocket] Broker reported error: ' + frame.headers['message']);
                console.error('[WebSocket] Additional details: ' + frame.body);
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            if (client) {
                console.log('[WebSocket] Deactivating...');
                client.deactivate();
            }
        };
    }, []);

    return null; // Component này chỉ chạy background
};

export default NotificationListener;

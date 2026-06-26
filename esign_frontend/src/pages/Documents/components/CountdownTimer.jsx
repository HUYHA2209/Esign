import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

/**
 * CountdownTimer – Hiển thị thời gian còn lại đếm ngược realtime (mỗi giây).
 * Props:
 *   - expiresAt: string ISO hoặc Date-compatible string (ví dụ "2025-06-25T14:30:00")
 *   - onExpire: function được gọi một lần duy nhất khi thời gian đếm ngược về 0
 */
const CountdownTimer = ({ expiresAt, onExpire }) => {
    const [remaining, setRemaining] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const hasTriggeredExpire = useRef(false);

    useEffect(() => {
        if (!expiresAt) return;
        hasTriggeredExpire.current = false;

        const calculate = () => {
            const now = new Date();
            const target = new Date(expiresAt);
            const diff = target - now;

            if (diff <= 0) {
                setRemaining('Đã hết hạn');
                setIsExpired(true);
                setIsUrgent(false);
                if (onExpire && !hasTriggeredExpire.current) {
                    hasTriggeredExpire.current = true;
                    onExpire();
                }
                return false; // stop interval
            }

            // Dưới 1 giờ → urgent (đỏ)
            setIsUrgent(diff < 3600000);
            setIsExpired(false);

            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            if (days > 0) {
                setRemaining(`${days}d ${hours}h ${minutes}m`);
            } else if (hours > 0) {
                setRemaining(`${hours}h ${minutes}m ${seconds}s`);
            } else {
                setRemaining(`${minutes}m ${seconds}s`);
            }
            return true; // keep running
        };

        // Tính lần đầu ngay lập tức
        const shouldContinue = calculate();
        if (!shouldContinue) return;

        const timer = setInterval(() => {
            const ok = calculate();
            if (!ok) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    if (!expiresAt) return null;

    if (isExpired) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                <AlertTriangle className="w-3 h-3" />
                Đã hết hạn
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border tabular-nums ${
            isUrgent
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                : 'bg-blue-50 text-blue-600 border-blue-200'
        }`}>
            <Clock className="w-3 h-3" />
            {remaining}
        </span>
    );
};

export default CountdownTimer;

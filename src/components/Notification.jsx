import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const Notification = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const handleNotification = (event) => {
            const newNotif = {
                id: Date.now() + Math.random(),
                ...event.detail
            };
            setNotifications(prev => [...prev, newNotif]);

            if (newNotif.duration > 0) {
                setTimeout(() => {
                    removeNotification(newNotif.id);
                }, newNotif.duration);
            }
        };

        window.addEventListener('app-notification', handleNotification);
        return () => window.removeEventListener('app-notification', handleNotification);
    }, []);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '400px',
            pointerEvents: 'none'
        }}>
            {notifications.map(notif => {
                let icon, bgColor, textColor, borderColor;

                switch (notif.type) {
                    case 'success':
                        icon = <CheckCircle2 size={20} />;
                        bgColor = 'rgba(20, 36, 24, 0.9)';
                        textColor = 'var(--primary)';
                        borderColor = 'rgba(var(--primary-rgb), 0.3)';
                        break;
                    case 'error':
                        icon = <AlertCircle size={20} />;
                        bgColor = 'rgba(40, 15, 15, 0.9)';
                        textColor = '#ef4444';
                        borderColor = 'rgba(239, 68, 68, 0.3)';
                        break;
                    case 'warning':
                        icon = <AlertCircle size={20} />;
                        bgColor = 'rgba(40, 35, 10, 0.9)';
                        textColor = '#eab308';
                        borderColor = 'rgba(234, 179, 8, 0.3)';
                        break;
                    default:
                        icon = <Info size={20} />;
                        bgColor = 'rgba(30, 30, 34, 0.9)';
                        textColor = '#3b82f6';
                        borderColor = 'rgba(59, 130, 246, 0.3)';
                }

                return (
                    <div
                        key={notif.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            padding: '16px',
                            borderRadius: '12px',
                            backgroundColor: bgColor,
                            border: `1px solid ${borderColor}`,
                            color: textColor,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(10px)',
                            pointerEvents: 'auto',
                            animation: 'slide-in-right 0.3s ease-out forwards'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {icon}
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff', lineHeight: '1.4' }}>
                                {notif.message}
                            </span>
                        </div>
                        <button
                            onClick={() => removeNotification(notif.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                padding: '4px'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Notification;

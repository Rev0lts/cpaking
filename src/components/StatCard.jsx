import React from 'react';

const StatCard = ({ title, value, icon, variant = 'default', size = 'medium', valueColor = 'var(--text-main)', trend }) => {
    const isLarge = size === 'large';

    const getIconColor = () => {
        switch (variant) {
            case 'primary': return 'var(--primary)';
            case 'secondary': return 'var(--secondary)';
            case 'accent': return 'var(--accent)';
            case 'warning': return 'var(--accent-amber)';
            case 'info': return 'var(--secondary)';
            case 'danger': return 'var(--danger)';
            default: return 'var(--text-muted)';
        }
    };

    const variantClass = variant !== 'default' ? `stat-card--${variant}` : '';

    return (
        <div className={`glass-card stat-card ${variantClass} animate-fade-in`} style={{
            padding: isLarge ? '24px' : '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: isLarge ? '260px' : '200px',
            flex: 1
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: `${getIconColor()}14`,
                    color: getIconColor(),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {icon}
                </div>
                {trend !== undefined && !isLarge && (
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: trend > 0 ? 'rgba(var(--money-positive-rgb), 0.12)' : (trend < 0 ? 'rgba(var(--money-negative-rgb), 0.12)' : 'rgba(255, 255, 255, 0.05)'),
                        color: trend > 0 ? 'var(--money-positive)' : (trend < 0 ? 'var(--money-negative)' : 'var(--text-muted)')
                    }}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </div>
                )}
            </div>

            <div>
                <div style={{
                    fontSize: isLarge ? '1rem' : '0.875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    marginBottom: '4px'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: isLarge ? '1.75rem' : '1.25rem',
                    fontWeight: 700,
                    color: valueColor,
                    letterSpacing: '-0.02em'
                }}>
                    {value}
                </div>
            </div>
        </div>
    );
};

export default StatCard;

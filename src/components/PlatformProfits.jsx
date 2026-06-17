import React from 'react';

const PlatformProfits = ({ platforms = [], onNavigate }) => {
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const topPlatforms = platforms.slice(0, 5);

    return (
        <div className="glass-card animate-fade-in dashboard-widget" style={{ padding: '24px', flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Lucro por Plataforma</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {topPlatforms.length > 0 ? (
                    topPlatforms.map((p, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                localStorage.setItem('navigateToPlatform', p.id);
                                if (onNavigate) onNavigate('plataformas');
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid var(--card-border)',
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                            }}
                            title="Ver detalhes da plataforma"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: p.color || 'var(--primary)'
                                }} />
                                <span style={{ fontWeight: 500 }}>{p.name}</span>
                            </div>
                            <span style={{
                                fontWeight: 700,
                                color: p.profit > 0 ? 'var(--primary)' : (p.profit < 0 ? 'var(--danger)' : 'var(--text-main)')
                            }}>
                                {formatCurrency(p.profit)}
                            </span>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        Nenhum dado disponível
                    </div>
                )}
            </div>

            <button
                onClick={() => onNavigate && onNavigate('plataformas')}
                style={{
                    marginTop: '24px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px dashed var(--card-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'var(--transition)'
                }}>
                Ver Relatório Completo
            </button>

            <style>{`
                button:hover {
                    color: var(--text-main);
                    border-color: var(--primary);
                    background-color: rgba(var(--primary-rgb), 0.05);
                }
            `}</style>
        </div>
    );
};

export default PlatformProfits;

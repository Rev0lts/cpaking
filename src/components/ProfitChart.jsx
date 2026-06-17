import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const ProfitChart = ({ dataSets }) => {
    const [filter, setFilter] = useState('Mes');

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'var(--surface-solid)',
                    border: '1px solid rgba(var(--primary-rgb), 0.25)',
                    padding: '12px',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-glow)',
                }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)' }}>
                        R$ {payload[0].value.toLocaleString('pt-BR')}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card animate-fade-in" style={{ padding: '24px', flex: 2, minWidth: 0 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '1.25rem' }}>Evolução do Lucro</h3>
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    padding: '4px',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border)',
                }}>
                    {['Semana', 'Mes', 'Ano'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={filter === f ? 'chart-filter-btn chart-filter-btn--active' : 'chart-filter-btn'}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                transition: 'var(--transition)',
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                    <AreaChart data={dataSets[filter]}>
                        <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="profit"
                            stroke="var(--primary)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorProfit)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ProfitChart;

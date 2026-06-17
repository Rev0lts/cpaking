import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { revenueData } from '../data/dashboardData'
import './RevenueChart.css'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      <p className="tooltip-value">R$ {payload[0].value.toLocaleString('pt-BR')}</p>
    </div>
  )
}

export default function RevenueChart() {
  return (
    <div className="card revenue-chart">
      <div className="card-header">
        <div>
          <h2 className="card-title">Receita Mensal</h2>
          <p className="card-subtitle">Performance dos últimos 12 meses</p>
        </div>
        <div className="chart-legend">
          <span className="legend-dot" />
          Receita
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="receita"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#colorReceita)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import './RevenueChart.css'

const data = [
  { month: 'Jan', receita: 42000, conversoes: 1200 },
  { month: 'Fev', receita: 38000, conversoes: 980 },
  { month: 'Mar', receita: 55000, conversoes: 1450 },
  { month: 'Abr', receita: 48000, conversoes: 1320 },
  { month: 'Mai', receita: 72000, conversoes: 1890 },
  { month: 'Jun', receita: 68000, conversoes: 1750 },
  { month: 'Jul', receita: 85000, conversoes: 2100 },
  { month: 'Ago', receita: 92000, conversoes: 2350 },
  { month: 'Set', receita: 78000, conversoes: 1980 },
  { month: 'Out', receita: 105000, conversoes: 2680 },
  { month: 'Nov', receita: 118000, conversoes: 2950 },
  { month: 'Dez', receita: 128450, conversoes: 3200 },
]

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
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="receita"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorReceita)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

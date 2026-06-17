import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { performance } from '../data/dashboardData'
import './PerformanceRing.css'

const data = [
  { name: 'Meta Atingida', value: performance.goalPercent },
  { name: 'Restante', value: 100 - performance.goalPercent },
]

const COLORS = ['var(--accent)', 'rgba(255,255,255,0.06)']

export default function PerformanceRing() {
  return (
    <div className="card performance-ring">
      <div className="card-header">
        <div>
          <h2 className="card-title">Performance</h2>
          <p className="card-subtitle">Meta mensal de conversões</p>
        </div>
      </div>

      <div className="ring-container">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="ring-center">
          <span className="ring-value">{performance.goalPercent}%</span>
          <span className="ring-label">da meta</span>
        </div>
      </div>

      <div className="metrics-list">
        {performance.metrics.map((m) => (
          <div key={m.label} className="metric-item">
            <span className="metric-label">{m.label}</span>
            <span className="metric-value">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

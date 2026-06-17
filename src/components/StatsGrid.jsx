import { DollarSign, MousePointerClick, Target, TrendingUp } from 'lucide-react'
import './StatsGrid.css'

const stats = [
  {
    label: 'Receita Total',
    value: 'R$ 128.450',
    change: '+12.5%',
    positive: true,
    icon: DollarSign,
    color: '#6366f1',
  },
  {
    label: 'Conversões',
    value: '3.842',
    change: '+8.2%',
    positive: true,
    icon: Target,
    color: '#22c55e',
  },
  {
    label: 'Cliques',
    value: '89.2K',
    change: '+15.3%',
    positive: true,
    icon: MousePointerClick,
    color: '#3b82f6',
  },
  {
    label: 'ROI Médio',
    value: '245%',
    change: '-2.1%',
    positive: false,
    icon: TrendingUp,
    color: '#f59e0b',
  },
]

export default function StatsGrid() {
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <div className="stat-top">
            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
              <stat.icon size={20} />
            </div>
            <span className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
              {stat.change}
            </span>
          </div>
          <p className="stat-value">{stat.value}</p>
          <p className="stat-label">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}

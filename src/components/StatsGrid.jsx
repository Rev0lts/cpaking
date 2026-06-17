import { DollarSign, MousePointerClick, Target, TrendingUp } from 'lucide-react'
import { stats as statsData } from '../data/dashboardData'
import './StatsGrid.css'

const icons = [DollarSign, Target, MousePointerClick, TrendingUp]

export default function StatsGrid() {
  return (
    <div className="stats-grid">
      {statsData.map((stat, i) => {
        const Icon = icons[i]
        return (
          <div key={stat.label} className="stat-card">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                <Icon size={20} />
              </div>
              <span className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
                {stat.change}
              </span>
            </div>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}

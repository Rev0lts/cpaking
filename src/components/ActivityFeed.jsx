import { ArrowUpRight, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react'
import { activities } from '../data/dashboardData'
import './ActivityFeed.css'

const iconMap = {
  conversion: { icon: ArrowUpRight, color: 'var(--success)' },
  affiliate: { icon: UserPlus, color: 'var(--accent)' },
  alert: { icon: AlertTriangle, color: 'var(--warning)' },
  approved: { icon: CheckCircle, color: 'var(--info)' },
  milestone: { icon: ArrowUpRight, color: 'var(--accent-secondary)' },
}

export default function ActivityFeed() {
  return (
    <div className="card activity-feed">
      <div className="card-header">
        <div>
          <h2 className="card-title">Atividade Recente</h2>
          <p className="card-subtitle">Últimas atualizações do sistema</p>
        </div>
      </div>

      <ul className="activity-list">
        {activities.map((item, i) => {
          const { icon: Icon, color } = iconMap[item.type]
          return (
            <li key={i} className="activity-item">
              <div className="activity-icon" style={{ background: `${color}20`, color }}>
                <Icon size={16} />
              </div>
              <div className="activity-content">
                <p className="activity-title">{item.title}</p>
                <p className="activity-desc">{item.desc}</p>
              </div>
              <span className="activity-time">{item.time}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

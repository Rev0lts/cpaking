import { ArrowUpRight, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react'
import './ActivityFeed.css'

const activities = [
  {
    icon: ArrowUpRight,
    color: '#22c55e',
    title: 'Nova conversão registrada',
    desc: 'Campanha Black Friday 2025 — R$ 45,00',
    time: '2 min atrás',
  },
  {
    icon: UserPlus,
    color: '#6366f1',
    title: 'Novo afiliado aprovado',
    desc: 'Maria Silva entrou no programa',
    time: '15 min atrás',
  },
  {
    icon: AlertTriangle,
    color: '#f59e0b',
    title: 'Orçamento atingindo limite',
    desc: 'App Install - iOS em 85% do budget',
    time: '1h atrás',
  },
  {
    icon: CheckCircle,
    color: '#3b82f6',
    title: 'Campanha aprovada',
    desc: 'E-commerce BR liberada para veiculação',
    time: '3h atrás',
  },
  {
    icon: ArrowUpRight,
    color: '#22c55e',
    title: 'Meta diária atingida',
    desc: '150 conversões hoje — recorde!',
    time: '5h atrás',
  },
]

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
        {activities.map((item, i) => (
          <li key={i} className="activity-item">
            <div className="activity-icon" style={{ background: `${item.color}20`, color: item.color }}>
              <item.icon size={16} />
            </div>
            <div className="activity-content">
              <p className="activity-title">{item.title}</p>
              <p className="activity-desc">{item.desc}</p>
            </div>
            <span className="activity-time">{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { MoreHorizontal } from 'lucide-react'
import './CampaignTable.css'

const campaigns = [
  { name: 'Black Friday 2025', status: 'active', clicks: '12.4K', conv: '842', revenue: 'R$ 28.450', roi: '312%' },
  { name: 'App Install - iOS', status: 'active', clicks: '8.9K', conv: '521', revenue: 'R$ 15.200', roi: '198%' },
  { name: 'Lead Gen - Finanças', status: 'paused', clicks: '5.2K', conv: '310', revenue: 'R$ 9.800', roi: '156%' },
  { name: 'E-commerce BR', status: 'active', clicks: '22.1K', conv: '1.240', revenue: 'R$ 42.100', roi: '278%' },
  { name: 'Survey Rewards', status: 'ended', clicks: '3.8K', conv: '189', revenue: 'R$ 4.200', roi: '89%' },
]

const statusMap = {
  active: { label: 'Ativa', class: 'status-active' },
  paused: { label: 'Pausada', class: 'status-paused' },
  ended: { label: 'Encerrada', class: 'status-ended' },
}

export default function CampaignTable() {
  return (
    <div className="card campaign-table">
      <div className="card-header">
        <div>
          <h2 className="card-title">Campanhas Recentes</h2>
          <p className="card-subtitle">Top 5 campanhas por receita</p>
        </div>
        <button className="icon-btn-sm" aria-label="Mais opções">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Status</th>
              <th>Cliques</th>
              <th>Conv.</th>
              <th>Receita</th>
              <th>ROI</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name}>
                <td className="campaign-name">{c.name}</td>
                <td>
                  <span className={`status-badge ${statusMap[c.status].class}`}>
                    {statusMap[c.status].label}
                  </span>
                </td>
                <td>{c.clicks}</td>
                <td>{c.conv}</td>
                <td className="revenue-cell">{c.revenue}</td>
                <td className="roi-cell">{c.roi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

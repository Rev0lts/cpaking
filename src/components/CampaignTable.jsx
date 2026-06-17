import { MoreHorizontal } from 'lucide-react'
import { campaigns } from '../data/dashboardData'
import './CampaignTable.css'

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

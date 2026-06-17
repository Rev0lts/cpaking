import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Users,
  Wallet,
  Settings,
  HelpCircle,
  X,
  TrendingUp,
} from 'lucide-react'
import { brand } from '../data/dashboardData'
import './Sidebar.css'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Megaphone, label: 'Campanhas' },
  { icon: BarChart3, label: 'Relatórios' },
  { icon: Users, label: 'Afiliados' },
  { icon: Wallet, label: 'Financeiro' },
  { icon: TrendingUp, label: 'Conversões' },
]

const bottomItems = [
  { icon: Settings, label: 'Configurações' },
  { icon: HelpCircle, label: 'Suporte' },
]

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">CP</div>
          <span className="logo-text">{brand.name}</span>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Fechar menu">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-label">Menu</span>
        <ul>
          {navItems.map((item) => (
            <li key={item.label}>
              <a href="#" className={item.active ? 'active' : ''}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-bottom">
        <ul>
          {bottomItems.map((item) => (
            <li key={item.label}>
              <a href="#">
                <item.icon size={20} />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="sidebar-promo">
          <p>Upgrade para Pro</p>
          <span>Desbloqueie analytics avançados</span>
          <button className="promo-btn">Saiba mais</button>
        </div>
      </div>
    </aside>
  )
}

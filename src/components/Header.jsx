import { Menu, Search, Bell, ChevronDown } from 'lucide-react'
import { brand } from '../data/dashboardData'
import './Header.css'

export default function Header({ onMenuClick }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input type="search" placeholder="Buscar campanhas, afiliados..." />
        </div>
      </div>

      <div className="header-right">
        <button className="icon-btn" aria-label="Notificações">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>

        <button className="user-menu">
          <div className="avatar">{brand.user.initials}</div>
          <div className="user-info">
            <span className="user-name">{brand.user.name}</span>
            <span className="user-role">{brand.user.role}</span>
          </div>
          <ChevronDown size={16} className="chevron" />
        </button>
      </div>
    </header>
  )
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Layout,
  Key,
  TrendingUp,
  LogOut,
  User,
  Lock as LockIcon,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Map,
  Calendar,
  X,
  Archive,
} from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, hasActivePlan, profile, mobileOpen, onMobileClose }) => {
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? '72px' : '260px';

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
  }, [collapsed]);

  useEffect(() => {
    if (mobileOpen && window.innerWidth < 1024) {
      document.documentElement.style.setProperty('--sidebar-width', '0px');
    } else {
      document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
    }
  }, [mobileOpen, sidebarWidth]);

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', protected: true },
    { id: 'plataformas', icon: <Layout size={20} />, label: 'Plataformas', protected: true },
    { id: 'chinesas', icon: <Map size={20} />, label: 'Chinesas', protected: true },
    { id: 'inativas', icon: <Archive size={20} />, label: 'Inativas', protected: true },
    { id: 'chavepix', icon: <Key size={20} />, label: 'Chave Pix', protected: true },
    { id: 'calendario', icon: <Calendar size={20} />, label: 'Calendário', protected: true },
  ];

  const handleNav = (id, locked) => {
    if (locked) return;
    onTabChange(id);
    onMobileClose?.();
  };

  return (
    <aside
      className={`sidebar${mobileOpen ? ' sidebar--mobile-open' : ''}`}
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
      }}
    >
      <div className="logo" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '40px',
        paddingLeft: collapsed ? '8px' : '12px',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div className="logo-icon" style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-fg)',
            flexShrink: 0,
          }}>
            <TrendingUp size={20} strokeWidth={3} />
          </div>
          {!collapsed && <h2 className="sidebar-brand-title display-font" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, whiteSpace: 'nowrap' }}>CPAKing</h2>}
        </div>
        {mobileOpen && (
          <button
            type="button"
            className="mobile-menu-btn sidebar-close-mobile"
            onClick={onMobileClose}
            aria-label="Fechar menu"
            style={{ width: 36, height: 36 }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => {
          const isLocked = item.protected && !hasActivePlan;
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              onClick={() => handleNav(item.id, isLocked)}
              className={`nav-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: collapsed ? '12px' : '12px 16px',
                borderRadius: '12px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                marginBottom: '4px',
                transition: 'var(--transition)',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
                border: isActive ? undefined : '1px solid transparent',
                opacity: isLocked ? 0.5 : 1,
              }}
              title={isLocked ? 'Requer Plano Ativo' : item.label}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.icon}
                {!collapsed && <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>}
              </div>
              {isLocked && !collapsed && <LockIcon size={14} color="var(--text-muted)" />}
            </div>
          );
        })}
      </nav>

      {profile?.is_admin && (
        <div
          onClick={() => handleNav('admin', false)}
          className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '12px',
            padding: collapsed ? '12px' : '12px 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            marginBottom: '8px',
            transition: 'var(--transition)',
            color: activeTab === 'admin' ? 'var(--text-main)' : 'var(--text-muted)',
            backgroundColor: 'transparent',
            border: activeTab === 'admin' ? undefined : '1px solid transparent',
          }}
          title="Admin"
        >
          <ShieldCheck size={20} />
          {!collapsed && <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Admin</span>}
        </div>
      )}

      <div
        onClick={() => handleNav('profile', false)}
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '12px',
          padding: collapsed ? '12px' : '12px 16px',
          borderRadius: '12px',
          cursor: 'pointer',
          marginBottom: '8px',
          transition: 'var(--transition)',
          color: activeTab === 'profile' ? 'var(--text-main)' : 'var(--text-muted)',
          backgroundColor: 'transparent',
          border: activeTab === 'profile' ? undefined : '1px solid transparent',
        }}
        title="Meu Perfil"
      >
        <User size={20} />
        {!collapsed && <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Meu Perfil</span>}
      </div>

      <div
        className="logout"
        onClick={() => supabase.auth.signOut()}
        style={{
          padding: collapsed ? '12px' : '12px 16px',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '12px',
          color: 'var(--text-muted)',
          transition: 'var(--transition)',
          marginTop: '4px',
        }}
        title="Sair"
      >
        <LogOut size={20} />
        {!collapsed && <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Sair</span>}
      </div>

      <div
        onClick={() => setCollapsed(!collapsed)}
        className="toggle-btn sidebar-toggle-desktop"
        style={{
          padding: '10px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          transition: 'var(--transition)',
          marginTop: '8px',
          border: '1px solid var(--card-border)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}
        title={collapsed ? 'Expandir' : 'Minimizar'}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </div>

      <style>{`
        .sidebar {
          height: 100vh;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--card-border);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 200;
          transition: transform 0.25s ease, width 0.25s ease, min-width 0.25s ease;
          overflow-x: hidden;
          overflow-y: auto;
        }
        .sidebar-close-mobile {
          display: none;
        }
        @media (max-width: 1023px) {
          .sidebar {
            padding: 20px 16px;
          }
          .sidebar-close-mobile {
            display: flex;
          }
        }
        .nav-item:hover:not(.locked):not(.active) {
          color: var(--text-main) !important;
          background: rgba(255, 255, 255, 0.04) !important;
        }
        .nav-item.locked:hover {
          background-color: transparent !important;
          color: var(--text-muted) !important;
        }
        .logout:hover {
          color: #ef4444 !important;
          background-color: rgba(239, 68, 68, 0.05) !important;
        }
        .toggle-btn:hover {
          color: var(--text-main) !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;

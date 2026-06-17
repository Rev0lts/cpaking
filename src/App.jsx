import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import StatsGrid from './components/StatsGrid'
import RevenueChart from './components/RevenueChart'
import CampaignTable from './components/CampaignTable'
import ActivityFeed from './components/ActivityFeed'
import PerformanceRing from './components/PerformanceRing'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="content">
          <section className="page-header">
            <div>
              <h1>Dashboard</h1>
              <p>Visão geral das suas campanhas CPA</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-secondary">Exportar</button>
              <button className="btn btn-primary">Nova Campanha</button>
            </div>
          </section>

          <StatsGrid />

          <div className="grid-2-1">
            <RevenueChart />
            <PerformanceRing />
          </div>

          <div className="grid-1-1">
            <CampaignTable />
            <ActivityFeed />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

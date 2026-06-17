import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Plataformas from './components/Plataformas';
import Chinesas from './components/Chinesas';
import Inativas from './components/Inativas';
import ChavePix from './components/ChavePix';
import Calendario from './components/Calendario';
import Profile from './components/Profile';
import Auth from './components/Auth';
import Notification from './components/Notification';
import AdminPanel from './components/AdminPanel';
import PlatformCardPopout, { getPopoutParams } from './components/PlatformCardPopout';
import { Menu } from 'lucide-react';
import { useDailyProfitMidnightLock } from './lib/dailyProfitSnapshots';

function App() {
  const popoutParams = getPopoutParams();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [resetPlataformas, setResetPlataformas] = useState(0);
  const [resetChinesas, setResetChinesas] = useState(0);
  const [resetInativas, setResetInativas] = useState(0);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useDailyProfitMidnightLock(impersonatedUser, Boolean(session));

  const handleTabChange = (tabId) => {
    if (tabId === 'plataformas' && activeTab === 'plataformas') {
      setResetPlataformas(prev => prev + 1);
    }
    if (tabId === 'chinesas' && activeTab === 'chinesas') {
      setResetChinesas(prev => prev + 1);
    }
    if (tabId === 'inativas' && activeTab === 'inativas') {
      setResetInativas(prev => prev + 1);
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('online-users', {
      config: { presence: { key: session.user.id } }
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: session.user.id, online_at: new Date().toISOString() });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: newProf, error: insertErr } = await supabase
          .from('profiles')
          .insert([{ id: userId, email: user?.email }])
          .select()
          .single();
        if (!insertErr) setProfile(newProf);
      } else if (error) {
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("[fetchProfile] Exceção:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPlanActive = true;

  useEffect(() => {
    if (!loading && session && activeTab === 'subscription') {
      setActiveTab('dashboard');
    }
  }, [loading, session, activeTab]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (popoutParams) {
    return (
      <PlatformCardPopout
        type={popoutParams.type}
        platformId={popoutParams.platformId}
        cycle={popoutParams.cycle}
      />
    );
  }

  const tabTitles = {
    dashboard: 'Dashboard',
    plataformas: 'Plataformas',
    chinesas: 'Chinesas',
    inativas: 'Inativas',
    chavepix: 'Chave Pix',
    calendario: 'Calendário',
    profile: 'Meu Perfil',
    admin: 'Admin',
  };

  return (
    <div className="app-container">
      <Notification />

      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop is-visible"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasActivePlan={isPlanActive}
        profile={profile}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <main className="app-main">
        <div className="app-mobile-bar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span className="app-mobile-bar__title">{tabTitles[activeTab] || 'CPAKing'}</span>
        </div>

        {impersonatedUser && (
          <div className="impersonation-banner animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5', flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Vendo como <strong>{impersonatedUser.email || 'Usuário'}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setImpersonatedUser(null)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#ef4444',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Sair do modo admin
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigate={handleTabChange}
            impersonatedUser={impersonatedUser}
            dailyGoal={profile?.daily_goal}
          />
        )}
        {activeTab === 'chavepix' && <ChavePix impersonatedUser={impersonatedUser} />}
        {activeTab === 'calendario' && <Calendario impersonatedUser={impersonatedUser} />}
        {activeTab === 'plataformas' && (
          <Plataformas
            resetTrigger={resetPlataformas}
            impersonatedUser={impersonatedUser}
            dailyGoal={profile?.daily_goal}
          />
        )}
        {activeTab === 'chinesas' && <Chinesas resetTrigger={resetChinesas} impersonatedUser={impersonatedUser} />}
        {activeTab === 'inativas' && (
          <Inativas
            resetTrigger={resetInativas}
            impersonatedUser={impersonatedUser}
            dailyGoal={profile?.daily_goal}
          />
        )}

        {activeTab === 'admin' && profile?.is_admin && (
          <AdminPanel onImpersonate={(user) => {
            setImpersonatedUser(user);
            handleTabChange('dashboard');
          }} />
        )}

        {activeTab === 'profile' && (
          <Profile
            onPlanUpdate={() => fetchProfile(session.user.id)}
            onNavigate={handleTabChange}
            impersonatedUser={impersonatedUser}
          />
        )}
      </main>
    </div>
  );
}

export default App;

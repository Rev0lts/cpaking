import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Users,
    UserPlus,
    ShieldCheck,
    Mail,
    Calendar,
    Zap,
    XCircle,
    Wifi,
    Eraser,
} from 'lucide-react';
import { notify } from '../lib/notify';
import { adminCleanKeepAccounts } from '../lib/clearFinancialData';

const StatsBar = () => {
    const [registeredCount, setRegisteredCount] = useState(null);
    const [onlineCount, setOnlineCount] = useState(0);

    useEffect(() => {
        // Fetch registered user count
        const getCount = async () => {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            setRegisteredCount(count);
        };
        getCount();

        // Listen to online users via Supabase Realtime Presence
        const channel = supabase.channel('online-users');

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const totalOnline = Object.keys(state).reduce(
                    (sum, key) => sum + state[key].length, 0
                );
                setOnlineCount(totalOnline);
            })
            .on('presence', { event: 'join' }, () => {
                const state = channel.presenceState();
                const totalOnline = Object.keys(state).reduce(
                    (sum, key) => sum + state[key].length, 0
                );
                setOnlineCount(totalOnline);
            })
            .on('presence', { event: 'leave' }, () => {
                const state = channel.presenceState();
                const totalOnline = Object.keys(state).reduce(
                    (sum, key) => sum + state[key].length, 0
                );
                setOnlineCount(totalOnline);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ role: 'admin', online_at: new Date().toISOString() });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(var(--primary-rgb), 0.03)',
                border: '1px solid rgba(var(--primary-rgb), 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.875rem'
            }}>
                <Wifi size={16} color="var(--primary)" />
                <span style={{ color: 'var(--text-muted)' }}>
                    Online Agora: <strong style={{ color: 'var(--primary)' }}>{onlineCount}</strong>
                </span>
                <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    animation: 'pulse 2s infinite',
                    boxShadow: '0 0 8px rgba(var(--primary-rgb), 0.5)'
                }} />
            </div>

            <div style={{
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--card-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.875rem'
            }}>
                <Users size={16} color="var(--primary)" />
                <span style={{ color: 'var(--text-muted)' }}>
                    Usuários Cadastrados: <strong style={{ color: 'var(--text-main)' }}>{registeredCount !== null ? registeredCount : '...'}</strong>
                </span>
            </div>
        </div>
    );
};

const AdminPanel = ({ onImpersonate }) => {
    const [email, setEmail] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('trial');
    const [loading, setLoading] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [cleanLoading, setCleanLoading] = useState(false);
    const [cleanModalOpen, setCleanModalOpen] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setUsersList(data || []);
            } catch (err) {
                console.error("Erro ao buscar usuários:", err);
            }
        };
        fetchUsers();
    }, []);

    const plans = [
        { id: 'none', name: 'Nenhum', icon: <XCircle size={14} color="#ef4444" /> },
        { id: 'trial', name: 'Teste (3 Dias)', icon: <Calendar size={14} color="var(--primary)" /> },
        { id: 'monthly', name: 'Mensal' },
        { id: 'quarterly', name: 'Trimestral' },
        { id: 'annual', name: 'Anual' },
        { id: 'lifetime', name: 'Vitalício', icon: <Zap size={14} color="var(--primary)" /> }
    ];

    const handleActivatePlan = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            notify("Por favor, insira o e-mail do usuário.", "error");
            return;
        }

        try {
            setLoading(true);

            // 1. Get user by email (using ilike for case-insensitive search)
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('id, trial_used, email')
                .ilike('email', email.trim())
                .maybeSingle();

            if (userError) {
                if (userError.message.includes('column "email" does not exist')) {
                    throw new Error("Erro: A coluna 'email' não existe na tabela 'profiles'. Você executou o script SQL no Supabase?");
                }
                throw new Error(`Erro ao buscar usuário: ${userError.message} `);
            }

            if (!userData) {
                throw new Error("Usuário não encontrado com este e-mail. Certifique-se de que ele já logou pelo menos uma vez ou que você executou a sincronização SQL.");
            }

            // 2. Trial restriction check
            if (selectedPlan === 'trial' && userData.trial_used) {
                throw new Error("Este usuário já utilizou o período de teste de 3 dias.");
            }

            let expiresAt = null;
            const planType = selectedPlan === 'none' ? null : selectedPlan;

            if (planType === 'trial') {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 3);
            } else if (planType === 'monthly') {
                expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 1);
            } else if (planType === 'quarterly') {
                expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 3);
            } else if (planType === 'annual') {
                expiresAt = new Date();
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            } else if (planType === 'lifetime') {
                expiresAt = new Date();
                expiresAt.setFullYear(expiresAt.getFullYear() + 100);
            }

            // 3. Update profile
            const updatePayload = {
                plan_type: planType,
                plan_expires_at: expiresAt ? expiresAt.toISOString() : null
            };

            if (selectedPlan === 'trial') {
                updatePayload.trial_used = true;
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', userData.id);

            if (updateError) throw updateError;

            const successMsg = selectedPlan === 'none'
                ? `Acesso removido com sucesso para ${email}.`
                : `Plano ${selectedPlan.toUpperCase()} ativado para ${email} !`;

            notify(successMsg, "success");
            setEmail('');
        } catch (err) {
            console.error("Erro no Admin:", err);
            notify(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCleanDatabase = async () => {
        try {
            setCleanLoading(true);
            const result = await adminCleanKeepAccounts();
            notify('Bases limpas. Contas e plataformas foram mantidas.', 'success', 5000);
            console.info('admin_clean_keep_accounts:', result);
            setCleanModalOpen(false);
        } catch (err) {
            console.error('Erro ao limpar bases:', err);
            notify(
                err.message?.includes('admin_clean_keep_accounts')
                    ? 'Execute supabase_clean_keep_accounts.sql no Supabase SQL Editor primeiro.'
                    : err.message || 'Não foi possível limpar as bases.',
                'error',
                6000
            );
        } finally {
            setCleanLoading(false);
        }
    };

    return (
        <div className="page-content page-content--narrow animate-fade-in">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                        <ShieldCheck size={24} />
                    </div>
                    <h1>Painel Administrativo</h1>
                </div>
                <p>Gestão manual de acessos e planos especiais.</p>
            </header>

            <StatsBar />

            <div className="glass-card" style={{ padding: '32px', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserPlus size={20} color="var(--primary)" /> Gerenciar Plano do Usuário
                </h3>

                <form onSubmit={handleActivatePlan}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>E-mail do Usuário</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@email.com"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 48px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    transition: 'var(--transition)'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ação / Selecionar Plano</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        backgroundColor: selectedPlan === plan.id ? (plan.id === 'none' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(var(--primary-rgb), 0.05)') : 'rgba(255, 255, 255, 0.01)',
                                        border: `1px solid ${selectedPlan === plan.id ? (plan.id === 'none' ? '#ef4444' : 'var(--primary)') : 'var(--card-border)'} `,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: selectedPlan === plan.id ? (plan.id === 'none' ? '#ef4444' : 'var(--primary)') : 'var(--text-main)' }}>
                                            {plan.name}
                                        </span>
                                        {plan.icon}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '12px',
                            backgroundColor: selectedPlan === 'none' ? '#ef4444' : 'var(--primary)',
                            color: 'var(--primary-fg)',
                            fontWeight: 500,
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'var(--transition)',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Processando...' : (selectedPlan === 'none' ? 'Remover Plano' : 'Confirmar Ativação')}
                        {!loading && (selectedPlan === 'none' ? <XCircle size={20} /> : <ShieldCheck size={20} />)}
                    </button>
                </form>
            </div>

            <div className="glass-card" style={{ padding: '32px', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={20} color="var(--primary)" /> Lista de Usuários Cadastrados
                </h3>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Usuário / E-mail</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Plano</th>
                                <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersList.map((usr) => (
                                <tr key={usr.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
                                        {usr.email || 'Sem e-mail'}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: usr.plan_type === 'lifetime' ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            color: usr.plan_type === 'lifetime' ? 'var(--primary)' : 'var(--text-muted)'
                                        }}>
                                            {usr.plan_type ? usr.plan_type.toUpperCase() : 'NENHUM'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => onImpersonate && onImpersonate(usr)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                                color: 'var(--primary)',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--primary)';
                                                e.currentTarget.style.color = 'var(--primary-fg)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)';
                                                e.currentTarget.style.color = 'var(--primary)';
                                            }}
                                        >
                                            Ver Dashboard
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {usersList.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '32px', marginBottom: '40px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
                    <Eraser size={20} /> Limpeza de dados
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.6 }}>
                    Remove movimentações financeiras de <strong>todos os usuários</strong>: zera depósito, saque e baú nas contas,
                    apaga reportes rápidos, histórico do calendário, notas e chinesas.{' '}
                    <strong>As contas (login/senha) e plataformas são mantidas.</strong>
                </p>
                <button
                    type="button"
                    onClick={() => setCleanModalOpen(true)}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Limpar bases (manter contas)
                </button>
            </div>

            {cleanModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{ maxWidth: '440px', backgroundColor: '#111114' }}>
                        <h3 style={{ marginBottom: '12px', fontSize: '1.25rem', textAlign: 'center' }}>
                            Confirmar limpeza global?
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6, fontSize: '0.9rem' }}>
                            Esta ação não pode ser desfeita. Todos os valores financeiros serão zerados e os históricos removidos.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                disabled={cleanLoading}
                                onClick={() => setCleanModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--card-border)',
                                    background: 'none',
                                    color: 'var(--text-main)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={cleanLoading}
                                onClick={handleCleanDatabase}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: cleanLoading ? 'default' : 'pointer',
                                    opacity: cleanLoading ? 0.7 : 1,
                                }}
                            >
                                {cleanLoading ? 'Limpando...' : 'Sim, limpar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;

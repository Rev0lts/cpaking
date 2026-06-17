import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    User,
    Lock,
    Tag as TagIcon,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Target,
    Eraser,
} from 'lucide-react';
import { notify } from '../lib/notify';
import { parseCurrency } from '../lib/profitCalculations';
import { clearUserFinancialData } from '../lib/clearFinancialData';
import { invalidateDashboardCache } from './Dashboard';
import { invalidatePlataformasCache } from './Plataformas';

let cachedProfileData = null;

const Profile = ({ onPlanUpdate, onNavigate, impersonatedUser }) => {
    const [user, setUser] = useState(cachedProfileData?.user || null);
    const [profile, setProfile] = useState(cachedProfileData?.profile || null);
    const [tags, setTags] = useState(cachedProfileData?.tags || []);
    const [newTag, setNewTag] = useState('');
    const [loading, setLoading] = useState(!cachedProfileData);
    const [tagLoading, setTagLoading] = useState(false);
    const [tagToDelete, setTagToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isClearFinancialModalOpen, setIsClearFinancialModalOpen] = useState(false);
    const [clearFinancialLoading, setClearFinancialLoading] = useState(false);

    // Password state
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passLoading, setPassLoading] = useState(false);
    const [passStatus, setPassStatus] = useState({ type: '', message: '' });

    const [dailyGoalInput, setDailyGoalInput] = useState('');
    const [goalLoading, setGoalLoading] = useState(false);

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;

                // Fetch profile/plan
                const { data: profileData, error: profError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', targetUserId)
                    .single();

                let finalProfile = profileData;

                if (!profError) {
                    setProfile(profileData);
                    const g = profileData?.daily_goal;
                    setDailyGoalInput(g != null && g !== '' ? String(g).replace('.', ',') : '');
                } else if (profError.code === 'PGRST116') {
                    // Profile doesn't exist yet, create a default one
                    const { data: newProf, error: createError } = await supabase
                        .from('profiles')
                        .insert([{ id: targetUserId, email: impersonatedUser ? impersonatedUser.email : user.email }])
                        .select()
                        .single();
                    if (!createError) {
                        setProfile(newProf);
                        finalProfile = newProf;
                    }
                }

                // Fetch tags
                const { data: tagData, error: tagError } = await supabase
                    .from('user_tags')
                    .select('*')
                    .eq('user_id', targetUserId)
                    .order('created_at', { ascending: false });

                let finalTags = tags;
                if (!tagError) {
                    setTags(tagData);
                    finalTags = tagData;
                }

                cachedProfileData = {
                    user: user,
                    profile: finalProfile,
                    tags: finalTags
                };
            }
        } catch (err) {
            console.error("Erro ao carregar perfil:", err);
        } finally {
            setLoading(false);
            if (onPlanUpdate) onPlanUpdate();
        }
    };

    // Check if user can use tags (quarterly, annual, lifetime, or admin)
    const canUseTags = () => true;

    const tagsAllowed = canUseTags();

    const handleAddTag = async (e) => {
        e.preventDefault();
        if (!newTag.trim()) return;

        // Backend check: block tag creation for non-qualifying plans
        if (!tagsAllowed) {
            notify("Tags personalizadas estão disponíveis apenas nos planos Trimestral, Anual ou Lifetime.", "error", 4000);
            return;
        }

        try {
            setTagLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;
            const { data, error } = await supabase
                .from('user_tags')
                .insert([{ user_id: targetUserId, name: newTag.trim() }])
                .select()
                .single();

            if (error) throw error;
            setTags([data, ...tags]);
            setNewTag('');
        } catch (err) {
            notify("Erro ao adicionar tag: " + err.message, "error");
        } finally {
            setTagLoading(false);
        }
    };

    const handleDeleteTag = async () => {
        if (!tagToDelete) return;

        try {
            const { error } = await supabase
                .from('user_tags')
                .delete()
                .eq('id', tagToDelete.id);

            if (error) throw error;
            setTags(tags.filter(t => t.id !== tagToDelete.id));
            setIsDeleteModalOpen(false);
            setTagToDelete(null);
        } catch (err) {
            notify("Erro ao excluir tag: " + err.message, "error");
        }
    };

    const handleSaveDailyGoal = async (e) => {
        e.preventDefault();
        const amount = parseCurrency(dailyGoalInput);
        if (amount <= 0) {
            notify('Informe um valor de meta maior que zero.', 'error');
            return;
        }

        try {
            setGoalLoading(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;
            const targetUserId = impersonatedUser ? impersonatedUser.id : authUser.id;

            const { data, error } = await supabase
                .from('profiles')
                .update({ daily_goal: amount })
                .eq('id', targetUserId)
                .select()
                .single();

            if (error) throw error;

            setProfile(data);
            cachedProfileData = { ...cachedProfileData, profile: data };
            notify('Meta do dia salva com sucesso!', 'success');
            if (onPlanUpdate) onPlanUpdate();
        } catch (err) {
            console.error('Erro ao salvar meta:', err);
            if (err.message?.includes('daily_goal')) {
                notify('Execute o SQL daily_goal no Supabase (supabase_daily_goal.sql).', 'error', 5000);
            } else {
                notify('Não foi possível salvar a meta.', 'error');
            }
        } finally {
            setGoalLoading(false);
        }
    };

    const handleClearFinancialData = async () => {
        try {
            setClearFinancialLoading(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const targetUserId = impersonatedUser ? impersonatedUser.id : authUser.id;
            await clearUserFinancialData(targetUserId);

            invalidateDashboardCache();
            invalidatePlataformasCache();

            setIsClearFinancialModalOpen(false);
            notify(
                'Depósitos, saques, baús e reporte rápido foram zerados. Plataformas e contas mantidas.',
                'success',
                5000
            );
            if (onPlanUpdate) onPlanUpdate();
        } catch (err) {
            console.error('Erro ao limpar movimentações:', err);
            notify(err.message || 'Não foi possível limpar as movimentações.', 'error');
        } finally {
            setClearFinancialLoading(false);
        }
    };

    const handleClearDailyGoal = async () => {
        try {
            setGoalLoading(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;
            const targetUserId = impersonatedUser ? impersonatedUser.id : authUser.id;

            const { data, error } = await supabase
                .from('profiles')
                .update({ daily_goal: null })
                .eq('id', targetUserId)
                .select()
                .single();

            if (error) throw error;

            setProfile(data);
            setDailyGoalInput('');
            cachedProfileData = { ...cachedProfileData, profile: data };
            notify('Meta do dia removida.', 'info');
            if (onPlanUpdate) onPlanUpdate();
        } catch (err) {
            notify('Não foi possível remover a meta.', 'error');
        } finally {
            setGoalLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setPassStatus({ type: 'error', message: 'As senhas não coincidem.' });
            return;
        }
        if (password.length < 6) {
            setPassStatus({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        try {
            setPassLoading(true);
            setPassStatus({ type: '', message: '' });
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setPassStatus({ type: 'success', message: 'Senha atualizada com sucesso!' });
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPassStatus({ type: 'error', message: err.message });
        } finally {
            setPassLoading(false);
        }
    };

    const calculateDaysRemaining = () => {
        if (!profile || !profile.plan_expires_at) return 0;
        if (profile.plan_type === 'lifetime') return '∞';
        const expires = new Date(profile.plan_expires_at);
        const now = new Date();
        const diffTime = expires - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    if (loading) {
        return (
            <div className="loader-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    const daysRemaining = calculateDaysRemaining();

    return (
        <div className="page-content page-content--narrow">
            <header className="page-header">
                <h1>Meu Perfil</h1>
                <p>Gerencie sua conta e configurações personalizadas</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>

                {/* User Info & Plan */}
                <div className="glass-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            <User size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Informações da Conta</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</p>
                        </div>
                    </div>

                    <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} /> Status do Plano
                            </span>
                            <span style={{
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                backgroundColor: 'rgba(var(--primary-rgb), 0.1)'
                            }}>
                                Ativo
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                Acesso Ilimitado
                            </div>
                        </div>
                        <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} color="var(--primary)" /> Todos os recursos do CPAKing estão liberados.
                        </div>
                    </div>

                    <form onSubmit={handleSaveDailyGoal} style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <Target size={18} color="var(--primary)" />
                            <label style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>Meta do dia (lucro)</label>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 12px' }}>
                            Define o lucro diário alvo. A barra de progresso aparece no Dashboard e nas plataformas.
                        </p>
                        <input
                            type="text"
                            value={dailyGoalInput}
                            onChange={(e) => setDailyGoalInput(e.target.value)}
                            placeholder="Ex: 100,00"
                            className="input-focus"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--card-border)',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                color: 'var(--text-main)',
                                outline: 'none',
                                marginBottom: '12px',
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="submit"
                                disabled={goalLoading}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: 'var(--primary)',
                                    color: '#0a0a0c',
                                    fontWeight: 700,
                                    cursor: goalLoading ? 'default' : 'pointer',
                                    opacity: goalLoading ? 0.7 : 1,
                                }}
                            >
                                {goalLoading ? 'Salvando...' : 'Salvar meta'}
                            </button>
                            {profile?.daily_goal != null && (
                                <button
                                    type="button"
                                    disabled={goalLoading}
                                    onClick={handleClearDailyGoal}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--card-border)',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Change Password */}
                <div className="glass-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <Lock size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Segurança</h3>
                    </div>

                    <form onSubmit={handleUpdatePassword}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nova Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-focus"
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                placeholder="******"
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Confirmar Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-focus"
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                placeholder="******"
                            />
                        </div>

                        {passStatus.message && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '12px',
                                marginBottom: '16px',
                                backgroundColor: passStatus.type === 'success' ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: passStatus.type === 'success' ? 'var(--primary)' : '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.875rem'
                            }}>
                                {passStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {passStatus.message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={passLoading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: passLoading ? 'var(--card-border)' : 'var(--text-main)',
                                color: 'var(--bg-dark)',
                                fontWeight: 700,
                                cursor: passLoading ? 'default' : 'pointer',
                                transition: 'var(--transition)'
                            }}
                        >
                            {passLoading ? 'Atualizando...' : 'Atualizar Senha'}
                        </button>
                    </form>
                </div>

                {/* Limpar movimentações */}
                <div
                    className="glass-card"
                    style={{
                        padding: '32px',
                        gridColumn: '1 / -1',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                flexShrink: 0,
                            }}
                        >
                            <Eraser size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Limpar movimentações</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                Zera <strong>depósitos, saques e baú</strong> de todas as contas e apaga todos os lançamentos do{' '}
                                <strong>Reporte Rápido</strong> e o histórico travado do calendário.
                            </p>
                            <p style={{ margin: '12px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                Não exclui plataformas, contas (login/senha), chaves Pix, chinesas, tags nem a meta do dia.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsClearFinancialModalOpen(true)}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                        }}
                    >
                        Limpar depósitos, saques e reporte rápido
                    </button>
                </div>

                {/* Tag Management */}
                <div className="glass-card profile-tags-card" style={{ padding: '32px', gridColumn: 'span 2', position: 'relative', overflow: 'hidden' }}>
                    {!tagsAllowed && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            borderRadius: '20px',
                            gap: '12px'
                        }}>
                            <Lock size={32} color="var(--text-muted)" />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Disponível no plano Trimestral ou superior</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Faça upgrade para desbloquear tags personalizadas</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <TagIcon size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Minhas Tags</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Crie tags para organizar suas contas</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Ex: VIP, Teste, Pendente..."
                            className="input-focus"
                            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                        />
                        <button
                            type="submit"
                            disabled={tagLoading || !newTag.trim()}
                            style={{ padding: '0 24px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--primary)', color: 'var(--primary-fg)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {tags.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', italic: 'true' }}>Nenhuma tag criada ainda.</div>
                        ) : (
                            tags.map(tag => (
                                <div key={tag.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '100px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--card-border)',
                                    animation: 'fade-in 0.3s ease'
                                }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{tag.name}</span>
                                    <button
                                        onClick={() => {
                                            setTagToDelete(tag);
                                            setIsDeleteModalOpen(true);
                                        }}
                                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <Trash2 size={14} className="hover-danger" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {isClearFinancialModalOpen && (
                <div className="app-overlay">
                    <div
                        className="glass-card app-overlay__panel"
                        style={{ maxWidth: '440px', backgroundColor: '#111114' }}
                    >
                        <div
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                color: '#ef4444',
                            }}
                        >
                            <Eraser size={32} />
                        </div>
                        <h3 style={{ marginBottom: '12px', fontSize: '1.25rem', textAlign: 'center' }}>
                            Limpar todas as movimentações?
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6, fontSize: '0.9rem' }}>
                            Isso vai zerar depósitos, saques e baú em <strong>todas as contas</strong>, remover{' '}
                            <strong>todos os lançamentos do Reporte Rápido</strong>, limpar o histórico do calendário,
                            notas do dashboard e registros de chinesas.
                            <br />
                            <br />
                            <span style={{ color: '#ef4444' }}>Plataformas e contas não serão apagadas.</span> Esta ação não
                            pode ser desfeita.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                disabled={clearFinancialLoading}
                                onClick={() => setIsClearFinancialModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--card-border)',
                                    color: 'var(--text-main)',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={clearFinancialLoading}
                                onClick={handleClearFinancialData}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: clearFinancialLoading ? 'default' : 'pointer',
                                    opacity: clearFinancialLoading ? 0.7 : 1,
                                }}
                            >
                                {clearFinancialLoading ? 'Limpando...' : 'Sim, limpar tudo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{
                        maxWidth: '400px',
                        textAlign: 'center',
                        backgroundColor: '#111114',
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            color: '#ef4444'
                        }}>
                            <Trash2 size={32} />
                        </div>

                        <h3 style={{ marginBottom: '12px', fontSize: '1.25rem' }}>Excluir Tag</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
                            Tem certeza que deseja excluir a tag <strong>{tagToDelete?.name}</strong>? Esta ação não pode ser desfeita.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setTagToDelete(null);
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'var(--text-main)', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteTag}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .hover-danger:hover {
                    color: #ef4444;
                }
            `}</style>
        </div>
    );
};


export default Profile;

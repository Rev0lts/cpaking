import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PlatformDetail from './PlatformDetail';
import {
    Plus,
    X,
    Layers,
    Users,
    Calendar,
    ArrowUpCircle,
    TrendingUp,
    Percent,
    ArrowUpRight,
    Search
} from 'lucide-react';
import DatePicker from './DatePicker';
import { notify } from '../lib/notify';
import { calculatePlatformProfits, formatCurrencyBRL } from '../lib/profitCalculations';
import { invalidateDashboardCache } from './Dashboard';

let cachedPlataformasByMode = { active: null, inactive: null };

export function invalidatePlataformasCache() {
    cachedPlataformasByMode = { active: null, inactive: null };
}

const Plataformas = ({ resetTrigger, impersonatedUser, dailyGoal, mode = 'active' }) => {
    const isInactiveView = mode === 'inactive';
    const [platforms, setPlatforms] = useState(cachedPlataformasByMode[mode] || []);
    const [loading, setLoading] = useState(!cachedPlataformasByMode[mode]);

    useEffect(() => {
        fetchPlatforms();
    }, [mode, impersonatedUser?.id]);

    const filterByMode = (list) =>
        isInactiveView ? list.filter((p) => p.active === false) : list.filter((p) => p.active !== false);

    const fetchPlatforms = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;

            const { data: platformsData, error: platformsError } = await supabase
                .from('platforms')
                .select(`
                    *,
                    accounts (
                        id,
                        deposit,
                        withdraw,
                        chest,
                        created_at,
                        date,
                        tag
                    )
                `)
                .eq('user_id', targetUserId);

            if (platformsError) throw platformsError;

            const formattedPlatforms = platformsData.map(platform => {
                const accountsList = platform.accounts || [];
                const profits = calculatePlatformProfits(accountsList);

                return {
                    ...platform,
                    accountsCount: accountsList.length,
                    depositFormatted: formatCurrencyBRL(profits.totalDeposit),
                    profitFormatted: formatCurrencyBRL(profits.totalProfit),
                    dailyProfitFormatted: formatCurrencyBRL(profits.dailyProfit),
                    rawDeposit: profits.totalDeposit,
                    rawProfit: profits.totalProfit,
                    rawDailyProfit: profits.dailyProfit
                };
            });

            const sortedPlatforms = filterByMode(formattedPlatforms).sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );

            cachedPlataformasByMode[mode] = sortedPlatforms;
            setPlatforms(sortedPlatforms);
        } catch (err) {
            if (err.code === '42703' || err.code === 'PGRST204') {
                console.warn("Coluna 'active' não encontrada em 'platforms', tratando todas como ativas.");
                const targetUserId = impersonatedUser
                    ? impersonatedUser.id
                    : (await supabase.auth.getUser()).data.user?.id;
                if (!targetUserId) return;

                const { data: platformsData, error: platformsError } = await supabase
                    .from('platforms')
                    .select(`
                        id, name, date, created_at,
                        accounts (id, deposit, withdraw, chest, created_at, date, tag)
                    `)
                    .eq('user_id', targetUserId)
                    .order('created_at', { ascending: false });

                if (platformsError) throw platformsError;

                const formattedPlatforms = platformsData.map(platform => {
                    const accountsList = platform.accounts || [];
                    const profits = calculatePlatformProfits(accountsList);

                    return {
                        ...platform,
                        active: true,
                        accountsCount: accountsList.length,
                        depositFormatted: formatCurrencyBRL(profits.totalDeposit),
                        profitFormatted: formatCurrencyBRL(profits.totalProfit),
                        dailyProfitFormatted: formatCurrencyBRL(profits.dailyProfit),
                        rawDeposit: profits.totalDeposit,
                        rawProfit: profits.totalProfit,
                        rawDailyProfit: profits.dailyProfit
                    };
                });

                const visiblePlatforms = filterByMode(formattedPlatforms).sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );

                cachedPlataformasByMode[mode] = visiblePlatforms;
                setPlatforms(visiblePlatforms);
                return;
            }
            console.error("Erro ao buscar plataformas:", err);
        } finally {
            setLoading(false);
        }
    };

    const getGMT3Date = () => {
        const date = new Date();
        const offset = -3; // GMT-3
        const gmt3Date = new Date(date.getTime() + (offset * 60 * 60 * 1000));
        const day = String(gmt3Date.getDate()).padStart(2, '0');
        const month = String(gmt3Date.getMonth() + 1).padStart(2, '0');
        const year = gmt3Date.getFullYear();
        return `${day}/${month}/${year}`;
    };



    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    useEffect(() => {
        if (resetTrigger > 0) {
            setSelectedPlatform(null);
            setSelectedGroupId(null);
        }
    }, [resetTrigger]);

    // Check localStorage for navigation
    useEffect(() => {
        if (platforms.length > 0) {
            const navPlatformId = localStorage.getItem('navigateToPlatform');
            if (navPlatformId) {
                const platToSelect = platforms.find(p => String(p.id) === navPlatformId);
                if (platToSelect) {
                    setSelectedPlatform(platToSelect);
                }
                localStorage.removeItem('navigateToPlatform');
            }
        }
    }, [platforms]);
    const [newPlatform, setNewPlatform] = useState({
        names: [''],
        groupName: '',
        date: getGMT3Date(),
        pixTypes: []
    });

    const pixTypeOptions = ['CPF', 'CNPJ', 'EVP', 'Email', 'Telefone'];

    const resetNewPlatformForm = () => {
        setNewPlatform({ names: [''], groupName: '', date: getGMT3Date(), pixTypes: [] });
    };

    const updatePlatformName = (index, value) => {
        setNewPlatform(prev => {
            const names = [...prev.names];
            names[index] = value;
            return { ...prev, names };
        });
    };

    const addPlatformNameField = () => {
        setNewPlatform(prev => ({ ...prev, names: [...prev.names, ''] }));
    };

    const removePlatformNameField = (index) => {
        setNewPlatform(prev => {
            const names = prev.names.filter((_, i) => i !== index);
            return { ...prev, names: names.length > 0 ? names : [''] };
        });
    };

    const togglePlatformPixType = (type) => {
        setNewPlatform(prev => {
            if (prev.pixTypes.includes(type)) {
                return { ...prev, pixTypes: prev.pixTypes.filter(t => t !== type) };
            }
            return { ...prev, pixTypes: [...prev.pixTypes, type] };
        });
    };

    const togglePlatformStatus = async (e, platform) => {
        e.stopPropagation();
        const newStatus = !platform.active;
        try {
            const { error } = await supabase
                .from('platforms')
                .update({ active: newStatus })
                .eq('id', platform.id);

            if (error) {
                if (error.code === '42703' || error.code === 'PGRST204') {
                    console.warn("Coluna 'active' não encontrada em 'platforms'. O status será alterado apenas visualmente nesta sessão.");
                } else {
                    throw error;
                }
            }

            invalidatePlataformasCache();
            invalidateDashboardCache();
            await fetchPlatforms();

            if (error && (error.code === '42703' || error.code === 'PGRST204')) {
                notify("A coluna 'active' não existe no banco de dados. O status foi alterado apenas visualmente.", "warning", 5000);
            } else if (newStatus) {
                notify('Plataforma reativada e voltou ao dashboard.', 'success');
            } else {
                notify('Plataforma marcada como inativa e movida para Inativas.', 'info');
            }
        } catch (err) {
            console.error("Erro ao alternar status da plataforma:", err);
            notify("Erro ao alterar status da plataforma: " + (err.message || "Erro desconhecido"), "error");
        }
    };

    const generateGroupId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                notify("Usuário não autenticado.", "error");
                return;
            }

            const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;

            const names = newPlatform.names.map(n => n.trim()).filter(Boolean);
            if (names.length === 0) {
                notify("Informe ao menos um nome de plataforma.", "error");
                return;
            }

            const isGroup = names.length > 1;
            if (isGroup && !newPlatform.groupName.trim()) {
                notify("Dê um nome ao grupo.", "error");
                return;
            }

            const groupId = isGroup ? generateGroupId() : null;
            const groupName = isGroup ? newPlatform.groupName.trim() : null;

            const buildRow = (name) => ({
                user_id: targetUserId,
                name,
                date: newPlatform.date,
                pix_types: newPlatform.pixTypes,
                group_id: groupId,
                group_name: groupName,
            });

            const rows = names.map(buildRow);

            let insertData, insertError;
            let groupColumnsMissing = false;
            let pixColumnMissing = false;

            ({ data: insertData, error: insertError } = await supabase
                .from('platforms')
                .insert(rows)
                .select());

            // Fallback 1: colunas de grupo ainda não existem no banco
            if (insertError && (insertError.code === '42703' || insertError.code === 'PGRST204')) {
                groupColumnsMissing = true;
                const rowsNoGroup = rows.map(({ group_id, group_name, ...rest }) => rest);
                ({ data: insertData, error: insertError } = await supabase
                    .from('platforms')
                    .insert(rowsNoGroup)
                    .select());
            }

            // Fallback 2: coluna pix_types não existe
            if (insertError && (insertError.code === '42703' || insertError.code === 'PGRST204')) {
                pixColumnMissing = true;
                const rowsNoPixNoGroup = rows.map(({ group_id, group_name, pix_types, ...rest }) => rest);
                ({ data: insertData, error: insertError } = await supabase
                    .from('platforms')
                    .insert(rowsNoPixNoGroup)
                    .select());
            }

            if (insertError) throw insertError;

            const formattedNew = (insertData || []).map((newPlat) => ({
                ...newPlat,
                group_id: groupColumnsMissing ? null : (newPlat.group_id ?? groupId),
                group_name: groupColumnsMissing ? null : (newPlat.group_name ?? groupName),
                accountsCount: 0,
                depositFormatted: 'R$ 0,00',
                profitFormatted: 'R$ 0,00',
                dailyProfitFormatted: 'R$ 0,00',
                rawDeposit: 0,
                rawProfit: 0,
                rawDailyProfit: 0,
                pix_types: newPlatform.pixTypes,
            }));

            const updatedPlatforms = [...formattedNew, ...platforms];
            setPlatforms(updatedPlatforms);
            cachedPlataformasByMode[mode] = updatedPlatforms;
            invalidateDashboardCache();

            if (groupColumnsMissing) {
                notify("As colunas de grupo não existem no banco. Rode o SQL informado — por enquanto as plataformas foram criadas separadas.", "warning", 6000);
            } else if (pixColumnMissing) {
                notify("A coluna 'pix_types' não existe. Plataformas criadas, mas sem as regras PIX.", "warning", 5000);
            } else if (isGroup) {
                notify(`Grupo "${groupName}" criado com ${names.length} plataformas.`, "success");
            } else {
                notify("Plataforma criada.", "success");
            }

            resetNewPlatformForm();
            setIsModalOpen(false);
        } catch (err) {
            console.error("Erro ao adicionar plataforma:", err);
            notify("Erro ao salvar a(s) plataforma(s).", "error");
        }
    };
    // Agrupa plataformas que compartilham o mesmo group_id em um único card.
    const groupsById = {};
    const ungroupedPlatforms = [];
    platforms.forEach((p) => {
        if (p.group_id) {
            if (!groupsById[p.group_id]) {
                groupsById[p.group_id] = {
                    id: p.group_id,
                    name: p.group_name || 'Grupo',
                    date: p.date,
                    created_at: p.created_at,
                    members: [],
                    rawDeposit: 0,
                    rawProfit: 0,
                    rawDailyProfit: 0,
                    accountsCount: 0,
                };
            }
            const g = groupsById[p.group_id];
            g.members.push(p);
            g.rawDeposit += p.rawDeposit || 0;
            g.rawProfit += p.rawProfit || 0;
            g.rawDailyProfit += p.rawDailyProfit || 0;
            g.accountsCount += p.accountsCount || 0;
        } else {
            ungroupedPlatforms.push(p);
        }
    });
    const groupList = Object.values(groupsById);
    const selectedGroup = selectedGroupId ? groupsById[selectedGroupId] : null;

    const renderGroupCard = (group) => (
        <div
            key={group.id}
            className="glass-card animate-fade-in"
            onClick={() => setSelectedGroupId(group.id)}
            style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                border: '1px solid rgba(var(--primary-rgb), 0.35)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                opacity: isInactiveView ? 0.85 : 1,
                transition: 'var(--transition)'
            }}
        >
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--primary)', filter: 'blur(50px)', opacity: 0.1, borderRadius: '50%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(var(--primary-rgb), 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <Layers size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{group.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                            <Layers size={14} />
                            <span>{group.members.length} plataformas</span>
                        </div>
                    </div>
                </div>
                <span style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Grupo
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}><Users size={12} /><span>Contas</span></div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{group.accountsCount}</div>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}><TrendingUp size={12} /><span>Lucro Diário</span></div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: group.rawDailyProfit > 0 ? 'var(--money-positive)' : (group.rawDailyProfit < 0 ? 'var(--money-negative)' : 'var(--text-main)') }}>{formatCurrencyBRL(group.rawDailyProfit)}</div>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}><ArrowUpCircle size={12} /><span>Depósito</span></div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{formatCurrencyBRL(group.rawDeposit)}</div>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}><TrendingUp size={12} /><span>Lucro</span></div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: group.rawProfit > 0 ? 'var(--money-positive)' : (group.rawProfit < 0 ? 'var(--money-negative)' : 'var(--text-main)') }}>{formatCurrencyBRL(group.rawProfit)}</div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="loader-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="page-content">
            {selectedPlatform ? (
                <PlatformDetail
                    platform={selectedPlatform}
                    impersonatedUser={impersonatedUser}
                    dailyGoal={dailyGoal}
                    onBack={() => {
                        setSelectedPlatform(null);
                        if (!cachedPlataformasByMode[mode]) {
                            setLoading(true);
                            fetchPlatforms();
                        }
                    }}
                    invalidateCache={() => {
                        invalidatePlataformasCache();
                        invalidateDashboardCache();
                    }}
                />
            ) : (
                <>
                    <header className="page-header platform-page-header">
                        <div>
                            <h1>{isInactiveView ? 'Inativas' : 'Plataformas'}</h1>
                            <p>
                                {isInactiveView
                                    ? 'Plataformas arquivadas — não entram no dashboard'
                                    : 'Gerencie suas contas por plataforma'}
                            </p>
                        </div>
                        {!isInactiveView && !selectedGroup && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-fg)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                            }}
                        >
                            <Plus size={20} />
                            Adicionar Plataforma
                        </button>
                        )}
                    </header>

                    {selectedGroup && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <button
                                onClick={() => setSelectedGroupId(null)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--card-border)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.85rem'
                                }}
                            >
                                <ArrowUpRight size={16} style={{ transform: 'rotate(180deg)' }} />
                                Voltar
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={20} color="var(--primary)" />
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{selectedGroup.name}</h2>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>· {selectedGroup.members.length} plataformas</span>
                            </div>
                        </div>
                    )}

                    {platforms.length === 0 ? (
                        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {isInactiveView
                                ? 'Nenhuma plataforma inativa no momento.'
                                : 'Nenhuma plataforma ativa. Adicione uma nova ou reative em Inativas.'}
                        </div>
                    ) : (
                    <div className="cards-grid">
                        {(selectedGroup ? selectedGroup.members : ungroupedPlatforms).map((platform) => (
                            <div
                                key={platform.id}
                                className="glass-card animate-fade-in"
                                onClick={() => setSelectedPlatform(platform)}
                                style={{
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px',
                                    border: '1px solid var(--card-border)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    opacity: isInactiveView ? 0.85 : 1,
                                    transition: 'var(--transition)'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    right: '-20px',
                                    width: '100px',
                                    height: '100px',
                                    background: 'var(--primary)',
                                    filter: 'blur(50px)',
                                    opacity: 0.05,
                                    borderRadius: '50%'
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--primary)'
                                        }}>
                                            <Layers size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{platform.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                                                <Calendar size={14} />
                                                <span>Desde {platform.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => togglePlatformStatus(e, platform)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            backgroundColor: isInactiveView
                                                ? 'rgba(var(--primary-rgb), 0.1)'
                                                : (platform.active ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                                            color: isInactiveView ? 'var(--primary)' : (platform.active ? 'var(--primary)' : '#ef4444'),
                                            border: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            transform: 'scale(1)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.boxShadow = isInactiveView || platform.active
                                                ? '0 0 8px rgba(var(--primary-rgb), 0.3)'
                                                : '0 0 8px rgba(239, 68, 68, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        {isInactiveView ? <ArrowUpRight size={14} /> : (platform.active ? <ArrowUpRight size={14} /> : <X size={14} />)}
                                        {isInactiveView ? 'Reativar' : (platform.active ? 'Ativa' : 'Inativa')}
                                    </button>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '16px',
                                    padding: '16px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '16px'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                                            <Users size={12} />
                                            <span>Contas</span>
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{platform.accountsCount}</div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                                            <TrendingUp size={12} />
                                            <span>Lucro Diário</span>
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: platform.rawDailyProfit > 0 ? 'var(--money-positive)' : (platform.rawDailyProfit < 0 ? 'var(--money-negative)' : 'var(--text-main)') }}>{platform.dailyProfitFormatted}</div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                                            <ArrowUpCircle size={12} />
                                            <span>Depósito</span>
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{platform.depositFormatted}</div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                                            <TrendingUp size={12} />
                                            <span>Lucro</span>
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: platform.rawProfit > 0 ? 'var(--money-positive)' : (platform.rawProfit < 0 ? 'var(--money-negative)' : 'var(--text-main)') }}>{platform.profitFormatted}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!selectedGroup && groupList.map((group) => renderGroupCard(group))}
                    </div>
                    )}

                    {isModalOpen && (
                        <div className="app-overlay">
                            <div className="glass-card app-overlay__panel app-overlay__panel--wide" style={{
                                position: 'relative',
                                backgroundColor: '#111114',
                            }}>
                                <button
                                    onClick={() => { setIsModalOpen(false); resetNewPlatformForm(); }}
                                    style={{
                                        position: 'absolute',
                                        top: '24px',
                                        right: '24px',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={24} />
                                </button>

                                <h2 style={{ marginBottom: '8px' }}>{newPlatform.names.length > 1 ? 'Novo Grupo de Plataformas' : 'Nova Plataforma'}</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                                    {newPlatform.names.length > 1
                                        ? 'Várias plataformas dentro de um único card'
                                        : 'Registre uma ou várias casas de apostas'}
                                </p>

                                <form onSubmit={handleAdd}>
                                    <div className="form-grid-2" style={{ marginBottom: '24px' }}>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                {newPlatform.names.length > 1 ? 'Nomes das Plataformas' : 'Nome da Plataforma'}
                                            </label>
                                            {newPlatform.names.map((nameVal, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                    <input
                                                        type="text"
                                                        required={idx === 0}
                                                        value={nameVal}
                                                        onChange={(e) => updatePlatformName(idx, e.target.value)}
                                                        placeholder={`Ex: ${idx === 0 ? 'Stake' : idx === 1 ? 'Betano' : 'Casa ' + (idx + 1)}...`}
                                                        className="input-focus"
                                                        style={{
                                                            flex: 1,
                                                            padding: '14px 16px',
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--card-border)',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                            color: 'var(--text-main)',
                                                            fontSize: '1rem',
                                                            outline: 'none',
                                                            transition: 'var(--transition)'
                                                        }}
                                                    />
                                                    {newPlatform.names.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removePlatformNameField(idx)}
                                                            title="Remover"
                                                            style={{
                                                                flexShrink: 0,
                                                                width: '44px',
                                                                borderRadius: '12px',
                                                                border: '1px solid var(--card-border)',
                                                                background: 'rgba(239, 68, 68, 0.08)',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addPlatformNameField}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '8px 14px',
                                                    borderRadius: '10px',
                                                    border: '1px dashed rgba(var(--primary-rgb), 0.4)',
                                                    background: 'rgba(var(--primary-rgb), 0.06)',
                                                    color: 'var(--primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600
                                                }}
                                            >
                                                <Plus size={16} />
                                                Adicionar outra plataforma
                                            </button>
                                        </div>
                                        {newPlatform.names.length > 1 && (
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nome do Grupo (aparece no card)</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newPlatform.groupName}
                                                    onChange={(e) => setNewPlatform({ ...newPlatform, groupName: e.target.value })}
                                                    placeholder="Ex: Operação 777"
                                                    className="input-focus"
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px 16px',
                                                        borderRadius: '12px',
                                                        border: '1px solid var(--card-border)',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                        color: 'var(--text-main)',
                                                        fontSize: '1rem',
                                                        outline: 'none',
                                                        transition: 'var(--transition)'
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tipos de Chave PIX</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {pixTypeOptions.map(type => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => togglePlatformPixType(type)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            border: '1px solid',
                                                            borderColor: newPlatform.pixTypes.includes(type) ? 'var(--primary)' : 'var(--card-border)',
                                                            backgroundColor: newPlatform.pixTypes.includes(type) ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                                            color: newPlatform.pixTypes.includes(type) ? 'var(--primary)' : 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem',
                                                            transition: 'var(--transition)'
                                                        }}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Data de Criação</label>
                                            <DatePicker
                                                value={newPlatform.date}
                                                onChange={(val) => setNewPlatform({ ...newPlatform, date: val })}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => { setIsModalOpen(false); resetNewPlatformForm(); }}
                                            style={{
                                                flex: 1,
                                                padding: '14px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--card-border)',
                                                color: 'var(--text-main)',
                                                background: 'none',
                                                cursor: 'pointer',
                                                fontWeight: 600
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            style={{
                                                flex: 2,
                                                padding: '14px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-fg)',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)'
                                            }}
                                        >
                                            {newPlatform.names.filter(n => n.trim()).length > 1
                                                ? `Criar grupo (${newPlatform.names.filter(n => n.trim()).length})`
                                                : 'Adicionar Plataforma'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Plataformas;

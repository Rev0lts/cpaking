import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Plus,
    X,
    Layers,
    Calendar,
    ArrowUpRight,
    Search,
    Link as LinkIcon,
    Pencil,
    Archive,
    Wallet,
    Key,
    RotateCcw,
    ChevronDown,
    Trash2
} from 'lucide-react';
import DatePicker from './DatePicker';
import { notify } from '../lib/notify';

let cachedChinesasData = null;

const Chinesas = ({ resetTrigger, impersonatedUser }) => {
    const [chinesas, setChinesas] = useState(cachedChinesasData || []);
    const [loading, setLoading] = useState(!cachedChinesasData);

    useEffect(() => {
        fetchChinesas();
    }, []);

    const fetchChinesas = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;

            const { data: chinesasData, error: chinesasError } = await supabase
                .from('chinesas')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false });

            if (chinesasError) throw chinesasError;

            const sortedChinesas = (chinesasData || []).sort((a, b) => {
                if (a.active === b.active) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return a.active ? -1 : 1;
            });

            cachedChinesasData = sortedChinesas;
            setChinesas(sortedChinesas);
        } catch (err) {
            console.error("Erro ao buscar chinesas:", err);
            // Fallback for when the table might exist without 'active' column yet
            if (err.code === '42703' || err.code === 'PGRST204') {
                try {
                    const { data: fallbackData } = await supabase
                        .from('chinesas')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (fallbackData) {
                        const formatted = fallbackData.map(c => ({
                            ...c,
                            active: true
                        }));
                        setChinesas(formatted);
                        cachedChinesasData = formatted;
                    }
                } catch (e) {
                    console.error("Fallback error:", e);
                }
            }
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
    const [editingChinesaId, setEditingChinesaId] = useState(null);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [newChinesa, setNewChinesa] = useState({
        name: '',
        link: '',
        date: getGMT3Date(),
        pixTypes: [],
        chestValue: '',
        rolloverValue: '',
        hasRollover: false,
        minWithdrawal: '',
        statusTag: 'Testando',
        notes: ''
    });

    const resetForm = () => {
        const date = new Date();
        const offset = -3;
        const gmt3Date = new Date(date.getTime() + (offset * 60 * 60 * 1000));
        const day = String(gmt3Date.getDate()).padStart(2, '0');
        const month = String(gmt3Date.getMonth() + 1).padStart(2, '0');
        const year = gmt3Date.getFullYear();

        setNewChinesa({
            name: '', link: '', date: `${day}/${month}/${year}`, pixTypes: [],
            chestValue: '', rolloverValue: '', hasRollover: false, minWithdrawal: '', statusTag: 'Testando', notes: ''
        });
        setEditingChinesaId(null);
    }

    const confirmDelete = () => {
        setIsDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!editingChinesaId) return;

        try {
            const { error } = await supabase
                .from('chinesas')
                .delete()
                .eq('id', editingChinesaId);

            if (error) throw error;

            const updatedChinesas = chinesas.filter(c => c.id !== editingChinesaId);
            setChinesas(updatedChinesas);
            cachedChinesasData = updatedChinesas;

            notify("Chinesa excluída com sucesso!", "success");
            setIsDeleteConfirmOpen(false);
            setIsModalOpen(false);
            resetForm();
        } catch (err) {
            console.error("Erro ao excluir chinesa:", err);
            notify("Erro ao excluir a chinesa.", "error");
        }
    };

    const openEditModal = (chinesa, e) => {
        e.stopPropagation();
        setNewChinesa({
            name: chinesa.name || '',
            link: chinesa.link || '',
            date: chinesa.date || getGMT3Date(),
            pixTypes: chinesa.pix_types || [],
            chestValue: chinesa.chest_value ? String(chinesa.chest_value) : '',
            rolloverValue: chinesa.rollover_value ? String(chinesa.rollover_value) : '',
            hasRollover: chinesa.has_rollover || false,
            minWithdrawal: chinesa.min_withdrawal ? String(chinesa.min_withdrawal) : '',
            statusTag: chinesa.status_tag || 'Testando',
            notes: chinesa.notes || ''
        });
        setEditingChinesaId(chinesa.id);
        setIsModalOpen(true);
    };

    const pixTypeOptions = ['CPF', 'CNPJ', 'EVP', 'Email', 'Telefone'];
    const statusTagOptions = ['Testada', 'Testando', 'Rodando'];

    const togglePixType = (type) => {
        setNewChinesa(prev => {
            if (prev.pixTypes.includes(type)) {
                return { ...prev, pixTypes: prev.pixTypes.filter(t => t !== type) };
            }
            return { ...prev, pixTypes: [...prev.pixTypes, type] };
        });
    };

    const toggleStatus = async (e, chinesa) => {
        e.stopPropagation();
        const newStatus = !chinesa.active;
        try {
            const { error } = await supabase
                .from('chinesas')
                .update({ active: newStatus })
                .eq('id', chinesa.id);

            if (error) {
                if (error.code === '42703' || error.code === 'PGRST204') {
                    console.warn("Coluna 'active' não encontrada em 'chinesas'. O status será alterado apenas visualmente nesta sessão.");
                } else {
                    throw error;
                }
            }

            const updatedChinesas = chinesas.map(p =>
                p.id === chinesa.id ? { ...p, active: newStatus } : p
            ).sort((a, b) => {
                if (a.active === b.active) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return a.active ? -1 : 1;
            });

            setChinesas(updatedChinesas);
            cachedChinesasData = updatedChinesas;

            if (error && (error.code === '42703' || error.code === 'PGRST204')) {
                notify("A coluna 'active' não existe no banco de dados. O status foi alterado apenas visualmente.", "warning", 5000);
            }
        } catch (err) {
            console.error("Erro ao alternar status da chinesa:", err);
            notify("Erro ao alterar status da chinesa: " + (err.message || "Erro desconhecido"), "error");
        }
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

            const chinesaPayload = {
                user_id: targetUserId,
                name: newChinesa.name,
                link: newChinesa.link || null,
                date: newChinesa.date,
                pix_types: newChinesa.pixTypes,
                chest_value: newChinesa.chestValue ? parseFloat(newChinesa.chestValue) : null,
                rollover_value: newChinesa.rolloverValue ? parseFloat(newChinesa.rolloverValue) : null,
                has_rollover: newChinesa.hasRollover,
                min_withdrawal: newChinesa.minWithdrawal ? parseFloat(newChinesa.minWithdrawal) : null,
                status_tag: newChinesa.statusTag,
                notes: newChinesa.notes || null,
                active: true
            };

            if (editingChinesaId) {
                // Remove active to avoid overriding if it was deactivated
                delete chinesaPayload.active;

                const { data: updateData, error: updateError } = await supabase
                    .from('chinesas')
                    .update(chinesaPayload)
                    .eq('id', editingChinesaId)
                    .select();

                if (updateError) throw updateError;

                const updatedChinesas = chinesas.map(c =>
                    c.id === editingChinesaId ? { ...c, ...updateData[0] } : c
                );

                setChinesas(updatedChinesas);
                cachedChinesasData = updatedChinesas;
                notify("Chinesa atualizada com sucesso!", "success");
            } else {
                let { data: insertData, error: insertError } = await supabase
                    .from('chinesas')
                    .insert([chinesaPayload])
                    .select();

                if (insertError) throw insertError;

                const newChi = insertData[0];
                const updated = [newChi, ...chinesas];
                setChinesas(updated);
                cachedChinesasData = updated;
                notify("Chinesa criada com sucesso!", "success");
            }

            resetForm();
            setIsModalOpen(false);
        } catch (err) {
            console.error("Erro ao salvar chinesa:", err);
            notify("Erro ao salvar a chinesa. Certifique-se de ter criado a tabela no Supabase.", "error");
        }
    };

    const formatCurrency = (val) => {
        if (val === null || val === undefined) return 'Não informado';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    if (loading) {
        return (
            <div className="loader-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="page-content animate-fade-in">
            <header className="page-header page-header--row">
                <div>
                    <h1>Chinesas</h1>
                    <p>Gerencie suas contas de plataformas chinesas</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
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
                    Adicionar Chinesa
                </button>
            </header>

            <div className="cards-grid">
                {chinesas.map((chinesa) => (
                    <div
                        key={chinesa.id}
                        className="glass-card animate-fade-in"
                        style={{
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            border: '1px solid var(--card-border)',
                            position: 'relative',
                            overflow: 'hidden',
                            opacity: chinesa.active ? 1 : 0.6,
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
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{chinesa.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                                        <Calendar size={14} />
                                        <span>Desde {chinesa.date || 'Desconhecido'}</span>
                                    </div>
                                    {chinesa.status_tag && (
                                        <div style={{ marginTop: '8px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                backgroundColor: chinesa.status_tag === 'Testada' ? 'rgba(var(--primary-rgb), 0.1)' : chinesa.status_tag === 'Testando' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: chinesa.status_tag === 'Testada' ? 'var(--primary)' : chinesa.status_tag === 'Testando' ? '#eab308' : '#3b82f6',
                                            }}>
                                                {chinesa.status_tag}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
                                <button
                                    onClick={(e) => openEditModal(chinesa, e)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '20px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: '#fff',
                                        border: 'none',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    title="Editar"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={(e) => toggleStatus(e, chinesa)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '20px',
                                        backgroundColor: chinesa.active ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: chinesa.active ? 'var(--primary)' : '#ef4444',
                                        border: 'none',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {chinesa.active ? <ArrowUpRight size={14} /> : <X size={14} />}
                                    <span style={{ display: 'none' }}>{chinesa.active ? 'Ativa' : 'Inativa'}</span>
                                </button>
                            </div>
                        </div>

                        {chinesa.link && (
                            <a
                                href={chinesa.link.startsWith('http') ? chinesa.link : `https://${chinesa.link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: 'var(--primary)',
                                    fontSize: '0.875rem',
                                    textDecoration: 'none',
                                    alignSelf: 'flex-start',
                                    padding: '6px 12px',
                                    backgroundColor: 'rgba(var(--primary-rgb), 0.05)',
                                    borderRadius: '8px',
                                    marginTop: '-8px'
                                }}
                            >
                                <LinkIcon size={14} />
                                Acessar Plataforma
                            </a>
                        )}

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
                                    <Archive size={12} />
                                    <span>Valor do Baú</span>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: chinesa.has_rollover ? '#ef4444' : 'var(--primary)' }}>{formatCurrency(chinesa.chest_value)}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                                    <RotateCcw size={12} />
                                    <span>Rollover</span>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                                    {formatCurrency(chinesa.rollover_value)}
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                                    <Wallet size={12} />
                                    <span>Saque Mínimo</span>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{formatCurrency(chinesa.min_withdrawal)}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                                    <Key size={12} />
                                    <span>Chaves PIX</span>
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                    {chinesa.pix_types && chinesa.pix_types.length > 0 ? (chinesa.pix_types.length === pixTypeOptions.length ? 'Todas' : chinesa.pix_types.join(', ')) : 'Nenhuma'}
                                </div>
                            </div>
                        </div>

                        {chinesa.notes && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                borderLeft: '3px solid var(--primary)',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {chinesa.notes}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel app-overlay__panel--wide" style={{
                        position: 'relative',
                        backgroundColor: '#111114',
                    }}>
                        <button
                            onClick={() => {
                                setIsModalOpen(false);
                                resetForm();
                            }}
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

                        <h2 style={{ marginBottom: '8px' }}>{editingChinesaId ? 'Editar Chinesa' : 'Nova Chinesa'}</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                            {editingChinesaId ? 'Edite as informações da plataforma chinesa' : 'Registre uma nova plataforma chinesa'}
                        </p>

                        <form onSubmit={handleAdd}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

                                {/* Nome e Link */}
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nome da Plataforma</label>
                                    <input
                                        type="text"
                                        required
                                        value={newChinesa.name}
                                        onChange={(e) => setNewChinesa({ ...newChinesa, name: e.target.value })}
                                        placeholder="Ex: 55G..."
                                        className="input-focus"
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Link (opcional)</label>
                                    <input
                                        type="text"
                                        value={newChinesa.link}
                                        onChange={(e) => setNewChinesa({ ...newChinesa, link: e.target.value })}
                                        placeholder="https://..."
                                        className="input-focus"
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                {/* Tipos de Chave PIX */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tipos de Chave PIX permitidos</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {pixTypeOptions.map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => togglePixType(type)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    border: '1px solid',
                                                    borderColor: newChinesa.pixTypes.includes(type) ? 'var(--primary)' : 'var(--card-border)',
                                                    backgroundColor: newChinesa.pixTypes.includes(type) ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                                    color: newChinesa.pixTypes.includes(type) ? 'var(--primary)' : 'var(--text-muted)',
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

                                {/* Baú e Saque Mínimo */}
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Valor do Baú (opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newChinesa.chestValue}
                                        onChange={(e) => setNewChinesa({ ...newChinesa, chestValue: e.target.value })}
                                        placeholder="R$ 0.00"
                                        className="input-focus"
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Saque Mínimo (opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newChinesa.minWithdrawal}
                                        onChange={(e) => setNewChinesa({ ...newChinesa, minWithdrawal: e.target.value })}
                                        placeholder="R$ 0.00"
                                        className="input-focus"
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                {/* Rollover */}
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tem Rollover para Baú?</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setNewChinesa({ ...newChinesa, hasRollover: true })}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid',
                                                borderColor: newChinesa.hasRollover ? '#ef4444' : 'var(--card-border)',
                                                backgroundColor: newChinesa.hasRollover ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                                color: newChinesa.hasRollover ? '#ef4444' : 'var(--text-muted)',
                                                cursor: 'pointer', transition: 'var(--transition)'
                                            }}
                                        >
                                            Sim
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewChinesa({ ...newChinesa, hasRollover: false })}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid',
                                                borderColor: !newChinesa.hasRollover ? 'var(--primary)' : 'var(--card-border)',
                                                backgroundColor: !newChinesa.hasRollover ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                                color: !newChinesa.hasRollover ? 'var(--primary)' : 'var(--text-muted)',
                                                cursor: 'pointer', transition: 'var(--transition)'
                                            }}
                                        >
                                            Não
                                        </button>
                                    </div>
                                </div>
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Valor do Rollover</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newChinesa.rolloverValue}
                                        onChange={(e) => setNewChinesa({ ...newChinesa, rolloverValue: e.target.value })}
                                        placeholder="R$ 0.00"
                                        className="input-focus"
                                        style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                {/* Status e Data */}
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status da Chinesa</label>
                                    <div style={{ position: 'relative' }} ref={statusDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                            className="input-focus"
                                            style={{
                                                width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', outline: 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {newChinesa.statusTag && (
                                                    <div style={{
                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                        backgroundColor: newChinesa.statusTag === 'Testada' ? 'var(--primary)' : newChinesa.statusTag === 'Testando' ? '#eab308' : '#3b82f6'
                                                    }} />
                                                )}
                                                <span>{newChinesa.statusTag || 'Selecione um status'}</span>
                                            </div>
                                            <ChevronDown size={18} style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'var(--transition)', color: 'var(--text-muted)' }} />
                                        </button>

                                        {isStatusDropdownOpen && (
                                            <div className="glass-card dropdown-menu" style={{
                                                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50, padding: '8px', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#111114'
                                            }}>
                                                {statusTagOptions.map(tag => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewChinesa({ ...newChinesa, statusTag: tag });
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="dropdown-item"
                                                        style={{
                                                            width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: '8px'
                                                        }}
                                                    >
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tag === 'Testada' ? 'var(--primary)' : tag === 'Testando' ? '#eab308' : '#3b82f6' }} />
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Data de Criação</label>
                                    <DatePicker
                                        value={newChinesa.date}
                                        onChange={(val) => setNewChinesa({ ...newChinesa, date: val })}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Anotações (Opcional)</label>
                                <textarea
                                    value={newChinesa.notes}
                                    onChange={(e) => setNewChinesa({ ...newChinesa, notes: e.target.value })}
                                    placeholder="Ex: Paga rápido, precisa de VPN, etc..."
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--card-border)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.925rem',
                                        minHeight: '80px',
                                        resize: 'vertical',
                                        outline: 'none',
                                        transition: 'var(--transition)'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                {editingChinesaId && (
                                    <button
                                        type="button"
                                        onClick={confirmDelete}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--danger)',
                                            color: 'var(--danger)',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'var(--transition)'
                                        }}
                                        title="Excluir Chinesa"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
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
                                    {editingChinesaId ? 'Salvar Configurações' : 'Adicionar Chinesa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {isDeleteConfirmOpen && (
                <div className="app-overlay" style={{ zIndex: 2100 }}>
                    <div className="glass-card app-overlay__panel" style={{
                        maxWidth: '400px', border: '1px solid var(--card-border)', backgroundColor: '#111114'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#ef4444' }}>
                            <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
                                <Trash2 size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>Excluir Chinesa?</h3>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                            Você tem certeza que deseja excluir esta chinesa permanentemente? Esta ação não pode ser desfeita e removerá a plataforma de todos os usuários.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'none', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Sim, excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chinesas;

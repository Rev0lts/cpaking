import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getGMT3Date, parseCurrency } from '../lib/profitCalculations';
import { notify } from '../lib/notify';
import DatePicker from './DatePicker';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Calculator,
    ClipboardList,
    Trash2,
} from 'lucide-react';

const TYPE_OPTIONS = [
    { id: 'deposit', label: 'Depósito', icon: ArrowDownCircle, color: 'var(--danger)' },
    { id: 'withdraw', label: 'Saque', icon: ArrowUpCircle, color: 'var(--primary)' },
    { id: 'operation_cost', label: 'Custo operação', icon: Calculator, color: '#f59e0b' },
];

const TYPE_LABELS = {
    deposit: 'Depósito',
    withdraw: 'Saque',
    operation_cost: 'Custo',
};

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--card-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'var(--transition)',
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const QuickReport = ({ impersonatedUser, onStatsChange }) => {
    const onStatsChangeRef = useRef(onStatsChange);
    onStatsChangeRef.current = onStatsChange;

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        label: '',
        type: 'deposit',
        amount: '',
        date: getGMT3Date(),
        notes: '',
    });

    const getTargetUserId = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        return impersonatedUser?.id || user.id;
    }, [impersonatedUser]);

    const fetchEntries = useCallback(async () => {
        try {
            setLoading(true);
            const targetUserId = await getTargetUserId();
            if (!targetUserId) return;

            const { data, error } = await supabase
                .from('quick_reports')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error('Erro ao carregar reporte rápido:', err);
            if (err.code === '42P01' || err.message?.includes('quick_reports')) {
                notify('Execute o SQL no Supabase para criar a tabela quick_reports.', 'error', 5000);
            }
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [getTargetUserId]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    useEffect(() => {
        let cancelled = false;
        let channel = null;

        (async () => {
            const targetUserId = await getTargetUserId();
            if (!targetUserId || cancelled) return;

            const ch = supabase
                .channel(`quick-reports:${targetUserId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'quick_reports',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => {
                        fetchEntries();
                        onStatsChangeRef.current?.();
                    }
                )
                .subscribe((status, err) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.warn('Realtime quick_reports:', err);
                    }
                });

            if (cancelled) {
                supabase.removeChannel(ch);
                return;
            }
            channel = ch;
        })();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [getTargetUserId, fetchEntries, impersonatedUser]);

    const totals = useMemo(() => {
        let deposits = 0;
        let withdraws = 0;
        let costs = 0;
        entries.forEach((e) => {
            const amount = parseCurrency(e.amount);
            if (e.type === 'deposit') deposits += amount;
            else if (e.type === 'withdraw') withdraws += amount;
            else if (e.type === 'operation_cost') costs += amount;
        });
        const profit = withdraws - deposits - costs;
        return { deposits, withdraws, costs, profit };
    }, [entries]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = parseCurrency(form.amount);
        if (amount <= 0) {
            notify('Informe um valor maior que zero.', 'error');
            return;
        }

        try {
            setSaving(true);
            const targetUserId = await getTargetUserId();
            if (!targetUserId) return;

            const { data, error } = await supabase
                .from('quick_reports')
                .insert({
                    user_id: targetUserId,
                    label: form.label.trim() || null,
                    type: form.type,
                    amount,
                    date: form.date,
                    notes: form.notes.trim() || null,
                })
                .select()
                .single();

            if (error) throw error;

            setEntries((prev) => [data, ...prev]);
            setForm((prev) => ({
                ...prev,
                amount: '',
                notes: '',
            }));
            notify('Lançamento registrado.', 'success');
            onStatsChange?.();
        } catch (err) {
            console.error('Erro ao salvar reporte:', err);
            notify('Não foi possível salvar. Verifique o SQL no Supabase.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase.from('quick_reports').delete().eq('id', id);
            if (error) throw error;
            setEntries((prev) => prev.filter((e) => e.id !== id));
            notify('Lançamento removido.', 'info');
            onStatsChange?.();
        } catch (err) {
            console.error('Erro ao excluir:', err);
            notify('Não foi possível excluir.', 'error');
        }
    };

    return (
        <div className="glass-card dashboard-widget" style={{ padding: '24px', flex: 1, minWidth: 320 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <ClipboardList size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Reporte Rápido</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
                Informe operações realizadas de maneira rápida — depósitos, saques e custos.
            </p>

            <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Nome do teste (opcional)
                </label>
                <input
                    type="text"
                    value={form.label}
                    onChange={(ev) => setForm({ ...form, label: ev.target.value })}
                    placeholder="Ex: Nova casa 777"
                    className="input-focus"
                    style={{ ...inputStyle, marginBottom: 16 }}
                />

                <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Tipo
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {TYPE_OPTIONS.map(({ id, label, icon: Icon, color }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setForm({ ...form, type: id })}
                            style={{
                                flex: '1 1 auto',
                                minWidth: 100,
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid',
                                borderColor: form.type === id ? color : 'var(--card-border)',
                                backgroundColor: form.type === id ? `${color}18` : 'rgba(255,255,255,0.02)',
                                color: form.type === id ? color : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Valor (R$)
                        </label>
                        <input
                            type="text"
                            required
                            value={form.amount}
                            onChange={(ev) => setForm({ ...form, amount: ev.target.value })}
                            placeholder="0,00"
                            className="input-focus"
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Data
                        </label>
                        <DatePicker
                            value={form.date}
                            onChange={(val) => setForm({ ...form, date: val })}
                        />
                    </div>
                </div>

                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Observação (opcional)
                </label>
                <input
                    type="text"
                    value={form.notes}
                    onChange={(ev) => setForm({ ...form, notes: ev.target.value })}
                    placeholder="Detalhe rápido..."
                    className="input-focus"
                    style={{ ...inputStyle, marginBottom: 16 }}
                />

                <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: 'var(--primary)',
                        color: '#0a0a0c',
                        fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? 'Salvando...' : 'Registrar'}
                </button>
            </form>

            <div className="quick-report-totals">
                <div className="quick-report-totals__cell--deposit">
                    <span>Depósitos</span>
                    <strong>{formatCurrency(totals.deposits)}</strong>
                </div>
                <div>
                    <span>Saques</span>
                    <strong>{formatCurrency(totals.withdraws)}</strong>
                </div>
                <div>
                    <span>Custos</span>
                    <strong style={{ color: '#f59e0b' }}>{formatCurrency(totals.costs)}</strong>
                </div>
                <div>
                    <span>Lucro</span>
                    <strong style={{ color: totals.profit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                        {formatCurrency(totals.profit)}
                    </strong>
                </div>
            </div>

            <div className="quick-report-list">
                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
                    Últimos lançamentos
                </h3>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando...</p>
                ) : entries.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum lançamento ainda.</p>
                ) : (
                    entries.map((entry) => (
                        <div key={entry.id} className="quick-report-item">
                            <div>
                                <span className={`quick-report-item__type quick-report-item__type--${entry.type}`}>
                                    {TYPE_LABELS[entry.type]}
                                </span>
                                {entry.label && (
                                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {entry.label}
                                    </span>
                                )}
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    {entry.date}
                                    {entry.notes ? ` · ${entry.notes}` : ''}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <strong
                                    className={`quick-report-item__amount quick-report-item__amount--${entry.type}`}
                                >
                                    {formatCurrency(parseCurrency(entry.amount))}
                                </strong>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(entry.id)}
                                    style={{
                                        border: 'none',
                                        background: 'rgba(239,68,68,0.1)',
                                        color: '#ef4444',
                                        borderRadius: 8,
                                        padding: 6,
                                        cursor: 'pointer',
                                    }}
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default QuickReport;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { notify } from '../lib/notify';
import { StickyNote } from 'lucide-react';

const SAVE_DELAY_MS = 800;

const DashboardNotepad = ({ impersonatedUser }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('idle');
    const timerRef = useRef(null);
    const contentRef = useRef('');

    const getTargetUserId = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        return impersonatedUser?.id || user.id;
    }, [impersonatedUser]);

    const loadNotes = useCallback(async () => {
        try {
            setLoading(true);
            const targetUserId = await getTargetUserId();
            if (!targetUserId) return;

            const { data, error } = await supabase
                .from('user_dashboard_notes')
                .select('content')
                .eq('user_id', targetUserId)
                .maybeSingle();

            if (error) throw error;

            const text = data?.content || '';
            setContent(text);
            contentRef.current = text;
        } catch (err) {
            console.error('Erro ao carregar bloco de notas:', err);
            if (err.code === '42P01' || err.message?.includes('user_dashboard_notes')) {
                notify('Execute o SQL no Supabase para criar user_dashboard_notes.', 'error', 5000);
            }
        } finally {
            setLoading(false);
        }
    }, [getTargetUserId]);

    const saveNotes = useCallback(async (text) => {
        try {
            setSaveStatus('saving');
            const targetUserId = await getTargetUserId();
            if (!targetUserId) return;

            const { error } = await supabase
                .from('user_dashboard_notes')
                .upsert(
                    {
                        user_id: targetUserId,
                        content: text,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                );

            if (error) throw error;
            setSaveStatus('saved');
        } catch (err) {
            console.error('Erro ao salvar notas:', err);
            setSaveStatus('error');
            notify('Não foi possível salvar as notas.', 'error');
        }
    }, [getTargetUserId]);

    useEffect(() => {
        loadNotes();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [loadNotes]);

    const handleChange = (ev) => {
        const text = ev.target.value;
        setContent(text);
        contentRef.current = text;
        setSaveStatus('pending');

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            saveNotes(text);
        }, SAVE_DELAY_MS);
    };

    const statusLabel =
        saveStatus === 'saving'
            ? 'Salvando...'
            : saveStatus === 'saved'
                ? 'Salvo'
                : saveStatus === 'error'
                    ? 'Erro ao salvar'
                    : saveStatus === 'pending'
                        ? 'Alterações pendentes...'
                        : '';

    return (
        <div className="glass-card dashboard-widget" style={{ padding: '24px', flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StickyNote size={22} color="var(--accent)" />
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Bloco de Notas</h2>
                </div>
                {statusLabel && (
                    <span
                        style={{
                            fontSize: '0.75rem',
                            color:
                                saveStatus === 'error'
                                    ? 'var(--danger)'
                                    : saveStatus === 'saved'
                                        ? 'var(--primary)'
                                        : 'var(--text-muted)',
                        }}
                    >
                        {statusLabel}
                    </span>
                )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                Anotações rápidas salvas automaticamente na sua conta.
            </p>

            {loading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando...</p>
            ) : (
                <textarea
                    value={content}
                    onChange={handleChange}
                    placeholder="Escreva lembretes, links, ideias..."
                    className="input-focus dashboard-notepad__textarea"
                    style={{
                        width: '100%',
                        minHeight: 320,
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--card-border)',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                    }}
                />
            )}
        </div>
    );
};

export default DashboardNotepad;

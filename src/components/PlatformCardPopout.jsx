import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PlatformDetail from './PlatformDetail';
import Notification from './Notification';

const PlatformCardPopout = ({ type, platformId, cycle }) => {
    const [platform, setPlatform] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.documentElement.classList.add('popout-window-mode');
        document.body.classList.add('popout-window-mode');
        return () => {
            document.documentElement.classList.remove('popout-window-mode');
            document.body.classList.remove('popout-window-mode');
        };
    }, []);

    useEffect(() => {
        document.title = type === 'mother'
            ? 'Conta mãe — CPAKing'
            : 'Conta filha — CPAKing';
    }, [type]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error: err } = await supabase
                .from('platforms')
                .select('*')
                .eq('id', platformId)
                .single();
            if (cancelled) return;
            if (err) setError(err.message || 'Plataforma não encontrada');
            else setPlatform(data);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [platformId]);

    if (loading) {
        return (
            <div
                id="popout-root"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--bg-dark)',
                    color: 'var(--text-muted)',
                    padding: 24,
                }}
            >
                Carregando...
            </div>
        );
    }

    if (error || !platform) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-dark)',
                color: '#ef4444',
                padding: 24,
            }}
            >
                {error || 'Plataforma não encontrada'}
            </div>
        );
    }

    return (
        <>
            <Notification />
            <PlatformDetail
                platform={platform}
                popoutOnly={type}
                initialCycle={cycle}
                onBack={() => window.close()}
            />
        </>
    );
};

export default PlatformCardPopout;

export function getPopoutParams() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('popout');
    const platformId = params.get('platformId');
    if (!type || !platformId || !['mother', 'daughter'].includes(type)) return null;
    return {
        type,
        platformId,
        cycle: Number(params.get('cycle') || 1),
    };
}

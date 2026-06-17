import { useCallback, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { calculateDashboardProfits, getGMT3Date } from './profitCalculations';
import { fetchUserProfitData } from './fetchProfitData';

const LS_DATE_KEY = 'cpa_daily_profit_date';
const LS_PROFIT_KEY = 'cpa_daily_profit_value';

export async function fetchDailyProfitSnapshots(userId) {
    if (!userId) return {};

    const { data, error } = await supabase
        .from('daily_profit_snapshots')
        .select('date, profit')
        .eq('user_id', userId);

    if (error) {
        if (error.code === '42P01' || error.message?.includes('daily_profit_snapshots')) {
            return {};
        }
        console.warn('Erro ao buscar snapshots de lucro:', error);
        return {};
    }

    const map = {};
    (data || []).forEach((row) => {
        map[row.date] = parseFloat(row.profit) || 0;
    });
    return map;
}

export async function upsertDailyProfitSnapshot(userId, dateKey, profit) {
    if (!userId || !dateKey) return;

    const { error } = await supabase
        .from('daily_profit_snapshots')
        .upsert(
            {
                user_id: userId,
                date: dateKey,
                profit: Number(profit) || 0,
                locked_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,date' }
        );

    if (error && error.code !== '42P01' && !error.message?.includes('daily_profit_snapshots')) {
        console.warn('Erro ao salvar snapshot de lucro:', error);
    }
}

function persistLocalDaily(dateKey, profit) {
    try {
        localStorage.setItem(LS_DATE_KEY, dateKey);
        localStorage.setItem(LS_PROFIT_KEY, String(profit));
    } catch {
        /* ignore */
    }
}

function readLocalDaily() {
    try {
        return {
            date: localStorage.getItem(LS_DATE_KEY),
            profit: parseFloat(localStorage.getItem(LS_PROFIT_KEY) || '0'),
        };
    } catch {
        return { date: null, profit: 0 };
    }
}

/**
 * Trava o lucro diário global ao virar o dia (GMT-3) e recupera dia perdido se o app estava fechado.
 */
export function useDailyProfitMidnightLock(impersonatedUser, enabled = true) {
    const dateRef = useRef(getGMT3Date());
    const profitRef = useRef(0);

    const lockDay = useCallback(async (userId, dateKey, profit) => {
        if (!userId || !dateKey) return;
        await upsertDailyProfitSnapshot(userId, dateKey, profit);
    }, []);

    const syncProfit = useCallback(async () => {
        if (!enabled) return;

        try {
            const { userId, accounts, quickReports } = await fetchUserProfitData(impersonatedUser);
            if (!userId) return;

            const stats = calculateDashboardProfits(accounts, quickReports);
            const today = getGMT3Date();
            const local = readLocalDaily();

            if (local.date && local.date !== today) {
                await lockDay(userId, local.date, local.profit);
            }

            if (dateRef.current !== today) {
                await lockDay(userId, dateRef.current, profitRef.current);
                dateRef.current = today;
            }

            profitRef.current = stats.dailyProfit;
            persistLocalDaily(today, stats.dailyProfit);
        } catch (err) {
            console.error('Erro ao sincronizar lucro diário:', err);
        }
    }, [enabled, impersonatedUser, lockDay]);

    useEffect(() => {
        if (!enabled) return undefined;

        syncProfit();
        const interval = setInterval(syncProfit, 30000);

        let channel = null;
        let cancelled = false;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const userId = impersonatedUser?.id || user.id;

            const ch = supabase
                .channel(`daily-profit-lock:${userId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${userId}` },
                    () => syncProfit()
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'quick_reports', filter: `user_id=eq.${userId}` },
                    () => syncProfit()
                )
                .subscribe();

            if (cancelled) {
                supabase.removeChannel(ch);
                return;
            }
            channel = ch;
        })();

        return () => {
            cancelled = true;
            clearInterval(interval);
            if (channel) supabase.removeChannel(channel);
        };
    }, [enabled, impersonatedUser, syncProfit]);
}

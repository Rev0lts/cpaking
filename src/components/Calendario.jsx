import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    calculateWeeklyDailyProfits,
    calculateMonthCalendarDays,
    calculateDashboardProfits,
    formatCurrencyBRL,
    getGMT3Now,
} from '../lib/profitCalculations';
import { fetchUserProfitData } from '../lib/fetchProfitData';
import { fetchDailyProfitSnapshots } from '../lib/dailyProfitSnapshots';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DayCard = ({ day, large = false }) => {
    if (!day) return null;

    const statusClass = day.isPositive
        ? 'calendar-day--positive'
        : day.isNegative
            ? 'calendar-day--negative'
            : 'calendar-day--neutral';

    return (
        <div
            className={`calendar-day ${statusClass}${day.isToday ? ' calendar-day--today' : ''}${large ? ' calendar-day--large' : ''}`}
        >
            <div className="calendar-day__top">
                <span className="calendar-day__name">{day.dayName}</span>
                <span className="calendar-day__date">{day.dateLabel}</span>
            </div>
            <div className="calendar-day__profit">
                <span>{formatCurrencyBRL(day.profit)}</span>
            </div>
        </div>
    );
};

const Calendario = ({ impersonatedUser }) => {
    const gmt3Now = getGMT3Now();
    const [viewYear, setViewYear] = useState(gmt3Now.getFullYear());
    const [viewMonth, setViewMonth] = useState(gmt3Now.getMonth());
    const [accounts, setAccounts] = useState([]);
    const [quickReports, setQuickReports] = useState([]);
    const [snapshots, setSnapshots] = useState({});
    const [liveGlobalDailyProfit, setLiveGlobalDailyProfit] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchCalendarData = useCallback(async () => {
        try {
            setLoading(true);
            const { userId, accounts: acc, quickReports: qr } = await fetchUserProfitData(impersonatedUser);
            if (!userId) return;

            const snapMap = await fetchDailyProfitSnapshots(userId);
            const stats = calculateDashboardProfits(acc, qr);

            setAccounts(acc);
            setQuickReports(qr);
            setSnapshots(snapMap);
            setLiveGlobalDailyProfit(stats.dailyProfit);
        } catch (err) {
            console.error('Erro ao carregar calendário:', err);
            setAccounts([]);
            setQuickReports([]);
            setSnapshots({});
            setLiveGlobalDailyProfit(0);
        } finally {
            setLoading(false);
        }
    }, [impersonatedUser]);

    useEffect(() => {
        let cancelled = false;
        let channel = null;

        fetchCalendarData();

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const targetUserId = impersonatedUser?.id || user.id;

            const ch = supabase
                .channel(`calendario:${targetUserId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'accounts',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => fetchCalendarData()
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'quick_reports',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => fetchCalendarData()
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'daily_profit_snapshots',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => fetchCalendarData()
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
            if (channel) supabase.removeChannel(channel);
        };
    }, [impersonatedUser, fetchCalendarData]);

    const calendarOptions = useMemo(
        () => ({ snapshots, liveGlobalDailyProfit }),
        [snapshots, liveGlobalDailyProfit]
    );

    const weekDays = useMemo(
        () => calculateWeeklyDailyProfits(accounts, quickReports, calendarOptions),
        [accounts, quickReports, calendarOptions]
    );

    const monthData = useMemo(
        () => calculateMonthCalendarDays(accounts, viewYear, viewMonth, quickReports, calendarOptions),
        [accounts, viewYear, viewMonth, quickReports, calendarOptions]
    );

    const monthTotal = useMemo(() => {
        return monthData.cells
            .filter((c) => !c.empty)
            .reduce((sum, c) => sum + c.profit, 0);
    }, [monthData]);

    const weekTotal = useMemo(() => weekDays.reduce((sum, d) => sum + d.profit, 0), [weekDays]);

    const changeMonth = (delta) => {
        const next = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(next.getFullYear());
        setViewMonth(next.getMonth());
    };

    const goToToday = () => {
        const now = getGMT3Now();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
    };

    return (
        <div className="calendario-page">
            <header className="calendario-page__header">
                <div>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Calendar size={28} color="var(--primary)" />
                        Calendário
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 8 }}>
                        Mesmo lucro diário global do dashboard — hoje ao vivo; dias passados travados à meia-noite
                    </p>
                </div>
                <div className="calendario-page__summary">
                    <div className="glass-card calendario-page__summary-card">
                        <span className="calendario-page__summary-label">Semana</span>
                        <strong style={{ color: weekTotal >= 0 ? 'var(--primary)' : '#ef4444' }}>
                            {formatCurrencyBRL(weekTotal)}
                        </strong>
                    </div>
                    <div className="glass-card calendario-page__summary-card">
                        <span className="calendario-page__summary-label">{monthData.monthLabel}</span>
                        <strong style={{ color: monthTotal >= 0 ? 'var(--primary)' : '#ef4444' }}>
                            {formatCurrencyBRL(monthTotal)}
                        </strong>
                    </div>
                </div>
            </header>

            <section className="glass-card calendario-page__section">
                <h2 className="calendario-page__section-title">Últimos 7 dias</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
                ) : (
                    <div className="calendario-page__week-grid">
                        {weekDays.map((day) => (
                            <DayCard key={day.key} day={day} large />
                        ))}
                    </div>
                )}
            </section>

            <section className="glass-card calendario-page__section">
                <div className="calendario-page__month-nav">
                    <button type="button" className="calendario-page__nav-btn" onClick={() => changeMonth(-1)}>
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h2 className="calendario-page__section-title" style={{ margin: 0 }}>
                            {monthData.monthLabel} {viewYear}
                        </h2>
                        <button type="button" className="calendario-page__today-btn" onClick={goToToday}>
                            Ir para hoje
                        </button>
                    </div>
                    <button type="button" className="calendario-page__nav-btn" onClick={() => changeMonth(1)}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="calendario-page__month-headers">
                    {WEEKDAY_HEADERS.map((name) => (
                        <span key={name}>{name}</span>
                    ))}
                </div>

                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
                ) : (
                    <div className="calendario-page__month-grid">
                        {monthData.cells.map((cell) =>
                            cell.empty ? (
                                <div key={cell.key} className="calendar-day calendar-day--empty" />
                            ) : (
                                <DayCard key={cell.key} day={cell} />
                            )
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Calendario;

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import StatCard from './StatCard';
import ProfitChart from './ProfitChart';
import PlatformProfits from './PlatformProfits';
import QuickReport from './QuickReport';
import DashboardNotepad from './DashboardNotepad';
import DailyGoalProgress from './DailyGoalProgress';
import {
    TrendingUp,
    Calendar,
    BarChart3,
    PieChart,
    ArrowDownCircle,
    ArrowUpCircle,
    PiggyBank,
    Users,
    Layout
} from 'lucide-react';
import {
    calculateDashboardProfits,
    calculatePlatformProfits,
    parseCurrency,
    applyQuickReportsToChartAggregates,
} from '../lib/profitCalculations';
import {
    filterAccountsByActivePlatforms,
    filterActivePlatforms,
} from '../lib/platformFilters';

let cachedDashboardData = null;

export function invalidateDashboardCache() {
    cachedDashboardData = null;
}

/** Cor estável por plataforma (não muda a cada atualização). */
const colorFromId = (id) => {
    const str = String(id ?? '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash * 31 + str.charCodeAt(i)) % 360;
    }
    return `hsl(${hash}, 70%, 60%)`;
};

const Dashboard = ({ onNavigate, impersonatedUser, dailyGoal }) => {
    const defaultStats = {
        totalDeposit: 0,
        totalWithdraw: 0,
        totalChest: 0,
        totalProfit: 0,
        totalAccounts: 0,
        totalPlatforms: 0,
        roi: 0,
        dailyProfit: 0,
        weeklyProfit: 0,
        monthlyProfit: 0,
        yearlyProfit: 0,
        dailyTrend: 0,
        weeklyTrend: 0,
        monthlyTrend: 0,
        yearlyTrend: 0
    };
    const [stats, setStats] = useState(cachedDashboardData?.stats || defaultStats);
    const [chartData, setChartData] = useState(cachedDashboardData?.chartData || { Ano: [], Mes: [], Semana: [] });
    const [platformStats, setPlatformStats] = useState(cachedDashboardData?.platformStats || []);
    const [loading, setLoading] = useState(!cachedDashboardData);

    useEffect(() => {
        fetchGlobalStats();
    }, [impersonatedUser]);

    useEffect(() => {
        let cancelled = false;
        let channel = null;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const targetUserId = impersonatedUser?.id || user.id;

            const ch = supabase
                .channel(`dashboard:${targetUserId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'quick_reports',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => fetchGlobalStats(true)
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'accounts',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => fetchGlobalStats(true)
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
    }, [impersonatedUser]);

    const fetchGlobalStats = async (silent = false) => {
        try {
            cachedDashboardData = null;
            if (!silent) setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;

            const { data: platformsData, error: platError } = await supabase
                .from('platforms')
                .select('*')
                .eq('user_id', targetUserId);

            if (platError) throw platError;

            const activePlatforms = filterActivePlatforms(platformsData || []);

            let { data: accountsData, error: accError } = await supabase
                .from('accounts')
                .select('deposit, withdraw, chest, platform_id, created_at, updated_at, date, tag')
                .eq('user_id', targetUserId);

            if (accError && (accError.code === '42703' || accError.code === 'PGRST204')) {
                console.warn("Coluna 'updated_at', 'date' ou 'tag' não encontrada, tentando sem elas...");
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('accounts')
                    .select('deposit, withdraw, chest, platform_id, created_at, date, tag')
                    .eq('user_id', targetUserId);

                if (fallbackError) throw fallbackError;
                accountsData = fallbackData;
            } else if (accError) {
                throw accError;
            }

            const activeAccounts = filterAccountsByActivePlatforms(accountsData || [], platformsData || []);

            let quickReportsData = [];
            const { data: quickData, error: quickError } = await supabase
                .from('quick_reports')
                .select('type, amount, date, created_at')
                .eq('user_id', targetUserId);

            if (quickError) {
                if (quickError.code !== '42P01' && !quickError.message?.includes('quick_reports')) {
                    console.warn('Erro ao buscar reporte rápido para dashboard:', quickError);
                }
            } else {
                quickReportsData = quickData || [];
            }

            const profitStats = calculateDashboardProfits(activeAccounts, quickReportsData);

            const pStatsMap = {};
            activePlatforms.forEach(p => {
                pStatsMap[p.id] = {
                    id: p.id,
                    name: p.name,
                    profit: 0,
                    color: colorFromId(p.id)
                };
            });

            activePlatforms.forEach((p) => {
                const platformAccounts = activeAccounts.filter((a) => a.platform_id === p.id);
                pStatsMap[p.id].profit = calculatePlatformProfits(platformAccounts).totalProfit;
            });

            const now = new Date();
            const aggByDate = {};
            const aggByMonth = {};

            activeAccounts.forEach(acc => {
                const profit = parseCurrency(acc.withdraw) + parseCurrency(acc.chest) - parseCurrency(acc.deposit);

                const parseDate = (dateStr, fallback) => {
                    if (!dateStr) return new Date(fallback);
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        return new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                    return new Date(fallback);
                };

                const createdAt = parseDate(acc.date, acc.created_at);

                const dateKey = `${String(createdAt.getDate()).padStart(2, '0')}/${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`;
                const monthKey = `${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`;

                aggByDate[dateKey] = (aggByDate[dateKey] || 0) + profit;
                aggByMonth[monthKey] = (aggByMonth[monthKey] || 0) + profit;
            });

            applyQuickReportsToChartAggregates(quickReportsData, aggByDate, aggByMonth);

            // Mantém o gráfico coerente com os cards e a barra de meta:
            // hoje usa o lucro diário global (mesma lógica de ciclos do dashboard).
            const todayKey = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            const thisMonthKey = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            const todayDelta = profitStats.dailyProfit - (aggByDate[todayKey] || 0);
            aggByDate[todayKey] = profitStats.dailyProfit;
            aggByMonth[thisMonthKey] = (aggByMonth[thisMonthKey] || 0) + todayDelta;

            const anoData = [];
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            for (let i = 0; i < 12; i++) {
                const mk = `${String(i + 1).padStart(2, '0')}/${now.getFullYear()}`;
                anoData.push({ name: monthNames[i], profit: aggByMonth[mk] || 0 });
            }

            const mesData = [];
            const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let i = 0; i < totalDaysInMonth; i++) {
                const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
                const dk = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                mesData.push({ name: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, profit: aggByDate[dk] || 0 });
            }

            const semanaData = [];
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                const dk = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                semanaData.push({ name: dayNames[d.getDay()], profit: aggByDate[dk] || 0 });
            }

            const calcRoi = profitStats.totalDeposit > 0
                ? ((profitStats.totalProfit / profitStats.totalDeposit) * 100).toFixed(2)
                : 0;

            const newStats = {
                totalDeposit: profitStats.totalDeposit,
                totalWithdraw: profitStats.totalWithdraw,
                totalChest: profitStats.totalChest,
                totalProfit: profitStats.totalProfit,
                totalAccounts: activeAccounts.length,
                totalPlatforms: activePlatforms.length,
                roi: calcRoi,
                dailyProfit: profitStats.dailyProfit,
                weeklyProfit: profitStats.weeklyProfit,
                monthlyProfit: profitStats.monthlyProfit,
                yearlyProfit: profitStats.yearlyProfit,
                dailyTrend: profitStats.dailyTrend,
                weeklyTrend: profitStats.weeklyTrend,
                monthlyTrend: profitStats.monthlyTrend,
                yearlyTrend: profitStats.yearlyTrend,
            };

            const newChartData = {
                Ano: anoData,
                Mes: mesData,
                Semana: semanaData
            };

            const newPlatformStats = Object.values(pStatsMap).sort((a, b) => b.profit - a.profit);

            cachedDashboardData = {
                stats: newStats,
                chartData: newChartData,
                platformStats: newPlatformStats
            };

            setStats(newStats);
            setChartData(newChartData);
            setPlatformStats(newPlatformStats);

        } catch (err) {
            console.error("Erro ao carregar estatísticas do dashboard:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const mainStats = [
        { title: 'Lucro Diário', value: formatCurrency(stats.dailyProfit), trend: stats.dailyTrend, icon: <TrendingUp size={24} />, variant: stats.dailyProfit >= 0 ? 'primary' : 'danger', valueColor: stats.dailyProfit > 0 ? 'var(--primary)' : (stats.dailyProfit < 0 ? 'var(--danger)' : 'var(--text-main)') },
        { title: 'Lucro Semanal', value: formatCurrency(stats.weeklyProfit), trend: stats.weeklyTrend, icon: <Calendar size={24} />, variant: stats.weeklyProfit >= 0 ? 'secondary' : 'danger', valueColor: stats.weeklyProfit > 0 ? 'var(--primary)' : (stats.weeklyProfit < 0 ? 'var(--danger)' : 'var(--text-main)') },
        { title: 'Lucro Mensal', value: formatCurrency(stats.monthlyProfit), trend: stats.monthlyTrend, icon: <BarChart3 size={24} />, variant: stats.monthlyProfit >= 0 ? 'accent' : 'danger', valueColor: stats.monthlyProfit > 0 ? 'var(--primary)' : (stats.monthlyProfit < 0 ? 'var(--danger)' : 'var(--text-main)') },
        { title: 'Lucro Anual', value: formatCurrency(stats.yearlyProfit), trend: stats.yearlyTrend, icon: <PieChart size={24} />, variant: stats.yearlyProfit >= 0 ? 'info' : 'danger', valueColor: stats.yearlyProfit > 0 ? 'var(--primary)' : (stats.yearlyProfit < 0 ? 'var(--danger)' : 'var(--text-main)') },
    ];

    const secondaryStats = [
        { title: 'Depósito Total', value: formatCurrency(stats.totalDeposit), icon: <ArrowDownCircle size={18} />, variant: 'primary' },
        { title: 'Saque Total', value: formatCurrency(stats.totalWithdraw), icon: <ArrowUpCircle size={18} />, variant: 'secondary' },
        { title: 'Baú Total', value: formatCurrency(stats.totalChest), icon: <PiggyBank size={18} />, variant: 'warning' },
        { title: 'Lucro Total', value: formatCurrency(stats.totalProfit), icon: <TrendingUp size={18} />, variant: stats.totalProfit >= 0 ? 'primary' : 'danger', valueColor: stats.totalProfit > 0 ? 'var(--primary)' : (stats.totalProfit < 0 ? 'var(--danger)' : 'var(--text-main)') },
        { title: 'ROI', value: `${stats.roi}%`, icon: <TrendingUp size={18} />, variant: stats.roi >= 0 ? 'accent' : 'danger', valueColor: stats.roi > 0 ? 'var(--primary)' : (stats.roi < 0 ? 'var(--danger)' : 'var(--text-main)') },
        { title: 'Contas', value: stats.totalAccounts.toString(), icon: <Users size={18} />, variant: 'info' },
        { title: 'Plataformas', value: stats.totalPlatforms.toString(), icon: <Layout size={18} />, variant: 'secondary' },
    ];

    if (loading) {
        return (
            <div className="loader-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <header className="page-header">
                <h1>Dashboard</h1>
                <p>Visão geral das suas movimentações e lucros</p>
            </header>

            <section className="dashboard-stats-main">
                {mainStats.map((stat, index) => (
                    <StatCard key={index} {...stat} size="large" />
                ))}
            </section>

            <section className="dashboard-stats-secondary">
                {secondaryStats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </section>

            <DailyGoalProgress dailyProfit={stats.dailyProfit} dailyGoal={dailyGoal} />

            <section className="dashboard-middle">
                <ProfitChart dataSets={chartData} />
                <PlatformProfits platforms={platformStats} onNavigate={onNavigate} />
            </section>

            <section className="dashboard-bottom-row">
                <QuickReport
                    impersonatedUser={impersonatedUser}
                    onStatsChange={() => fetchGlobalStats(true)}
                />
                <DashboardNotepad impersonatedUser={impersonatedUser} />
            </section>

            <style>{`
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
                }
                .input-focus:focus {
                    border-color: var(--primary) !important;
                    background-color: rgba(255, 255, 255, 0.05) !important;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;

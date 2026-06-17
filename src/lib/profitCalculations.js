/** Cálculos de lucro compartilhados (dashboard, plataformas, detalhe). */

export const parseCurrency = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let str = String(val).replace(/[R$\s]/g, '');
    if (str.includes(',') && str.includes('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    return parseFloat(str) || 0;
};

export function getGMT3Date() {
    const date = new Date();
    const offset = -3;
    const gmt3Date = new Date(date.getTime() + offset * 60 * 60 * 1000);
    const day = String(gmt3Date.getDate()).padStart(2, '0');
    const month = String(gmt3Date.getMonth() + 1).padStart(2, '0');
    const year = gmt3Date.getFullYear();
    return `${day}/${month}/${year}`;
}

/** Chave DD/MM/YYYY para snapshot e calendário. */
export function formatProfitDateKey(date) {
    const d = date instanceof Date ? date : parseAccountDate(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const resolveCalendarDayProfit = (
    list,
    reports,
    dayStart,
    dayEnd,
    isToday,
    snapshots,
    liveGlobalDailyProfit
) => {
    const dateKey = formatProfitDateKey(dayStart);

    if (isToday) {
        return typeof liveGlobalDailyProfit === 'number' ? liveGlobalDailyProfit : 0;
    }

    if (snapshots && snapshots[dateKey] != null) {
        return Number(snapshots[dateKey]) || 0;
    }

    return (
        calculateCalendarDayAccountProfit(list, dayStart, dayEnd) +
        sumQuickReportProfitInRange(reports, dayStart, dayEnd)
    );
};

const applyDayProfitFlags = (profit) => ({
    profit,
    isPositive: profit > 0,
    isNegative: profit < 0,
    isNeutral: profit === 0,
});

const getGMT3Now = () => {
    const date = new Date();
    const offset = -3;
    return new Date(date.getTime() + offset * 60 * 60 * 1000);
};

const getGMT3StartOfDay = () => {
    const gmt3 = getGMT3Now();
    return new Date(gmt3.getFullYear(), gmt3.getMonth(), gmt3.getDate());
};

const parseAccountDate = (dateStr, fallback) => {
    if (dateStr) {
        const parts = String(dateStr).split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            if (!isNaN(d.getTime())) return d;
        }
    }
    if (fallback) {
        const d = new Date(fallback);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date(0);
};

const getAccountTags = (acc) => {
    if (Array.isArray(acc.tag)) return acc.tag;
    if (typeof acc.tag === 'string' && acc.tag) {
        return acc.tag.split(',').filter(Boolean);
    }
    return [];
};

const normalizeAccounts = (accounts = []) =>
    accounts.map((acc) => ({ ...acc, tag: getAccountTags(acc) }));

const getAccountCycleNum = (acc) => {
    const tags = getAccountTags(acc);
    const cycleTag = tags.find((t) => t.startsWith('Ciclo '));
    if (!cycleTag) return 1;
    const num = parseInt(cycleTag.replace('Ciclo ', ''), 10);
    return isNaN(num) ? 1 : num;
};

const isMotherAccount = (acc) => getAccountTags(acc).includes('Mãe');

const getAccountProfit = (acc) =>
    parseCurrency(acc.withdraw) + parseCurrency(acc.chest) - parseCurrency(acc.deposit);

const isAccountDateToday = (acc) => {
    const todayStr = getGMT3Date();
    const startOfDay = getGMT3StartOfDay();
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    if (acc.date === todayStr) return true;
    const d = parseAccountDate(acc.date, acc.created_at);
    return d >= startOfDay && d < endOfDay;
};

const isAccountInRange = (acc, rangeStart, rangeEnd) => {
    const d = parseAccountDate(acc.date, acc.created_at);
    return d >= rangeStart && d < rangeEnd;
};

/**
 * Lucro no período: contas no intervalo + filhas do mesmo ciclo com atividade no período.
 * useTodayCheck: no diário, usa regra de "hoje" (GMT-3) + filhas do ciclo.
 */
const calculateRangedProfit = (list, rangeStart, rangeEnd, useTodayCheck = false) => {
    const cyclesActive = new Set();

    list.forEach((acc) => {
        const active = useTodayCheck
            ? isAccountDateToday(acc)
            : isAccountInRange(acc, rangeStart, rangeEnd);
        if (active) cyclesActive.add(getAccountCycleNum(acc));
    });

    let sum = 0;
    list.forEach((acc) => {
        const profit = getAccountProfit(acc);
        const cycleNum = getAccountCycleNum(acc);
        const counts = useTodayCheck
            ? isAccountDateToday(acc) || (cyclesActive.has(cycleNum) && !isMotherAccount(acc))
            : isAccountInRange(acc, rangeStart, rangeEnd) ||
              (cyclesActive.has(cycleNum) && !isMotherAccount(acc));

        if (counts) sum += profit;
    });

    return sum;
};

/**
 * Lucro de contas em um dia do calendário: só contas cuja data cai no dia.
 * Não repete filhas de ciclo em outros dias (evita inflar semana/mês).
 */
const calculateCalendarDayAccountProfit = (list, rangeStart, rangeEnd) => {
    let sum = 0;
    list.forEach((acc) => {
        if (isAccountInRange(acc, rangeStart, rangeEnd)) {
            sum += getAccountProfit(acc);
        }
    });
    return sum;
};

const calcTrend = (current, previous) => {
    if (previous === 0) {
        if (current > 0) return 100;
        if (current < 0) return -100;
        return 0;
    }
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
};

/**
 * Lucros agregados — todas as contas e todos os ciclos.
 */
export function calculatePlatformProfits(accounts = []) {
    const list = normalizeAccounts(accounts);

    const totalDeposit = list.reduce((sum, acc) => sum + parseCurrency(acc.deposit), 0);
    const totalWithdraw = list.reduce((sum, acc) => sum + parseCurrency(acc.withdraw), 0);
    const totalChest = list.reduce((sum, acc) => sum + parseCurrency(acc.chest), 0);
    const totalProfit = totalWithdraw + totalChest - totalDeposit;

    const startOfDay = getGMT3StartOfDay();
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const gmt3Now = getGMT3Now();
    const startOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth(), 1);
    const endOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth() + 1, 1);

    const startOfYear = new Date(gmt3Now.getFullYear(), 0, 1);
    const endOfYear = new Date(gmt3Now.getFullYear() + 1, 0, 1);

    return {
        totalDeposit,
        totalWithdraw,
        totalChest,
        totalProfit,
        dailyProfit: calculateRangedProfit(list, startOfDay, endOfDay, true),
        weeklyProfit: calculateRangedProfit(list, startOfWeek, endOfDay, false),
        monthlyProfit: calculateRangedProfit(list, startOfMonth, endOfMonth, false),
        yearlyProfit: calculateRangedProfit(list, startOfYear, endOfYear, false),
    };
};

/** Lucro de um lançamento do reporte rápido (mesma lógica: saque − depósito − custo). */
export const getQuickReportProfit = (entry) => {
    const amount = parseCurrency(entry?.amount);
    if (entry?.type === 'withdraw') return amount;
    if (entry?.type === 'deposit' || entry?.type === 'operation_cost') return -amount;
    return 0;
};

const isQuickReportInRange = (entry, rangeStart, rangeEnd) => {
    const d = parseAccountDate(entry?.date, entry?.created_at);
    return d >= rangeStart && d < rangeEnd;
};

const sumQuickReportProfitInRange = (reports, rangeStart, rangeEnd) =>
    (reports || []).reduce(
        (sum, entry) =>
            isQuickReportInRange(entry, rangeStart, rangeEnd) ? sum + getQuickReportProfit(entry) : sum,
        0
    );

/** Totais e lucros por período só do reporte rápido. */
export function calculateQuickReportProfitStats(quickReports = []) {
    const reports = quickReports || [];
    let totalDeposit = 0;
    let totalWithdraw = 0;
    let totalOperationCost = 0;

    reports.forEach((entry) => {
        const amount = parseCurrency(entry.amount);
        if (entry.type === 'deposit') totalDeposit += amount;
        else if (entry.type === 'withdraw') totalWithdraw += amount;
        else if (entry.type === 'operation_cost') totalOperationCost += amount;
    });

    const startOfDay = getGMT3StartOfDay();
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const prevStartOfDay = new Date(startOfDay);
    prevStartOfDay.setDate(prevStartOfDay.getDate() - 1);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const prevStartOfWeek = new Date(startOfWeek);
    prevStartOfWeek.setDate(prevStartOfWeek.getDate() - 7);

    const gmt3Now = getGMT3Now();
    const startOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth(), 1);
    const endOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth() + 1, 1);
    const prevStartOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth() - 1, 1);

    const startOfYear = new Date(gmt3Now.getFullYear(), 0, 1);
    const endOfYear = new Date(gmt3Now.getFullYear() + 1, 0, 1);
    const prevStartOfYear = new Date(gmt3Now.getFullYear() - 1, 0, 1);

    const totalProfit = totalWithdraw - totalDeposit - totalOperationCost;

    return {
        totalDeposit,
        totalWithdraw,
        totalOperationCost,
        totalProfit,
        dailyProfit: sumQuickReportProfitInRange(reports, startOfDay, endOfDay),
        weeklyProfit: sumQuickReportProfitInRange(reports, startOfWeek, endOfDay),
        monthlyProfit: sumQuickReportProfitInRange(reports, startOfMonth, endOfMonth),
        yearlyProfit: sumQuickReportProfitInRange(reports, startOfYear, endOfYear),
        prevDailyProfit: sumQuickReportProfitInRange(reports, prevStartOfDay, startOfDay),
        prevWeeklyProfit: sumQuickReportProfitInRange(reports, prevStartOfWeek, startOfWeek),
        prevMonthlyProfit: sumQuickReportProfitInRange(reports, prevStartOfMonth, startOfMonth),
        prevYearlyProfit: sumQuickReportProfitInRange(reports, prevStartOfYear, startOfYear),
    };
}

/** Soma lucro do reporte rápido nas agregações do gráfico (por dia/mês). */
export function applyQuickReportsToChartAggregates(quickReports = [], aggByDate = {}, aggByMonth = {}) {
    (quickReports || []).forEach((entry) => {
        const profit = getQuickReportProfit(entry);
        const createdAt = parseAccountDate(entry.date, entry.created_at);
        const dateKey = `${String(createdAt.getDate()).padStart(2, '0')}/${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`;
        const monthKey = `${String(createdAt.getMonth() + 1).padStart(2, '0')}/${createdAt.getFullYear()}`;
        aggByDate[dateKey] = (aggByDate[dateKey] || 0) + profit;
        aggByMonth[monthKey] = (aggByMonth[monthKey] || 0) + profit;
    });
    return { aggByDate, aggByMonth };
}

/** Lucros + tendências para o dashboard global (contas + reporte rápido). */
export function calculateDashboardProfits(accounts = [], quickReports = []) {
    const list = normalizeAccounts(accounts);
    const accountStats = calculatePlatformProfits(list);
    const qr = calculateQuickReportProfitStats(quickReports);

    const startOfDay = getGMT3StartOfDay();
    const prevStartOfDay = new Date(startOfDay);
    prevStartOfDay.setDate(prevStartOfDay.getDate() - 1);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const prevStartOfWeek = new Date(startOfWeek);
    prevStartOfWeek.setDate(prevStartOfWeek.getDate() - 7);

    const gmt3Now = getGMT3Now();
    const startOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth(), 1);
    const prevStartOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth() - 1, 1);

    const startOfYear = new Date(gmt3Now.getFullYear(), 0, 1);
    const prevStartOfYear = new Date(gmt3Now.getFullYear() - 1, 0, 1);

    const dailyProfit = accountStats.dailyProfit + qr.dailyProfit;
    const weeklyProfit = accountStats.weeklyProfit + qr.weeklyProfit;
    const monthlyProfit = accountStats.monthlyProfit + qr.monthlyProfit;
    const yearlyProfit = accountStats.yearlyProfit + qr.yearlyProfit;

    const prevDaily =
        calculateRangedProfit(list, prevStartOfDay, startOfDay, false) + qr.prevDailyProfit;
    const prevWeekly =
        calculateRangedProfit(list, prevStartOfWeek, startOfWeek, false) + qr.prevWeeklyProfit;
    const prevMonthly =
        calculateRangedProfit(list, prevStartOfMonth, startOfMonth, false) + qr.prevMonthlyProfit;
    const prevYearly =
        calculateRangedProfit(list, prevStartOfYear, startOfYear, false) + qr.prevYearlyProfit;

    return {
        totalDeposit: accountStats.totalDeposit + qr.totalDeposit,
        totalWithdraw: accountStats.totalWithdraw + qr.totalWithdraw,
        totalChest: accountStats.totalChest,
        totalProfit: accountStats.totalProfit + qr.totalProfit,
        dailyProfit,
        weeklyProfit,
        monthlyProfit,
        yearlyProfit,
        dailyTrend: calcTrend(dailyProfit, prevDaily),
        weeklyTrend: calcTrend(weeklyProfit, prevWeekly),
        monthlyTrend: calcTrend(monthlyProfit, prevMonthly),
        yearlyTrend: calcTrend(yearlyProfit, prevYearly),
    };
}

export const formatCurrencyBRL = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Lucro por dia dos últimos 7 dias (GMT-3).
 * Hoje = lucro diário global (igual ao dashboard). Dias passados = snapshot travado à meia-noite.
 */
export function calculateWeeklyDailyProfits(accounts = [], quickReports = [], options = {}) {
    const { snapshots = {}, liveGlobalDailyProfit = 0 } = options;
    const list = normalizeAccounts(accounts);
    const reports = quickReports || [];
    const startOfToday = getGMT3StartOfDay();
    const days = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
        const dayStart = new Date(startOfToday);
        dayStart.setDate(dayStart.getDate() - offset);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const isToday = offset === 0;
        const profit = resolveCalendarDayProfit(
            list,
            reports,
            dayStart,
            dayEnd,
            isToday,
            snapshots,
            liveGlobalDailyProfit
        );

        days.push({
            key: `${dayStart.getFullYear()}-${dayStart.getMonth()}-${dayStart.getDate()}`,
            dateKey: formatProfitDateKey(dayStart),
            dayName: DAY_NAMES_SHORT[dayStart.getDay()],
            dateLabel: `${String(dayStart.getDate()).padStart(2, '0')}/${String(dayStart.getMonth() + 1).padStart(2, '0')}`,
            isToday,
            ...applyDayProfitFlags(profit),
        });
    }

    return days;
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Grade do mês — hoje ao vivo (dashboard); dias anteriores travados no snapshot. */
export function calculateMonthCalendarDays(accounts = [], year, month, quickReports = [], options = {}) {
    const { snapshots = {}, liveGlobalDailyProfit = 0 } = options;
    const list = normalizeAccounts(accounts);
    const reports = quickReports || [];
    const startOfToday = getGMT3StartOfDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [];

    for (let i = 0; i < firstWeekday; i += 1) {
        cells.push({ key: `empty-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayStart = new Date(year, month, day);
        const dayEnd = new Date(year, month, day + 1);
        const isToday =
            dayStart.getFullYear() === startOfToday.getFullYear() &&
            dayStart.getMonth() === startOfToday.getMonth() &&
            dayStart.getDate() === startOfToday.getDate();

        const profit = resolveCalendarDayProfit(
            list,
            reports,
            dayStart,
            dayEnd,
            isToday,
            snapshots,
            liveGlobalDailyProfit
        );

        cells.push({
            key: `${year}-${month}-${day}`,
            empty: false,
            day,
            dateKey: formatProfitDateKey(dayStart),
            dayName: DAY_NAMES_SHORT[dayStart.getDay()],
            dateLabel: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
            isToday,
            ...applyDayProfitFlags(profit),
        });
    }

    return {
        year,
        month,
        monthLabel: MONTH_NAMES[month],
        cells,
    };
}

export { getGMT3Now, getGMT3StartOfDay };

import { supabase } from './supabase';
import { filterAccountsByActivePlatforms } from './platformFilters';

/** Busca contas + reporte rápido do usuário (mesma base do dashboard). */
export async function fetchUserProfitData(impersonatedUser, { activePlatformsOnly = true } = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, accounts: [], quickReports: [], platforms: [] };

    const userId = impersonatedUser?.id || user.id;

    const { data: platformsData, error: platError } = await supabase
        .from('platforms')
        .select('id, active')
        .eq('user_id', userId);

    if (platError && platError.code !== '42703' && platError.code !== 'PGRST204') {
        throw platError;
    }

    const platforms = (platformsData || []).map((p) => ({
        ...p,
        active: p.active !== false,
    }));

    let { data: accountsData, error: accError } = await supabase
        .from('accounts')
        .select('deposit, withdraw, chest, platform_id, created_at, updated_at, date, tag')
        .eq('user_id', userId);

    if (accError && (accError.code === '42703' || accError.code === 'PGRST204')) {
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('accounts')
            .select('deposit, withdraw, chest, platform_id, created_at, date, tag')
            .eq('user_id', userId);
        if (fallbackError) throw fallbackError;
        accountsData = fallbackData;
    } else if (accError) {
        throw accError;
    }

    let accounts = accountsData || [];
    if (activePlatformsOnly && platforms.length > 0) {
        accounts = filterAccountsByActivePlatforms(accounts, platforms);
    }

    let quickReportsData = [];
    const { data: quickData, error: quickError } = await supabase
        .from('quick_reports')
        .select('type, amount, date, created_at')
        .eq('user_id', userId);

    if (!quickError) {
        quickReportsData = quickData || [];
    } else if (quickError.code !== '42P01' && !quickError.message?.includes('quick_reports')) {
        console.warn('Erro ao buscar reporte rápido:', quickError);
    }

    return {
        userId,
        accounts,
        quickReports: quickReportsData,
        platforms,
    };
}

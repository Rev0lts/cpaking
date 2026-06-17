import { supabase } from './supabase';

/**
 * Zera depósitos/saques/baú nas contas e remove histórico financeiro.
 * Mantém contas, plataformas, chaves PIX e perfil.
 */
export async function clearUserFinancialData(targetUserId) {
    if (!targetUserId) throw new Error('Usuário não identificado.');

    const { error: accountsError } = await supabase
        .from('accounts')
        .update({
            deposit: 0,
            withdraw: 0,
            chest: 0,
        })
        .eq('user_id', targetUserId);

    if (accountsError) throw accountsError;

    const tables = ['quick_reports', 'daily_profit_snapshots', 'user_dashboard_notes', 'chinesas'];

    for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', targetUserId);
        if (error && error.code !== '42P01' && !error.message?.includes(table)) {
            throw error;
        }
    }

    try {
        localStorage.removeItem('cpa_daily_profit_date');
        localStorage.removeItem('cpa_daily_profit_value');
    } catch {
        /* ignore */
    }
}

/** Limpeza global — apenas admin (requer RPC no Supabase). */
export async function adminCleanKeepAccounts() {
    const { data, error } = await supabase.rpc('admin_clean_keep_accounts');
    if (error) throw error;
    return data;
}

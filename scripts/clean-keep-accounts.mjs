/**
 * Limpeza global via service role (bypass RLS).
 * Uso: SUPABASE_SERVICE_ROLE_KEY=sua_chave node scripts/clean-keep-accounts.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function wipe(table) {
  const { error, count } = await supabase.from(table).delete({ count: 'exact' }).neq('user_id', '00000000-0000-0000-0000-000000000000');
  if (error && error.code !== '42P01') throw error;
  return count ?? 0;
}

async function main() {
  const { error: accountsError } = await supabase
    .from('accounts')
    .update({ deposit: 0, withdraw: 0, chest: 0 })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (accountsError) throw accountsError;

  const quick = await wipe('quick_reports');
  const snapshots = await wipe('daily_profit_snapshots');
  const notes = await wipe('user_dashboard_notes');
  const chinesas = await wipe('chinesas');

  console.log('Limpeza concluída:');
  console.log('  Contas — depósito/saque/baú zerados');
  console.log(`  quick_reports: ${quick} removidos`);
  console.log(`  daily_profit_snapshots: ${snapshots} removidos`);
  console.log(`  user_dashboard_notes: ${notes} removidos`);
  console.log(`  chinesas: ${chinesas} removidos`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

-- ============================================================
-- CPAKing — Limpar bases de dados mantendo apenas as contas
-- Cole no SQL Editor do Supabase e execute (Run).
--
-- MANTÉM:
--   accounts (login, senha, plataforma, tags, pix, etc.)
--   platforms, pix_keys, profiles, banks, user_tags, auth.users
--
-- REMOVE / ZERA:
--   depósito, saque e baú em todas as contas (zerados)
--   quick_reports, daily_profit_snapshots*, user_dashboard_notes*, chinesas*
--   (* só se a tabela existir no projeto)
-- ============================================================

-- Zera movimentações financeiras nas contas
UPDATE public.accounts
SET
  deposit = 0,
  withdraw = 0,
  chest = 0;

-- Remove dados auxiliares (ignora tabelas que ainda não foram criadas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quick_reports'
  ) THEN
    DELETE FROM public.quick_reports;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'daily_profit_snapshots'
  ) THEN
    DELETE FROM public.daily_profit_snapshots;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_dashboard_notes'
  ) THEN
    DELETE FROM public.user_dashboard_notes;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chinesas'
  ) THEN
    DELETE FROM public.chinesas;
  END IF;
END $$;

-- Função RPC para admin executar pelo painel
CREATE OR REPLACE FUNCTION public.admin_clean_keep_accounts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accounts_updated INT := 0;
  quick_deleted INT := 0;
  snapshots_deleted INT := 0;
  notes_deleted INT := 0;
  chinesas_deleted INT := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta operação.';
  END IF;

  UPDATE public.accounts SET deposit = 0, withdraw = 0, chest = 0;
  GET DIAGNOSTICS accounts_updated = ROW_COUNT;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quick_reports'
  ) THEN
    DELETE FROM public.quick_reports;
    GET DIAGNOSTICS quick_deleted = ROW_COUNT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'daily_profit_snapshots'
  ) THEN
    DELETE FROM public.daily_profit_snapshots;
    GET DIAGNOSTICS snapshots_deleted = ROW_COUNT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_dashboard_notes'
  ) THEN
    DELETE FROM public.user_dashboard_notes;
    GET DIAGNOSTICS notes_deleted = ROW_COUNT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chinesas'
  ) THEN
    DELETE FROM public.chinesas;
    GET DIAGNOSTICS chinesas_deleted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'accounts_updated', accounts_updated,
    'quick_reports_deleted', quick_deleted,
    'snapshots_deleted', snapshots_deleted,
    'notes_deleted', notes_deleted,
    'chinesas_deleted', chinesas_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clean_keep_accounts() TO authenticated;

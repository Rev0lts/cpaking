-- ============================================================
-- CPAKing — Liga o Realtime para accounts e platforms
-- Cole no SQL Editor do Supabase e execute (Run).
--
-- Sem isto, alterações em contas/plataformas (depósito, saque,
-- baú, ativar/inativar) NÃO disparam atualização ao vivo no
-- dashboard, na barra de meta e no calendário.
-- ============================================================

-- Garante que o Postgres envie o registro completo nas mudanças
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
ALTER TABLE public.platforms REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'accounts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'platforms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.platforms;
    END IF;
END $$;

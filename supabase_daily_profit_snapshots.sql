-- CPAManager: lucro diário global travado à meia-noite (GMT-3) para o calendário
-- Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.daily_profit_snapshots (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, date),
    CONSTRAINT daily_profit_snapshots_date_format CHECK (date ~ '^\d{2}/\d{2}/\d{4}$')
);

CREATE INDEX IF NOT EXISTS idx_daily_profit_snapshots_user_date
    ON public.daily_profit_snapshots(user_id, date DESC);

ALTER TABLE public.daily_profit_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_profit_snapshots_select_own" ON public.daily_profit_snapshots;
CREATE POLICY "daily_profit_snapshots_select_own"
    ON public.daily_profit_snapshots FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_profit_snapshots_insert_own" ON public.daily_profit_snapshots;
CREATE POLICY "daily_profit_snapshots_insert_own"
    ON public.daily_profit_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_profit_snapshots_update_own" ON public.daily_profit_snapshots;
CREATE POLICY "daily_profit_snapshots_update_own"
    ON public.daily_profit_snapshots FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_profit_snapshots_delete_own" ON public.daily_profit_snapshots;
CREATE POLICY "daily_profit_snapshots_delete_own"
    ON public.daily_profit_snapshots FOR DELETE
    USING (auth.uid() = user_id);

-- Tempo real (calendário atualiza ao travar o dia)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'daily_profit_snapshots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_profit_snapshots;
    END IF;
END $$;

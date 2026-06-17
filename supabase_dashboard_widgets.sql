-- CPAManager: Reporte Rápido + Bloco de Notas
-- Cole no SQL Editor do Supabase e execute (Run).

-- ============================================================
-- 1) Reporte rápido (depósitos, saques, custos sem plataforma)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quick_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'operation_cost')),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    date TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_reports_user_id ON public.quick_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_reports_created_at ON public.quick_reports(created_at DESC);

ALTER TABLE public.quick_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_reports_select_own" ON public.quick_reports;
CREATE POLICY "quick_reports_select_own"
    ON public.quick_reports FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quick_reports_insert_own" ON public.quick_reports;
CREATE POLICY "quick_reports_insert_own"
    ON public.quick_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quick_reports_update_own" ON public.quick_reports;
CREATE POLICY "quick_reports_update_own"
    ON public.quick_reports FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quick_reports_delete_own" ON public.quick_reports;
CREATE POLICY "quick_reports_delete_own"
    ON public.quick_reports FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 2) Bloco de notas (uma nota por usuário, autosave)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_dashboard_notes (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_dashboard_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_dashboard_notes_select_own" ON public.user_dashboard_notes;
CREATE POLICY "user_dashboard_notes_select_own"
    ON public.user_dashboard_notes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_dashboard_notes_insert_own" ON public.user_dashboard_notes;
CREATE POLICY "user_dashboard_notes_insert_own"
    ON public.user_dashboard_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_dashboard_notes_update_own" ON public.user_dashboard_notes;
CREATE POLICY "user_dashboard_notes_update_own"
    ON public.user_dashboard_notes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_dashboard_notes_delete_own" ON public.user_dashboard_notes;
CREATE POLICY "user_dashboard_notes_delete_own"
    ON public.user_dashboard_notes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 3) Tempo real (atualiza PC + tablet sem F5)
-- No Supabase: Database → Replication → quick_reports deve estar ON,
-- ou execute o bloco abaixo uma vez.
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'quick_reports'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_reports;
    END IF;
END $$;

-- ============================================================
-- CPAManager — Ativar RLS nas tabelas "UNRESTRICTED"
-- Cole no SQL Editor do Supabase e execute (Run).
--
-- O que muda:
-- - Some o badge vermelho "UNRESTRICTED"
-- - Cada usuário só vê/edita os PRÓPRIOS dados (user_id = auth.uid())
-- - Admins (profiles.is_admin = true) continuam vendo tudo (painel Admin)
-- - Tabela banks: só leitura para usuários logados (catálogo de bancos)
-- ============================================================

-- Função auxiliar: usuário logado é admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ---------- accounts ----------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_select" ON public.accounts;
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "accounts_insert" ON public.accounts;
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "accounts_update" ON public.accounts;
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "accounts_delete" ON public.accounts;
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ---------- platforms ----------
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platforms_select" ON public.platforms;
CREATE POLICY "platforms_select" ON public.platforms FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "platforms_insert" ON public.platforms;
CREATE POLICY "platforms_insert" ON public.platforms FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "platforms_update" ON public.platforms;
CREATE POLICY "platforms_update" ON public.platforms FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "platforms_delete" ON public.platforms;
CREATE POLICY "platforms_delete" ON public.platforms FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ---------- chinesas ----------
ALTER TABLE public.chinesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chinesas_select" ON public.chinesas;
CREATE POLICY "chinesas_select" ON public.chinesas FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chinesas_insert" ON public.chinesas;
CREATE POLICY "chinesas_insert" ON public.chinesas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chinesas_update" ON public.chinesas;
CREATE POLICY "chinesas_update" ON public.chinesas FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chinesas_delete" ON public.chinesas;
CREATE POLICY "chinesas_delete" ON public.chinesas FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ---------- pix_keys ----------
ALTER TABLE public.pix_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pix_keys_select" ON public.pix_keys;
CREATE POLICY "pix_keys_select" ON public.pix_keys FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "pix_keys_insert" ON public.pix_keys;
CREATE POLICY "pix_keys_insert" ON public.pix_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "pix_keys_update" ON public.pix_keys;
CREATE POLICY "pix_keys_update" ON public.pix_keys FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "pix_keys_delete" ON public.pix_keys;
CREATE POLICY "pix_keys_delete" ON public.pix_keys FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ---------- user_tags ----------
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tags_select" ON public.user_tags;
CREATE POLICY "user_tags_select" ON public.user_tags FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_tags_insert" ON public.user_tags;
CREATE POLICY "user_tags_insert" ON public.user_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_tags_update" ON public.user_tags;
CREATE POLICY "user_tags_update" ON public.user_tags FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_tags_delete" ON public.user_tags;
CREATE POLICY "user_tags_delete" ON public.user_tags FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ---------- banks (catálogo global — só leitura) ----------
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banks_select_authenticated" ON public.banks;
CREATE POLICY "banks_select_authenticated" ON public.banks FOR SELECT
  TO authenticated
  USING (true);

-- Opcional: se precisar cadastrar bancos pelo painel no futuro, use service_role
-- ou crie policy de INSERT só para admin:
-- CREATE POLICY "banks_insert_admin" ON public.banks FOR INSERT
--   WITH CHECK (public.is_admin());

-- ---------- profiles (reforço para Admin + usuário ver o próprio) ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

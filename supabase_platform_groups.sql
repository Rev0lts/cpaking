-- ============================================================
-- CPAKing — Grupos de plataformas (multi-plataforma em 1 card)
-- Cole no SQL Editor do Supabase e execute (Run).
--
-- Plataformas que compartilham o mesmo group_id aparecem juntas
-- dentro de um único card no menu Plataformas. Cada uma continua
-- com suas próprias contas e cálculos.
-- ============================================================

ALTER TABLE public.platforms
ADD COLUMN IF NOT EXISTS group_id TEXT;

ALTER TABLE public.platforms
ADD COLUMN IF NOT EXISTS group_name TEXT;

COMMENT ON COLUMN public.platforms.group_id IS
  'Mesmo valor = plataformas exibidas juntas no mesmo card (grupo)';
COMMENT ON COLUMN public.platforms.group_name IS
  'Nome do grupo exibido no card';

-- Acelera a busca por grupo
CREATE INDEX IF NOT EXISTS idx_platforms_group_id
  ON public.platforms (group_id);

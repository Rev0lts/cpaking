-- ============================================================
-- CPAKing — Coluna active em platforms (Inativas)
-- Cole no SQL Editor do Supabase e execute (Run).
--
-- Não cria tabela nova: plataformas inativas continuam em
-- public.platforms com active = false.
-- ============================================================

ALTER TABLE public.platforms
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.platforms.active IS
  'false = plataforma inativa (vai para o menu Inativas e sai do dashboard)';

-- Garante que registros antigos fiquem ativos
UPDATE public.platforms
SET active = true
WHERE active IS NULL;

-- Meta do dia no perfil do usuário
-- Cole no SQL Editor do Supabase e execute (Run).

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_goal NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN public.profiles.daily_goal IS 'Meta de lucro diário em BRL (CPA Manager)';

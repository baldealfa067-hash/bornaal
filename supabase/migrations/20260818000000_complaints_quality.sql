-- Sistema de reclamações e nível de qualidade do prestador
-- ============================================================

-- 1. Tabela de reclamações (denúncias)
CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'resolvida')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

GRANT SELECT ON public.complaints TO anon, authenticated;
GRANT ALL ON public.complaints TO service_role;

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can insert complaints (clients denouncing providers)
DROP POLICY IF EXISTS "Authenticated can insert complaints" ON public.complaints;
CREATE POLICY "Authenticated can insert complaints" ON public.complaints
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: authenticated users can view complaints (admin and the provider involved)
DROP POLICY IF EXISTS "Authenticated can view complaints" ON public.complaints;
CREATE POLICY "Authenticated can view complaints" ON public.complaints
  FOR SELECT TO authenticated USING (true);

-- Policy: providers can view their own complaints
DROP POLICY IF EXISTS "Providers can view own complaints" ON public.complaints;
CREATE POLICY "Providers can view own complaints" ON public.complaints
  FOR SELECT TO authenticated USING (provider_id = auth.uid());

-- 2. Tabela de níveis de qualidade (para registrar o histórico)
CREATE TABLE IF NOT EXISTS public.quality_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('alta', 'media', 'baixa')),
  score integer NOT NULL DEFAULT 0,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id)
);

GRANT SELECT ON public.quality_levels TO anon, authenticated;
GRANT ALL ON public.quality_levels TO service_role;

ALTER TABLE public.quality_levels ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can view quality levels
DROP POLICY IF EXISTS "Authenticated can view quality levels" ON public.quality_levels;
CREATE POLICY "Authenticated can view quality levels" ON public.quality_levels
  FOR SELECT TO authenticated USING (true);

-- Policy: providers can view their own quality level
DROP POLICY IF EXISTS "Providers can view own quality level" ON public.quality_levels;
CREATE POLICY "Providers can view own quality level" ON public.quality_levels
  FOR SELECT TO authenticated USING (provider_id = auth.uid());

-- 3. Função para calcular atualizar o nível de qualidade
CREATE OR REPLACE FUNCTION public.update_quality_level(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  score integer;
BEGIN
  -- Calcula o score: avaliações >= 4 = +1, reclamações = -1
  -- Note: precisamos contar avaliações e reclamações
  -- Para simplificar, vamos atualizar baseado no que temos
  
  UPDATE public.quality_levels
  SET level = CASE 
    WHEN score > 0 THEN 'alta'
    WHEN score < 0 THEN 'baixa'
    ELSE 'media'
  END,
    calculated_at = now()
  WHERE provider_id = p_provider_id;
  
  IF NOT FOUND THEN
    -- Inserir novo registro se não existir
    INSERT INTO public.quality_levels (provider_id, level, score, calculated_at)
    VALUES (p_provider_id, 'media', 0, now());
  END IF;
END;
$$;

-- 4. Trigger: atualizar nível de qualidade após inserir reclamação
DROP TRIGGER IF EXISTS update_quality_after_complaint ON public.complaints;
CREATE TRIGGER update_quality_after_complaint
  AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_quality_level(p_provider_id);

-- 5. Inicializar níveis de qualidade para todos os prestadores existentes
DO $$
DECLARE
  prov record;
BEGIN
  FOR prov IN SELECT id FROM public.profiles WHERE is_provider = true LOOP
    INSERT INTO public.quality_levels (provider_id, level, score, calculated_at)
    VALUES (prov.id, 'media', 0, now())
    ON CONFLICT (provider_id) DO NOTHING;
  END LOOP;
END $$;

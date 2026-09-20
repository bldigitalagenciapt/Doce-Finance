-- ================================================================
-- COLE ESTE SQL COMPLETO NO SUPABASE SQL EDITOR E CLIQUE EM "RUN"
-- ================================================================

-- PASSO 1: Remove a coluna GENERATED ALWAYS AS e recria como coluna normal
ALTER TABLE public.recipes DROP COLUMN IF EXISTS total_cost;
ALTER TABLE public.recipes ADD COLUMN total_cost NUMERIC(12,4) NOT NULL DEFAULT 0;

-- PASSO 2: Preenche os valores existentes
UPDATE public.recipes
SET total_cost = ingredients_cost + extra_costs;

-- PASSO 3: Atualiza o trigger para recalcular total_cost automaticamente
CREATE OR REPLACE FUNCTION public.recalc_recipe_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.total_cost := NEW.ingredients_cost + NEW.extra_costs;
  NEW.suggested_price := CASE
    WHEN NEW.margin_percent < 100 AND NEW.margin_percent >= 0
      THEN NEW.total_cost / (1 - NEW.margin_percent / 100.0)
    ELSE 0
  END;
  RETURN NEW;
END;
$$;


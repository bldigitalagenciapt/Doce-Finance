-- ============================================================
-- ATELIER ANA — Script SQL Completo
-- Execute no Supabase SQL Editor (em ordem)
-- ============================================================

-- ─────────────────────────────────────────────
-- 0. EXTENSÕES
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. PROFILES (vinculado ao auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  business_name TEXT DEFAULT 'Meu Atelier',
  currency    TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'EUR')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: cria profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- 2. INGREDIENTS (Ingredientes)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ingredients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'Outros',
  unit                TEXT NOT NULL DEFAULT 'g'
                        CHECK (unit IN ('g','kg','ml','L','un','cx','pct')),
  quantity_purchased  NUMERIC(12,4) NOT NULL DEFAULT 0,  -- quantidade na embalagem
  cost_per_package    NUMERIC(12,4) NOT NULL DEFAULT 0,  -- custo da embalagem
  cost_per_unit       NUMERIC(12,6) GENERATED ALWAYS AS (
                        CASE WHEN quantity_purchased > 0
                          THEN cost_per_package / quantity_purchased
                          ELSE 0
                        END
                      ) STORED,
  stock_quantity      NUMERIC(12,4) NOT NULL DEFAULT 0,  -- estoque atual
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingredients_user_id ON public.ingredients(user_id);
CREATE INDEX idx_ingredients_category ON public.ingredients(category);

-- ─────────────────────────────────────────────
-- 3. RECIPES (Receitas)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recipes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'Bolo',
  description      TEXT,
  image_url        TEXT,
  yield_quantity   NUMERIC(12,4) NOT NULL DEFAULT 1,  -- rendimento
  yield_unit       TEXT NOT NULL DEFAULT 'un'
                     CHECK (yield_unit IN ('g','kg','ml','L','un','fatia','porção')),
  ingredients_cost NUMERIC(12,4) NOT NULL DEFAULT 0,  -- custo apenas ingredientes
  extra_costs      NUMERIC(12,4) NOT NULL DEFAULT 0,  -- embalagem, gás, etc.
  total_cost       NUMERIC(12,4) GENERATED ALWAYS AS (
                     ingredients_cost + extra_costs
                   ) STORED,
  margin_percent   NUMERIC(5,2) NOT NULL DEFAULT 30,  -- margem de lucro em %
  suggested_price  NUMERIC(12,4) GENERATED ALWAYS AS (
                     CASE WHEN (1 - (ingredients_cost + extra_costs) / NULLIF(ingredients_cost + extra_costs,0) * 0) > 0
                       THEN (ingredients_cost + extra_costs) / (1 - margin_percent / 100.0)
                       ELSE 0
                     END
                   ) STORED,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recalcular sugestão de preço via função (mais simples e correto)
ALTER TABLE public.recipes DROP COLUMN IF EXISTS suggested_price;
ALTER TABLE public.recipes ADD COLUMN suggested_price NUMERIC(12,4) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalc_recipe_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.suggested_price := CASE
    WHEN NEW.margin_percent < 100 AND NEW.margin_percent >= 0
      THEN (NEW.ingredients_cost + NEW.extra_costs) / (1 - NEW.margin_percent / 100.0)
    ELSE 0
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_recalc_price
  BEFORE INSERT OR UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.recalc_recipe_price();

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX idx_recipes_category ON public.recipes(category);

-- ─────────────────────────────────────────────
-- 4. RECIPE_INGREDIENTS (Pivô Receita ↔ Ingrediente)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id     UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity      NUMERIC(12,4) NOT NULL DEFAULT 0,  -- quantidade usada na receita
  unit          TEXT NOT NULL DEFAULT 'g',
  cost          NUMERIC(12,6) GENERATED ALWAYS AS (0) STORED,  -- será atualizado via trigger
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipe_id, ingredient_id)
);

-- Custo calculado = quantity * cost_per_unit do ingrediente
ALTER TABLE public.recipe_ingredients DROP COLUMN IF EXISTS cost;
ALTER TABLE public.recipe_ingredients ADD COLUMN cost NUMERIC(12,6) NOT NULL DEFAULT 0;

-- Trigger que recalcula custo ao salvar recipe_ingredient
CREATE OR REPLACE FUNCTION public.recalc_recipe_ingredient_cost()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cost_per_unit NUMERIC(12,6);
BEGIN
  SELECT cost_per_unit INTO v_cost_per_unit
    FROM public.ingredients WHERE id = NEW.ingredient_id;
  NEW.cost := NEW.quantity * COALESCE(v_cost_per_unit, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipe_ingredients_cost
  BEFORE INSERT OR UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.recalc_recipe_ingredient_cost();

-- Trigger que atualiza ingredients_cost na receita ao alterar recipe_ingredients
CREATE OR REPLACE FUNCTION public.update_recipe_ingredients_cost()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_recipe_id UUID;
  v_total     NUMERIC(12,4);
BEGIN
  v_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);
  SELECT COALESCE(SUM(cost), 0) INTO v_total
    FROM public.recipe_ingredients WHERE recipe_id = v_recipe_id;
  UPDATE public.recipes SET ingredients_cost = v_total WHERE id = v_recipe_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_recipe_cost_on_ingredient
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_recipe_ingredients_cost();

CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON public.recipe_ingredients(ingredient_id);

-- ─────────────────────────────────────────────
-- 5. CLIENTS (Clientes)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  notes        TEXT,
  total_spent  NUMERIC(12,4) NOT NULL DEFAULT 0,  -- atualizado via trigger
  orders_count INTEGER NOT NULL DEFAULT 0,         -- atualizado via trigger
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_clients_user_id ON public.clients(user_id);

-- ─────────────────────────────────────────────
-- 6. ORDERS (Pedidos / Orçamentos)
-- ─────────────────────────────────────────────
CREATE TYPE public.order_status AS ENUM (
  'orcamento',
  'confirmado',
  'em_producao',
  'pronto',
  'entregue',
  'cancelado'
);

CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  order_number    SERIAL,
  status          public.order_status NOT NULL DEFAULT 'orcamento',
  delivery_date   DATE,
  delivery_time   TIME,
  delivery_address TEXT,
  notes           TEXT,
  subtotal        NUMERIC(12,4) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,4) NOT NULL DEFAULT 0,
  total           NUMERIC(12,4) GENERATED ALWAYS AS (subtotal - discount) STORED,
  paid_amount     NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_client_id ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_delivery_date ON public.orders(delivery_date);

-- Trigger que atualiza total_spent e orders_count no client
CREATE OR REPLACE FUNCTION public.update_client_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_id UUID;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);
  IF v_client_id IS NOT NULL THEN
    UPDATE public.clients
    SET
      total_spent  = COALESCE((
        SELECT SUM(total) FROM public.orders
        WHERE client_id = v_client_id AND status NOT IN ('orcamento','cancelado')
      ), 0),
      orders_count = COALESCE((
        SELECT COUNT(*) FROM public.orders
        WHERE client_id = v_client_id AND status NOT IN ('orcamento','cancelado')
      ), 0)
    WHERE id = v_client_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_client_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_client_stats();

-- ─────────────────────────────────────────────
-- 7. ORDER_ITEMS (Pivô Pedido ↔ Receita/Produto)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recipe_id   UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,        -- snapshot do nome (caso receita seja deletada)
  quantity    NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,4) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(12,4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Trigger que recalcula subtotal do pedido ao alterar order_items
CREATE OR REPLACE FUNCTION public.update_order_subtotal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_order_id UUID;
  v_subtotal NUMERIC(12,4);
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
    FROM public.order_items WHERE order_id = v_order_id;
  UPDATE public.orders SET subtotal = v_subtotal WHERE id = v_order_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_order_subtotal
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_order_subtotal();

-- ─────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: owner access"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INGREDIENTS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients: owner access"
  ON public.ingredients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RECIPES
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes: owner access"
  ON public.recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RECIPE_INGREDIENTS
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_ingredients: owner access via recipe"
  ON public.recipe_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.user_id = auth.uid()
    )
  );

-- CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients: owner access"
  ON public.clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders: owner access"
  ON public.orders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ORDER_ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items: owner access via order"
  ON public.order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 9. STORAGE BUCKET (avatares e fotos de receitas)
-- ─────────────────────────────────────────────
-- Execute via Supabase Dashboard > Storage > New Bucket
-- Nome: "atelier-images", Public: false
-- Ou via SQL (requer extensão pg_storage):
-- SELECT storage.create_bucket('atelier-images', false);

-- ─────────────────────────────────────────────
-- FIM DO SCRIPT
-- ─────────────────────────────────────────────

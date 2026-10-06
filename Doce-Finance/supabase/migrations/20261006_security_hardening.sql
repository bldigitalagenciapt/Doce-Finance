-- ================================================================
-- MIGRATION: Security hardening (auditoria OWASP — 2026-10-06)
-- Cole no Supabase SQL Editor e execute UMA vez (idempotente).
--
-- Cobre:
--   C1  Colunas de cobrança de profiles somente-leitura para clientes
--   C2  Storage isolado por usuário + limites de MIME/tamanho
--   A2  Escrita condicionada a assinatura/trial ativo (has_active_access)
--   A3  cleanup_expired_trials sem exposição via RPC + search_path fixo
--   A4  Tabela de idempotência para webhooks Stripe
--   M1  share_token aleatório para orçamentos públicos
--   M2  FKs validadas por dono (sem referências entre inquilinos)
--   M3  Constraints de domínio (valores, tamanhos, formatos)
-- ================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- C1. PROFILES — policies separadas + proteção das colunas de cobrança
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: owner access" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Sem INSERT/DELETE para clientes: o trigger handle_new_user cria o perfil
-- e a exclusão acontece em cascata a partir de auth.users.

CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
       NEW.subscription_status    IS DISTINCT FROM OLD.subscription_status
    OR NEW.trial_starts_at        IS DISTINCT FROM OLD.trial_starts_at
    OR NEW.trial_ends_at          IS DISTINCT FROM OLD.trial_ends_at
    OR NEW.stripe_customer_id     IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.id                     IS DISTINCT FROM OLD.id
  ) THEN
    RAISE EXCEPTION 'Campos de cobrança são somente leitura' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_protect_billing ON public.profiles;
CREATE TRIGGER profiles_protect_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();

-- ────────────────────────────────────────────────────────────────
-- A2. Função de verificação de acesso (trial válido / assinatura ativa)
--     past_due mantém acesso (período de retentativa do Stripe).
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_active_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.subscription_status IN ('active', 'past_due')
        OR (p.subscription_status = 'trialing' AND p.trial_ends_at > now())
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_active_access() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_active_access() TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- A2 + M2. Policies das tabelas de negócio
--   SELECT/DELETE: só dono (leitura e exclusão sempre permitidas — LGPD/RGPD)
--   INSERT/UPDATE: dono + acesso ativo + FKs pertencentes ao mesmo dono
-- ────────────────────────────────────────────────────────────────

-- INGREDIENTS
DROP POLICY IF EXISTS "ingredients: owner access" ON public.ingredients;
DROP POLICY IF EXISTS ingredients_select ON public.ingredients;
DROP POLICY IF EXISTS ingredients_insert ON public.ingredients;
DROP POLICY IF EXISTS ingredients_update ON public.ingredients;
DROP POLICY IF EXISTS ingredients_delete ON public.ingredients;
CREATE POLICY ingredients_select ON public.ingredients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY ingredients_insert ON public.ingredients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());
CREATE POLICY ingredients_update ON public.ingredients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());
CREATE POLICY ingredients_delete ON public.ingredients FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RECIPES
DROP POLICY IF EXISTS "recipes: owner access" ON public.recipes;
DROP POLICY IF EXISTS recipes_select ON public.recipes;
DROP POLICY IF EXISTS recipes_insert ON public.recipes;
DROP POLICY IF EXISTS recipes_update ON public.recipes;
DROP POLICY IF EXISTS recipes_delete ON public.recipes;
CREATE POLICY recipes_select ON public.recipes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY recipes_insert ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());
CREATE POLICY recipes_update ON public.recipes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());
CREATE POLICY recipes_delete ON public.recipes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RECIPE_INGREDIENTS (receita E ingrediente devem ser do usuário)
DROP POLICY IF EXISTS "recipe_ingredients: owner access via recipe" ON public.recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_select ON public.recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_insert ON public.recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_update ON public.recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_delete ON public.recipe_ingredients;
CREATE POLICY recipe_ingredients_select ON public.recipe_ingredients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY recipe_ingredients_insert ON public.recipe_ingredients FOR INSERT TO authenticated
  WITH CHECK (
    public.has_active_access()
    AND EXISTS (SELECT 1 FROM public.recipes r     WHERE r.id = recipe_id     AND r.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.ingredients i WHERE i.id = ingredient_id AND i.user_id = auth.uid())
  );
CREATE POLICY recipe_ingredients_update ON public.recipe_ingredients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (
    public.has_active_access()
    AND EXISTS (SELECT 1 FROM public.recipes r     WHERE r.id = recipe_id     AND r.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.ingredients i WHERE i.id = ingredient_id AND i.user_id = auth.uid())
  );
CREATE POLICY recipe_ingredients_delete ON public.recipe_ingredients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- CLIENTS
DROP POLICY IF EXISTS "clients: owner access" ON public.clients;
DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
DROP POLICY IF EXISTS clients_delete ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());
CREATE POLICY clients_update ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());
CREATE POLICY clients_delete ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ORDERS (client_id deve pertencer ao usuário)
DROP POLICY IF EXISTS "orders: owner access" ON public.orders;
DROP POLICY IF EXISTS orders_select ON public.orders;
DROP POLICY IF EXISTS orders_insert ON public.orders;
DROP POLICY IF EXISTS orders_update ON public.orders;
DROP POLICY IF EXISTS orders_delete ON public.orders;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND public.has_active_access()
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()))
  );
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND public.has_active_access()
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()))
  );
CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ORDER_ITEMS (pedido e receita devem pertencer ao usuário)
DROP POLICY IF EXISTS "order_items: owner access via order" ON public.order_items;
DROP POLICY IF EXISTS order_items_select ON public.order_items;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_update ON public.order_items;
DROP POLICY IF EXISTS order_items_delete ON public.order_items;
CREATE POLICY order_items_select ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY order_items_insert ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    public.has_active_access()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    AND (recipe_id IS NULL OR EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  );
CREATE POLICY order_items_update ON public.order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()))
  WITH CHECK (
    public.has_active_access()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    AND (recipe_id IS NULL OR EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  );
CREATE POLICY order_items_delete ON public.order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────────
-- C2. STORAGE — cada usuário só mexe na própria pasta "<uid>/..."
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authed Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authed Delete" ON storage.objects;
DROP POLICY IF EXISTS atelier_images_insert_own ON storage.objects;
DROP POLICY IF EXISTS atelier_images_update_own ON storage.objects;
DROP POLICY IF EXISTS atelier_images_delete_own ON storage.objects;

CREATE POLICY atelier_images_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'atelier-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY atelier_images_update_own ON storage.objects FOR UPDATE TO authenticated
  USING      (bucket_id = 'atelier-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'atelier-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY atelier_images_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'atelier-images' AND (storage.foldername(name))[1] = auth.uid()::text);

UPDATE storage.buckets
   SET file_size_limit    = 2097152,  -- 2 MB
       allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
 WHERE id = 'atelier-images';

-- ────────────────────────────────────────────────────────────────
-- A3. Limpeza de trials: search_path fixo, nunca apaga quem tem Stripe,
--     e não pode ser chamada via API (/rest/v1/rpc).
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_trials()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM auth.users u
   USING public.profiles p
   WHERE p.id = u.id
     AND p.subscription_status IN ('trialing', 'expired')
     AND p.stripe_customer_id IS NULL
     AND p.stripe_subscription_id IS NULL
     AND p.trial_ends_at < now() - interval '30 days';
END $$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_trials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_billing_columns() FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- A4. Idempotência de webhooks Stripe (acesso só via service_role)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;  -- sem policies = sem acesso para clientes
REVOKE ALL ON public.stripe_events FROM anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- M1. Token público de compartilhamento (não é mais o id do pedido)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS share_token TEXT;

UPDATE public.orders
   SET share_token = encode(extensions.gen_random_bytes(24), 'hex')
 WHERE share_token IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN share_token SET DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  ALTER COLUMN share_token SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_share_token_key') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_share_token_key UNIQUE (share_token);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_share_token_format') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_share_token_format
      CHECK (share_token ~ '^[0-9a-f]{48}$');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- M3. Constraints de domínio (NOT VALID: não quebra dados legados;
--     valide depois com ALTER TABLE ... VALIDATE CONSTRAINT ...)
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('ingredients', 'ingredients_nonneg',
       'CHECK (quantity_purchased >= 0 AND cost_per_package >= 0 AND stock_quantity >= 0)'),
    ('ingredients', 'ingredients_text_len',
       'CHECK (char_length(name) BETWEEN 1 AND 120 AND char_length(category) <= 60)'),
    ('recipes', 'recipes_values',
       'CHECK (margin_percent BETWEEN 0 AND 100 AND yield_quantity > 0 AND extra_costs >= 0 AND ingredients_cost >= 0)'),
    ('recipes', 'recipes_text_len',
       'CHECK (char_length(name) BETWEEN 1 AND 120 AND char_length(coalesce(description, '''')) <= 2000)'),
    ('recipe_ingredients', 'recipe_ingredients_values',
       'CHECK (quantity >= 0 AND char_length(categoria) <= 60)'),
    ('clients', 'clients_text_len',
       'CHECK (char_length(name) BETWEEN 1 AND 120 AND char_length(coalesce(phone, '''')) <= 30 AND char_length(coalesce(email, '''')) <= 254 AND char_length(coalesce(address, '''')) <= 300 AND char_length(coalesce(notes, '''')) <= 2000)'),
    ('orders', 'orders_amounts',
       'CHECK (discount >= 0 AND delivery_fee >= 0 AND paid_amount >= 0)'),
    ('orders', 'orders_text_len',
       'CHECK (char_length(coalesce(notes, '''')) <= 2000 AND char_length(coalesce(delivery_address, '''')) <= 300)'),
    ('order_items', 'order_items_values',
       'CHECK (quantity > 0 AND unit_price >= 0 AND char_length(name) BETWEEN 1 AND 200 AND char_length(coalesce(notes, '''')) <= 500)'),
    ('profiles', 'profiles_brand_color',
       'CHECK (brand_color IS NULL OR brand_color ~ ''^#[0-9A-Fa-f]{6}$'')'),
    ('profiles', 'profiles_logo_url',
       'CHECK (logo_url IS NULL OR logo_url ~ ''^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/atelier-images/'')'),
    ('profiles', 'profiles_text_len',
       'CHECK (char_length(coalesce(business_name, '''')) <= 120 AND char_length(coalesce(full_name, '''')) <= 120 AND char_length(coalesce(payment_instructions, '''')) <= 1000 AND char_length(coalesce(pix_key, '''')) <= 140 AND char_length(coalesce(mbway_phone, '''')) <= 30 AND char_length(coalesce(phone, '''')) <= 30 AND char_length(coalesce(email_contact, '''')) <= 254 AND char_length(coalesce(address, '''')) <= 300 AND char_length(coalesce(business_hours, '''')) <= 200)'),
    ('profiles', 'profiles_prefs',
       'CHECK ((default_margin_percent IS NULL OR default_margin_percent BETWEEN 0 AND 99) AND (quote_validity_days IS NULL OR quote_validity_days BETWEEN 1 AND 365))')
  ) AS t(tbl, name, def)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s NOT VALID', c.tbl, c.name, c.def);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ================================================================
-- (Opcional) Depois de corrigir dados legados, valide as constraints:
--   ALTER TABLE public.orders VALIDATE CONSTRAINT orders_amounts;
--   ... (repita para as demais)
-- ================================================================

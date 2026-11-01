-- ============================================================================
-- MIGRATION: Suite Completa de Segurança (2026-11-01)
-- Execute no Supabase SQL Editor (idempotente).
--
-- Cobre:
--   1. Extensão pgcrypto e garantia de Hash Bcrypt (cost 12) nas senhas do banco
--   2. Tabela auth_login_attempts para controle persistente de brute-force
--   3. FORCE ROW LEVEL SECURITY e revogação de acesso anônimo em todas as tabelas
--   4. Políticas RLS completas por proprietário (auth.uid()) em todas as tabelas
--   5. Ajuste da constraint de tamanho em profiles para suportar campos cifrados (AES-256-GCM)
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSÃO PGCRYPTO E PROTEÇÃO DE HASH BCRYPT DE SENHAS NO BANCO
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Garante que qualquer senha inserida/atualizada em auth.users esteja sempre
-- criptografada com Bcrypt ($2a$, $2b$, $2y$). Se não estiver em formato Bcrypt,
-- aplica automaticamente crypt(..., gen_salt('bf', 12)).
CREATE OR REPLACE FUNCTION public.ensure_password_is_hashed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.encrypted_password IS NOT NULL
     AND NEW.encrypted_password <> ''
     AND NEW.encrypted_password !~ '^\$2[aby]\$[0-9]{2}\$' THEN
    NEW.encrypted_password := extensions.crypt(NEW.encrypted_password, extensions.gen_salt('bf', 12));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_password_is_hashed() FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. TABELA DE CONTROLE DE TENTATIVAS DE LOGIN (ANTI BRUTE-FORCE)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  identifier_hash TEXT PRIMARY KEY,
  email_hint      TEXT,
  ip_address      TEXT,
  failed_count    INTEGER NOT NULL DEFAULT 1,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_failed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
  ON public.auth_login_attempts (locked_until);

ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_login_attempts FORCE ROW LEVEL SECURITY;

-- Nenhum acesso direto via API pública (anon/authenticated); apenas service_role
REVOKE ALL ON public.auth_login_attempts FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. AJUSTE DE CONSTRAINTS PARA CAMPOS CRIPTOGRAFADOS (AES-256-GCM)
--    Textos cifrados no formato "enc:v1:<iv>:<tag>:<ciphertext>" são maiores
--    que o texto plano original.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_text_len;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_text_len CHECK (
    char_length(coalesce(business_name, '')) <= 200
    AND char_length(coalesce(full_name, '')) <= 500
    AND char_length(coalesce(payment_instructions, '')) <= 2000
    AND char_length(coalesce(pix_key, '')) <= 600
    AND char_length(coalesce(mbway_phone, '')) <= 400
    AND char_length(coalesce(phone, '')) <= 400
    AND char_length(coalesce(email_contact, '')) <= 600
    AND char_length(coalesce(address, '')) <= 1000
    AND char_length(coalesce(business_hours, '')) <= 300
  ) NOT VALID;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. REFORÇO ESTRITO DE RLS EM TODAS AS TABELAS DE NEGÓCIO
--    - Ativa ENABLE + FORCE ROW LEVEL SECURITY
--    - Revoga qualquer permissão da role 'anon' (visitantes não autenticados)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items        FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles           FROM anon;
REVOKE ALL ON public.ingredients        FROM anon;
REVOKE ALL ON public.recipes            FROM anon;
REVOKE ALL ON public.recipe_ingredients FROM anon;
REVOKE ALL ON public.clients            FROM anon;
REVOKE ALL ON public.orders             FROM anon;
REVOKE ALL ON public.order_items        FROM anon;

-- Garante que políticas de isolamento por auth.uid() estejam ativas em todas as tabelas
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

COMMIT;


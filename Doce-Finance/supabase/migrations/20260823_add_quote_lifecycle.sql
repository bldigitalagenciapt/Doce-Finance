-- ============================================================
-- ATELIER ANA — Ciclo de vida do orçamento (quote lifecycle)
-- Execute no Supabase SQL Editor.
-- Idempotente: pode ser executado várias vezes sem erro.
-- ============================================================

-- 1) Enum public.quote_state
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_state') THEN
    CREATE TYPE public.quote_state AS ENUM (
      'rascunho',
      'enviado',
      'visualizado',
      'aceite',
      'recusado',
      'expirado'
    );
  END IF;
END$$;

-- 2) Colunas de rastreio na tabela orders (backward-compatible)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS quote_state public.quote_state NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS quote_valid_until DATE,
  ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_responded_at TIMESTAMPTZ;

-- 3) Índice para filtros por estado do orçamento
CREATE INDEX IF NOT EXISTS idx_orders_quote_state ON public.orders (quote_state);

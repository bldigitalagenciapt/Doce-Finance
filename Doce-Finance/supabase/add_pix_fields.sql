-- ============================================================
-- ATELIER ANA — Campos de pagamento (Pix / Mbway)
-- Execute no Supabase SQL Editor
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf','cnpj','email','telefone','aleatoria')),
  ADD COLUMN IF NOT EXISTS mbway_phone TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Adiciona novos campos de configuração ao perfil do usuário
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS email_contact    text,
  ADD COLUMN IF NOT EXISTS address          text,
  ADD COLUMN IF NOT EXISTS business_hours   text,
  ADD COLUMN IF NOT EXISTS default_margin_percent integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS quote_validity_days    integer DEFAULT 7;

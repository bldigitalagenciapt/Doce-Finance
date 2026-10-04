-- Update profiles table with subscription and trial fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'canceled', 'expired'
ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 days'),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS currency_preference TEXT DEFAULT 'EUR';

-- Ensure cascading deletes for user data are set up (already covered by auth.users reference in schema, but we can verify)
-- In schema.sql, recipes, ingredients, clients, orders already have:
-- user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE

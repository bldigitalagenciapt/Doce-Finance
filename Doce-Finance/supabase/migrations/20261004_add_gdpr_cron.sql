-- Ativa a extensão pg_cron se não estiver ativa
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Função para limpar contas expiradas (30 dias após o trial)
CREATE OR REPLACE FUNCTION public.cleanup_expired_trials()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT id
    FROM public.profiles
    WHERE subscription_status IN ('trialing', 'expired')
      AND trial_ends_at < (NOW() - INTERVAL '30 days')
  LOOP
    -- A exclusão em auth.users cascateará para public.profiles, recipes, etc.
    DELETE FROM auth.users WHERE id = v_user_id;
  END LOOP;
END;
$$;

-- Agendar o cron para rodar diariamente à meia-noite (00:00)
-- OBS: O id da job 'cleanup_expired_trials_job' garantirá que só exista um.
SELECT cron.schedule(
  'cleanup_expired_trials_job',
  '0 0 * * *',
  'SELECT public.cleanup_expired_trials();'
);

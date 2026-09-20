-- ================================================================
-- MIGRATION: Fix orders.total to include delivery_fee
-- Problema: orders.total era GENERATED ALWAYS AS (subtotal - discount)
-- ignorando a taxa de entrega (delivery_fee), que ficava fora do total.
--
-- Solucao: Converter para coluna normal gerenciada por trigger,
-- incluindo delivery_fee no calculo.
-- ================================================================

-- PASSO 1: Remove coluna GENERATED ALWAYS AS e recria como normal
ALTER TABLE public.orders DROP COLUMN IF EXISTS total;
ALTER TABLE public.orders ADD COLUMN total NUMERIC(12,4) NOT NULL DEFAULT 0;

-- PASSO 2: Atualiza registros existentes com o calculo correto
UPDATE public.orders
SET total = COALESCE(subtotal, 0) + COALESCE(delivery_fee, 0) - COALESCE(discount, 0);

-- PASSO 3: Cria trigger para manter total atualizado automaticamente
CREATE OR REPLACE FUNCTION public.recalc_order_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.total := COALESCE(NEW.subtotal, 0)
             + COALESCE(NEW.delivery_fee, 0)
             - COALESCE(NEW.discount, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_recalc_total ON public.orders;
CREATE TRIGGER orders_recalc_total
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.recalc_order_total();

-- Nota: o trigger sync_order_subtotal ja existe e atualiza subtotal
-- automaticamente quando order_items sao alterados. Este novo trigger
-- garante que total = subtotal + delivery_fee - discount.

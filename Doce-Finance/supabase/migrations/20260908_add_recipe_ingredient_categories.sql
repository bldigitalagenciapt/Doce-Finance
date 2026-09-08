-- Adiciona a coluna 'categoria' na tabela pivô 'recipe_ingredients'
ALTER TABLE public.recipe_ingredients 
ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'Geral';

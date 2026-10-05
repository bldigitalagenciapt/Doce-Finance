-- Remove a restrição única antiga que impedia o mesmo ingrediente em etapas (categorias) diferentes
ALTER TABLE public.recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_recipe_id_ingredient_id_key;

-- Adiciona a nova restrição única que permite o mesmo ingrediente, desde que em categorias (etapas) diferentes
ALTER TABLE public.recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_id_ingredient_id_categoria_key UNIQUE (recipe_id, ingredient_id, categoria);

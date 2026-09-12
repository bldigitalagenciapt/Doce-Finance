import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* ─── Dados do seed ──────────────────────────────────────────────────────── */

const SEED_INGREDIENTS = [
  { name: 'Leite Condensado',  category: 'Laticínios',  unit: 'g',  quantity_purchased: 395,  cost_per_package: 0 },
  { name: 'Creme de Leite',    category: 'Laticínios',  unit: 'g',  quantity_purchased: 200,  cost_per_package: 0 },
  { name: 'Farinha de Trigo',  category: 'Farinhas',    unit: 'g',  quantity_purchased: 1000, cost_per_package: 0 },
  { name: 'Açúcar Refinado',   category: 'Açúcares',    unit: 'g',  quantity_purchased: 1000, cost_per_package: 0 },
  { name: 'Manteiga sem Sal',  category: 'Gorduras',    unit: 'g',  quantity_purchased: 200,  cost_per_package: 0 },
  { name: 'Ovos',              category: 'Outros',      unit: 'un', quantity_purchased: 12,   cost_per_package: 0 },
  { name: 'Cacau em Pó 50%',   category: 'Chocolates',  unit: 'g',  quantity_purchased: 500,  cost_per_package: 0 },
  { name: 'Embalagem / Caixa', category: 'Embalagens',  unit: 'un', quantity_purchased: 1,    cost_per_package: 0 },
] as const

export async function POST() {
  try {
    const supabaseUser = createClient()
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { count } = await admin
      .from('ingredients')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_seed', true)

    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const ingredientsPayload = SEED_INGREDIENTS.map((ing) => ({
      user_id: user.id,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      quantity_purchased: ing.quantity_purchased,
      cost_per_package: 0,
      cost_per_unit: 0,
      stock_quantity: 0,
      is_seed: true,
    }))

    const { data: insertedIngredients, error: ingErr } = await admin
      .from('ingredients')
      .insert(ingredientsPayload)
      .select('id, name')

    if (ingErr) throw ingErr

    const ingByName = Object.fromEntries(
      (insertedIngredients ?? []).map((i: { id: string; name: string }) => [i.name, i.id])
    )

    const { data: recipe, error: recipeErr } = await admin
      .from('recipes')
      .insert({
        user_id: user.id,
        name: 'Brigadeiro Gourmet Tradicional',
        category: 'Doce',
        description: 'Receita modelo criada automaticamente. Edite os custos dos ingredientes para calcular o preço correto.',
        yield_quantity: 25,
        yield_unit: 'un',
        extra_costs: 0,
        margin_percent: 100,
        ingredients_cost: 0,
        total_cost: 0,
        suggested_price: 0,
        is_active: true,
      })
      .select('id')
      .single()

    if (recipeErr) throw recipeErr

    const recipeIngredients = [
      { name: 'Leite Condensado', quantity: 395 },
      { name: 'Creme de Leite',   quantity: 100 },
      { name: 'Manteiga sem Sal', quantity: 20  },
      { name: 'Cacau em Pó 50%',  quantity: 30  },
    ]

    const riPayload = recipeIngredients
      .filter((ri) => ingByName[ri.name])
      .map((ri) => ({
        recipe_id: recipe.id,
        ingredient_id: ingByName[ri.name],
        quantity: ri.quantity,
        unit: 'g',
        cost: 0,
        categoria: 'Preparo',
      }))

    if (riPayload.length > 0) {
      const { error: riErr } = await admin.from('recipe_ingredients').insert(riPayload)
      if (riErr) throw riErr
    }

    return NextResponse.json({ ok: true, skipped: false })
  } catch (err: any) {
    console.error('[seed] Erro:', err)
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 })
  }
}

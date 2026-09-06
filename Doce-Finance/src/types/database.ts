export type Currency = 'BRL' | 'EUR'

export type OrderStatus =
  | 'orcamento'
  | 'confirmado'
  | 'em_producao'
  | 'pronto'
  | 'entregue'
  | 'cancelado'

export type IngredientUnit = 'g' | 'kg' | 'ml' | 'L' | 'un' | 'cx' | 'pct'
export type YieldUnit = 'g' | 'kg' | 'ml' | 'L' | 'un' | 'fatia' | 'porção'

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'

export type QuoteState =
  | 'rascunho'
  | 'enviado'
  | 'visualizado'
  | 'aceite'
  | 'recusado'
  | 'expirado'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  business_name: string | null
  currency: Currency
  pix_key: string | null
  pix_key_type: PixKeyType | null
  mbway_phone: string | null
  payment_instructions: string | null
  created_at: string
  updated_at: string
}

export interface Ingredient {
  id: string
  user_id: string
  name: string
  category: string
  unit: IngredientUnit
  quantity_purchased: number
  cost_per_package: number
  cost_per_unit: number
  stock_quantity: number
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  yield_quantity: number
  yield_unit: YieldUnit
  ingredients_cost: number
  extra_costs: number
  total_cost: number
  margin_percent: number
  suggested_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: number
  unit: string
  cost: number
  created_at: string
  ingredient?: Ingredient
}

export interface Client {
  id: string
  user_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  total_spent: number
  orders_count: number
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  client_id: string | null
  order_number: number
  status: OrderStatus
  delivery_date: string | null
  delivery_time: string | null
  delivery_address: string | null
  notes: string | null
  subtotal: number
  discount: number
  total: number
  paid_amount: number
  // Ciclo de vida do orçamento (opcional/anulável — seguro antes da migração)
  quote_state?: QuoteState | null
  quote_valid_until?: string | null
  quote_sent_at?: string | null
  quote_viewed_at?: string | null
  quote_responded_at?: string | null
  created_at: string
  updated_at: string
  client?: Client | null
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  recipe_id: string | null
  name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string | null
  created_at: string
}

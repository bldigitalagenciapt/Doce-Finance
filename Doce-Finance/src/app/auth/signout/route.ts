import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSafeOrigin } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const origin = getSafeOrigin(req.headers.get('origin') || req.nextUrl.origin)
  return NextResponse.redirect(new URL('/login', origin), { status: 303 })
}


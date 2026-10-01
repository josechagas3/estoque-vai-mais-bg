import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const normalizeCategory = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR')

function adminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuração privada do Supabase indisponível.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function authorizeAdmin() {
  const cookieStore = await cookies()
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user }, error } = await sessionClient.auth.getUser()
  if (error || !user) return { response: NextResponse.json({ error: 'Sessão não autenticada.' }, { status: 401 }) }
  const supabase = adminClient()
  const { data: profile, error: profileError } = await supabase.from('stock_users').select('role').eq('auth_user_id', user.id).eq('active', true).maybeSingle()
  if (profileError) return { response: NextResponse.json({ error: 'Não foi possível validar as permissões.' }, { status: 500 }) }
  if (profile?.role !== 'admin') return { response: NextResponse.json({ error: 'Acesso permitido somente para administradores.' }, { status: 403 }) }
  return { supabase }
}

export async function PATCH(request: Request) {
  const authorization = await authorizeAdmin()
  if ('response' in authorization) return authorization.response
  const body = await request.json() as { oldCategory?: string; newCategory?: string }
  const oldCategory = body.oldCategory?.trim()
  const newCategory = body.newCategory?.replace(/\s+/g, ' ').trim()
  if (!oldCategory || !newCategory) return NextResponse.json({ error: 'Informe a categoria atual e o novo nome.' }, { status: 400 })
  if (normalizeCategory(oldCategory) === normalizeCategory(newCategory)) return NextResponse.json({ error: 'O novo nome precisa ser diferente do atual.' }, { status: 400 })

  const { data: products, error: readError } = await authorization.supabase.from('stock_products').select('id,category')
  if (readError) return NextResponse.json({ error: 'Não foi possível consultar os produtos.' }, { status: 500 })
  const affected = (products ?? []).filter((product) => product.category === oldCategory)
  const duplicate = (products ?? []).some((product) => product.category !== oldCategory && normalizeCategory(product.category) === normalizeCategory(newCategory))
  if (duplicate) return NextResponse.json({ error: 'Já existe uma categoria com esse nome.' }, { status: 409 })
  if (!affected.length) return NextResponse.json({ error: 'A categoria não possui produtos vinculados.' }, { status: 404 })

  const { error: updateError } = await authorization.supabase.from('stock_products').update({ category: newCategory }).eq('category', oldCategory)
  if (updateError) return NextResponse.json({ error: `Não foi possível alterar a categoria. Nenhum produto foi confirmado como atualizado. ${updateError.message}` }, { status: 500 })
  return NextResponse.json({ oldCategory, newCategory, updatedCount: affected.length })
}

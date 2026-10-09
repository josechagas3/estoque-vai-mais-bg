import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function serviceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuração privada do Supabase indisponível.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function authorizeAdmin(): Promise<ReturnType<typeof serviceClient> | NextResponse> {
  const cookieStore = await cookies()
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user }, error: sessionError } = await sessionClient.auth.getUser()
  if (sessionError || !user) return NextResponse.json({ error: 'Sessão não autenticada.' }, { status: 401 })

  const supabase = serviceClient()
  const { data: profile, error: profileError } = await supabase.from('stock_users').select('role').eq('auth_user_id', user.id).eq('active', true).maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Não foi possível validar as permissões.' }, { status: 500 })
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso permitido somente para administradores.' }, { status: 403 })
  return supabase
}

function validateId(id: string) {
  return UUID_PATTERN.test(id)
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!validateId(id)) return NextResponse.json({ error: 'Produto inválido.' }, { status: 400 })
  const authorized = await authorizeAdmin()
  if (authorized instanceof NextResponse) return authorized

  const { data: product, error: productError } = await authorized.from('stock_products').select('id,name').eq('id', id).maybeSingle()
  if (productError) return NextResponse.json({ error: `Não foi possível consultar o produto: ${productError.message}` }, { status: 500 })
  if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })

  const [{ count: movementCount, error: movementError }, { count: orderItemCount, error: orderItemError }] = await Promise.all([
    authorized.from('stock_movements').select('id', { count: 'exact', head: true }).eq('product_id', id),
    authorized.from('itens_pedido_compra').select('id', { count: 'exact', head: true }).eq('produto_id', id),
  ])
  if (movementError || orderItemError) return NextResponse.json({ error: 'Não foi possível consultar os registros vinculados.' }, { status: 500 })
  return NextResponse.json({ product: { id: product.id, name: product.name }, movementCount: movementCount ?? 0, orderItemCount: orderItemCount ?? 0 })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!validateId(id)) return NextResponse.json({ error: 'Produto inválido.' }, { status: 400 })
  const authorized = await authorizeAdmin()
  if (authorized instanceof NextResponse) return authorized

  const { data: product, error: productError } = await authorized.from('stock_products').select('id,name').eq('id', id).maybeSingle()
  if (productError) return NextResponse.json({ error: `Não foi possível consultar o produto: ${productError.message}` }, { status: 500 })
  if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })

  const { error: orderItemsError } = await authorized.from('itens_pedido_compra').delete().eq('produto_id', id)
  if (orderItemsError) return NextResponse.json({ error: `Não foi possível remover os itens dos pedidos: ${orderItemsError.message}` }, { status: 500 })
  const { error: movementsError } = await authorized.from('stock_movements').delete().eq('product_id', id)
  if (movementsError) return NextResponse.json({ error: `Não foi possível remover as movimentações: ${movementsError.message}` }, { status: 500 })
  const { data: deletedProducts, error: deleteError } = await authorized.from('stock_products').delete().eq('id', id).select('id')
  if (deleteError) return NextResponse.json({ error: `Não foi possível remover o produto: ${deleteError.message}` }, { status: 500 })
  if (!deletedProducts?.length) return NextResponse.json({ error: 'Produto não encontrado ou já removido.' }, { status: 404 })
  return NextResponse.json({ ok: true, id })
}

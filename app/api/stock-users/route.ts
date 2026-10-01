import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const emailFor = (username: string) => `${username.trim().toLowerCase()}@vaimaisbg.com`

const admin = () => {
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
  const { data: { user }, error: sessionError } = await sessionClient.auth.getUser()
  if (sessionError || !user) return NextResponse.json({ error: 'Sessão não autenticada.' }, { status: 401 })

  const serviceClient = admin()
  const { data: profile, error: profileError } = await serviceClient.from('stock_users').select('role').eq('auth_user_id', user.id).eq('active', true).maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Não foi possível validar as permissões.' }, { status: 500 })
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso permitido somente para administradores.' }, { status: 403 })
  return serviceClient
}

export async function GET() {
  const authorized = await authorizeAdmin()
  if (authorized instanceof NextResponse) return authorized
  const supabase = authorized
  const { data: users, error } = await supabase.from('stock_users').select('id,name,username,active,auth_user_id,role').eq('active', true).order('name')
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os usuários.' }, { status: 500 })
  return NextResponse.json(users ?? [])
}

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; username?: string; password?: string; role?: 'admin' | 'operador' | 'consulta' }
  const name = body.name?.trim(); const username = body.username?.trim().toLowerCase(); const password = body.password ?? ''
  if (!name || !username || password.length < 6 || !/^[a-z0-9._-]+$/.test(username)) return NextResponse.json({ error: 'Preencha nome, usuário válido e senha com pelo menos 6 caracteres.' }, { status: 400 })
  const authorized = await authorizeAdmin()
  if (authorized instanceof NextResponse) return authorized
  const supabase = authorized
  const auth = await supabase.auth.admin.createUser({ email: emailFor(username), password, email_confirm: true, user_metadata: { display_name: name, username } })
  if (auth.error || !auth.data.user) return NextResponse.json({ error: `Supabase Auth: ${auth.error?.message ?? 'Usuário não retornado.'}` }, { status: 400 })
  const { data, error } = await supabase.from('stock_users').insert({ id: crypto.randomUUID(), auth_user_id: auth.data.user.id, name, username, active: true, role: body.role ?? 'operador' }).select('id,name,username,active,auth_user_id,role').single()
  if (error) { await supabase.auth.admin.deleteUser(auth.data.user.id); return NextResponse.json({ error: `Supabase Database: ${error.message} (${error.code ?? 'sem código'})` }, { status: 409 }) }
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const body = await request.json() as { id?: string }
  if (!body.id) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })
  const authorized = await authorizeAdmin()
  if (authorized instanceof NextResponse) return authorized
  const supabase = authorized
  const { data: user, error: lookupError } = await supabase.from('stock_users').select('id,auth_user_id').eq('id', body.id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: `Supabase Database: ${lookupError.message} (${lookupError.code ?? 'sem código'})` }, { status: 500 })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  const { count, error: countError } = await supabase.from('stock_users').select('id', { count: 'exact', head: true }).eq('active', true)
  if (countError) return NextResponse.json({ error: `Supabase Database: ${countError.message} (${countError.code ?? 'sem código'})` }, { status: 500 })
  if ((count ?? 0) <= 1) return NextResponse.json({ error: 'Não é possível excluir o último usuário do sistema.' }, { status: 409 })
  if (user.auth_user_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(user.auth_user_id)
    if (authError) return NextResponse.json({ error: `Supabase Auth: ${authError.message}` }, { status: 400 })
  }
  const { error } = await supabase.from('stock_users').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: `Supabase Database: ${error.message} (${error.code ?? 'sem código'})` }, { status: 500 })
  return NextResponse.json({ ok: true, id: body.id })
}

export async function PATCH(request: Request) {
  const body = await request.json() as { id?: string; name?: string; username?: string; password?: string; auth_user_id?: string; role?: 'admin' | 'operador' | 'consulta' }
  if (!body.id || !body.name?.trim() || !body.username?.trim()) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const authorized = await authorizeAdmin()
  if (authorized instanceof NextResponse) return authorized
  const supabase = authorized; const username = body.username.trim().toLowerCase()
  if (body.role && body.role !== 'admin') {
    const { data: currentUser, error: currentUserError } = await supabase.from('stock_users').select('role,active').eq('id', body.id).maybeSingle()
    if (currentUserError) return NextResponse.json({ error: 'Não foi possível validar o perfil atual.' }, { status: 500 })
    if (currentUser?.role === 'admin' && currentUser.active) {
      const { count, error: adminCountError } = await supabase.from('stock_users').select('id', { count: 'exact', head: true }).eq('active', true).eq('role', 'admin')
      if (adminCountError) return NextResponse.json({ error: 'Não foi possível validar os administradores ativos.' }, { status: 500 })
      if ((adminCount ?? 0) <= 1) return NextResponse.json({ error: 'É necessário manter pelo menos um administrador ativo.' }, { status: 409 })
    }
  }
  const authUpdate = await supabase.auth.admin.updateUserById(body.auth_user_id!, { ...(body.password ? { password: body.password } : {}), email: emailFor(username), user_metadata: { display_name: body.name.trim(), username } })
  if (authUpdate.error) return NextResponse.json({ error: 'Não foi possível atualizar o usuário.' }, { status: 400 })
  const { data, error } = await supabase.from('stock_users').update({ name: body.name.trim(), username, ...(body.role ? { role: body.role } : {}) }).eq('id', body.id).select('id,name,username,active,auth_user_id,role').single()
  if (error) return NextResponse.json({ error: 'Nome de usuário já cadastrado.' }, { status: 409 })
  return NextResponse.json(data)
}

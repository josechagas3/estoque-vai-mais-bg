import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const emailFor = (username: string) => `${username.trim().toLowerCase()}@vaimaisbg.com`
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)!, { auth: { autoRefreshToken: false, persistSession: false } })

export async function GET() {
  const supabase = admin()
  const { data: users, error } = await supabase.from('stock_users').select('id,name,username,active,auth_user_id').eq('active', true).order('name')
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os usuários.' }, { status: 500 })
  const joseRow = (users ?? []).find((user) => user.username === 'jose' || user.name === 'José')
  if (joseRow && joseRow.username !== 'jose') {
    const listed = await supabase.auth.admin.listUsers({ perPage: 100 }); const existing = listed.data.users.find((user) => user.email === emailFor('jose'))
    const auth = existing ? { data: { user: existing } } : await supabase.auth.admin.createUser({ email: emailFor('jose'), password: '123', email_confirm: true, user_metadata: { display_name: 'José', username: 'jose' } })
    if (auth.data.user) await supabase.from('stock_users').update({ username: 'jose', auth_user_id: auth.data.user.id }).eq('id', joseRow.id)
  } else if (!joseRow) {
    const auth = await supabase.auth.admin.createUser({ email: emailFor('jose'), password: '123', email_confirm: true, user_metadata: { display_name: 'José', username: 'jose' } })
    if (auth.data.user) await supabase.from('stock_users').insert({ id: crypto.randomUUID(), auth_user_id: auth.data.user.id, name: 'José', username: 'jose', active: true })
  }
  const refreshed = await supabase.from('stock_users').select('id,name,username,active,auth_user_id').eq('active', true).order('name')
  return NextResponse.json(refreshed.data ?? [])
}

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; username?: string; password?: string }
  const name = body.name?.trim(); const username = body.username?.trim().toLowerCase(); const password = body.password ?? ''
  if (!name || !username || password.length < 3 || !/^[a-z0-9._-]+$/.test(username)) return NextResponse.json({ error: 'Preencha nome, usuário válido e senha com pelo menos 3 caracteres.' }, { status: 400 })
  const supabase = admin()
  const auth = await supabase.auth.admin.createUser({ email: emailFor(username), password, email_confirm: true, user_metadata: { display_name: name, username } })
  if (auth.error || !auth.data.user) return NextResponse.json({ error: 'Não foi possível criar este usuário.' }, { status: 400 })
  const { data, error } = await supabase.from('stock_users').insert({ id: crypto.randomUUID(), auth_user_id: auth.data.user.id, name, username, active: true }).select('id,name,username,active,auth_user_id').single()
  if (error) { await supabase.auth.admin.deleteUser(auth.data.user.id); return NextResponse.json({ error: 'Nome de usuário já cadastrado.' }, { status: 409 }) }
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const body = await request.json() as { id?: string; name?: string; username?: string; password?: string; auth_user_id?: string }
  if (!body.id || !body.name?.trim() || !body.username?.trim()) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const supabase = admin(); const username = body.username.trim().toLowerCase()
  const authUpdate = await supabase.auth.admin.updateUserById(body.auth_user_id!, { ...(body.password ? { password: body.password } : {}), email: emailFor(username), user_metadata: { display_name: body.name.trim(), username } })
  if (authUpdate.error) return NextResponse.json({ error: 'Não foi possível atualizar o usuário.' }, { status: 400 })
  const { data, error } = await supabase.from('stock_users').update({ name: body.name.trim(), username }).eq('id', body.id).select('id,name,username,active,auth_user_id').single()
  if (error) return NextResponse.json({ error: 'Nome de usuário já cadastrado.' }, { status: 409 })
  return NextResponse.json(data)
}

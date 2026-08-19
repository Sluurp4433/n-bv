import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json, generatePassword } from '../_shared/cors.ts'

// Skapar en ny medlem. Endast administratörer (verifieras via anroparens JWT).
// service_role-nyckeln stannar i Edge Function-miljön och exponeras aldrig i frontend.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''

    // Verifiera att anroparen är admin
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin')
    if (adminErr || !isAdmin) {
      return json({ error: 'Endast administratörer får skapa användare.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()
    const role = ['admin', 'styrelse', 'medlem'].includes(body.role) ? body.role : 'medlem'
    if (!email) return json({ error: 'E-postadress krävs.' }, 400)

    const password =
      typeof body.password === 'string' && body.password.length >= 8
        ? body.password
        : generatePassword()

    const admin = createClient(url, service)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'Kunde inte skapa användaren.' }, 400)
    }

    // Säkerställ roll och namn i profiles (triggern skapar raden)
    await admin.from('profiles').update({ role, name: name || null }).eq('id', created.user.id)

    return json({ userId: created.user.id, email, tempPassword: password })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

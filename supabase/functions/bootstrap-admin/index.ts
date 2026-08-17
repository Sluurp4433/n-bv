import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cors, json, generatePassword } from '../_shared/cors.ts'

// Skapar den FÖRSTA administratören. Fungerar bara så länge ingen admin finns –
// därefter inaktiveras funktionen automatiskt (self-disabling bootstrap).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, service)

    const { count, error: countErr } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
    if (countErr) return json({ error: countErr.message }, 500)
    if ((count ?? 0) > 0) {
      return json({ error: 'En administratör finns redan. Bootstrap är inaktiverad.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()
    if (!email) return json({ error: 'E-postadress krävs.' }, 400)

    // Genererar ett tillfälligt lösenord om inget anges. Admin byter vid första inloggning.
    const password =
      typeof body.password === 'string' && body.password.length >= 8
        ? body.password
        : generatePassword()

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'admin' },
    })
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'Kunde inte skapa administratören.' }, 400)
    }

    await admin.from('profiles').update({ role: 'admin', name: name || null }).eq('id', created.user.id)

    return json({ userId: created.user.id, email, tempPassword: password })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

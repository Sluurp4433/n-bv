import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Field, Input, LoadingState } from '../components/ui'
import { BrandMark } from '../components/BrandMark'
import { useSiteSettings, useSponsors, publicAssetUrl } from '../lib/site'

const schema = z.object({
  email: z.string().min(1, 'Ange din e-postadress').email('Ogiltig e-postadress'),
  password: z.string().min(1, 'Ange ditt lösenord'),
})
type FormValues = z.infer<typeof schema>

export function PublicHome() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const site = useSiteSettings()
  const sponsors = useSponsors(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (loading) return <LoadingState />
  if (session) return <Navigate to="/hem" replace />

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await signIn(values.email, values.password)
      navigate('/hem')
    } catch {
      setError('Fel e-postadress eller lösenord.')
    }
  }

  const name = site.data?.display_name || 'N-BV'
  const tagline = site.data?.tagline || 'Tryggare tillsammans.'
  const logo = publicAssetUrl(site.data?.logo_path)
  const tipPhone = site.data?.tip_phone
  const tipHref = tipPhone ? `tel:${tipPhone.replace(/[^\d+]/g, '')}` : undefined

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-800 to-brand-900 px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center">
        {/* Logga + namn */}
        <div className="mb-6 flex flex-col items-center text-center text-white">
          {logo ? (
            <img src={logo} alt={name} className="h-24 w-auto max-w-[220px] object-contain" />
          ) : (
            <BrandMark className="h-16 w-16" />
          )}
          <h1 className="mt-4 text-3xl font-bold text-white">{name}</h1>
          <p className="mt-2 text-brand-100">{tagline}</p>
        </div>

        {/* Tipstelefon */}
        {tipPhone && (
          <a
            href={tipHref}
            className="mb-6 w-full rounded-2xl bg-white/10 px-6 py-4 text-center ring-1 ring-white/20 transition-colors hover:bg-white/15"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-brand-200">Tipstelefon</div>
            <div className="mt-1 text-3xl font-extrabold text-white">{tipPhone}</div>
          </a>
        )}

        {/* Inloggning */}
        <div className="w-full rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-xl font-semibold text-brand-800">Logga in</h2>
          <p className="mt-1 text-sm text-slate-500">Internt medlemsverktyg. Endast för registrerade medlemmar.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            {error && <Alert variant="error">{error}</Alert>}
            <Field label="E-postadress" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="namn@exempel.se" {...register('email')} />
            </Field>
            <Field label="Lösenord" htmlFor="password" error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Logga in</Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/glomt-losenord" className="text-sm text-brand-600 hover:underline">Glömt lösenord?</Link>
          </div>
        </div>

        <p className="mt-6 max-w-sm text-center text-xs text-brand-200">
          Ingen intern information visas utan inloggning. Nya konton skapas av föreningens administratörer.
        </p>
      </div>

      {/* Sponsorer */}
      {(sponsors.data?.length ?? 0) > 0 && (
        <div className="mx-auto mt-10 max-w-4xl">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-brand-200">
            Föreningen stöttas av
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sponsors.data!.map((s) => {
              const url = publicAssetUrl(s.logo_path)
              return (
                <div key={s.id} className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white p-3 text-center shadow-sm">
                  {url ? (
                    <img src={url} alt={s.name} className="h-14 w-full object-contain" />
                  ) : (
                    <div className="flex h-14 w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-400">Ingen logga</div>
                  )}
                  <span className="line-clamp-1 text-xs font-medium text-slate-600">{s.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

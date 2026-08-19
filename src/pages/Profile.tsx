import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, Field, Input, PageHeader, cn } from '../components/ui'
import { Avatar } from '../components/Avatar'
import { COLOR_PALETTE, memberColor } from '../lib/memberColor'
import { formatDate } from '../lib/format'

export function Profile() {
  const { user, profile, isAdmin, refreshProfile, updatePassword } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  async function saveColor(color: string) {
    if (!user) return
    const { error } = await supabase.from('profiles').update({ personal_color: color }).eq('id', user.id)
    if (error) {
      toast.error('Kunde inte spara färgen.')
      return
    }
    await refreshProfile()
    qc.invalidateQueries({ queryKey: ['profiles'] })
    toast.success('Din färg har sparats.')
  }

  const { register, handleSubmit, reset, formState } = useForm<{ name: string }>({
    defaultValues: { name: profile?.name ?? '' },
  })

  const pw = useForm<{ password: string; confirm: string }>()

  useEffect(() => {
    if (profile) reset({ name: profile.name ?? '' })
  }, [profile, reset])

  async function onSubmit(values: { name: string }) {
    const { error } = await supabase.from('profiles').update({ name: values.name }).eq('id', user!.id)
    if (error) {
      toast.error('Kunde inte spara profilen.')
      return
    }
    await refreshProfile()
    toast.success('Profilen har uppdaterats.')
  }

  async function onChangePassword(values: { password: string; confirm: string }) {
    if (values.password.length < 8) {
      pw.setError('password', { message: 'Minst 8 tecken' })
      return
    }
    if (values.password !== values.confirm) {
      pw.setError('confirm', { message: 'Lösenorden matchar inte' })
      return
    }
    try {
      await updatePassword(values.password)
      pw.reset({ password: '', confirm: '' })
      toast.success('Lösenordet har uppdaterats.')
    } catch {
      toast.error('Kunde inte uppdatera lösenordet.')
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Min profil" />

      {/* Avatar & personlig färg */}
      <Card className="mb-4 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Avatar config={profile?.avatar} size={112} ring={memberColor(profile)} title="Din avatar" />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-semibold text-brand-800">Min avatar</h2>
            <p className="mt-1 text-sm text-slate-500">
              Skapa din egen figur som syns på dina körpass i kalendern.
            </p>
            <Link to="/profil/avatar" className="mt-3 inline-block">
              <Button>Redigera avatar</Button>
            </Link>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-slate-700">Min färg</p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {COLOR_PALETTE.map((hex) => {
                  const selected = (profile?.personal_color ?? '') === hex
                  return (
                    <button
                      key={hex}
                      onClick={() => saveColor(hex)}
                      className={cn(
                        'h-9 w-9 rounded-full border-2 transition-transform',
                        selected ? 'border-brand-700 scale-110' : 'border-white shadow'
                      )}
                      style={{ backgroundColor: hex }}
                      aria-pressed={selected}
                      aria-label={`Färg ${hex}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <span>{profile?.email}</span>
          <Badge color={isAdmin ? 'green' : 'slate'}>{isAdmin ? 'Administratör' : 'Medlem'}</Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Namn" htmlFor="name">
            <Input id="name" {...register('name')} placeholder="För- och efternamn" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={formState.isSubmitting}>
              Spara profil
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Medlem sedan {formatDate(profile?.created_at)}
        </div>
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <h2 className="font-semibold text-brand-800">Byt lösenord</h2>
        <p className="mt-1 text-sm text-slate-500">Välj ett nytt lösenord direkt här.</p>
        <form onSubmit={pw.handleSubmit(onChangePassword)} className="mt-4 space-y-4" noValidate>
          <Field label="Nytt lösenord" htmlFor="new-pw" error={pw.formState.errors.password?.message} hint="Minst 8 tecken.">
            <Input id="new-pw" type="password" autoComplete="new-password" {...pw.register('password')} />
          </Field>
          <Field label="Bekräfta lösenord" htmlFor="new-pw2" error={pw.formState.errors.confirm?.message}>
            <Input id="new-pw2" type="password" autoComplete="new-password" {...pw.register('confirm')} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={pw.formState.isSubmitting}>
              Spara nytt lösenord
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

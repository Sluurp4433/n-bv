import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { Alert, Button, Field, Input } from '../components/ui'
import { BrandMark } from '../components/BrandMark'

const schema = z
  .object({
    password: z.string().min(8, 'Minst 8 tecken'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Lösenorden matchar inte',
    path: ['confirm'],
  })
type FormValues = z.infer<typeof schema>

export function ResetPassword() {
  const { session, updatePassword } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await updatePassword(values.password)
      toast.success('Lösenordet har uppdaterats.')
      navigate('/hem')
    } catch {
      setError('Kunde inte uppdatera lösenordet. Länken kan ha gått ut – begär en ny.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-800 to-brand-900 px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="mb-6 flex flex-col items-center text-white">
          <BrandMark className="h-14 w-14" />
          <h1 className="mt-3 text-2xl font-bold text-white">Välj nytt lösenord</h1>
        </div>

        <div className="w-full rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          {!session ? (
            <Alert variant="warning">
              Ingen aktiv återställningssession hittades. Öppna länken från e-postmeddelandet igen
              eller begär en ny återställning.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {error && <Alert variant="error">{error}</Alert>}
              <Field label="Nytt lösenord" htmlFor="password" error={errors.password?.message} hint="Minst 8 tecken.">
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              </Field>
              <Field label="Bekräfta lösenord" htmlFor="confirm" error={errors.confirm?.message}>
                <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
              </Field>
              <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                Spara nytt lösenord
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

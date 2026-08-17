import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Field, Input } from '../components/ui'
import { BrandMark } from '../components/BrandMark'

const schema = z.object({
  email: z.string().min(1, 'Ange din e-postadress').email('Ogiltig e-postadress'),
})
type FormValues = z.infer<typeof schema>

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    // Skickar alltid samma bekräftelse för att inte avslöja vilka adresser som finns.
    try {
      await requestPasswordReset(values.email)
    } catch {
      /* ignorera – visa ändå neutral bekräftelse */
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-800 to-brand-900 px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="mb-6 flex flex-col items-center text-white">
          <BrandMark className="h-14 w-14" />
          <h1 className="mt-3 text-2xl font-bold text-white">Återställ lösenord</h1>
        </div>

        <div className="w-full rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          {done ? (
            <div className="space-y-4">
              <Alert variant="success">
                Om adressen finns registrerad har vi skickat instruktioner för att återställa
                lösenordet. Kontrollera din e-post.
              </Alert>
              <Link to="/" className="block text-center text-sm text-brand-600 hover:underline">
                Tillbaka till inloggning
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Ange din e-postadress så skickar vi en länk för att återställa lösenordet.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
                <Field label="E-postadress" htmlFor="email" error={errors.email?.message}>
                  <Input id="email" type="email" autoComplete="email" {...register('email')} />
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                  Skicka återställningslänk
                </Button>
                <Link to="/" className="block text-center text-sm text-brand-600 hover:underline">
                  Tillbaka till inloggning
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

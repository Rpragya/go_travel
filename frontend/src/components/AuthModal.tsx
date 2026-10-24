import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { api, errorMessage } from '@/lib/api'
import type { AuthResponse, User } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/store/auth'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

const signupSchema = z.object({
  first_name: z.string().trim().min(1, 'Required'),
  last_name: z.string().trim().min(1, 'Required'),
  email: z.email('Enter a valid email'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number'),
  password: z.string().min(8, 'At least 8 characters'),
})

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

export function AuthModal() {
  const { modal, closeAuth, openAuth } = useAuth()
  const view = modal.view
  return (
    <Modal
      open={modal.open}
      onClose={closeAuth}
      title={view === 'verify' ? 'Verify your email' : view === 'login' ? 'Welcome back' : 'Create your account'}
    >
      {view !== 'verify' && (
        <div className="mb-5 grid grid-cols-2 rounded-full bg-gray-100 p-1 text-sm font-bold">
          {(['login', 'signup'] as const).map((v) => (
            <button
              key={v}
              onClick={() => openAuth(v)}
              className={cn('cursor-pointer rounded-full py-2', view === v ? 'bg-white text-brand-600 shadow' : 'text-gray-500')}
            >
              {v === 'login' ? 'Login' : 'Sign up'}
            </button>
          ))}
        </div>
      )}
      {view === 'login' && <LoginForm />}
      {view === 'signup' && <SignupForm />}
      {view === 'verify' && <VerifyForm />}
    </Modal>
  )
}

function useSession() {
  const { setSession, closeAuth } = useAuth()
  const qc = useQueryClient()
  return (data: AuthResponse) => {
    setSession(data)
    qc.invalidateQueries()
    closeAuth()
  }
}

function LoginForm() {
  const onSession = useSession()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const login = useMutation({
    mutationFn: (v: LoginValues) => api.post<AuthResponse>('/auth/login/', v).then((r) => r.data),
    onSuccess: (data) => {
      onSession(data)
      toast.success(`Welcome back, ${data.user.first_name || 'traveller'}!`)
    },
  })
  const { errors } = form.formState
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((v) => login.mutate(v))}>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register('password')} />
      </Field>
      {login.isError && <p className="text-sm text-red-600">{errorMessage(login.error, 'Invalid email or password.')}</p>}
      <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
        Login
      </Button>
      <button
        type="button"
        className="w-full cursor-pointer rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 hover:bg-gray-50"
        onClick={() => {
          form.setValue('email', 'demo@gotravels.dev')
          form.setValue('password', 'Demo@12345')
        }}
      >
        Use demo account: <b>demo@gotravels.dev</b> / <b>Demo@12345</b>
      </button>
    </form>
  )
}

function SignupForm() {
  const { setSession, openAuth } = useAuth()
  const qc = useQueryClient()
  const form = useForm<SignupValues>({ resolver: zodResolver(signupSchema) })
  const signup = useMutation({
    mutationFn: (v: SignupValues) => api.post<AuthResponse>('/auth/register/', v).then((r) => r.data),
    onSuccess: (data) => {
      setSession(data)
      qc.invalidateQueries()
      openAuth('verify')
    },
  })
  const { errors } = form.formState
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit((v) => signup.mutate(v))}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" error={errors.first_name?.message}>
          <Input autoComplete="given-name" {...form.register('first_name')} />
        </Field>
        <Field label="Last name" error={errors.last_name?.message}>
          <Input autoComplete="family-name" {...form.register('last_name')} />
        </Field>
      </div>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field label="Mobile number" error={errors.phone?.message}>
        <Input inputMode="numeric" autoComplete="tel-national" maxLength={10} {...form.register('phone')} />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      {signup.isError && <p className="text-sm text-red-600">{errorMessage(signup.error)}</p>}
      <Button type="submit" className="w-full" size="lg" loading={signup.isPending}>
        Create account
      </Button>
    </form>
  )
}

function VerifyForm() {
  const { user, setUser, closeAuth } = useAuth()
  const [code, setCode] = useState('')
  const verify = useMutation({
    mutationFn: () => api.post<User>('/auth/verify-email/', { code }).then((r) => r.data),
    onSuccess: (u) => {
      setUser(u)
      closeAuth()
      toast.success('Email verified. Welcome to Go Travels!')
    },
  })
  const resend = useMutation({
    mutationFn: () => api.post('/auth/resend-otp/'),
    onSuccess: () => toast.success('A new code is on its way.'),
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        verify.mutate()
      }}
    >
      <div className="flex items-center gap-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
        <MailCheck className="size-6 shrink-0 text-brand-500" />
        <span>
          We sent a 6-digit code to <b>{user?.email}</b>. In local development the email is printed in the Django
          server console.
        </span>
      </div>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="Enter 6-digit code"
        className="h-12 text-center text-lg tracking-[0.5em]"
        aria-label="Verification code"
      />
      {verify.isError && <p className="text-sm text-red-600">{errorMessage(verify.error)}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={code.length !== 6} loading={verify.isPending}>
        Verify email
      </Button>
      <div className="flex justify-between text-sm">
        <button type="button" className="cursor-pointer font-bold text-brand-600" onClick={() => resend.mutate()} disabled={resend.isPending}>
          Resend code
        </button>
        <button type="button" className="cursor-pointer text-gray-500" onClick={closeAuth}>
          Skip for now
        </button>
      </div>
    </form>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, MailWarning, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { api, errorMessage } from '@/lib/api'
import type { Traveller, User } from '@/lib/types'
import { useAuth } from '@/store/auth'

const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'Required'),
  last_name: z.string().trim(),
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number').or(z.literal('')),
})

const travellerSchema = z.object({
  first_name: z.string().trim().min(1, 'Required'),
  last_name: z.string().trim().min(1, 'Required'),
  gender: z.enum(['M', 'F', 'O'], { message: 'Select gender' }),
  date_of_birth: z.string().optional(),
})

export default function ProfilePage() {
  const { user, setUser, openAuth } = useAuth()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/auth/me/').then((r) => r.data),
  })
  const current = me.data ?? user!
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { first_name: current.first_name, last_name: current.last_name, phone: current.phone },
  })
  const save = useMutation({
    mutationFn: (v: z.infer<typeof profileSchema>) => api.patch<User>('/auth/me/', v).then((r) => r.data),
    onSuccess: (u) => {
      setUser(u)
      toast.success('Profile updated')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const resend = useMutation({
    mutationFn: () => api.post('/auth/resend-otp/'),
    onSuccess: () => openAuth('verify'),
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-black">My Profile</h1>
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="grid size-14 place-items-center rounded-full bg-brand-500 text-2xl font-black text-white">
            {(current.first_name || current.email)[0].toUpperCase()}
          </span>
          <div className="mr-auto">
            <div className="text-lg font-black">{current.first_name} {current.last_name}</div>
            <div className="text-sm text-gray-500">{current.email}</div>
          </div>
          {current.is_verified ? (
            <span className="flex items-center gap-1 text-sm font-bold text-emerald-700"><BadgeCheck className="size-5" /> Verified</span>
          ) : (
            <Button variant="outline" size="sm" loading={resend.isPending} onClick={() => resend.mutate()}>
              <MailWarning className="size-4" /> Verify email
            </Button>
          )}
        </div>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <Field label="First name" error={form.formState.errors.first_name?.message}>
            <Input {...form.register('first_name')} />
          </Field>
          <Field label="Last name">
            <Input {...form.register('last_name')} />
          </Field>
          <Field label="Mobile" error={form.formState.errors.phone?.message}>
            <Input inputMode="numeric" maxLength={10} {...form.register('phone')} />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" loading={save.isPending}>Save changes</Button>
          </div>
        </form>
      </Card>
      <SavedTravellers />
    </div>
  )
}

function SavedTravellers() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const list = useQuery({ queryKey: ['travellers'], queryFn: () => api.get<Traveller[]>('/auth/travellers/').then((r) => r.data) })
  const form = useForm<z.infer<typeof travellerSchema>>({ resolver: zodResolver(travellerSchema) })
  const add = useMutation({
    mutationFn: (v: z.infer<typeof travellerSchema>) =>
      api.post('/auth/travellers/', { ...v, date_of_birth: v.date_of_birth || null }),
    onSuccess: () => {
      form.reset()
      setAdding(false)
      qc.invalidateQueries({ queryKey: ['travellers'] })
      toast.success('Traveller saved')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/travellers/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travellers'] }),
  })
  const errors = form.formState.errors

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Saved travellers</h2>
          <p className="text-sm text-gray-500">Fill traveller details in one tap while booking.</p>
        </div>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" /> Add
          </Button>
        )}
      </div>
      {adding && (
        <form className="mb-4 grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-4" onSubmit={form.handleSubmit((v) => add.mutate(v))}>
          <Field label="First name" error={errors.first_name?.message}><Input {...form.register('first_name')} /></Field>
          <Field label="Last name" error={errors.last_name?.message}><Input {...form.register('last_name')} /></Field>
          <Field label="Gender" error={errors.gender?.message}>
            <Select {...form.register('gender')} defaultValue="">
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </Select>
          </Field>
          <Field label="Date of birth"><Input type="date" {...form.register('date_of_birth')} /></Field>
          <div className="flex gap-2 sm:col-span-4">
            <Button type="submit" size="sm" loading={add.isPending}>Save traveller</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}
      <ul className="divide-y divide-gray-100">
        {list.data?.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-3 text-sm">
            <span>
              <b>{t.first_name} {t.last_name}</b>{' '}
              <span className="text-gray-500">· {t.gender === 'M' ? 'Male' : t.gender === 'F' ? 'Female' : 'Other'}{t.date_of_birth && ` · born ${t.date_of_birth}`}</span>
            </span>
            <button onClick={() => remove.mutate(t.id)} className="cursor-pointer p-1 text-gray-400 hover:text-red-600" aria-label={`Remove ${t.first_name}`}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {list.data?.length === 0 && !adding && <li className="py-3 text-sm text-gray-500">No saved travellers yet.</li>}
      </ul>
    </Card>
  )
}

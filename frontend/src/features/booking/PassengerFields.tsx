import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { Field, Input, Select } from '@/components/ui/Field'
import type { Gender, PaxType, Traveller } from '@/lib/types'
import { z } from 'zod'

export const passengerSchema = z
  .object({
    first_name: z.string().trim().min(1, 'Required').max(60),
    last_name: z.string().trim().min(1, 'Required').max(60),
    gender: z.enum(['M', 'F', 'O'], { message: 'Select gender' }),
    age: z.number({ message: 'Enter age' }).int().min(0).max(120),
    pax_type: z.enum(['ADULT', 'CHILD']),
  })
  .superRefine((p, ctx) => {
    if (p.pax_type === 'ADULT' && p.age < 12) ctx.addIssue({ code: 'custom', path: ['age'], message: 'Adults are 12+' })
    if (p.pax_type === 'CHILD' && (p.age < 2 || p.age > 11))
      ctx.addIssue({ code: 'custom', path: ['age'], message: 'Children are 2-11' })
  })

export const contactSchema = {
  contact_email: z.email('Enter a valid email'),
  contact_phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit mobile number'),
}

export type PassengerValues = z.infer<typeof passengerSchema>

export function emptyPassenger(pax_type: PaxType): PassengerValues {
  return { first_name: '', last_name: '', gender: '' as Gender, age: NaN, pax_type }
}

function ageFromDob(dob: string | null) {
  if (!dob) return NaN
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--
  return age
}

type PaxForm = { passengers: PassengerValues[] }
// Shared between flight and hotel forms, whose value types differ.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyForm = any

export function PassengerFields({
  index,
  label,
  register,
  setValue,
  errors,
  saved,
}: {
  index: number
  label: string
  register: UseFormRegister<AnyForm>
  setValue: UseFormSetValue<AnyForm>
  errors?: FieldErrors<PaxForm>
  saved?: Traveller[]
}) {
  const e = errors?.passengers?.[index]
  const prefix = `passengers.${index}` as const
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="flex w-full items-center justify-between gap-3 px-1 text-sm font-black">
        {label}
      </legend>
      {saved && saved.length > 0 && (
        <Select
          className="mb-3 h-9 text-xs"
          defaultValue=""
          aria-label={`Fill ${label} from saved travellers`}
          onChange={(ev) => {
            const t = saved.find((s) => String(s.id) === ev.target.value)
            if (!t) return
            const opts = { shouldValidate: true }
            setValue(`${prefix}.first_name`, t.first_name, opts)
            setValue(`${prefix}.last_name`, t.last_name, opts)
            setValue(`${prefix}.gender`, t.gender, opts)
            const age = ageFromDob(t.date_of_birth)
            if (!Number.isNaN(age)) setValue(`${prefix}.age`, age, opts)
          }}
        >
          <option value="">Fill from saved travellers…</option>
          {saved.map((t) => (
            <option key={t.id} value={t.id}>
              {t.first_name} {t.last_name}
            </option>
          ))}
        </Select>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_90px]">
        <Field label="First & middle name" error={e?.first_name?.message}>
          <Input aria-invalid={!!e?.first_name} {...register(`${prefix}.first_name`)} />
        </Field>
        <Field label="Last name" error={e?.last_name?.message}>
          <Input aria-invalid={!!e?.last_name} {...register(`${prefix}.last_name`)} />
        </Field>
        <Field label="Gender" error={e?.gender?.message}>
          <Select aria-invalid={!!e?.gender} {...register(`${prefix}.gender`)}>
            <option value="">Select</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </Select>
        </Field>
        <Field label="Age" error={e?.age?.message}>
          <Input type="number" min={0} aria-invalid={!!e?.age} {...register(`${prefix}.age`, { valueAsNumber: true })} />
        </Field>
      </div>
      <input type="hidden" {...register(`${prefix}.pax_type`)} />
    </fieldset>
  )
}

export function ContactFields({
  register,
  errors,
}: {
  register: UseFormRegister<AnyForm>
  errors: { contact_email?: { message?: string }; contact_phone?: { message?: string } }
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Email (ticket will be sent here)" error={errors.contact_email?.message}>
        <Input type="email" aria-invalid={!!errors.contact_email} {...register('contact_email')} />
      </Field>
      <Field label="Mobile number" error={errors.contact_phone?.message}>
        <Input inputMode="numeric" maxLength={10} aria-invalid={!!errors.contact_phone} {...register('contact_phone')} />
      </Field>
    </div>
  )
}

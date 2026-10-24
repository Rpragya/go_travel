import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Counter } from '@/components/ui/Counter'
import { Popover } from '@/components/ui/Popover'
import type { CabinClass } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SearchBox } from './SearchBox'

export const CABINS: { value: CabinClass; label: string }[] = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'PREMIUM', label: 'Premium Economy' },
  { value: 'BUSINESS', label: 'Business' },
]

export interface TravellersValue {
  adults: number
  children: number
  cabin: CabinClass
}

export function TravellersPicker({ value, onChange }: { value: TravellersValue; onChange: (v: TravellersValue) => void }) {
  const [open, setOpen] = useState(false)
  const total = value.adults + value.children
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align="right"
      className="w-80"
      trigger={
        <SearchBox
          label="Travellers & class"
          active={open}
          onClick={() => setOpen((o) => !o)}
          value={
            <>
              {total} <span className="text-base font-bold">Traveller{total > 1 ? 's' : ''}</span>
            </>
          }
          sub={CABINS.find((c) => c.value === value.cabin)?.label}
        />
      }
    >
      <Counter
        label="Adults"
        hint="12 years & above"
        value={value.adults}
        min={1}
        max={9 - value.children}
        onChange={(adults) => onChange({ ...value, adults })}
      />
      <Counter
        label="Children"
        hint="2 - 11 years"
        value={value.children}
        min={0}
        max={9 - value.adults}
        onChange={(children) => onChange({ ...value, children })}
      />
      <div className="mt-3 mb-1 text-xs font-bold text-gray-500 uppercase">Travel class</div>
      <div className="flex flex-wrap gap-2">
        {CABINS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange({ ...value, cabin: c.value })}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-xs font-bold',
              value.cabin === c.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <Button className="mt-4 w-full" size="sm" onClick={() => setOpen(false)}>
        Apply
      </Button>
    </Popover>
  )
}

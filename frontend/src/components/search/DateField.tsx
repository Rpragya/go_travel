import { addDays, addYears, format } from 'date-fns'
import { useState, type ReactNode } from 'react'
import { DayPicker } from 'react-day-picker'
import { Popover } from '@/components/ui/Popover'
import { fromISODate, toISODate } from '@/lib/utils'
import { SearchBox } from './SearchBox'

export function DateField({
  label,
  value,
  onChange,
  min,
  placeholder,
  onClear,
  align,
}: {
  label: string
  value: string | null
  onChange: (iso: string) => void
  min?: string
  placeholder?: ReactNode
  onClear?: () => void
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const minDate = min ? fromISODate(min) : new Date()
  const selected = value ? fromISODate(value) : undefined

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align={align}
      trigger={
        <SearchBox
          label={label}
          active={open}
          onClick={() => setOpen((o) => !o)}
          value={
            selected ? (
              <>
                {format(selected, 'd')} <span className="text-base font-bold">{format(selected, "MMM''yy")}</span>
              </>
            ) : (
              <span className="text-base font-bold text-gray-400">{placeholder ?? 'Select date'}</span>
            )
          }
          sub={selected ? format(selected, 'EEEE') : 'Tap to add'}
        />
      }
    >
      <DayPicker
        mode="single"
        selected={selected}
        defaultMonth={selected ?? minDate}
        startMonth={minDate}
        endMonth={addYears(new Date(), 1)}
        disabled={[{ before: minDate }, { after: addDays(new Date(), 365) }]}
        onSelect={(d) => {
          if (d) {
            onChange(toISODate(d))
            setOpen(false)
          }
        }}
      />
      {onClear && value && (
        <button
          type="button"
          className="mt-1 w-full cursor-pointer text-center text-xs font-bold text-brand-600"
          onClick={() => {
            onClear()
            setOpen(false)
          }}
        >
          Remove return date
        </button>
      )}
    </Popover>
  )
}

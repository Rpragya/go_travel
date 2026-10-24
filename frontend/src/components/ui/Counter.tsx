import { Minus, Plus } from 'lucide-react'

export function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const btn =
    'grid size-8 cursor-pointer place-items-center rounded-full border border-brand-500 text-brand-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300'
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <div>
        <div className="text-sm font-bold">{label}</div>
        {hint && <div className="text-xs text-gray-500">{hint}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${label}`}>
          <Minus className="size-4" />
        </button>
        <span className="w-4 text-center font-bold" aria-live="polite">
          {value}
        </span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${label}`}>
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

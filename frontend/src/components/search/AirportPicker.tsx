import { useQuery } from '@tanstack/react-query'
import { PlaneTakeoff, Search } from 'lucide-react'
import { useState } from 'react'
import { Popover } from '@/components/ui/Popover'
import { api } from '@/lib/api'
import type { Airport } from '@/lib/types'
import { useDebounced } from '@/lib/useDebounced'
import { SearchBox } from './SearchBox'

export function AirportPicker({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string
  value: Airport | null
  onChange: (a: Airport) => void
  exclude?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const debounced = useDebounced(q, 200)
  const { data = [], isFetching } = useQuery({
    queryKey: ['airports', debounced],
    queryFn: () => api.get<Airport[]>('/locations/airports/', { params: { q: debounced } }).then((r) => r.data),
    enabled: open,
    staleTime: 5 * 60_000,
  })

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      className="w-80 p-0"
      trigger={
        <SearchBox
          label={label}
          active={open}
          value={value ? value.city : 'Select city'}
          sub={value ? `${value.iata}, ${value.name}` : 'Airport or city'}
          onClick={() => setOpen((o) => !o)}
        />
      }
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-3">
        <Search className="size-4 text-gray-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search city or airport"
          className="h-11 w-full text-sm outline-none"
          aria-label={`${label} airport`}
        />
      </div>
      <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
        {!isFetching && data.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No airports found</li>}
        {data
          .filter((a) => a.iata !== exclude)
          .map((a) => (
            <li key={a.iata}>
              <button
                type="button"
                onClick={() => {
                  onChange(a)
                  setOpen(false)
                  setQ('')
                }}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left hover:bg-brand-50"
              >
                <PlaneTakeoff className="size-4 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">
                    {a.city}, {a.country}
                  </span>
                  <span className="block truncate text-xs text-gray-500">{a.name}</span>
                </span>
                <span className="text-xs font-bold text-gray-500">{a.iata}</span>
              </button>
            </li>
          ))}
      </ul>
    </Popover>
  )
}

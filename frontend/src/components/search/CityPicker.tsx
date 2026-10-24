import { useQuery } from '@tanstack/react-query'
import { MapPin, Search } from 'lucide-react'
import { useState } from 'react'
import { Popover } from '@/components/ui/Popover'
import { api } from '@/lib/api'
import type { City } from '@/lib/types'
import { useDebounced } from '@/lib/useDebounced'
import { SearchBox } from './SearchBox'

export type CityValue = Pick<City, 'id' | 'name'> & { country?: string }

export function CityPicker({ value, onChange }: { value: CityValue | null; onChange: (c: CityValue) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const debounced = useDebounced(q, 200)
  const { data = [] } = useQuery({
    queryKey: ['cities', debounced],
    queryFn: () => api.get<City[]>('/locations/cities/', { params: { q: debounced } }).then((r) => r.data),
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
          label="City, property or location"
          active={open}
          value={value ? value.name : 'Where to?'}
          sub={value?.country ?? 'Select a destination'}
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
          placeholder="Search a city"
          className="h-11 w-full text-sm outline-none"
          aria-label="Destination city"
        />
      </div>
      <ul className="max-h-72 overflow-y-auto py-1">
        {data.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No cities found</li>}
        {data.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => {
                onChange({ id: c.id, name: c.name, country: c.country })
                setOpen(false)
                setQ('')
              }}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left hover:bg-brand-50"
            >
              <MapPin className="size-4 shrink-0 text-gray-400" />
              <span className="flex-1">
                <span className="block text-sm font-bold">{c.name}</span>
                <span className="block text-xs text-gray-500">{[c.state, c.country].filter(Boolean).join(', ')}</span>
              </span>
              <span className="text-xs text-gray-400">{c.hotel_count} hotels</span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  )
}

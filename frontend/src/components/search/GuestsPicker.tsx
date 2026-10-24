import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Counter } from '@/components/ui/Counter'
import { Popover } from '@/components/ui/Popover'
import { SearchBox } from './SearchBox'

export interface GuestsValue {
  rooms: number
  guests: number
}

export function GuestsPicker({ value, onChange }: { value: GuestsValue; onChange: (v: GuestsValue) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align="right"
      className="w-72"
      trigger={
        <SearchBox
          label="Rooms & guests"
          active={open}
          onClick={() => setOpen((o) => !o)}
          value={
            <>
              {value.rooms} <span className="text-base font-bold">Room{value.rooms > 1 ? 's' : ''}</span> {value.guests}{' '}
              <span className="text-base font-bold">Guest{value.guests > 1 ? 's' : ''}</span>
            </>
          }
          sub="Up to 4 guests per room"
        />
      }
    >
      <Counter
        label="Rooms"
        value={value.rooms}
        min={1}
        max={8}
        onChange={(rooms) => onChange({ rooms, guests: Math.min(Math.max(value.guests, rooms), rooms * 4) })}
      />
      <Counter
        label="Guests"
        hint="Adults & children"
        value={value.guests}
        min={value.rooms}
        max={value.rooms * 4}
        onChange={(guests) => onChange({ ...value, guests })}
      />
      <Button className="mt-3 w-full" size="sm" onClick={() => setOpen(false)}>
        Apply
      </Button>
    </Popover>
  )
}

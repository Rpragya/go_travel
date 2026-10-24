import type { Airline } from '@/lib/types'

/** Neutral coloured badge instead of trademarked airline logos. */
export function AirlineLogo({ airline, size = 36 }: { airline: Airline; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg text-xs font-black text-white"
      style={{ background: airline.color, width: size, height: size }}
      aria-hidden
    >
      {airline.code}
    </span>
  )
}

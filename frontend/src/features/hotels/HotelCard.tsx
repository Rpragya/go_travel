import { Heart, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Card'
import { Img } from '@/components/ui/Img'
import { RatingBadge, Stars } from '@/components/ui/Rating'
import type { HotelListItem } from '@/lib/types'
import { cn, formatINR } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'
import { AmenityIcon } from './AmenityIcon'

export function HotelCard({ hotel, to, nights }: { hotel: HotelListItem; to: string; nights: number }) {
  const { wishlist, toggleWishlist } = usePrefs()
  const saved = wishlist.some((w) => w.slug === hotel.slug)
  return (
    <div className="group relative grid overflow-hidden rounded-xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.12)] transition hover:shadow-lg sm:grid-cols-[260px_1fr_190px]">
      <Link to={to} className="relative block aspect-[4/3] sm:aspect-auto">
        <Img src={hotel.thumbnail} seed={hotel.slug} alt={hotel.name} className="absolute inset-0 size-full object-cover" />
      </Link>
      <button
        onClick={() => toggleWishlist(hotel)}
        className="absolute top-2 left-2 z-10 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 shadow"
        aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        aria-pressed={saved}
      >
        <Heart className={cn('size-5', saved ? 'fill-red-500 text-red-500' : 'text-gray-600')} />
      </button>
      <Link to={to} className="min-w-0 space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Stars count={hotel.star_rating} />
          {hotel.property_type !== 'HOTEL' && <Badge>{hotel.property_type.toLowerCase()}</Badge>}
        </div>
        <h3 className="text-lg leading-tight font-black group-hover:text-brand-600">{hotel.name}</h3>
        <p className="flex items-center gap-1 text-sm text-brand-600">
          <MapPin className="size-3.5" /> {hotel.locality}, {hotel.city}
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-gray-600">
          {hotel.amenities.slice(0, 4).map((a) => (
            <li key={a.id} className="flex items-center gap-1">
              <AmenityIcon name={a.icon} className="size-3.5" /> {a.name}
            </li>
          ))}
          {hotel.amenities.length > 4 && <li className="text-gray-400">+{hotel.amenities.length - 4} more</li>}
        </ul>
      </Link>
      <Link
        to={to}
        className="flex flex-row items-end justify-between gap-2 border-t border-gray-100 p-4 sm:flex-col sm:items-end sm:border-t-0 sm:border-l"
      >
        <RatingBadge rating={hotel.user_rating} count={hotel.review_count} />
        <div className="text-right">
          <div className="text-2xl font-black">{formatINR(hotel.min_price)}</div>
          <div className="text-xs text-gray-500">per night + taxes</div>
          {nights > 1 && <div className="text-xs text-gray-500">{formatINR(Number(hotel.min_price) * nights)} for {nights} nights</div>}
        </div>
      </Link>
    </div>
  )
}

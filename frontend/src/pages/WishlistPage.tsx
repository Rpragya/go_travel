import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Img } from '@/components/ui/Img'
import { RatingBadge, Stars } from '@/components/ui/Rating'
import { EmptyState } from '@/components/ui/States'
import { plusDays } from '@/lib/utils'
import { usePrefs } from '@/store/prefs'

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = usePrefs()
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black">Wishlist</h1>
      {wishlist.length === 0 ? (
        <EmptyState
          title="No saved hotels yet"
          message="Tap the heart on any hotel to save it here for later."
          action={<Link to="/?tab=hotels" className="font-bold text-brand-600">Explore hotels</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.map((h) => (
            <div key={h.slug} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="relative">
                <Img src={h.thumbnail} seed={h.slug} alt={h.name} className="aspect-[4/3] w-full object-cover" />
                <button
                  onClick={() => toggleWishlist(h)}
                  className="absolute top-2 right-2 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90"
                  aria-label="Remove from wishlist"
                >
                  <Heart className="size-5 fill-red-500 text-red-500" />
                </button>
              </div>
              <Link
                to={`/hotels/${h.slug}?check_in=${plusDays(7)}&check_out=${plusDays(9)}&rooms=1&guests=2`}
                className="block space-y-1 p-4"
              >
                <Stars count={h.star_rating} />
                <h3 className="font-black">{h.name}</h3>
                <p className="text-sm text-gray-500">{h.city}</p>
                <RatingBadge rating={h.user_rating} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

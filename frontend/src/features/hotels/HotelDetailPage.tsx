import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, Check, Clock, Coffee, Heart, MapPin, Maximize, Star, Users, X } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { createSearchParams, Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge, Card, Skeleton } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Img } from '@/components/ui/Img'
import { Modal } from '@/components/ui/Modal'
import { RatingBadge, Stars } from '@/components/ui/Rating'
import { ErrorState, Spinner } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api'
import type { HotelDetail, Paginated, Review, RoomType } from '@/lib/types'
import { cn, formatINR, nightsBetween, prettyDate } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import { usePrefs } from '@/store/prefs'
import { AmenityIcon } from './AmenityIcon'
import { StayBar, useStay } from './StayBar'

const MiniMap = lazy(() => import('./MiniMap'))

export default function HotelDetailPage() {
  const { slug = '' } = useParams()
  const stay = useStay()
  const navigate = useNavigate()
  const [gallery, setGallery] = useState<number | null>(null)
  const { wishlist, toggleWishlist } = usePrefs()
  const nights = nightsBetween(stay.checkIn, stay.checkOut)

  const hotel = useQuery({
    queryKey: ['hotel', slug],
    queryFn: () => api.get<HotelDetail>(`/hotels/${slug}/`).then((r) => r.data),
  })
  const rooms = useQuery({
    queryKey: ['rooms', slug, stay.checkIn, stay.checkOut, stay.rooms, stay.guests],
    queryFn: () =>
      api
        .get<RoomType[]>(`/hotels/${slug}/rooms/`, {
          params: { check_in: stay.checkIn, check_out: stay.checkOut, rooms: stay.rooms, guests: stay.guests },
        })
        .then((r) => r.data),
  })

  if (hotel.isLoading) return <Spinner />
  if (hotel.isError || !hotel.data) return <div className="p-8"><ErrorState message={errorMessage(hotel.error, 'Hotel not found.')} /></div>
  const h = hotel.data
  const saved = wishlist.some((w) => w.slug === h.slug)
  const images = h.images.length ? h.images : [{ url: '', caption: '' }]

  const selectRoom = (room: RoomType) =>
    navigate({
      pathname: `/hotels/${slug}/book`,
      search: createSearchParams({
        room: String(room.id), check_in: stay.checkIn, check_out: stay.checkOut,
        rooms: String(stay.rooms), guests: String(stay.guests),
      }).toString(),
    })

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <nav className="text-xs text-gray-500">
        <Link to="/">Home</Link> /{' '}
        <Link to={`/hotels?city=${h.city.id}&cityName=${h.city.name}&check_in=${stay.checkIn}&check_out=${stay.checkOut}&rooms=${stay.rooms}&guests=${stay.guests}`}>
          Hotels in {h.city.name}
        </Link>{' '}
        / <span className="text-gray-700">{h.name}</span>
      </nav>

      <div className="grid h-72 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:h-96">
        {images.slice(0, 5).map((img, i) => (
          <button
            key={i}
            onClick={() => setGallery(i)}
            className={cn('relative cursor-pointer overflow-hidden', i === 0 ? 'col-span-4 row-span-2 sm:col-span-2' : 'hidden sm:block')}
          >
            <Img src={img.url} seed={`${h.slug}-${i}`} alt={`${h.name} photo ${i + 1}`} className="size-full object-cover transition hover:scale-105" />
            {i === 4 && images.length > 5 && (
              <span className="absolute inset-0 grid place-items-center bg-black/50 font-bold text-white">+{images.length - 5} photos</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Stars count={h.star_rating} />
                <Badge className="capitalize">{h.property_type.toLowerCase()}</Badge>
              </div>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">{h.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="size-4 text-brand-500" /> {h.address}
              </p>
            </div>
            <button
              onClick={() => toggleWishlist({ ...h, city: h.city.name, thumbnail: h.images[0]?.url ?? '' })}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-gray-200"
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart className={cn('size-5', saved ? 'fill-red-500 text-red-500' : 'text-gray-600')} />
            </button>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{h.description}</p>
          <div className="flex gap-6 text-sm">
            <span className="flex items-center gap-1"><Clock className="size-4 text-gray-400" /> Check-in {h.check_in_time.slice(0, 5)}</span>
            <span className="flex items-center gap-1"><Clock className="size-4 text-gray-400" /> Check-out {h.check_out_time.slice(0, 5)}</span>
          </div>
          <div>
            <h2 className="mb-2 font-black">Amenities</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {h.amenities.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <AmenityIcon name={a.icon} className="size-4 text-brand-500" /> {a.name}
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <RatingBadge rating={h.user_rating} count={h.review_count} />
            <a href="#reviews" className="mt-2 block text-sm font-bold text-brand-600">Read all reviews</a>
          </Card>
          <Card className="overflow-hidden">
            <Suspense fallback={<Skeleton className="h-48" />}>
              <MiniMap lat={h.latitude} lng={h.longitude} />
            </Suspense>
            <div className="p-3 text-xs text-gray-600">{h.locality}, {h.city.name}</div>
          </Card>
        </div>
      </div>

      <section id="rooms" className="space-y-4">
        <h2 className="text-xl font-black">Choose your room</h2>
        <Card className="p-4">
          <StayBar stay={stay} />
        </Card>
        {rooms.isLoading && <Skeleton className="h-40 rounded-xl" />}
        {rooms.isError && <ErrorState message={errorMessage(rooms.error)} />}
        {rooms.data?.map((room) => {
          const fits = room.max_guests * stay.rooms >= stay.guests
          const available = (room.rooms_left ?? 0) >= stay.rooms
          return (
            <Card key={room.id} className="grid overflow-hidden sm:grid-cols-[220px_1fr_220px]">
              <Img src={room.image_url} seed={`room-${room.id}`} alt={room.name} className="aspect-[4/3] size-full object-cover sm:aspect-auto" />
              <div className="space-y-2 p-4">
                <h3 className="text-lg font-black">{room.name}</h3>
                <ul className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                  <li className="flex items-center gap-1.5"><BedDouble className="size-4" /> {room.bed_type}</li>
                  <li className="flex items-center gap-1.5"><Maximize className="size-4" /> {room.size_sqft} sq.ft</li>
                  <li className="flex items-center gap-1.5"><Users className="size-4" /> Max {room.max_guests} guests</li>
                  <li className="flex items-center gap-1.5"><Coffee className="size-4" /> {room.breakfast_included ? 'Breakfast included' : 'Room only'}</li>
                </ul>
                <p className={cn('flex items-center gap-1 text-sm font-bold', room.refundable ? 'text-emerald-700' : 'text-gray-500')}>
                  {room.refundable ? <Check className="size-4" /> : <X className="size-4" />}
                  {room.refundable ? 'Free cancellation till 24 hrs before check-in' : 'Non-refundable'}
                </p>
                {available && (room.rooms_left ?? 0) <= 3 && <Badge tone="red">Only {room.rooms_left} left</Badge>}
              </div>
              <div className="flex flex-col justify-center gap-2 border-t border-gray-100 p-4 sm:border-t-0 sm:border-l">
                <div className="text-2xl font-black">{formatINR(room.price_per_night)}</div>
                <div className="text-xs text-gray-500">
                  per room per night + taxes
                  <br />
                  {formatINR(Number(room.price_per_night) * nights * stay.rooms)} for {nights} night{nights > 1 && 's'}, {stay.rooms} room{stay.rooms > 1 && 's'}
                </div>
                <Button variant={available && fits ? 'primary' : 'ghost'} disabled={!available || !fits} onClick={() => selectRoom(room)}>
                  {!available ? 'Sold out' : !fits ? 'Add rooms for guests' : 'SELECT ROOM'}
                </Button>
              </div>
            </Card>
          )
        })}
      </section>

      <Reviews slug={slug} />

      <Modal open={gallery !== null} onClose={() => setGallery(null)} title={h.name} className="sm:max-w-4xl">
        {gallery !== null && (
          <div className="space-y-3">
            <Img src={images[gallery].url} seed={`${h.slug}-${gallery}`} alt="" className="max-h-[65vh] w-full rounded-lg object-contain" />
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setGallery(i)} className={cn('shrink-0 cursor-pointer rounded-md', i === gallery && 'ring-2 ring-brand-500')}>
                  <Img src={img.url} seed={`${h.slug}-${i}`} alt="" className="h-16 w-24 rounded-md object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Reviews({ slug }: { slug: string }) {
  const { user, openAuth } = useAuth()
  const qc = useQueryClient()
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const reviews = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => api.get<Paginated<Review> | Review[]>(`/hotels/${slug}/reviews/`).then((r) => r.data),
  })
  const list = Array.isArray(reviews.data) ? reviews.data : (reviews.data?.results ?? [])
  const post = useMutation({
    mutationFn: () => api.post(`/hotels/${slug}/reviews/`, { rating, title, comment }),
    onSuccess: () => {
      toast.success('Thanks for your review!')
      setTitle('')
      setComment('')
      qc.invalidateQueries({ queryKey: ['reviews', slug] })
      qc.invalidateQueries({ queryKey: ['hotel', slug] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <section id="reviews" className="space-y-4">
      <h2 className="text-xl font-black">Guest reviews</h2>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {list.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">{r.title}</span>
                <span className="rounded-md bg-emerald-600 px-1.5 text-sm font-black text-white">{r.rating}.0</span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{r.comment}</p>
              <p className="mt-2 text-xs text-gray-500">
                {r.author_name} · {prettyDate(r.created_at.slice(0, 10), 'd MMM yyyy')}
              </p>
            </Card>
          ))}
          {list.length === 0 && !reviews.isLoading && <p className="text-sm text-gray-500">No reviews yet.</p>}
        </div>
        <Card className="space-y-3 self-start p-5">
          <h3 className="font-black">Write a review</h3>
          {user ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                post.mutate()
              }}
            >
              <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} className="cursor-pointer">
                    <Star className={cn('size-6', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
                  </button>
                ))}
              </div>
              <Field label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
              </Field>
              <Field label="Your experience">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-brand-500"
                />
              </Field>
              <Button type="submit" className="w-full" loading={post.isPending}>
                Submit review
              </Button>
            </form>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => openAuth('login')}>
              Login to write a review
            </Button>
          )}
        </Card>
      </div>
    </section>
  )
}

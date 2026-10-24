import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HotelListItem } from '@/lib/types'

export interface RecentFlightSearch {
  from: string
  fromCity: string
  to: string
  toCity: string
  date: string
  returnDate?: string
  adults: number
  children: number
  cabin: string
}

export interface RecentHotelSearch {
  city: number
  cityName: string
  checkIn: string
  checkOut: string
  rooms: number
  guests: number
}

export type WishlistItem = Pick<HotelListItem, 'slug' | 'name' | 'city' | 'thumbnail' | 'star_rating' | 'user_rating'>

interface PrefsState {
  recentFlights: RecentFlightSearch[]
  recentHotels: RecentHotelSearch[]
  wishlist: WishlistItem[]
  addRecentFlight: (s: RecentFlightSearch) => void
  addRecentHotel: (s: RecentHotelSearch) => void
  toggleWishlist: (item: WishlistItem) => void
}

const MAX_RECENT = 4

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      recentFlights: [],
      recentHotels: [],
      wishlist: [],
      addRecentFlight: (s) =>
        set((st) => ({
          recentFlights: [s, ...st.recentFlights.filter((r) => !(r.from === s.from && r.to === s.to))].slice(
            0,
            MAX_RECENT,
          ),
        })),
      addRecentHotel: (s) =>
        set((st) => ({
          recentHotels: [s, ...st.recentHotels.filter((r) => r.city !== s.city)].slice(0, MAX_RECENT),
        })),
      toggleWishlist: (item) =>
        set((st) => ({
          wishlist: st.wishlist.some((w) => w.slug === item.slug)
            ? st.wishlist.filter((w) => w.slug !== item.slug)
            : [item, ...st.wishlist],
        })),
    }),
    { name: 'gt-prefs' },
  ),
)

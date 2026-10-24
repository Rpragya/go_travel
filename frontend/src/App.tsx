import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { RequireAuth } from '@/components/RequireAuth'
import { Spinner } from '@/components/ui/States'
import HomePage from '@/pages/HomePage'

const FlightResultsPage = lazy(() => import('@/features/flights/FlightResultsPage'))
const FlightReviewPage = lazy(() => import('@/features/flights/FlightReviewPage'))
const HotelResultsPage = lazy(() => import('@/features/hotels/HotelResultsPage'))
const HotelDetailPage = lazy(() => import('@/features/hotels/HotelDetailPage'))
const HotelBookPage = lazy(() => import('@/features/hotels/HotelBookPage'))
const CheckoutPage = lazy(() => import('@/features/booking/CheckoutPage'))
const MyTripsPage = lazy(() => import('@/features/trips/MyTripsPage'))
const TripDetailPage = lazy(() => import('@/features/trips/TripDetailPage'))
const ProfilePage = lazy(() => import('@/features/account/ProfilePage'))
const OffersPage = lazy(() => import('@/pages/OffersPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const guard = (el: ReactNode) => <RequireAuth>{el}</RequireAuth>

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="flights" element={<FlightResultsPage />} />
          <Route path="flights/review" element={<FlightReviewPage />} />
          <Route path="hotels" element={<HotelResultsPage />} />
          <Route path="hotels/:slug" element={<HotelDetailPage />} />
          <Route path="hotels/:slug/book" element={<HotelBookPage />} />
          <Route path="checkout/:reference" element={guard(<CheckoutPage />)} />
          <Route path="trips" element={guard(<MyTripsPage />)} />
          <Route path="trips/:reference" element={guard(<TripDetailPage />)} />
          <Route path="profile" element={guard(<ProfilePage />)} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

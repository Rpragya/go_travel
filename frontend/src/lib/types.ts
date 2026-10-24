export type CabinClass = 'ECONOMY' | 'PREMIUM' | 'BUSINESS'
export type BookingType = 'FLIGHT' | 'HOTEL'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
export type Gender = 'M' | 'F' | 'O'
export type PaxType = 'ADULT' | 'CHILD'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  is_verified: boolean
  date_joined: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

export interface Traveller {
  id: number
  first_name: string
  last_name: string
  gender: Gender
  date_of_birth: string | null
}

export interface Airport {
  iata: string
  name: string
  city: string
  country?: string
}

export interface Airline {
  code: string
  name: string
  color: string
}

export interface Flight {
  id: number
  airline: Airline
  flight_number: string
  origin: Airport
  destination: Airport
  departure: string
  arrival: string
  duration_minutes: number
  stops: number
  stop_airport: Airport | null
  aircraft: string
}

export interface Fare {
  id: number
  cabin_class: CabinClass
  base_fare: string
  taxes: string
  price: string
  seats_available: number
  refundable: boolean
  baggage_checkin: string
  baggage_cabin: string
  flight: Flight
}

export interface FlightSearchResponse {
  origin: { iata: string; city: string }
  destination: { iata: string; city: string }
  date: string
  count: number
  facets: {
    airlines: { code: string; name: string; min_price: string }[]
    price_range: { min: number | null; max: number | null }
  }
  results: Fare[]
}

export interface City {
  id: number
  name: string
  state: string
  country: string
  latitude: number
  longitude: number
  image_url: string
  tagline: string
  hotel_count?: number
}

export interface Amenity {
  id: number
  name: string
  icon: string
}

export type PropertyType = 'HOTEL' | 'RESORT' | 'VILLA' | 'HOMESTAY'

export interface HotelListItem {
  id: number
  slug: string
  name: string
  city: string
  locality: string
  property_type: PropertyType
  star_rating: number
  user_rating: string
  review_count: number
  latitude: number
  longitude: number
  amenities: Amenity[]
  thumbnail: string
  min_price: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface HotelSearchResponse extends Paginated<HotelListItem> {
  city: { id: number; name: string; latitude: number; longitude: number }
  facets: { price_range: { min: number | null; max: number | null }; amenities: Amenity[] }
}

export interface HotelDetail {
  id: number
  slug: string
  name: string
  city: City
  locality: string
  address: string
  description: string
  property_type: PropertyType
  star_rating: number
  user_rating: string
  review_count: number
  latitude: number
  longitude: number
  amenities: Amenity[]
  images: { url: string; caption: string }[]
  check_in_time: string
  check_out_time: string
}

export interface RoomType {
  id: number
  name: string
  description: string
  bed_type: string
  size_sqft: number
  max_guests: number
  price_per_night: string
  breakfast_included: boolean
  refundable: boolean
  image_url: string
  rooms_left?: number
}

export interface Review {
  id: number
  author_name: string
  rating: number
  title: string
  comment: string
  created_at: string
}

export interface Coupon {
  code: string
  title: string
  description: string
  discount_type: 'PERCENT' | 'FLAT'
  value: string
  max_discount: string | null
  min_amount: string
  applies_to: 'ALL' | BookingType
  valid_to: string | null
}

export interface Quote {
  base_amount: string
  taxes: string
  discount: string
  total: string
  coupon_code: string | null
  coupon_message: string | null
  coupon_valid: boolean
}

export interface Passenger {
  first_name: string
  last_name: string
  gender: Gender
  age: number
  pax_type: PaxType
}

export interface Booking {
  reference: string
  booking_type: BookingType
  status: BookingStatus
  created_at: string
  confirmed_at: string | null
  cancelled_at: string | null
  hold_expires_at: string | null
  contact_email: string
  contact_phone: string
  base_amount: string
  taxes: string
  discount: string
  total_amount: string
  refund_amount: string
  coupon_code: string | null
  passengers: Passenger[]
  flight: Fare | null
  return_flight: Fare | null
  hotel: {
    name: string
    slug: string
    city: string
    address: string
    star_rating: number
    thumbnail: string
    check_in_time: string
    check_out_time: string
    room: RoomType
  } | null
  check_in: string | null
  check_out: string | null
  nights: number
  rooms: number
  guests: number
  can_cancel: boolean
  starts_at: string
  ends_at: string
  payment_status: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED' | null
}

export interface PaymentOrder {
  provider: 'RAZORPAY' | 'MOCK'
  key_id: string | null
  order_id: string
  amount: number
  currency: string
  name: string
  description: string
  prefill: { name: string; email: string; contact: string }
}

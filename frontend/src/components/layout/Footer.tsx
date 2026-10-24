import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-900 text-gray-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm text-gray-400">Flights and hotels at the best prices. Book in minutes, travel with ease.</p>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-white">Book</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/">Flights</Link></li>
            <li><Link to="/?tab=hotels">Hotels</Link></li>
            <li><Link to="/offers">Offers</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-white">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/trips">My Trips</Link></li>
            <li><Link to="/profile">Profile</Link></li>
            <li><Link to="/wishlist">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold text-white">About</h4>
          <p className="text-sm text-gray-400">
            Go Travels is a personal portfolio project. Bookings and payments run in test mode.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Go Travels. Built with React, TypeScript, Django & DRF.
      </div>
    </footer>
  )
}

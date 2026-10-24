import { BadgePercent, Briefcase, Building2, ChevronDown, Heart, LogOut, Plane, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Logo } from '@/components/Logo'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/utils'
import { useAuth } from '@/store/auth'

const links = [
  { to: '/', label: 'Flights', icon: Plane, end: true },
  { to: '/?tab=hotels', label: 'Hotels', icon: Building2, end: false },
  { to: '/offers', label: 'Offers', icon: BadgePercent, end: false },
  { to: '/trips', label: 'My Trips', icon: Briefcase, end: false },
]

export function Navbar() {
  const { user, openAuth, logout } = useAuth()
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  return (
    <header className="sticky top-0 z-[500] bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center rounded-lg px-4 py-1 text-xs font-bold text-gray-600 hover:text-brand-600',
                  isActive && to !== '/?tab=hotels' && 'text-brand-600',
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto">
          {user ? (
            <Popover
              open={menu}
              onClose={() => setMenu(false)}
              align="right"
              className="w-56 p-2"
              trigger={
                <button
                  onClick={() => setMenu((m) => !m)}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-brand-50 py-1.5 pr-3 pl-1.5 text-sm font-bold text-brand-700"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-white">
                    {(user.first_name || user.email)[0].toUpperCase()}
                  </span>
                  <span className="hidden max-w-32 truncate sm:inline">Hi, {user.first_name || 'Traveller'}</span>
                  <ChevronDown className="size-4" />
                </button>
              }
            >
              {[
                { to: '/profile', label: 'My Profile', icon: UserIcon },
                { to: '/trips', label: 'My Trips', icon: Briefcase },
                { to: '/wishlist', label: 'Wishlist', icon: Heart },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenu(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Icon className="size-4 text-gray-500" /> {label}
                </Link>
              ))}
              <button
                onClick={() => {
                  logout()
                  qc.clear()
                  setMenu(false)
                  navigate('/')
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </Popover>
          ) : (
            <button
              onClick={() => openAuth('login')}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-sm font-bold text-white"
            >
              <UserIcon className="size-4" /> Login or Create Account
            </button>
          )}
        </div>
      </div>
      <nav className="scrollbar-none flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-1 md:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={label} to={to} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-gray-600">
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

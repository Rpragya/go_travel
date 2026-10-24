import { Lock } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/store/auth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, openAuth } = useAuth()
  useEffect(() => {
    if (!user) openAuth('login')
  }, [user, openAuth])

  if (user) return <>{children}</>
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <Lock className="size-12 text-brand-500" />
      <h1 className="text-2xl font-black">Please log in</h1>
      <p className="text-gray-500">Log in to view your trips, profile and bookings.</p>
      <Button onClick={() => openAuth('login')}>Login or create account</Button>
    </div>
  )
}

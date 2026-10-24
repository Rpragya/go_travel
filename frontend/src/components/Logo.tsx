import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2', className)} aria-label="Go Travels home">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className={cn('text-2xl font-black tracking-tight', light ? 'text-white' : 'text-brand-900')}>
        go<span className="text-accent-500">travels</span>
      </span>
    </Link>
  )
}

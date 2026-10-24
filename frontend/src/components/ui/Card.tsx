import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.12)]', className)} {...props} />
}

export function Badge({
  className,
  tone = 'gray',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'gray' | 'green' | 'red' | 'blue' | 'orange' | 'yellow' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-brand-50 text-brand-700',
    orange: 'bg-orange-50 text-orange-700',
    yellow: 'bg-amber-50 text-amber-700',
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold', tones[tone], className)}
      {...props}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />
}

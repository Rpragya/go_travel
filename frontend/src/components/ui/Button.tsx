import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-sm hover:from-brand-500 hover:to-brand-700',
  accent: 'bg-accent-500 text-white hover:bg-accent-600',
  outline: 'border border-brand-500 text-brand-600 bg-white hover:bg-brand-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}
const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  pill?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, pill, className, children, disabled, ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        pill ? 'rounded-full' : 'rounded-lg',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

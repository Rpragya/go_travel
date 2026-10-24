import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Lightweight anchored popover that closes on outside click / Escape. */
export function Popover({
  open,
  onClose,
  trigger,
  children,
  className,
  align = 'left',
}: {
  open: boolean
  onClose: () => void
  trigger: ReactNode
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

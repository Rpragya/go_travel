import { clsx, type ClassValue } from 'clsx'
import { addDays, format, parseISO } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function formatINR(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return inr.format(Number(value))
}

const IST = 'Asia/Kolkata'

/** Times are shown in IST, like the airline schedule, regardless of the browser's time zone. */
export function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST }).format(
    new Date(iso),
  )
}

export function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: IST,
  }).format(new Date(iso))
}

export function fmtDay(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST }).format(
    new Date(iso),
  )
}

/** Days between two instants' IST calendar dates (for the "+1 day" badge). */
export function dayDiff(fromIso: string, toIso: string) {
  const d = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date(iso))
  return Math.round((Date.parse(d(toIso)) - Date.parse(d(fromIso))) / 86_400_000)
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/** yyyy-MM-dd date strings are handled as local calendar dates. */
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')
export const fromISODate = (s: string) => parseISO(s)
export const prettyDate = (s: string, pattern = 'EEE, d MMM yy') => format(parseISO(s), pattern)
export const todayISO = () => toISODate(new Date())
export const plusDays = (n: number, from = new Date()) => toISODate(addDays(from, n))

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / 86_400_000)
}

export function placeholderImage(seed: string, w = 800, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`
}

export function pluralize(n: number, word: string, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`
}

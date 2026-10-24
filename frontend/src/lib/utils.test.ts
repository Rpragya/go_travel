import { dayDiff, fmtTime, formatDuration, formatINR, nightsBetween } from './utils'

describe('formatting helpers', () => {
  it('formats rupees in Indian grouping without decimals', () => {
    expect(formatINR(125000)).toBe('₹1,25,000')
    expect(formatINR('8400.00')).toBe('₹8,400')
    expect(formatINR(null)).toBe('-')
  })

  it('formats durations', () => {
    expect(formatDuration(125)).toBe('2h 05m')
  })

  it('shows times in IST regardless of browser zone', () => {
    expect(fmtTime('2026-11-03T12:45:00Z')).toBe('18:15')
  })

  it('detects overnight arrivals', () => {
    expect(dayDiff('2026-11-03T17:00:00Z', '2026-11-03T19:00:00Z')).toBe(1) // 22:30 -> 00:30 IST
    expect(dayDiff('2026-11-03T03:00:00Z', '2026-11-03T05:00:00Z')).toBe(0)
  })

  it('counts nights', () => {
    expect(nightsBetween('2026-11-03', '2026-11-06')).toBe(3)
  })
})

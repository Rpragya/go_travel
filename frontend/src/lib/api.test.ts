import { AxiosError, AxiosHeaders } from 'axios'
import { errorMessage } from './api'

const drfError = (data: unknown, status = 400) =>
  new AxiosError('fail', 'ERR', undefined, undefined, {
    data, status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() },
  })

describe('errorMessage', () => {
  it('reads DRF detail', () => {
    expect(errorMessage(drfError({ detail: 'Only 2 seat(s) left.' }))).toBe('Only 2 seat(s) left.')
  })
  it('reads first field error with field name', () => {
    expect(errorMessage(drfError({ contact_phone: ['Enter a valid phone number.'] }))).toBe(
      'contact phone: Enter a valid phone number.',
    )
  })
  it('falls back for unknown errors', () => {
    expect(errorMessage(new Error('x'), 'fallback')).toBe('fallback')
  })
})

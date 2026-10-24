import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter'

it('respects min and max', async () => {
  const onChange = vi.fn()
  render(<Counter label="Adults" value={1} min={1} max={2} onChange={onChange} />)
  expect(screen.getByLabelText('Fewer Adults')).toBeDisabled()
  await userEvent.click(screen.getByLabelText('More Adults'))
  expect(onChange).toHaveBeenCalledWith(2)
})

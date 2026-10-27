import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'

import { Checkbox } from './Checkbox'

expect.extend(toHaveNoViolations)

describe('Checkbox', () => {
  it('associates the label and toggles on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Subscribe" checked={false} onChange={onChange} />)

    const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' })
    await user.click(checkbox)

    expect(onChange).toHaveBeenCalledOnce()
  })

  it('shows a description and links it via aria-describedby', () => {
    render(<Checkbox label="Opt in" description="You can change this later." />)

    const checkbox = screen.getByRole('checkbox', { name: 'Opt in' })
    expect(checkbox).toHaveAccessibleDescription('You can change this later.')
  })

  it('marks the checkbox invalid and links the error message', () => {
    render(
      <Checkbox
        label="I confirm these details are accurate."
        error
        helperText="Confirm that these details are accurate before continuing."
      />,
    )

    const checkbox = screen.getByRole('checkbox', {
      name: 'I confirm these details are accurate.',
    })
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    expect(checkbox).toHaveAccessibleDescription(
      'Confirm that these details are accurate before continuing.',
    )
  })

  it('keeps the description visible alongside an error, both linked', () => {
    render(
      <Checkbox
        label="I agree"
        description="Required to continue."
        error
        helperText="This must be confirmed."
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'I agree' })
    expect(screen.getByText('Required to continue.')).toBeInTheDocument()
    expect(screen.getByText('This must be confirmed.')).toBeInTheDocument()
    expect(checkbox).toHaveAccessibleDescription(
      'Required to continue. This must be confirmed.',
    )
  })

  it('suppresses helperText in favor of the description when there is no error', () => {
    render(
      <Checkbox
        label="I agree"
        description="Required to continue."
        helperText="This would only show on error."
      />,
    )

    expect(screen.getByText('Required to continue.')).toBeInTheDocument()
    expect(
      screen.queryByText('This would only show on error.'),
    ).not.toBeInTheDocument()
  })

  it('has no automated accessibility violations, with or without an error', async () => {
    const { container, rerender } = render(<Checkbox label="I agree" />)
    expect(await axe(container)).toHaveNoViolations()

    rerender(<Checkbox label="I agree" error helperText="This is required." />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

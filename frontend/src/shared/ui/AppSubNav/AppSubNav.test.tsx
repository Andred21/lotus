import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppSubNav } from './AppSubNav'

const items = [
  { key: 'certificados', label: 'Certificados' },
  { key: 'otro', label: 'Otro' },
]

describe('AppSubNav', () => {
  it('marca o item atual com aria-current e chama onSelect', () => {
    const onSelect = vi.fn()
    render(<AppSubNav items={items} activeKey="certificados" onSelect={onSelect} ariaLabel="Submódulos" />)

    expect(screen.getByRole('navigation', { name: 'Submódulos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Certificados' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Otro' }).getAttribute('aria-current')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Otro' }))
    expect(onSelect).toHaveBeenCalledWith('otro')
  })
})

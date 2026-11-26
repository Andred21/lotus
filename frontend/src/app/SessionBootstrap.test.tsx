import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SessionBootstrap } from './SessionBootstrap'

vi.mock('@features/identity/hooks/useSessionBootstrap', () => ({
  useSessionBootstrap: () => 'loading',
}))

describe('SessionBootstrap', () => {
  it('mostra o spinner de boot com 30px (o svg ignora font-size)', () => {
    const { container } = render(<SessionBootstrap>filho</SessionBootstrap>)
    const spinner = container.querySelector('svg')
    expect(spinner?.getAttribute('class')).toContain('size-[1.875rem]')
    expect(spinner?.getAttribute('class')).toContain('animate-spin')
  })
})

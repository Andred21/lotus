import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBlobDownload } from './useBlobDownload'

const criar = vi.fn(() => 'blob:fake-url')
const revogar = vi.fn()

beforeEach(() => {
  criar.mockClear()
  revogar.mockClear()
  URL.createObjectURL = criar as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = revogar as unknown as typeof URL.revokeObjectURL
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useBlobDownload', () => {
  it('salva com o nome dado e revoga o object URL', () => {
    const ancoras: HTMLAnchorElement[] = []
    const clique = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        ancoras.push(this)
        // Durante o clique o <a> precisa estar no DOM para o download valer.
        expect(document.body.contains(this)).toBe(true)
      })

    const { result } = renderHook(() => useBlobDownload())
    result.current(new Blob(['x']), 'plantilla-alumnos.xlsx')

    expect(clique).toHaveBeenCalledTimes(1)
    expect(ancoras[0].download).toBe('plantilla-alumnos.xlsx')
    expect(ancoras[0].href).toBe('blob:fake-url')
    expect(revogar).toHaveBeenCalledWith('blob:fake-url')
    expect(document.body.contains(ancoras[0])).toBe(false)
  })
})

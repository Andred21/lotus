import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPanel } from './AuthPanel'

/** `t` devolve a própria chave; o texto traduzido é assunto do `parity.test.ts`. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

/**
 * As duas rotas apontam para o MESMO elemento, igual ao router de verdade: é
 * essa forma que faz o react-router reconciliar em vez de remontar. Se algum dia
 * uma atualização de dependência mudar isso, é este teste que avisa — o e-mail
 * deixaria de atravessar o clique.
 */
function renderPanel(entry: string) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<AuthPanel />} />
          <Route path="/recuperar-clave" element={<AuthPanel />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('AuthPanel', () => {
  it('em /login mostra os campos do login', () => {
    const { container } = renderPanel('/login')

    expect(container.querySelector('#login-email')).not.toBeNull()
    expect(container.querySelector('#login-password')).not.toBeNull()
    expect(container.querySelector('#forgot-email')).toBeNull()
  })

  it('o clique em recuperar troca so os campos e leva o e-mail digitado', () => {
    const { container } = renderPanel('/login')

    fireEvent.change(container.querySelector('#login-email') as HTMLInputElement, {
      target: { value: 'ana@lotus.cl' },
    })
    fireEvent.click(container.querySelector('a[href="/recuperar-clave"]') as HTMLAnchorElement)

    const forgot = container.querySelector('#forgot-email') as HTMLInputElement
    expect(forgot.value).toBe('ana@lotus.cl')
    expect(container.querySelector('#login-password')).toBeNull()
  })

  it('em /recuperar-clave abre no modo recuperacao', () => {
    const { container } = renderPanel('/recuperar-clave')

    expect(container.querySelector('#forgot-email')).not.toBeNull()
    expect(container.querySelector('#login-password')).toBeNull()
  })
})

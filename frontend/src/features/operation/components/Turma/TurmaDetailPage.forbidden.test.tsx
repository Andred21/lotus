import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api } from '@shared/api/axios'
import { createWrapper } from '@shared/testing/providers'
import { TurmaDetailPage } from './TurmaDetailPage'

/**
 * O CAMINHO REAL do 403 numa tela de detalhe: GET -> `useTurma` -> `useTurmaDetail`
 * -> página -> `AppErrorState`. Só o transporte e o i18n são trocados. O teste do
 * componente isolado não prova nada aqui — o botão some (ou não) no ponto onde
 * o `reload` nasce, e é ele que a página repassa.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return { ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: mockUseTranslation() }
})

vi.mock('@shared/api/axios', () => ({ api: { get: vi.fn() } }))

vi.mock('./TurmaConfigCard', () => ({ TurmaConfigCard: () => null }))
vi.mock('./RedatorDesignation', () => ({ RedatorDesignation: () => null }))
vi.mock('../Enrollment/EnrollmentSection', () => ({ EnrollmentSection: () => null }))
vi.mock('../Document/TurmaDocuments', () => ({ TurmaDocuments: () => null }))
vi.mock('../Document/ConcludePanel', () => ({ ConcludePanel: () => null }))

const get = vi.mocked(api.get)

function montar() {
  const { wrapper: Provedor } = createWrapper()
  render(
    <MemoryRouter initialEntries={['/operacion/turmas/5']}>
      <Routes>
        <Route
          path="/operacion/turmas/:id"
          element={
            <Provedor>
              <TurmaDetailPage />
            </Provedor>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

/** `mockImplementation`, e não `mockRejectedValue`: este cria a promise rejeitada
 * na hora da configuração, e sem ninguém aguardando ela vira rejeição não tratada. */
function falhaCom(problem: { status: number; detail: string; title: string }) {
  get.mockImplementation(() => Promise.reject({ ...problem, type: 'about:blank' }))
}

// Chaves, e não a seta: o `mockReset` devolve o próprio mock, e o vitest trata a
// função devolvida por um `beforeEach` como limpeza e a CHAMA ao fim do teste —
// aqui isso reemitia a rejeição configurada e reprovava um teste verde.
beforeEach(() => {
  get.mockReset()
})

describe('TurmaDetailPage — falha de carga', () => {
  it('403 do GET: explica a recusa e NÃO oferece Reintentar', async () => {
    falhaCom({ status: 403, detail: 'Sin permiso', title: 'Forbidden' })
    montar()

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.retry' })).toBeNull()
  })

  it('500 do GET: segue oferecendo Reintentar (a falha pode ser passageira)', async () => {
    falhaCom({ status: 500, detail: 'boom', title: 'Server Error' })
    montar()

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeTruthy()
  })
})

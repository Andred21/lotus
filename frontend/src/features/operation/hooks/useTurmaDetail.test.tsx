import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { api } from '@shared/api/axios'
import { useTurmaDetail } from './useTurmaDetail'
import { TURMA_TABS } from '../lib/turmaTabs'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

const DOCS = TURMA_TABS.indexOf('docs')

/** O GET da turma não tem parte nesta prova: o que se mede é a aba, que vem da
 * URL. Uma promessa que nunca resolve mantém o hook no ramo de carga sem
 * orfanar rejeição. (Cliente estável por teste — molde do `useTurmasPage`.) */
function montar(rota: string) {
  get.mockReturnValue(new Promise(() => {}))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/operacion/turmas/:id" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )

  return renderHook(() => useTurmaDetail(), { wrapper: Wrapper })
}

describe('useTurmaDetail — a aba ativa é da URL (Q-1 do review de 2026-08-24)', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('`?tab=docs` abre o painel de documentação, não o primeiro', () => {
    // O defeito era `useState(0)`: o link da pendência do redator prometia a aba
    // "Documentación" e entregava "Configuración".
    const { result } = montar('/operacion/turmas/4?tab=docs')

    expect(result.current.tab).toBe(DOCS)
    expect(DOCS).not.toBe(0)
  })

  it('sem parâmetro, abre a primeira aba', () => {
    const { result } = montar('/operacion/turmas/4')

    expect(result.current.tab).toBe(0)
  })

  it('aba desconhecida na URL não deixa a página sem painel', () => {
    const { result } = montar('/operacion/turmas/4?tab=inexistente')

    expect(result.current.tab).toBe(0)
  })

  it('trocar de aba reescreve a URL — a barra de endereço não mente', () => {
    const { result } = montar('/operacion/turmas/4')

    act(() => {
      result.current.setTab(DOCS)
    })

    expect(result.current.tab).toBe(DOCS)
  })

  it('a turma continua vindo do path, não do parâmetro de aba', () => {
    const { result } = montar('/operacion/turmas/7?tab=docs')

    expect(result.current.turmaId).toBe(7)
  })
})

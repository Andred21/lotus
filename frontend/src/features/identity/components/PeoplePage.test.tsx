import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import { PeoplePage } from './PeoplePage'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

/** Conta no limite do AXIOS, não no do hook: é GET de verdade que a D-04 mede,
 * e contar renders do hook contaria outra coisa. */
const gets: string[] = []

beforeEach(() => {
  gets.length = 0
  vi.spyOn(api, 'get').mockImplementation(((url: string) => {
    gets.push(url)
    return Promise.resolve({ data: [] })
  }) as never)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const montar = () => {
  const qc = new QueryClient({
    // `staleTime` NÃO entra aqui: é justamente o que a página passa e o que
    // este teste mede. Fixá-lo no client provaria o client, não a página.
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <PeoplePage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const gtsDe = (recurso: string) => gets.filter((u) => u === `/api/${recurso}`).length

describe('PeoplePage — uma aba, um GET', () => {
  it('a montagem busca SO a aba ativa', async () => {
    montar()

    await waitFor(() => expect(gtsDe('redatores')).toBe(1))
    // O defeito da D-04: `useStudentsPage()` no corpo da página buscava alunos
    // com a aba de alunos fechada.
    expect(gtsDe('students')).toBe(0)
  })

  it('abrir a segunda aba busca a segunda aba, uma vez', async () => {
    montar()
    await waitFor(() => expect(gtsDe('redatores')).toBe(1))

    fireEvent.click(screen.getByRole('tab', { name: 'redator.tabStudents' }))

    await waitFor(() => expect(gtsDe('students')).toBe(1))
    expect(gtsDe('redatores')).toBe(1)
  })

  it('voltar a aba dentro da janela NAO refaz o GET', async () => {
    // Sem `staleTime` a volta refaria: default 0 com `refetchOnMount` ligado
    // (AppProviders.tsx:6-10). Alternar 3 vezes custaria 4 GETs contra os 2 de
    // hoje -- o conserto estrutural sozinho pioraria quem alterna.
    montar()
    await waitFor(() => expect(gtsDe('redatores')).toBe(1))

    fireEvent.click(screen.getByRole('tab', { name: 'redator.tabStudents' }))
    await waitFor(() => expect(gtsDe('students')).toBe(1))

    fireEvent.click(screen.getByRole('tab', { name: 'redator.tabRedatores' }))
    await waitFor(() => expect(gtsDe('students')).toBe(1))

    expect(gtsDe('redatores')).toBe(1)
  })
})

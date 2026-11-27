import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import { TurmaCreatePage } from './TurmaCreatePage'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// O salvar "dá certo" na hora: o que se prova é o que a página faz DEPOIS.
const criar = vi.hoisted(() => vi.fn())
vi.mock('../../api/useTurmas', () => ({
  useCreateTurma: () => ({ mutate: criar, isPending: false, error: null }),
  useUpdateTurma: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@shared/api/coursesApi', () => ({ coursesApi: { useList: () => ({ data: [] }) } }))

/** A página REAL com o cartão REAL (o `TurmaCreatePage.test.tsx` troca o cartão
 * por um botão): a guarda vive no form do cartão. */
function montar() {
  const router = createMemoryRouter(
    [
      { path: '/operacion', element: <p>lista</p> },
      { path: '/operacion/turmas/nueva/:quoteId', element: <TurmaCreatePage /> },
      { path: '/operacion/turmas/:id', element: <p>detalhe</p> },
    ],
    { initialEntries: ['/operacion?q=ana', '/operacion/turmas/nueva/3'], initialIndex: 1 },
  )
  render(<RouterProvider router={router} />)
  return router
}

const perguntou = () => screen.queryByText('common.discardTitle') !== null
const sujar = () => fireEvent.change(screen.getByLabelText('operation.config.local'), { target: { value: 'Santiago' } })
const volver = () => fireEvent.click(screen.getByRole('button', { name: /operation\.detail\.back/ }))
const cancelar = () => fireEvent.click(screen.getByRole('button', { name: /operation\.config\.cancel/ }))
const descartar = () => fireEvent.click(screen.getByRole('button', { name: /common\.discardConfirm/ }))

beforeAll(registerPrimeLocales)
beforeEach(() => {
  criar.mockReset()
  criar.mockImplementation((_vars: unknown, opts?: { onSuccess?: (t: { id: number }) => void }) => opts?.onSuccess?.({ id: 7 }))
})

describe('TurmaCreatePage — guarda de rascunho', () => {
  it('Volver sem mudança não pergunta', async () => {
    const router = montar()

    volver()

    await waitFor(() => expect(router.state.location.pathname).toBe('/operacion'))
    expect(perguntou()).toBe(false)
  })

  it('Volver com mudança pergunta, e Descartar volta', async () => {
    const router = montar()
    sujar()

    volver()

    await waitFor(() => expect(perguntou()).toBe(true))
    expect(router.state.location.pathname).toBe('/operacion/turmas/nueva/3')

    descartar()
    await waitFor(() => expect(router.state.location.pathname).toBe('/operacion'))
  })

  it('Seguir editando fica na criação, com o rascunho', async () => {
    const router = montar()
    sujar()
    volver()
    await waitFor(() => expect(perguntou()).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: /common\.keepEditing/ }))

    await waitFor(() => expect(perguntou()).toBe(false))
    expect(router.state.location.pathname).toBe('/operacion/turmas/nueva/3')
    expect((screen.getByLabelText('operation.config.local') as HTMLInputElement).value).toBe('Santiago')
  })

  it('Cancelar com mudança pergunta UMA vez: o Descartar não reabre o aviso', async () => {
    const router = montar()
    sujar()

    cancelar()
    await waitFor(() => expect(perguntou()).toBe(true))
    descartar()

    await waitFor(() => expect(router.state.location.pathname).toBe('/operacion'))
    expect(perguntou()).toBe(false)
  })

  it('salvar navega ao detalhe sem perguntar', async () => {
    const router = montar()
    sujar()
    fireEvent.change(screen.getByLabelText('operation.config.startDate'), { target: { value: '2026-01-05' } })

    fireEvent.click(screen.getByRole('button', { name: /operation\.config\.save/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/operacion/turmas/7'))
    expect(perguntou()).toBe(false)
    expect(criar).toHaveBeenCalledTimes(1)
  })
})

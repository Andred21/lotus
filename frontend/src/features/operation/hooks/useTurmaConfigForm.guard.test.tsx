import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createWrapper } from '@shared/testing/providers'
import { useTurmaConfigForm } from './useTurmaConfigForm'

// O salvar "dá certo" na hora: o que se prova é o que o hook faz se o `onSaved` falhar.
vi.mock('../api/useTurmas', () => ({
  useCreateTurma: () => ({
    mutate: (_vars: unknown, opts?: { onSuccess?: (t: { id: number }) => void }) => opts?.onSuccess?.({ id: 7 }),
    isPending: false,
    error: null,
  }),
  useUpdateTurma: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@shared/api/coursesApi', () => ({ coursesApi: { useList: () => ({ data: [] }) } }))

/** O hook com o blocker montado, como o cartão faz via `DiscardChangesDialog`. */
function Sonda({ onSaved, aoPronto }: { onSaved: (id: number) => void; aoPronto: (submit: () => void) => void }) {
  const f = useTurmaConfigForm({ mode: 'create', turma: null, quoteId: 3, onSaved })
  const navigate = useNavigate()
  const { submit } = f
  useEffect(() => aoPronto(submit))
  return (
    <>
      {f.guard.dialogProps.blocker}
      <p data-testid="onde">{useLocation().pathname}</p>
      <p data-testid="aviso">{String(f.guard.dialogProps.visible)}</p>
      <button onClick={() => f.set('local_aplicacao', 'Santiago')}>sujar</button>
      <button onClick={() => void navigate('/otra')}>ir</button>
    </>
  )
}

describe('useTurmaConfigForm — pós-salvar que falha', () => {
  it('onSaved que lança não deixa a liberação pendurada: navegar sujo ainda pergunta', async () => {
    let salvar = () => {}
    const { wrapper } = createWrapper({ route: '/lista' })
    render(
      <Sonda aoPronto={(submit) => { salvar = submit }} onSaved={() => { throw new Error('onSaved reprovou') }} />,
      { wrapper },
    )
    fireEvent.click(screen.getByText('sujar'))

    expect(() => act(() => salvar())).toThrow('onSaved reprovou')
    fireEvent.click(screen.getByText('ir'))

    await waitFor(() => expect(screen.getByTestId('aviso').textContent).toBe('true'))
    expect(screen.getByTestId('onde').textContent).toBe('/lista')
  })
})

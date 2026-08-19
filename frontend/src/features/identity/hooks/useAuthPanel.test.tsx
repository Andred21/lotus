import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuthPanel } from './useAuthPanel'

/**
 * O hook depende do `pathname`, então não dá para medi-lo com `renderHook`
 * puro: a prova que importa é a TROCA de rota. O harness abaixo é o menor
 * componente que expõe o retorno do hook e navega, e as duas rotas usam o
 * MESMO elemento de propósito — é essa a forma que preserva o estado.
 */
function Harness() {
  const { mode, email, setEmail, switched } = useAuthPanel()

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="switched">{String(switched)}</span>
      <input
        data-testid="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Link to="/recuperar-clave">ir</Link>
    </div>
  )
}

function renderHarness(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Harness />} />
        <Route path="/recuperar-clave" element={<Harness />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
})

describe('useAuthPanel', () => {
  it('deriva o modo do pathname', () => {
    const login = renderHarness('/login')
    expect(login.getByTestId('mode').textContent).toBe('login')
    cleanup()

    const forgot = renderHarness('/recuperar-clave')
    expect(forgot.getByTestId('mode').textContent).toBe('forgot')
  })

  it('nao marca troca no mount, nem em deep link direto na recuperacao', () => {
    const login = renderHarness('/login')
    expect(login.getByTestId('switched').textContent).toBe('false')
    cleanup()

    const forgot = renderHarness('/recuperar-clave')
    expect(forgot.getByTestId('switched').textContent).toBe('false')
  })

  it('preserva o e-mail digitado ao trocar de modo, e marca a troca', () => {
    const { getByTestId, getByText } = renderHarness('/login')

    fireEvent.change(getByTestId('email'), { target: { value: 'ana@lotus.cl' } })
    fireEvent.click(getByText('ir'))

    expect(getByTestId('mode').textContent).toBe('forgot')
    expect((getByTestId('email') as HTMLInputElement).value).toBe('ana@lotus.cl')
    expect(getByTestId('switched').textContent).toBe('true')
  })
})

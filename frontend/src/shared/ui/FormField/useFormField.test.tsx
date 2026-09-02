import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useFormField } from './useFormField'
import { useFieldBind } from './fieldContext'

afterEach(() => {
  cleanup()
})

type Campos = { rut: string; nome: string }

function ControleFake() {
  const bind = useFieldBind((e: { target: { value: string } }) => e.target.value)
  return (
    <input
      data-testid="controle"
      value={(bind.value as string | undefined) ?? ''}
      onChange={(e) => bind.onChange?.({ target: { value: e.target.value } })}
    />
  )
}

function Formulario({
  inicial = { rut: '', nome: '' },
  fieldErrors = null,
  readOnly = false,
  onSet,
}: {
  inicial?: Campos
  fieldErrors?: Record<string, string[]> | null
  readOnly?: boolean
  onSet?: (k: keyof Campos, v: unknown) => void
}) {
  const [form, setForm] = useState<Campos>(inicial)
  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => {
    onSet?.(k, v)
    setForm((f) => ({ ...f, [k]: v }))
  }
  const campo = useFormField({ form, set, fieldErrors, readOnly })
  return (
    <campo.Field name="rut" label="RUT">
      <ControleFake />
    </campo.Field>
  )
}

describe('useFormField', () => {
  it('lê o valor do form pelo name', () => {
    render(<Formulario inicial={{ rut: '76.123.456-7', nome: '' }} />)
    expect((screen.getByTestId('controle') as HTMLInputElement).value).toBe('76.123.456-7')
  })

  it('escreve no form pelo name', () => {
    const onSet = vi.fn()
    render(<Formulario onSet={onSet} />)

    fireEvent.change(screen.getByTestId('controle'), { target: { value: '77' } })

    expect(onSet).toHaveBeenCalledWith('rut', '77')
    expect((screen.getByTestId('controle') as HTMLInputElement).value).toBe('77')
  })

  it('mostra o erro do backend da própria chave', () => {
    render(<Formulario fieldErrors={{ rut: ['RUT inválido'], nome: ['ignorado'] }} />)
    expect(screen.getByText('RUT inválido')).toBeTruthy()
    expect(screen.queryByText('ignorado')).toBeNull()
  })

  it('herda readOnly do bundle e mostra o valor cru', () => {
    render(<Formulario inicial={{ rut: '76.123.456-7', nome: '' }} readOnly />)
    expect(screen.queryByTestId('controle')).toBeNull()
    expect(screen.getByText('76.123.456-7')).toBeTruthy()
  })

  it('NÃO remonta o input entre duas teclas — o nó e o foco sobrevivem', () => {
    render(<Formulario />)
    const antes = screen.getByTestId('controle') as HTMLInputElement
    antes.focus()

    fireEvent.change(antes, { target: { value: '7' } })
    fireEvent.change(screen.getByTestId('controle'), { target: { value: '76' } })

    const depois = screen.getByTestId('controle') as HTMLInputElement
    // Identidade do NÓ, não do valor: componente recriado a cada render remonta
    // o input, e o remonte é invisível para uma asserção de valor.
    expect(depois).toBe(antes)
    expect(document.activeElement).toBe(depois)
    expect(depois.value).toBe('76')
  })
})

describe('useFormField — prop do chamador vence', () => {
  function ComEscapes({ readOnly }: { readOnly: boolean }) {
    const [form, setForm] = useState<Campos>({ rut: 'cru', nome: '' })
    const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setForm((f) => ({ ...f, [k]: v }))
    const campo = useFormField({ form, set, fieldErrors: { rut: ['do contexto'] }, readOnly: true })
    return (
      <campo.Field name="rut" label="RUT" error="do chamador" readOnly={readOnly} value="apresentado">
        <ControleFake />
      </campo.Field>
    )
  }

  it('a prop error vence o fieldErrors', () => {
    render(<ComEscapes readOnly />)
    expect(screen.getByText('do chamador')).toBeTruthy()
    expect(screen.queryByText('do contexto')).toBeNull()
  })

  it('a prop value vence o valor cru em leitura', () => {
    render(<ComEscapes readOnly />)
    expect(screen.getByText('apresentado')).toBeTruthy()
    expect(screen.queryByText('cru')).toBeNull()
  })

  it('a prop readOnly={false} vence o readOnly do bundle', () => {
    render(<ComEscapes readOnly={false} />)
    expect(screen.getByTestId('controle')).toBeTruthy()
  })
})

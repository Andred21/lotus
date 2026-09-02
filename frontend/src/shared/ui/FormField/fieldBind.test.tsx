import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FormField } from './FormField'
import { useFieldBind } from './fieldContext'

afterEach(() => {
  cleanup()
})

/** Controle de teste: o mesmo contrato dos wrappers de `shared/ui` — pesca o
 * bind do contexto e diz qual é a forma do próprio evento. */
function ControleFake(props: { value?: string; onChange?: (e: { target: { value: string } }) => void }) {
  const bind = useFieldBind((e: { target: { value: string } }) => e.target.value)
  const value = props.value ?? (bind.value as string | undefined) ?? ''
  const onChange = props.onChange ?? bind.onChange
  return <input data-testid="controle" value={value} onChange={(e) => onChange?.({ target: { value: e.target.value } })} />
}

describe('bind pelo FieldContext', () => {
  it('entrega valor e setter ao controle', () => {
    const onChange = vi.fn()
    render(
      <FormField label="RUT" bind={{ value: '76.123.456-7', onChange }}>
        <ControleFake />
      </FormField>,
    )

    const input = screen.getByTestId('controle') as HTMLInputElement
    expect(input.value).toBe('76.123.456-7')

    fireEvent.change(input, { target: { value: '77' } })
    expect(onChange).toHaveBeenCalledWith('77')
  })

  it('prop do chamador vence o bind', () => {
    const doContexto = vi.fn()
    const doChamador = vi.fn()
    render(
      <FormField label="RUT" bind={{ value: 'do contexto', onChange: doContexto }}>
        <ControleFake value="do chamador" onChange={doChamador} />
      </FormField>,
    )

    const input = screen.getByTestId('controle') as HTMLInputElement
    expect(input.value).toBe('do chamador')

    fireEvent.change(input, { target: { value: 'x' } })
    expect(doChamador).toHaveBeenCalled()
    expect(doContexto).not.toHaveBeenCalled()
  })

  it('sem FormField em volta, o controle não recebe nada', () => {
    render(<ControleFake />)
    expect((screen.getByTestId('controle') as HTMLInputElement).value).toBe('')
  })

  it('em modo leitura não há controle a ligar', () => {
    render(
      <FormField label="RUT" readOnly value="76.123.456-7" bind={{ value: 'x', onChange: vi.fn() }}>
        <ControleFake />
      </FormField>,
    )
    expect(screen.queryByTestId('controle')).toBeNull()
    expect(screen.getByText('76.123.456-7')).toBeTruthy()
  })
})

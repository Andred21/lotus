import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FormField } from './FormField'
import { useFieldBind } from './fieldContext'
import { useFormField } from './useFormField'
import { AppInputText } from '../AppInputText/AppInputText'
import { AppDropdown } from '../AppDropdown/AppDropdown'

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

/* eslint-disable react-hooks/static-components -- o `Field` é montado no mesmo
 * arquivo em que o hook roda porque é o que o teste prova; nos call sites reais
 * ele desce como prop e a regra passa limpa. */
describe('os wrappers de shared/ui pescam o bind', () => {
  type Campos = { rut: string; giro: string | null; tipo: string | null }

  function Tela() {
    const [form, setForm] = useState<Campos>({ rut: '76.123.456-7', giro: null, tipo: 'client' })
    const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setForm((f) => ({ ...f, [k]: v }))
    const Field = useFormField({ form, set, fieldErrors: null, readOnly: false })
    return (
      <>
        <Field name="rut" label="RUT"><AppInputText /></Field>
        <Field name="giro" label="Giro"><AppInputText /></Field>
        <Field name="tipo" label="Tipo">
          <AppDropdown options={[{ value: 'client', label: 'Cliente' }, { value: 'other', label: 'Outro' }]} />
        </Field>
      </>
    )
  }

  it('AppInputText mostra o valor do form e escreve de volta', () => {
    render(<Tela />)
    const input = screen.getByLabelText('RUT') as HTMLInputElement
    expect(input.value).toBe('76.123.456-7')

    fireEvent.change(input, { target: { value: '77.000.000-0' } })
    expect((screen.getByLabelText('RUT') as HTMLInputElement).value).toBe('77.000.000-0')
  })

  it('AppInputText mostra vazio, não "null", quando o campo é nulo', () => {
    render(<Tela />)
    expect((screen.getByLabelText('Giro') as HTMLInputElement).value).toBe('')
  })

  it('AppDropdown recebe o valor do form', () => {
    render(<Tela />)
    expect(screen.getByLabelText('Tipo')).toBeTruthy()
    // Pelo rótulo VISÍVEL do dropdown, e não por `getByText`: o Prime mantém um
    // `<select>` oculto com as mesmas opções, então o texto casa duas vezes.
    expect(document.querySelector('.p-dropdown-label')?.textContent).toBe('Cliente')
  })
})

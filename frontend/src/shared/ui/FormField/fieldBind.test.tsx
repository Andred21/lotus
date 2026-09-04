import { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import { FormField } from './FormField'
import { useFieldBind } from './fieldContext'
import { useFormField } from './useFormField'
import { AppInputText } from '../AppInputText/AppInputText'
import { AppTextarea } from '../AppTextarea/AppTextarea'
import { AppPassword } from '../AppPassword/AppPassword'
import { AppDropdown } from '../AppDropdown/AppDropdown'
import { AppDatePicker } from '../AppDatePicker/AppDatePicker'

// O `AppDatePicker` resolve `locale="es"` (gramática default do wrapper) por
// `localeOption`, que só existe depois de `addLocale` — igual a
// `fieldAssociation.test.tsx` e `EmissionPanel.test.tsx`.
beforeAll(registerPrimeLocales)

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

describe('os wrappers de shared/ui pescam o bind', () => {
  type Campos = { rut: string; giro: string | null; tipo: string | null }

  function Tela() {
    const [form, setForm] = useState<Campos>({ rut: '76.123.456-7', giro: null, tipo: 'client' })
    const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setForm((f) => ({ ...f, [k]: v }))
    const campo = useFormField({ form, set, fieldErrors: null, readOnly: false })
    return (
      <>
        <campo.Field name="rut" label="RUT"><AppInputText /></campo.Field>
        <campo.Field name="giro" label="Giro"><AppInputText /></campo.Field>
        <campo.Field name="tipo" label="Tipo">
          <AppDropdown options={[{ value: 'client', label: 'Cliente' }, { value: 'other', label: 'Outro' }]} />
        </campo.Field>
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
    // `{ ignore: 'option' }`, não `document.querySelector`: o Prime mantém um
    // `<select>` oculto com as mesmas opções, e ignorar `<option>` descarta
    // esse duplicado sem sair do escopo da `screen`.
    expect(screen.getByText('Cliente', { ignore: 'option' })).toBeTruthy()
  })
})

describe('outros wrappers de shared/ui pescam o bind', () => {
  type CamposExtra = { bio: string; senha: string; inicio: string | null }

  function TelaExtra() {
    const [form, setForm] = useState<CamposExtra>({ bio: 'texto inicial', senha: 'segredo', inicio: '2026-01-15' })
    const set = <K extends keyof CamposExtra>(k: K, v: CamposExtra[K]) => setForm((f) => ({ ...f, [k]: v }))
    const campo = useFormField({ form, set, fieldErrors: null, readOnly: false })
    return (
      <>
        <campo.Field name="bio" label="Bio"><AppTextarea /></campo.Field>
        <campo.Field name="senha" label="Senha"><AppPassword /></campo.Field>
        <campo.Field name="inicio" label="Início"><AppDatePicker /></campo.Field>
      </>
    )
  }

  it('AppTextarea lê o valor do form e escreve de volta', () => {
    render(<TelaExtra />)
    const textarea = screen.getByLabelText('Bio') as HTMLTextAreaElement
    expect(textarea.value).toBe('texto inicial')

    fireEvent.change(textarea, { target: { value: 'texto novo' } })
    expect((screen.getByLabelText('Bio') as HTMLTextAreaElement).value).toBe('texto novo')
  })

  it('AppPassword lê o valor do form e escreve de volta', () => {
    render(<TelaExtra />)
    const senha = screen.getByLabelText('Senha') as HTMLInputElement
    expect(senha.value).toBe('segredo')

    fireEvent.change(senha, { target: { value: 'novaSenha' } })
    expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('novaSenha')
  })

  it('AppDatePicker recebe o ISO do form e devolve ISO na mudança', () => {
    render(<TelaExtra />)
    const data = screen.getByLabelText('Início') as HTMLInputElement
    // `es-CL` é a gramática default do wrapper fora de troca de idioma.
    expect(data.value).toBe('15-01-2026')

    // `fireEvent.input`, não `.change`: o Calendar do Prime pesca o digitado
    // pelo `onInput` nativo (`onUserInput`, `calendar.cjs.js:572`), não pelo
    // `onChange` sintético dos outros wrappers.
    fireEvent.input(data, { target: { value: '20-02-2026' } })
    fireEvent.blur(data)
    expect((screen.getByLabelText('Início') as HTMLInputElement).value).toBe('20-02-2026')
  })
})

describe('wrapper de texto fora de Field/FormField', () => {
  it('AppInputText solto e sem value continua digitável (não trava em controlado)', () => {
    render(<AppInputText aria-label="solto" />)
    const input = screen.getByLabelText('solto') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'abc' } })
    expect(input.value).toBe('abc')
  })

  it("value='' do chamador vence o bind — '' não é nulo", () => {
    render(
      <FormField label="RUT" bind={{ value: 'do contexto', onChange: vi.fn() }}>
        <AppInputText value="" onChange={vi.fn()} />
      </FormField>,
    )
    const input = screen.getByLabelText('RUT') as HTMLInputElement
    expect(input.value).toBe('')
  })
})

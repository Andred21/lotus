import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { registerPrimeLocales } from '@shared/config/primeLocale'
import { FormField } from './FormField'
import { AppInputText } from '../AppInputText'
import { AppTextarea } from '../AppTextarea'
import { AppDropdown } from '../AppDropdown'
import { AppDatePicker } from '../AppDatePicker'
import { AppPassword } from '../AppPassword'

// O boot do app (`main.tsx:19`) registra a locale 'es' do Prime, e o
// `AppDatePicker` passa `locale="es"` ao Calendar. Sem o registro, o botão do
// ícone estoura em `localeOption('chooseDate', 'es')` — a locale nem existe no
// mapa. No app não estoura porque `addLocale` faz spread sobre `locales.en` e
// herda a chave; aqui o que faltava era rodar o boot.
beforeAll(registerPrimeLocales)

afterEach(cleanup)

/**
 * O nome acessível do controle tem de ser SÓ o rótulo, em todo wrapper — e a
 * porta do id muda com o componente do Prime: `id` no InputText e no
 * InputTextarea; `inputId` no Password, no Dropdown e no Calendar, onde o `id`
 * cai no nó raiz (`password.cjs.js:704/713`, `dropdown.cjs.js:1577`,
 * `calendar.cjs.js:3900`). Cada linha aqui é uma dessas portas.
 */
describe('os wrappers de shared/ui se associam ao rótulo do FormField', () => {
  it('AppInputText', () => {
    render(<FormField label="Nombre"><AppInputText /></FormField>)
    expect(screen.getByLabelText('Nombre').tagName).toBe('INPUT')
  })

  it('AppTextarea', () => {
    render(<FormField label="Observaciones"><AppTextarea /></FormField>)
    expect(screen.getByLabelText('Observaciones').tagName).toBe('TEXTAREA')
  })

  it('AppDropdown', () => {
    render(
      <FormField label="Rol">
        <AppDropdown options={[{ label: 'Admin', value: 'admin' }]} />
      </FormField>,
    )
    expect(screen.getByLabelText('Rol')).toBeTruthy()
  })

  it('AppDatePicker', () => {
    render(<FormField label="Vigencia"><AppDatePicker value={null} onChange={() => {}} /></FormField>)
    expect(screen.getByLabelText('Vigencia')).toBeTruthy()
  })

  it('AppPassword — o id vai ao INPUT, nao ao span raiz', () => {
    render(<FormField label="Contraseña"><AppPassword /></FormField>)

    const controle = screen.getByLabelText('Contraseña')
    expect(controle.tagName).toBe('INPUT')
    expect(controle.getAttribute('type')).toBe('password')
  })

  it('o erro chega ao input de cada wrapper como aria-invalid + describedby', () => {
    render(
      <FormField label="Nombre" error="Requerido">
        <AppInputText />
      </FormField>,
    )

    const controle = screen.getByLabelText('Nombre')
    expect(controle.getAttribute('aria-invalid')).toBe('true')
    const descrito = controle.getAttribute('aria-describedby') as string
    expect(document.getElementById(descrito)?.textContent).toBe('Requerido')
  })

  it('a prop do chamador VENCE a do contexto', () => {
    render(
      <FormField label="Nombre">
        <AppInputText id="id-do-chamador" />
      </FormField>,
    )

    expect(screen.getByRole('textbox').id).toBe('id-do-chamador')
  })
})

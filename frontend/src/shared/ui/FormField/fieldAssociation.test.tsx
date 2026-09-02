import type { ReactElement } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  /**
   * O erro é a SEGUNDA metade da associação, e ela tem a mesma armadilha da
   * primeira: o nó que recebe o atributo. Este teste dizia "de cada wrapper" no
   * nome e montava só o `AppInputText` — e o `AppDatePicker` passava
   * `aria-invalid`/`aria-describedby` ao `<span.p-calendar>` raiz, porque o
   * Calendar copia para dentro só `inputId`, `ariaLabelledBy` e `ariaLabel`
   * (`calendar.cjs.js:3899-3924`) e despeja o resto na raiz (`:4127`). Medido no
   * navegador com um 422 real, não deduzido. Agora a tabela é a mesma dos cinco
   * wrappers acima.
   */
  const COM_CONTROLE: [string, ReactElement][] = [
    ['AppInputText', <AppInputText />],
    ['AppTextarea', <AppTextarea />],
    ['AppDropdown', <AppDropdown options={[{ label: 'Admin', value: 'admin' }]} />],
    ['AppDatePicker', <AppDatePicker value={null} onChange={() => {}} />],
    ['AppPassword', <AppPassword />],
  ]

  it.each(COM_CONTROLE)('o erro chega ao INPUT do %s, nao ao no raiz', (_nome, controle) => {
    render(
      <FormField label="Campo" error="Requerido">
        {controle}
      </FormField>,
    )

    const alvo = screen.getByLabelText('Campo')
    expect(alvo.getAttribute('aria-invalid')).toBe('true')
    const descrito = alvo.getAttribute('aria-describedby') as string
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

  /**
   * A TERCEIRA metade da associação, medida no CourseDialog em 422 (f4 UI-02 da
   * run de 2026-08-28): `aria-invalid` chegava, `.p-invalid` não. A prop
   * `invalid` do Prime é a única porta para a classe, e `useFieldProps` não a
   * devolvia — a invalidez existia para o leitor de tela e não para quem vê.
   * O Login escapava porque passa `invalid` na mão (P-37 com outra roupa).
   */
  it.each(COM_CONTROLE)('o erro PINTA o %s: `.p-invalid` chega ao controle', (_nome, controle) => {
    const { container } = render(
      <FormField label="Campo" error="Requerido">
        {controle}
      </FormField>,
    )
    expect(container.querySelector('.p-invalid')).not.toBeNull()
  })

  it('sem erro nenhum wrapper veste `.p-invalid`', () => {
    const { container } = render(<FormField label="Campo"><AppInputText /></FormField>)
    expect(container.querySelector('.p-invalid')).toBeNull()
  })
})

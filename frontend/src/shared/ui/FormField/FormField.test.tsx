import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FormField, FormErrorSummary, NestedField } from './FormField'

afterEach(() => {
  cleanup()
})

describe('FormField em modo leitura', () => {
  it('mostra o valor como texto e NÃO monta o controle', () => {
    render(
      <FormField label="RUT" readOnly value="76.123.456-7">
        <input data-testid="controle" defaultValue="76.123.456-7" />
      </FormField>,
    )

    expect(screen.getByText('76.123.456-7')).toBeTruthy()
    // O ponto do item: em leitura não existe input para truncar o valor.
    expect(screen.queryByTestId('controle')).toBeNull()
  })

  it('em leitura SEM filho nenhum mostra o valor', () => {
    // O sítio que nasce só-leitura (snapshot de certificado, carga horária
    // derivada) não tem controle a montar em modo algum. Antes ele escrevia
    // `<AppInputText disabled readOnly>`, que é o próprio débito do §4 — o
    // input corta o valor. `children` opcional é o que permite matá-lo
    // (review do BD-3, Q-1).
    render(<FormField label="Código" readOnly value="LOT-2026-1001" />)

    expect(screen.getByText('LOT-2026-1001')).toBeTruthy()
  })

  it('mostra travessão quando o valor é vazio', () => {
    render(<FormField label="Giro" readOnly value="">{null}</FormField>)

    // Campo em branco é ambíguo entre "sem valor" e "não carregou".
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('em edição monta o controle e ignora `value`', () => {
    render(
      <FormField label="RUT" value="ignorado">
        <input data-testid="controle" defaultValue="76.123.456-7" />
      </FormField>,
    )

    expect(screen.getByTestId('controle')).toBeTruthy()
    expect(screen.queryByText('ignorado')).toBeNull()
  })

  it('mostra o erro do backend nos dois modos', () => {
    const { rerender } = render(
      <FormField label="RUT" error="RUT inválido" readOnly value="x">{null}</FormField>,
    )
    expect(screen.getByText('RUT inválido')).toBeTruthy()

    rerender(
      <FormField label="RUT" error="RUT inválido"><input /></FormField>,
    )
    expect(screen.getByText('RUT inválido')).toBeTruthy()
  })
})

describe('NestedField em modo leitura', () => {
  it('mostra o valor como texto e NÃO monta o controle', () => {
    render(
      <NestedField readOnly value="Módulo 1">
        <input data-testid="controle" defaultValue="Módulo 1" />
      </NestedField>,
    )

    expect(screen.getByText('Módulo 1')).toBeTruthy()
    expect(screen.queryByTestId('controle')).toBeNull()
  })
})

describe('FormErrorSummary', () => {
  it('mostra a chave que NAO esta em mapped', () => {
    // É o item (c) do BD-4: `phone` não tem `error=` em campo nenhum, então
    // sem o resumo um 422 nele não aparece em lugar algum da tela.
    render(<FormErrorSummary errors={{ phone: ['El teléfono es inválido.'] }} mapped={['name', 'rut']} />)

    expect(screen.getByText('El teléfono es inválido.')).toBeTruthy()
  })

  it('NAO repete a chave que ja aparece no proprio campo', () => {
    render(<FormErrorSummary errors={{ rut: ['RUT inválido.'] }} mapped={['name', 'rut']} />)

    expect(screen.queryByText('RUT inválido.')).toBeNull()
  })

  it('corta a chave que casa excludePrefixes', () => {
    render(
      <FormErrorSummary
        errors={{ 'modules.0.name': ['Requerido.'], phone: ['Inválido.'] }}
        mapped={['name']}
        excludePrefixes={['modules.']}
      />,
    )

    expect(screen.queryByText('Requerido.')).toBeNull()
    expect(screen.getByText('Inválido.')).toBeTruthy()
  })
})

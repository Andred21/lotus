import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FormField, NestedField } from './FormField'

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

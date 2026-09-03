import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField, FormErrorSummary, NestedField } from './FormField'
import { useFieldProps } from './fieldContext'

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

/** Consumidor mínimo do contexto. Existe para testar o CONTRATO sem depender de
 * nenhum wrapper de Prime — os wrappers reais são medidos na task seguinte. */
function ControleDeTeste() {
  const props = useFieldProps('id')
  return <input {...props} data-testid="controle" />
}

describe('FormField associa o rótulo ao controle (P-37)', () => {
  it('o nome acessível do controle é SÓ o rótulo', () => {
    // Hoje o <label> envolve o texto E o controle, então o nome acessível soma
    // os dois — e com erro presente soma a mensagem junto. É a P-37.
    render(
      <FormField label="RUT">
        <ControleDeTeste />
      </FormField>,
    )

    expect(screen.getByLabelText('RUT')).toBe(screen.getByTestId('controle'))
  })

  it('erro publica aria-invalid e aria-describedby apontando para a mensagem', () => {
    render(
      <FormField label="RUT" error="RUT inválido">
        <ControleDeTeste />
      </FormField>,
    )

    const controle = screen.getByTestId('controle')
    expect(controle.getAttribute('aria-invalid')).toBe('true')

    const descrito = controle.getAttribute('aria-describedby')
    expect(descrito).toBeTruthy()
    expect(document.getElementById(descrito as string)?.textContent).toBe('RUT inválido')
  })

  it('sem erro NAO pendura aria-invalid nem aria-describedby', () => {
    render(
      <FormField label="RUT">
        <ControleDeTeste />
      </FormField>,
    )

    const controle = screen.getByTestId('controle')
    expect(controle.getAttribute('aria-invalid')).toBeNull()
    expect(controle.getAttribute('aria-describedby')).toBeNull()
  })

  it('em leitura o rotulo NAO aponta para controle nenhum', () => {
    // `htmlFor` pendurado num id que não existe é label morta.
    const { container } = render(<FormField label="RUT" readOnly value="76.123.456-7" />)

    expect(container.querySelector('label')?.getAttribute('for')).toBeNull()
  })

  it('dois campos na mesma tela nao colidem de id', () => {
    render(
      <>
        <FormField label="Nombre"><ControleDeTeste /></FormField>
        <FormField label="Teléfono"><ControleDeTeste /></FormField>
      </>,
    )

    const [a, b] = screen.getAllByTestId('controle')
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })

  it('fora de um FormField o hook nao pendura nada', () => {
    // O wrapper usado solto — login, filtro de tabela — continua exatamente como
    // era. Nenhum dos 55 call sites com controle precisa mudar por causa disto.
    render(<ControleDeTeste />)

    const controle = screen.getByTestId('controle')
    expect(controle.id).toBe('')
    expect(controle.getAttribute('aria-invalid')).toBeNull()
  })
})

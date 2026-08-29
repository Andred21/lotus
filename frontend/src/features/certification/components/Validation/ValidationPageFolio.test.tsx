import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ValidationState } from '../../hooks/useValidationPage'
import { ValidationPage } from './ValidationPage'

/**
 * A assinatura da página mora em arquivo próprio, e não junto das réguas de
 * título do `ValidationPage.test.tsx`, porque o par dos dois passou de 150
 * linhas e a catraca `max-lines` de `src/features/<x>/components/` mede teste
 * junto com componente (medido no fechamento do item 18: 170 linhas). A saída
 * escolhida pelo João foi quebrar, não isentar — a camada `src/app/**` isenta
 * teste, esta não, e afrouxar aqui soltaria régua que 24 arquivos honram hoje,
 * dois deles exatamente em 150.
 *
 * O harness é redeclarado de propósito: `vi.mock` iça por arquivo e não se
 * importa de um módulo comum.
 *
 * `t` devolve a própria chave; o texto traduzido é assunto do `parity.test.ts`.
 */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const validation = vi.hoisted(() => ({ current: { kind: 'loading' } as ValidationState }))
vi.mock('../../hooks/useValidationPage', () => ({
  useValidationPage: () => validation.current,
}))

const CERT: Extract<ValidationState, { kind: 'valid' }>['cert'] = {
  codigo: 'CERT-1',
  status: 'emitido',
  valido_ate: '2027-01-31',
  revoked_at: null,
  aluno: { name: 'Ana' },
  curso: { name: 'Alta tensión', workload_hours: 8 },
  turma: { end_date: '2026-01-31' },
  // O DTO público carrega os dois, mas o cartão não os mostra (dados mínimos,
  // spec D14) — estão aqui só porque o tipo os exige.
  cliente: { name: 'Enel' },
  redator: { name: 'Redator' },
  display_status: 'vigente',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/validar/abc']}>
      <ValidationPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  validation.current = { kind: 'valid', cert: CERT }
})

afterEach(() => {
  cleanup()
})

/**
 * O folio saía como PRIMEIRO campo de uma `<dl>`, em `text-sm font-medium` — a
 * mesma grafia do nome do aluno (achados D4 e A4). Quem escaneia o QR está com
 * o papel na mão para conferir o folio; ele é a assinatura da página, não mais
 * um campo.
 */
describe('a assinatura da validação', () => {
  /** "Sai da lista de campos" era `closest('dl') === null`, e essa régua mediu a
   * coisa errada: ela congelou a PERDA do par `dt`/`dd` do folio (Q-4 do review
   * de 2026-08-29). O que o achado D4 pedia é que o folio não seja mais um campo
   * ENTRE os outros — não que ele deixe de ter rótulo associado. Hoje a
   * `<CertificateFolio>` carrega a própria lista de definição, então a régua é
   * de POSIÇÃO: o folio está fora da `<dl>` dos demais campos. */
  it('o folio sai da lista de campos e vira bloco próprio, em mono', () => {
    const { container } = renderPage()

    const folio = screen.getByText('CERT-1')
    expect(folio.className).toContain('font-mono')

    const listaDeCampos = screen.getByText('certificate.validation.issuedTo').closest('dl')
    expect(listaDeCampos).not.toBeNull()
    expect(listaDeCampos?.contains(folio)).toBe(false)
    expect(container.querySelectorAll('dl')).toHaveLength(2)
  })

  /** O par sobrevive à mudança de posição: a legenda continua NOMEANDO o código
   * para o leitor de tela, agora na `<dl>` da própria peça. */
  it('legenda e folio continuam sendo par `dt`/`dd`', () => {
    renderPage()

    const folio = screen.getByText('CERT-1')
    expect(folio.tagName).toBe('DD')
    expect(screen.getByText('certificate.fieldCodigo').tagName).toBe('DT')
    expect(folio.closest('dl')).toBe(screen.getByText('certificate.fieldCodigo').closest('dl'))
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ValidationState } from '../../hooks/useValidationPage'
import { ValidationPage } from './ValidationPage'

/**
 * Mesmo achado das telas de detalhe (Q-5, review de 2026-08-12) na rota pública
 * do QR: `loading` e `error` não titulavam nada e, sem `AppLayout` e sem
 * `DetailHeader`, ninguém mais assumia o nível 1 da página.
 *
 * Aqui o `valid` também entra: é o ramo mais cheio da tela e o que prova o outro
 * lado da régua — um `h1`, nunca dois.
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
  validation.current = { kind: 'loading' }
})

afterEach(() => {
  cleanup()
})

describe('ValidationPage titula todos os seus estados', () => {
  it('em carga, tem um h1 (escondido) em vez de só o esqueleto', () => {
    validation.current = { kind: 'loading' }

    const { container } = renderPage()

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('common.loading')
    expect(h1[0].className).toContain('sr-only')
  })

  it('em falha de carga, tem um h1 (escondido) com o título do erro', () => {
    validation.current = {
      kind: 'error',
      error: {
        type: 'about:blank',
        title: 'Server Error',
        status: 500,
        detail: 'boom',
        instance: '/api/publico/certificados/abc',
      },
      retry: () => Promise.resolve(),
    }

    const { container } = renderPage()

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('common.loadError')
    expect(h1[0].className).toContain('sr-only')
  })

  it('500 de snapshot corrompido: a tela PUBLICA nao imprime os campos do documento', () => {
    // A rota do QR é pública: quem escaneou não é o suporte. Ela imprimia o
    // `detail` cru do backend — `El certificado LOT-2026-1001 no puede
    // presentarse: su documento congelado no tiene los campos aluno.name,
    // curso.name.` — mensagem escrita em es-CL fixo para o OPERADOR ler no
    // `CertificateViewDialog` (D8), não para um terceiro. Aqui vale a dica
    // genérica, no idioma da sessão.
    validation.current = {
      kind: 'error',
      error: {
        type: 'https://lotus.cl/errors/server',
        title: 'Erro interno',
        status: 500,
        detail:
          'El certificado LOT-2026-1001 no puede presentarse: su documento congelado no tiene los campos aluno.name, curso.name.',
        instance: '/api/validate/LOT-2026-1001',
      },
      retry: () => Promise.resolve(),
    }

    const { container } = renderPage()

    expect(container.textContent).not.toContain('aluno.name')
    expect(container.textContent).toContain('common.loadErrorHint')
  })

  it('no certificado válido segue tendo um h1 só — o do StatusHeading', () => {
    validation.current = { kind: 'valid', cert: CERT }

    const { container } = renderPage()

    const h1 = container.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('certificate.validation.valid')
  })
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
    validation.current = { kind: 'valid', cert: CERT }

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
    validation.current = { kind: 'valid', cert: CERT }

    renderPage()

    const folio = screen.getByText('CERT-1')
    expect(folio.tagName).toBe('DD')
    expect(screen.getByText('certificate.fieldCodigo').tagName).toBe('DT')
    expect(folio.closest('dl')).toBe(screen.getByText('certificate.fieldCodigo').closest('dl'))
  })
})

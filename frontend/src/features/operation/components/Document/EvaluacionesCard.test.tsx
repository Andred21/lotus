import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import esCL from '@shared/config/locales/es-CL.json'
import { EvaluacionesCard } from './EvaluacionesCard'

/** `t` resolve contra o es-CL real: o que se prova é o texto que o operador lê,
 * inclusive as chaves novas existirem. */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => {
        const folha = key.split('.').reduce<unknown>((no, parte) => (no as Record<string, unknown>)?.[parte], esCL)
        const texto = typeof folha === 'string' ? folha : key
        return texto.replace(/\{\{(\w+)\}\}/g, (_, nome: string) => String(opts?.[nome] ?? ''))
      },
    }),
  }
})

const doc = (id: number, type: TurmaDocumentType, name: string) =>
  ({ id, type, original_name: name, mime: 'application/pdf', size: 10, created_at: '2026-10-01T10:00:00Z',
    download_url: `https://minio.local/${name}` }) as TurmaDocumentData

const vazio: Record<TurmaDocumentType, TurmaDocumentData[]> = {
  MANUAL: [], EVALUACION_REDATOR: [], EVALUACION_CLIENTE: [], EVALUACION_ALUNO: [],
}

function montar(over: Partial<React.ComponentProps<typeof EvaluacionesCard>> = {}) {
  return render(
    <EvaluacionesCard
      clientName="Scap Minera"
      byType={vazio}
      missingOptional={[]}
      uploading={false}
      onUpload={vi.fn()}
      canUpload={() => true}
      removing={false}
      removeError={null}
      onRemove={vi.fn()}
      canRemove={() => true}
      {...over}
    />,
  )
}

describe('EvaluacionesCard', () => {
  it('três slots: Instructor, o nome do cliente e Alumnos', () => {
    montar()

    expect(screen.getByText('Instructor')).toBeTruthy()
    expect(screen.getByText('Scap Minera')).toBeTruthy()
    expect(screen.getByText('Alumnos')).toBeTruthy()
  })

  it('sem nome de cliente, o slot cai no fallback Cliente', () => {
    montar({ clientName: undefined })

    expect(screen.getByText('Cliente')).toBeTruthy()
  })

  it('cada slot lista todos os arquivos do seu tipo, sem substituir', () => {
    montar({
      byType: {
        ...vazio,
        EVALUACION_REDATOR: [doc(1, 'EVALUACION_REDATOR', 'inst-a.pdf'), doc(2, 'EVALUACION_REDATOR', 'inst-b.pdf')],
        EVALUACION_CLIENTE: [doc(3, 'EVALUACION_CLIENTE', 'cli.pdf')],
        EVALUACION_ALUNO: [doc(4, 'EVALUACION_ALUNO', 'alu-a.pdf'), doc(5, 'EVALUACION_ALUNO', 'alu-b.pdf'), doc(6, 'EVALUACION_ALUNO', 'alu-c.pdf')],
      },
    })

    for (const nome of ['inst-a.pdf', 'inst-b.pdf', 'cli.pdf', 'alu-a.pdf', 'alu-b.pdf', 'alu-c.pdf']) {
      expect(screen.getByText(nome)).toBeTruthy()
    }
  })

  it('o botão de envio só aparece onde canUpload', () => {
    montar({ canUpload: (type) => type === 'EVALUACION_CLIENTE' })

    expect(screen.getAllByRole('button', { name: /Subir/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Subir Evaluación Cliente' })).toBeTruthy()
  })

  it('a lixeira só aparece onde canRemove', () => {
    montar({
      byType: { ...vazio, EVALUACION_ALUNO: [doc(4, 'EVALUACION_ALUNO', 'alu-a.pdf')], EVALUACION_CLIENTE: [doc(3, 'EVALUACION_CLIENTE', 'cli.pdf')] },
      canRemove: (type) => type === 'EVALUACION_ALUNO',
    })

    expect(screen.getAllByRole('button', { name: /Eliminar/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Eliminar Evaluación Alumnos' })).toBeTruthy()
  })

  it('o aviso lista as evaluaciones que faltam, como informação', () => {
    montar({ missingOptional: ['EVALUACION_CLIENTE', 'EVALUACION_ALUNO'] })

    expect(screen.getByText(/Evaluación Cliente, Evaluación Alumnos/)).toBeTruthy()
  })

  it('sem opcionais faltando, não há aviso', () => {
    montar()

    expect(screen.queryByText(/Faltan evaluaciones/)).toBeNull()
  })
})

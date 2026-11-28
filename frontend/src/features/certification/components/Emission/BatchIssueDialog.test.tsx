import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EmissionPanelTurmaData } from '@shared/types/generated'
import { BatchIssueDialog } from './BatchIssueDialog'
import type { useBatchIssue } from '../../hooks/useBatchIssue'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

type Batch = ReturnType<typeof useBatchIssue>
const batch = vi.hoisted<{ current: Partial<Batch> }>(() => ({ current: {} }))
vi.mock('../../hooks/useBatchIssue', () => ({ useBatchIssue: () => batch.current as Batch }))

describe('BatchIssueDialog — o relatório do lote', () => {
  it('o folio emitido leva ícone check (não o glifo ✓) e não quebra', () => {
    batch.current = {
      report: [{ enrollmentId: 1, studentName: 'Ana Torres', ok: true, codigo: 'LOT-2026-1001' }],
      okCount: 1,
      failedCount: 0,
    } as unknown as Partial<Batch>

    render(<BatchIssueDialog turma={{ id: 1 } as unknown as EmissionPanelTurmaData} onHide={() => {}} />)

    const folio = screen.getByText('LOT-2026-1001')
    const tag = folio.closest('.p-tag') as HTMLElement

    expect(tag.textContent).not.toContain('✓')
    expect(tag.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
    expect(tag.className).toContain('whitespace-nowrap')
  })
})

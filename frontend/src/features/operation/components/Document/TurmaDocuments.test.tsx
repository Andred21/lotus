import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { TurmaData } from '@shared/types/generated'
import { TurmaDocuments } from './TurmaDocuments'
import type { useTurmaDocsSection } from '../../hooks/useTurmaDocsSection'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})
vi.mock('./DocumentTypeCard', () => ({ DocumentTypeCard: () => null }))
vi.mock('./EvaluacionesCard', () => ({ EvaluacionesCard: () => null }))
vi.mock('./ManualButton', () => ({ ManualButton: () => null }))

type Section = ReturnType<typeof useTurmaDocsSection>
const section = vi.hoisted<{ current: Partial<Section> }>(() => ({ current: {} }))
vi.mock('../../hooks/useTurmaDocsSection', () => ({ useTurmaDocsSection: () => section.current as Section }))

/** B-11: o contraste vive nos tokens, e o jsdom não resolve `var()`. Prova-se QUAL
 * token cada peça usa; as razões (medidas nos dois temas) estão no registro da
 * task: trilho com borda `--surface-500`/`--surface-300` ≥ 4,76/3,07 sobre o card,
 * barra `--green-700`/`--green-400` ≥ 4,42/7,40 sobre o card e 3,58/5,24 sobre o trilho. */
describe('TurmaDocuments — a barra de progresso', () => {
  it('barra de progresso usa os tokens medidos', () => {
    section.current = {
      loading: false, loadError: null, deliveredCount: 1, totalTypes: 2,
      byType: {}, missingOptional: [], canUpload: () => true, canRemove: () => true,
      habilitada: false, concluida: false, lockReason: null, error: '',
    } as unknown as Partial<Section>

    render(<TurmaDocuments turma={{ id: 1 } as TurmaData} />)

    const trilho = screen.getByRole('progressbar')
    const barra = trilho.firstElementChild as HTMLElement

    expect(trilho.getAttribute('aria-valuenow')).toBe('1')
    expect(trilho.getAttribute('aria-valuemax')).toBe('2')
    expect(trilho.className).toContain('bg-(--surface-200)')
    expect(trilho.className).toContain('border-(--surface-500)')
    expect(trilho.className).toContain('dark:border-(--surface-300)')
    expect(barra.className).toContain('bg-(--green-700)')
    expect(barra.className).toContain('dark:bg-(--green-400)')
    expect(barra.style.width).toBe('50%')
  })
})

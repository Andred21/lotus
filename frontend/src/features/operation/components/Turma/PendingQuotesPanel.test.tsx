import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PendingQuoteData } from '@shared/types/generated'
import { PendingQuotesPanel } from './PendingQuotesPanel'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const item = (over: Partial<PendingQuoteData>): PendingQuoteData => ({
  quote_id: 1, quote_code: 'Scap 7 - R1', budget_code: 'Scap 7',
  client_name: 'Transelec', course_name: 'Alta Tensión', student_count: 3, ...over,
})

const renderizar = (items: PendingQuoteData[]) =>
  render(<MemoryRouter><PendingQuotesPanel items={items} /></MemoryRouter>)

describe('PendingQuotesPanel', () => {
  it('mostra o código da cotação antes do cliente', () => {
    renderizar([item({})])
    expect(screen.getByText('Scap 7 - R1')).toBeTruthy()
  })

  it('sem código de cotação, cai no código do orçamento', () => {
    renderizar([item({ quote_code: null })])
    expect(screen.getByText('Scap 7')).toBeTruthy()
  })
})

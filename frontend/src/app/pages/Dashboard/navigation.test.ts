import { describe, expect, it } from 'vitest'
import { alertRoute, pendingItemRoute } from './navigation'
import type { DashboardAlertType, PendingItemType } from '@shared/types/generated'

describe('pendingItemRoute', () => {
  it.each([
    ['turma_without_redator', { turma_id: 7 }, '/operacion/turmas/7'],
    ['turma_docs_incomplete', { turma_id: 7 }, '/operacion/turmas/7'],
    ['turma_awaiting_conclusion', { turma_id: 7 }, '/operacion/turmas/7'],
    ['enrollment_awaiting_certificate', { turma_id: 7 }, '/operacion/turmas/7'],
  ] as [PendingItemType, Record<string, number>, string][])(
    '%s ancora na turma',
    (type, navigation, esperado) => {
      expect(pendingItemRoute(type, navigation)).toBe(esperado)
    },
  )

  // D7: o backend manda budget_id E quote_id; o CTA leva ao ORÇAMENTO, que é a
  // tela dona, e não ao formulário de criar turma — o Dashboard não executa
  // mutação nem cola o operador no botão que resolve.
  it.each([
    ['quote_awaiting_approval'],
    ['quote_approved_without_turma'],
  ] as [PendingItemType][])('%s leva ao orçamento, não à cotação', (type) => {
    expect(pendingItemRoute(type, { budget_id: 12, quote_id: 34 })).toBe('/comercial/presupuestos/12')
  })

  // Chave ausente = item sem link. Uma rota montada com `undefined` viraria
  // "/operacion/turmas/undefined" e daria 404 no clique.
  it('devolve null quando a chave esperada não veio', () => {
    expect(pendingItemRoute('turma_without_redator', {})).toBeNull()
    expect(pendingItemRoute('quote_awaiting_approval', { quote_id: 34 })).toBeNull()
  })
})

describe('alertRoute', () => {
  it('turma vencida ancora na turma', () => {
    expect(alertRoute('turma_overdue', { turma_id: 9 })).toBe('/operacion/turmas/9')
  })

  // D8: /certificados e /personas são listagem com diálogo, sem rota de
  // detalhe. Ancorar na entidade é o FUT-2 do backlog, que depende de decisão
  // do João — este bloco leva à listagem, sem seleção, e o certificate_id /
  // redator_id do payload fica sem uso de propósito.
  it.each([
    ['certificate_expiring_soon', { certificate_id: 3 }, '/certificados'],
    ['certificate_expired', { certificate_id: 3 }, '/certificados'],
    ['redator_document_expired', { redator_id: 5 }, '/personas'],
    ['redator_document_expiring_soon', { redator_id: 5 }, '/personas'],
  ] as [DashboardAlertType, Record<string, number>, string][])(
    '%s leva à listagem do módulo, sem seleção',
    (type, navigation, esperado) => {
      expect(alertRoute(type, navigation)).toBe(esperado)
    },
  )

  it('devolve null quando a turma não veio no payload', () => {
    expect(alertRoute('turma_overdue', {})).toBeNull()
  })
})

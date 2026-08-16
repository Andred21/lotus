import type { DashboardAlertType, PendingItemType } from '@shared/types/generated'

/**
 * Para onde cada item do Dashboard navega. Nada aqui é regra de negócio: é o
 * mapa entre o `navigation` que o backend já produz e as rotas que o
 * `AppRouter` já expõe.
 *
 * Homônimo de `shared/config/navigation.ts` de propósito — aquele é o MENU
 * (NAV_MODULES), este é o destino de um ITEM. O nome vem do campo do contrato
 * (`PendingItemData.navigation`), e renomeá-lo aqui só faria a tela e o DTO
 * falarem línguas diferentes.
 *
 * `key: null` = a rota não aceita entidade. `/certificados` e `/personas` são
 * listagem com diálogo, sem rota de detalhe: o alerta leva ao módulo dono, sem
 * seleção (D8). Ancorar na entidade é o FUT-2 do backlog e depende de decisão
 * do João — resolvê-lo aqui decidiria um futuro dentro de um bloco que não é
 * dele.
 */
type Destino = {
  path: string
  /** Chave de `navigation` que vira o parâmetro da rota. `null` = sem parâmetro. */
  key: string | null
}

/**
 * As chaves são as que o backend MANDA, medidas em
 * `app/Domains/Dashboard/Services/` — não supostas:
 * `CommercialMetricsQuery.php:87` produz `budget_id` e `quote_id`;
 * `OperationMetricsQuery.php:195` e `CertificationMetricsQuery.php:42`
 * produzem `turma_id`.
 *
 * D7: as duas pendências de cotação usam `budget_id`. O Dashboard não executa
 * mutação e o CTA só direciona ao módulo dono; levar direto ao formulário de
 * criar turma chegaria colado no botão que resolve.
 */
const PENDENCIA: Record<PendingItemType, Destino> = {
  quote_awaiting_approval: { path: '/comercial/presupuestos', key: 'budget_id' },
  quote_approved_without_turma: { path: '/comercial/presupuestos', key: 'budget_id' },
  turma_without_redator: { path: '/operacion/turmas', key: 'turma_id' },
  turma_docs_incomplete: { path: '/operacion/turmas', key: 'turma_id' },
  turma_awaiting_conclusion: { path: '/operacion/turmas', key: 'turma_id' },
  enrollment_awaiting_certificate: { path: '/operacion/turmas', key: 'turma_id' },
}

const ALERTA: Record<DashboardAlertType, Destino> = {
  turma_overdue: { path: '/operacion/turmas', key: 'turma_id' },
  certificate_expiring_soon: { path: '/certificados', key: null },
  certificate_expired: { path: '/certificados', key: null },
  redator_document_expired: { path: '/personas', key: null },
  redator_document_expiring_soon: { path: '/personas', key: null },
}

/**
 * Resolve o destino. Chave declarada mas ausente no payload devolve `null` —
 * item sem link, nunca rota quebrada: `/operacion/turmas/undefined` responderia
 * 404 no clique, e um link que só falha depois do clique é pior que link nenhum.
 */
function resolver(destino: Destino, navigation: Record<string, number>): string | null {
  if (destino.key === null) return destino.path

  const id = navigation[destino.key]
  return id === undefined ? null : `${destino.path}/${id}`
}

export function pendingItemRoute(
  type: PendingItemType,
  navigation: Record<string, number>,
): string | null {
  return resolver(PENDENCIA[type], navigation)
}

export function alertRoute(
  type: DashboardAlertType,
  navigation: Record<string, number>,
): string | null {
  return resolver(ALERTA[type], navigation)
}

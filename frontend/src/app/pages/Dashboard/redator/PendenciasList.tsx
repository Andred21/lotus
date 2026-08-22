import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import { formatIsoDate } from '@shared/lib'
import { warningText } from '@shared/styles/tokens'
import type { RedatorTurmaPendenciaData } from '@shared/types/generated'

/**
 * Turmas do próprio Redator com documento faltando. Sem cliente, sem UF, sem
 * turma alheia — o payload `view=redator` já chega filtrado da API, e esta tela
 * não tem como pedir mais do que ele traz.
 *
 * A pendência se resolve em `/operacion/turmas/:id`, aba "Documentación" — não
 * em `/perfil`, que gerencia documento PESSOAL (CV, REUF, título), conjunto
 * disjunto do documento de TURMA que falta aqui. Por isso a linha inteira é o
 * link, e não há botão único no cabeçalho: com N turmas pendentes um controle
 * do cabeçalho não tem destino único (para qual turma ele levaria?), e um
 * controle por linha mantém uma parada de Tab por item — a mesma razão do
 * UI-08 da revisão de 2026-08-17, que evitava `<Link>` embrulhando `<AppButton>`
 * (aninhamento inválido de `<a>` sobre `<button>`). Aqui a linha É o `<a>`;
 * não há botão de dentro para aninhar (UI-01 da revisão de 2026-08-22).
 */
export function PendenciasList({ items }: { items: RedatorTurmaPendenciaData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.redator.pendencias.title')} count={items.length} />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-check-circle"
          title={t('dashboard.redator.pendencias.empty')}
          description={t('dashboard.redator.pendencias.emptyHint')}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <li
              key={item.turma_id}
              className="border-b px-4 py-2 last:border-b-0"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              <Link
                to={`/operacion/turmas/${item.turma_id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 no-underline sm:flex-nowrap"
                style={{ color: 'var(--text-color)' }}
              >
                <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                  <span className="block truncate text-sm font-medium" title={item.course_name}>
                    {item.course_name}
                  </span>
                  <span className="block truncate text-xs" style={{ color: warningText }}>
                    {/* O código do enum não vai à tela: `EVALUACION_REDATOR` é identificador
                    de banco, e o mesmo dado já aparece traduzido no módulo de Operação,
                    pelas mesmas chaves (UI-07 da revisão de 2026-08-22, molde no
                    `CompliancePanel`). */}
                    {t('dashboard.redator.pendencias.missing', {
                      types: item.missing_types.map((tipo) => t(`operation.documents.type.${tipo}`)).join(', '),
                    })}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
                  {t('dashboard.redator.pendencias.until', { date: formatIsoDate(item.end_date) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}

import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import type { AlertData } from '@shared/types/generated'
import { DashboardItemRow } from './DashboardItemRow'
import { alertRoute } from './navigation'

/** O tag do alerta mostra a SEVERIDADE, não o módulo: `AlertData` não tem campo
 * `module` (o gate age na origem de cada grupo, no backend), e a severidade
 * aqui varia de verdade — vencido é `high`, a vencer é `medium`.
 *
 * A frase do VAZIO vem de fora, e é obrigatória. O componente é reuso medido
 * entre as duas views — `alertas_documentos` do Redator é o mesmo `AlertData[]`
 * do admin — mas o que o vazio SIGNIFICA muda com o papel: no admin o payload é
 * filtrado por permissão de módulo, e "nada nos módulos que você vê" é verdade;
 * o recorte do Redator é por posse das turmas, e a mesma frase lhe sugeria
 * alerta escondido atrás de uma permissão que ele não tem (UI-07 da revisão de
 * 2026-08-17). Sem default: com dois papéis, um deles herdaria em silêncio a
 * gramática do outro, que foi exatamente o defeito. */
export function AlertList({ items, emptyHint }: { items: AlertData[]; emptyHint: string }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.alerts.title')} count={items.length} />
      {items.length === 0 ? (
        <AppEmptyState icon="pi pi-shield" title={t('dashboard.alerts.empty')} description={emptyHint} />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <DashboardItemRow
              key={`${item.type}-${item.entity_id}`}
              tagLabel={t(`dashboard.severity.${item.severity}`)}
              severity={item.severity}
              label={t(`dashboard.alerts.type.${item.type}`)}
              detail={item.description}
              date={item.date}
              to={alertRoute(item.type, item.navigation)}
              openLabel={t('dashboard.open')}
            />
          ))}
        </ul>
      )}
    </AppCard>
  )
}

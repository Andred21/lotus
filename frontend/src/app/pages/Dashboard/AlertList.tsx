import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import type { AlertData } from '@shared/types/generated'
import { DashboardItemRow } from './DashboardItemRow'
import { alertRoute } from './navigation'

/** O tag do alerta mostra a SEVERIDADE, não o módulo: `AlertData` não tem campo
 * `module` (o gate age na origem de cada grupo, no backend), e a severidade
 * aqui varia de verdade — vencido é `high`, a vencer é `medium`. */
export function AlertList({ items }: { items: AlertData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.alerts.title')} count={items.length} />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-shield"
          title={t('dashboard.alerts.empty')}
          description={t('dashboard.alerts.emptyHint')}
        />
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

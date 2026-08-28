import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import type { PendingItemData } from '@shared/types/generated'
import { DashboardItemRow } from '../DashboardItemRow'
import { pendingItemRoute } from '../navigation'

/** `pendencias` é lista NÃO-anulável: chega `[]` tanto para quem não tem
 * permissão quanto para quem tem e não tem pendência. Por isso a seção sempre
 * renderiza — quem some por gate são os KPIs, o pipeline e a agenda (D6). */
export function PendingList({ items }: { items: PendingItemData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.pending.title')} count={items.length} />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-check-circle"
          title={t('dashboard.pending.empty')}
          description={t('dashboard.pending.emptyHint')}
        />
      ) : (
        <ul role="list">
          {items.map((item) => (
            <DashboardItemRow
              key={`${item.type}-${item.entity_id}`}
              tagLabel={t(`dashboard.module.${item.module}`)}
              severity={item.severity}
              label={t(`dashboard.pending.type.${item.type}`)}
              detail={item.description}
              date={item.date}
              to={pendingItemRoute(item.type, item.navigation)}
              openLabel={t('dashboard.open')}
            />
          ))}
        </ul>
      )}
    </AppCard>
  )
}

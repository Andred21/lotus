import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import type { PipelineStageCountData } from '@shared/types/generated'

export function PipelineFunnel({ stages }: { stages: PipelineStageCountData[] }) {
  const { t } = useTranslation()
  const maior = stages.reduce((max, etapa) => Math.max(max, etapa.count), 0)

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.pipeline.title')} />
      {maior === 0 ? (
        // Todas as etapas em zero é funil VAZIO, não funil quebrado: seis barras
        // de largura nula seriam indistinguíveis de um erro de render.
        <AppEmptyState icon="pi pi-filter" title={t('dashboard.pipeline.empty')} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-4">
          {stages.map((etapa) => (
            <li key={etapa.stage} className="flex items-center gap-3">
              <span className="w-48 shrink-0 truncate text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t(`dashboard.pipeline.stage.${etapa.stage}`)}
              </span>
              <span
                className="h-2 min-w-1 rounded-full"
                // Largura proporcional ao MAIOR valor, não ao total: o funil
                // compara etapas entre si, e normalizar pelo total achataria
                // todas quando uma domina.
                style={{
                  width: `${(etapa.count / maior) * 100}%`,
                  background: 'var(--primary-color)',
                }}
                aria-hidden="true"
              />
              <span className="shrink-0 font-mono text-sm tabular-nums">{etapa.count}</span>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}

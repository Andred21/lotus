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
            // Abaixo de `sm` o rótulo toma a linha inteira: o `w-48` fixo (192px)
            // consumia a largura útil do mobile e TODAS as barras caíam no
            // mínimo (UI-03 da revisão de 2026-08-16).
            <li key={etapa.stage} className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
              <span
                className="min-w-0 basis-full truncate text-sm sm:w-48 sm:shrink-0 sm:basis-auto"
                style={{ color: 'var(--text-color-secondary)' }}
              >
                {t(`dashboard.pipeline.stage.${etapa.stage}`)}
              </span>
              {/* O trilho é quem mede: todas as etapas partem da MESMA largura e
                * o preenchimento é % dela. Aplicar a % direto na barra fazia a de
                * 100% ser encolhida pelo `flex-shrink` enquanto as de 33% não —
                * 3 e 1 desenhavam 2,38:1 em vez de 3:1. */}
              <span
                className="flex h-2 min-w-0 flex-1 rounded-full"
                style={{ background: 'var(--surface-border)' }}
                aria-hidden="true"
              >
                <span
                  // O mínimo de 4px só vale para etapa com contagem: ele existe
                  // para que um valor pequeno ainda apareça, e aplicado a
                  // `count === 0` desenhava preenchimento colorido ao lado do
                  // número 0 (review de 2026-08-16, segunda lente).
                  className={`h-2 rounded-full ${etapa.count > 0 ? 'min-w-1' : ''}`}
                  // Proporcional ao MAIOR valor, não ao total: o funil compara
                  // etapas entre si, e normalizar pelo total achataria todas
                  // quando uma domina.
                  style={{
                    width: `${(etapa.count / maior) * 100}%`,
                    background: 'var(--primary-color)',
                  }}
                />
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums">{etapa.count}</span>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}

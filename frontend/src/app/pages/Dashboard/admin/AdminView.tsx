import { useTranslation } from 'react-i18next'
import { InlineLoadState } from '@shared/ui'
import type { AdminDashboardData } from '@shared/types/generated'
import type { DashboardPeriod } from '../useDashboard'
import { SectionLabel } from '../SectionLabel'
import { KpiRow } from '../KpiRow'
import { AlertList } from '../AlertList'
import { AgendaPanel } from '../AgendaPanel'
import { kpiCards } from './kpiCards'
import { PendingList } from './PendingList'
import { PipelineFunnel } from './PipelineFunnel'
import { PeriodFilter } from './PeriodFilter'
import { SeriesPanel } from './SeriesPanel'
import { RankingsPanel } from './RankingsPanel'
import { CompliancePanel } from './CompliancePanel'
import { RedatorLoadPanel } from './RedatorLoadPanel'
import type { PeriodPresetKey } from './periodPresets'

/**
 * Composição do administrador. Saiu do `DashboardPage` porque a página é o
 * roteador de `kind` (D3) e as duas views compõem a própria pasta (D4) — e
 * porque a régua da D8 não caberia com as duas responsabilidades no mesmo
 * arquivo (Emenda 1 da spec).
 *
 * Layout "torre" (D16 do B1): fileira de KPIs; abaixo, pendências e alertas
 * LADO A LADO — as duas listas que respondem "o que faço agora", na primeira
 * tela; abaixo, agenda e pipeline, que são leitura de contexto. Em telas
 * estreitas as colunas empilham.
 */
export function AdminView({
  data,
  preset,
  period,
  staleError,
  onPresetChange,
  onPeriodChange,
  onRetry,
}: {
  data: AdminDashboardData
  preset: PeriodPresetKey
  period: DashboardPeriod
  staleError: string | null
  onPresetChange: (p: PeriodPresetKey) => void
  onPeriodChange: (p: DashboardPeriod) => void
  /** Ausente quando repetir não recupera a falha (`useDashboard.podeRepetir`).
   * Aceita a promise do `staleRetry`: é ela que mantém o botão do `InlineLoadState`
   * em carga enquanto o GET está em voo (Q-14). `() => void` compila e faz o tipo
   * mentir, porque TypeScript aceita descartar retorno. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()

  // O aviso de falha com dado em mão mora DENTRO do seletor de janela, junto do
  // controle que a causou (D6) — e o seletor só existe se houver seção de
  // análise. Sem ela, não havia onde o aviso aparecer: um refetch falho ficava
  // mudo e a tela seguia com dado velho, que é a falha silenciosa que a lição
  // do BD-6 existe para impedir. O caso é real e já foi medido — o papel só com
  // `identity.user.view` é `ready-admin` pelos alertas e tem `series` e
  // `rankings` nulas (Q-1 da revisão de 2026-08-17).
  const temAnalise = data.series !== null || data.rankings !== null

  return (
    <div className="space-y-6">
      {!temAnalise && (
        <InlineLoadState error={staleError} retryLabel={t('common.retry')} onRetry={onRetry} />
      )}

      <KpiRow items={kpiCards(data.kpis)} />

      <section className="space-y-3">
        <SectionLabel>{t('dashboard.section.action')}</SectionLabel>
        {/* Duas colunas só a partir de `xl`. Em `lg` a sidebar ainda está
          * expandida (256px) e cada card caía para ~343px, truncando os 7
          * rótulos de pendência; em 1280 a truncagem some (UI-04 da revisão de
          * 2026-08-16). */}
        {/* `items-start`: as duas listas têm contagens independentes — 8
          * pendências e 3 alertas é o caso comum — e a grade, esticando, deixava
          * ~340px de moldura vazia no card menor em 1440, empurrando a seção de
          * contexto para fora da primeira tela. Cada card passa a valer a própria
          * altura; abaixo de `xl` eles empilham e a prop não tem efeito (UI-08 da
          * revisão de 2026-08-22). */}
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <PendingList items={data.pendencias} />
          <AlertList items={data.alertas} emptyHint={t('dashboard.alerts.emptyHint')} />
        </div>
      </section>

      {/* Seção nula por gate não renderiza (D7) — e a faixa some junto quando
        * as DUAS somem, senão o rótulo anunciaria um bloco vazio. */}
      {(data.agenda !== null || data.pipeline !== null) && (
        <section className="space-y-3">
          <SectionLabel>{t('dashboard.section.context')}</SectionLabel>
          <div className="space-y-4">
            {data.agenda !== null && <AgendaPanel agenda={data.agenda} />}
            {data.pipeline !== null && <PipelineFunnel stages={data.pipeline} />}
          </div>
        </section>
      )}

      {/* A janela histórica só alcança séries e rankings (D3 do bloco A), e é
        * por isso que o seletor mora DENTRO desta seção e não no cabeçalho da
        * página: no cabeçalho ele prometeria filtrar a tela inteira. */}
      {temAnalise && (
        <section className="space-y-3">
          <SectionLabel>{t('dashboard.section.analysis')}</SectionLabel>
          <PeriodFilter
            preset={preset}
            period={period}
            staleError={staleError}
            onPresetChange={onPresetChange}
            onPeriodChange={onPeriodChange}
            onRetry={onRetry}
          />
          {data.series !== null && <SeriesPanel series={data.series} />}
          {data.rankings !== null && <RankingsPanel rankings={data.rankings} />}
        </section>
      )}

      {/* Estado ATUAL, não histórico: por isso fora da seção de análise, e o
        * seletor de janela não as toca (D3 do bloco A). */}
      {(data.compliance_turmas !== null || data.redatores !== null) && (
        <section className="space-y-3">
          <SectionLabel>{t('dashboard.section.compliance')}</SectionLabel>
          <div className="space-y-4">
            {data.compliance_turmas !== null && <CompliancePanel turmas={data.compliance_turmas} />}
            {data.redatores !== null && <RedatorLoadPanel redatores={data.redatores} />}
          </div>
        </section>
      )}
    </div>
  )
}

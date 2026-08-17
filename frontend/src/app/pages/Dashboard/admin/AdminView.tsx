import { useTranslation } from 'react-i18next'
import type { AdminDashboardData } from '@shared/types/generated'
import { SectionLabel } from '../SectionLabel'
import { KpiRow } from '../KpiRow'
import { AlertList } from '../AlertList'
import { AgendaPanel } from '../AgendaPanel'
import { kpiCards } from './kpiCards'
import { PendingList } from './PendingList'
import { PipelineFunnel } from './PipelineFunnel'

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
export function AdminView({ data }: { data: AdminDashboardData }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <KpiRow items={kpiCards(data.kpis)} />

      <section className="space-y-3">
        <SectionLabel>{t('dashboard.section.action')}</SectionLabel>
        {/* Duas colunas só a partir de `xl`. Em `lg` a sidebar ainda está
          * expandida (256px) e cada card caía para ~343px, truncando os 7
          * rótulos de pendência; em 1280 a truncagem some (UI-04 da revisão de
          * 2026-08-16). */}
        <div className="grid gap-4 xl:grid-cols-2">
          <PendingList items={data.pendencias} />
          <AlertList items={data.alertas} />
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
    </div>
  )
}

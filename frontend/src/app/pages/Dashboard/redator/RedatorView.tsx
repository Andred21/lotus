import { useTranslation } from 'react-i18next'
import type { RedatorDashboardData } from '@shared/types/generated'
import { SectionLabel } from '../SectionLabel'
import { KpiRow } from '../KpiRow'
import { AgendaPanel } from '../AgendaPanel'
import { AlertList } from '../AlertList'
import { PendenciasList } from './PendenciasList'
import { historicoCards, resumoCards } from './resumoCards'

/**
 * Painel do Redator: as 5 seções do contrato `view=redator`, e nada além.
 *
 * Não há gate a testar aqui — as 6 chaves são não-anuláveis
 * (`generated.ts:376-383`) — e não há ocultação a fazer: o payload já chega
 * filtrado da API, sem Comercial, sem UF, sem cliente e sem turma alheia. O
 * `AgendaPanel` genérico (D13) fecha o ownership pelo TIPO:
 * `RedatorAgendaTurmaData` não tem `client_name`, então não existe o que
 * esconder.
 *
 * Três dos cinco renderizadores são reuso medido, não abstração especulativa
 * (D13): `AlertList` consome o MESMO `AlertData[]`, `KpiRow` já era genérico
 * sobre `Kpi[]` e `AgendaPanel` divergia em exatamente um campo.
 */
export function RedatorView({ data }: { data: RedatorDashboardData }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.now')}</SectionLabel>
        <KpiRow items={resumoCards(data.resumo)} />
      </section>

      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.action')}</SectionLabel>
        <div className="grid gap-4 xl:grid-cols-2">
          <PendenciasList items={data.pendencias_documentais} />
          <AlertList items={data.alertas_documentos} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.agenda')}</SectionLabel>
        <AgendaPanel agenda={data.agenda} />
      </section>

      {/* Instância separada de KpiRow, com faixa própria: resumo e histórico
        * respondem perguntas diferentes — "o que tenho agora" e "o que já fiz"
        * — e o Drive as separa. */}
      <section className="space-y-3">
        <SectionLabel>{t('dashboard.redator.section.history')}</SectionLabel>
        <KpiRow items={historicoCards(data.historico)} />
      </section>
    </div>
  )
}

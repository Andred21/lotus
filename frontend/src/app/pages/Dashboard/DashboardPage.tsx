import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, AppErrorState, AppSkeleton, AppEmptyState, InlineLoadState } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useDashboard } from './useDashboard'
import { KpiRow } from './KpiRow'
import { PendingList } from './PendingList'
import { AlertList } from './AlertList'
import { AgendaPanel } from './AgendaPanel'
import { PipelineFunnel } from './PipelineFunnel'

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <AppSkeleton key={i} width="100%" height="6rem" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AppSkeleton width="100%" height="16rem" />
        <AppSkeleton width="100%" height="16rem" />
      </div>
      <AppSkeleton width="100%" height="12rem" />
    </div>
  )
}

/**
 * Faixa de seção. O `h2` que faltava: a página emitia `h1` e depois `h3` dos
 * cards, sem degrau intermediário, e as quatro seções não se apresentavam como
 * filhas do título (UI-05 do review de 2026-08-17). O degrau existe porque a
 * página TEM dois registros — o que pede ação e o que dá contexto —, e eles já
 * estavam escritos no docblock abaixo sem aparecer na tela.
 *
 * `m-0` pelo mesmo motivo do `AppCardHeader`: sem Preflight, o `h2` traria
 * `margin: 0.83em` do agente do usuário.
 *
 * Tinta do corpo, não a secundária: a faixa pousa no `--surface-ground`, e ali
 * `--text-color-secondary` mede 4,34:1 — reprova o 4,5:1 de texto normal. O
 * mesmo cinza passa (4,76:1) sobre o branco dos cards, que é onde os outros
 * rótulos miúdos da tela moram.
 */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2
        className="m-0 text-xs font-semibold tracking-wider uppercase"
        style={{ color: 'var(--text-color)' }}
      >
        {children}
      </h2>
      <span aria-hidden="true" className="h-px flex-1" style={{ background: 'var(--surface-border)' }} />
    </div>
  )
}

/**
 * Central operacional do administrador. Declarativa: a query e a política de
 * estado moram em `useDashboard` (D9); aqui só se decide o ramo e se distribui
 * o dado já tipado.
 *
 * Layout "torre" (D16): fileira de KPIs; abaixo, pendências e alertas LADO A
 * LADO — as duas listas que respondem "o que faço agora", na primeira tela;
 * abaixo, agenda; abaixo, pipeline, que são leitura de contexto. Em telas
 * estreitas as duas colunas empilham.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)
  const state = useDashboard()

  const header = (
    <PageHeader title={t('dashboard.welcome', { name: user?.name })} description={t('dashboard.subtitle')} />
  )

  if (state.kind === 'loading') {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    )
  }

  // Falhou E não há nada em cache: é o único caso em que o erro SUBSTITUI a tela.
  if (state.kind === 'error') {
    return (
      <div>
        {header}
        <AppErrorState
          title={t('common.loadError')}
          detail={state.error.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={state.retry}
        />
      </div>
    )
  }

  // D12: a view do Redator é do B2, e hoje nenhum redator autentica. Sem
  // placeholder e sem tela de transição — só o cabeçalho.
  if (state.kind === 'unsupported') return <div>{header}</div>

  // O caso-limite do §4: esconder cada seção nula, uma a uma, deixaria a página
  // em branco para quem não tem módulo nenhum — indistinguível de falha
  // silenciosa. A tela diz o que está acontecendo em vez de não dizer nada.
  if (state.kind === 'unauthorized') {
    return (
      <div>
        {header}
        <AppEmptyState
          icon="pi pi-lock"
          title={t('dashboard.noAccess.title')}
          description={t('dashboard.noAccess.description')}
        />
      </div>
    )
  }

  const { data } = state

  return (
    <div>
      {header}

      {/* Falha COM cache: aviso ao lado, a tela permanece utilizável (BD-6). */}
      <InlineLoadState error={state.staleError} retryLabel={t('common.retry')} onRetry={state.retry} />

      <div className="space-y-6">
        <KpiRow kpis={data.kpis} />

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

        {/* Seção nula por gate não renderiza (D6) — e a faixa some junto quando
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
    </div>
  )
}

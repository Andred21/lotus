import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, AppErrorState, AppEmptyState, InlineLoadState } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useDashboard } from './useDashboard'
import { DashboardSkeleton } from './DashboardSkeleton'
import { AdminView } from './admin/AdminView'
import { RedatorView } from './redator/RedatorView'
import { PERIOD_PRESET_PADRAO, periodoDoPreset, periodoPadrao } from './admin/periodPresets'
import type { PeriodPresetKey } from './admin/periodPresets'

/**
 * Roteador de `kind` do Dashboard, e só isso (D3/D4). A query e a política de
 * estado moram em `useDashboard`; cada view compõe a própria pasta.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)

  // D12: a janela mora aqui. Não cruza fronteira além do par página/seletor, e
  // a rule proíbe promover a Zustand o que não cruza fronteira. `useState` com
  // inicializador de função para o `new Date()` rodar UMA vez, no mount, e não
  // a cada render.
  const [preset, setPreset] = useState<PeriodPresetKey>(PERIOD_PRESET_PADRAO)
  const [period, setPeriod] = useState(() => periodoPadrao(new Date()))
  const state = useDashboard(period)

  // Trocar de preset recalcula a janela; "Personalizado" mantém a que estava e
  // passa o comando para os dois campos.
  const trocarPreset = (novo: PeriodPresetKey) => {
    setPreset(novo)
    const janela = periodoDoPreset(novo, new Date())
    if (janela) setPeriod(janela)
  }

  /** O texto do aviso lateral, resolvido num lugar só e descido pronto para o
   * `AdminView`/`PeriodFilter`.
   *
   * `staleError` carrega só o `detail` que o FRONT escreveu (D-05): o do
   * servidor não é localizado e é calado no `useDashboard`. Mas ali `staleError`
   * é mensagem E gatilho — o `InlineLoadState` desiste no `!error` —, então
   * imprimir o campo cru fazia o aviso inteiro sumir num 500, inclusive no 422
   * de janela invertida que a D6 existe para mostrar. `staleErrored` é o
   * gatilho; a dica genérica é de quem imprime. */
  const avisoStale = (s: { staleErrored: boolean; staleError: string | null }) =>
    s.staleErrored ? (s.staleError ?? t('common.loadErrorHint')) : null

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

  // Falhou E não há nada em mão, de nenhuma janela: é o único caso em que o
  // erro SUBSTITUI a tela.
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

  // O caso-limite do §4 do B1: esconder cada seção nula, uma a uma, deixaria a
  // página em branco para quem não tem módulo nenhum — indistinguível de falha
  // silenciosa. A tela diz o que está acontecendo em vez de não dizer nada.
  // Só o admin tem este ramo: as 6 chaves do Redator são não-anuláveis.
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

  if (state.kind === 'ready-redator') {
    return (
      <div>
        {header}
        {/* Falha COM dado em mão: aviso ao lado (BD-6). O Redator não tem
          * seletor de janela, então o aviso mora aqui e não junto de um
          * controle. */}
        <InlineLoadState error={avisoStale(state)} retryLabel={t('common.retry')} onRetry={state.staleRetry} />
        <RedatorView data={state.data} />
      </div>
    )
  }

  return (
    <div>
      {header}
      <AdminView
        data={state.data}
        preset={preset}
        period={period}
        staleError={avisoStale(state)}
        onPresetChange={trocarPreset}
        onPeriodChange={setPeriod}
        onRetry={state.staleRetry}
      />
    </div>
  )
}

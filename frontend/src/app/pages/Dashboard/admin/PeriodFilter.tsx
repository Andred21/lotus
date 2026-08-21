import { useTranslation } from 'react-i18next'
import { AppDropdown, AppDatePicker, InlineLoadState } from '@shared/ui'
import type { DashboardPeriod } from '../useDashboard'
import { PERIOD_PRESETS } from './periodPresets'
import type { PeriodPresetKey } from './periodPresets'

/**
 * Seletor de janela histórica (D5): presets para o caso frequente, e
 * "Personalizado" revelando DOIS campos de data — não um range. O wrapper é de
 * data única (`AppDatePicker.tsx:6`) e o backend trata `period_start` e
 * `period_end` como limites independentes; dois campos espelham o contrato 1:1.
 *
 * Sem validação de janela invertida aqui (D6): ela vive no backend, que sobe
 * 422 com `errors.period_end`. Validar no cliente duplicaria a regra, e a
 * mensagem chegaria em duas gramáticas diferentes. A falha aparece AO LADO,
 * neste mesmo bloco, com a tela mantendo o dado anterior.
 */
export function PeriodFilter({
  preset,
  period,
  staleError,
  onPresetChange,
  onPeriodChange,
  onRetry,
}: {
  preset: PeriodPresetKey
  period: DashboardPeriod
  /** `detail` do 422/500 do GET da janela nova. A tela segue com o dado anterior. */
  staleError: string | null
  onPresetChange: (p: PeriodPresetKey) => void
  onPeriodChange: (p: DashboardPeriod) => void
  /** Ausente na recusa de validação: ali "Reintentar" reemitiria a mesma janela
   * invertida e receberia o mesmo 422 (`useDashboard.podeRepetir`).
   * Aceita a promise do `staleRetry`: é ela que mantém o botão do `InlineLoadState`
   * em carga enquanto o GET está em voo (Q-14). `() => void` compila e faz o tipo
   * mentir, porque TypeScript aceita descartar retorno. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()

  const opcoes = PERIOD_PRESETS.map((chave) => ({ value: chave, label: t(`dashboard.period.${chave}`) }))

  return (
    <div className="space-y-1">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_auto]">
        <AppDropdown
          value={preset}
          options={opcoes}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => onPresetChange(e.value as PeriodPresetKey)}
          aria-label={t('dashboard.period.label')}
        />
        {preset === 'custom' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <AppDatePicker
              value={period.start}
              onChange={(v) => onPeriodChange({ ...period, start: v ?? period.start })}
              aria-label={t('dashboard.period.start')}
              placeholder={t('dashboard.period.start')}
            />
            <AppDatePicker
              value={period.end}
              onChange={(v) => onPeriodChange({ ...period, end: v ?? period.end })}
              aria-label={t('dashboard.period.end')}
              placeholder={t('dashboard.period.end')}
            />
          </div>
        )}
      </div>
      {/* O erro da janela mora AQUI, junto do controle que o causou — não no
        * topo da página. É o que a D6 pede, e o InlineLoadState já é a linha
        * compacta sob um controle que continua utilizável. */}
      <InlineLoadState error={staleError} retryLabel={t('common.retry')} onRetry={onRetry} />
    </div>
  )
}

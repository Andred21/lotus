import { useTranslation } from 'react-i18next'
import type { Period } from '@shared/lib'
import { AppDropdown } from '../AppDropdown'
import { AppDatePicker } from '../AppDatePicker'
import { InlineLoadState } from '../InlineLoadState'

/**
 * Seletor de janela (D5 do B2): presets para o caso frequente, e o preset
 * `customKey` revelando DOIS campos de data — não um range. O wrapper é de data
 * única (`AppDatePicker.tsx:6`) e o backend trata `period_start` e
 * `period_end` como limites independentes; dois campos espelham o contrato 1:1.
 *
 * Os presets chegam por prop: cada tela tem os seus (o Dashboard usa
 * "últimos 12 meses", o diálogo do cliente usa "semana/mês/ano"), e o
 * componente só sabe qual deles revela as datas (`customKey`).
 *
 * Sem validação de janela invertida aqui (D6): ela vive no backend, que sobe
 * 422 com `errors.period_end`. Validar no cliente duplicaria a regra, e a
 * mensagem chegaria em duas gramáticas diferentes. A falha aparece AO LADO,
 * neste mesmo bloco, com a tela mantendo o dado anterior.
 */
export function PeriodFilter<K extends string>({
  preset,
  presets,
  customKey,
  period,
  staleError,
  onPresetChange,
  onPeriodChange,
  onRetry,
}: {
  preset: K
  /** As opções do dropdown, na ordem em que aparecem. */
  presets: { value: K; label: string }[]
  /** O preset que revela os dois campos de data. */
  customKey: K
  period: Period
  /** `detail` do 422/500 do GET da janela nova. A tela segue com o dado anterior. */
  staleError?: string | null
  onPresetChange: (p: K) => void
  onPeriodChange: (p: Period) => void
  /** Ausente na recusa de validação: ali "Reintentar" reemitiria a mesma janela
   * invertida e receberia o mesmo 422 (`useDashboard.podeRepetir`).
   * Aceita a promise do `staleRetry`: é ela que mantém o botão do `InlineLoadState`
   * em carga enquanto o GET está em voo (Q-14). `() => void` compila e faz o tipo
   * mentir, porque TypeScript aceita descartar retorno. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_auto]">
        <AppDropdown
          value={preset}
          options={presets}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => onPresetChange(e.value as K)}
          aria-label={t('common.period.label')}
        />
        {preset === customKey && (
          <div className="grid gap-2 sm:grid-cols-2">
            <AppDatePicker
              value={period.start}
              onChange={(v) => onPeriodChange({ ...period, start: v ?? period.start })}
              aria-label={t('common.period.start')}
              placeholder={t('common.period.start')}
            />
            <AppDatePicker
              value={period.end}
              onChange={(v) => onPeriodChange({ ...period, end: v ?? period.end })}
              aria-label={t('common.period.end')}
              placeholder={t('common.period.end')}
            />
          </div>
        )}
      </div>
      {/* O erro da janela mora AQUI, junto do controle que o causou — não no
        * topo da página. É o que a D6 pede, e o InlineLoadState já é a linha
        * compacta sob um controle que continua utilizável. */}
      <InlineLoadState error={staleError ?? null} retryLabel={t('common.retry')} onRetry={onRetry} />
    </div>
  )
}

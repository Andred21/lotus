import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDropdown, PeriodFilter } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { EmissionPanelTurmaData } from '@shared/types/generated'
import type { useEmissionPanelState } from '../../hooks/useEmissionPanelState'
import { EMISSION_PANEL_WINDOW_MONTHS, EMISSION_PERIOD_KEYS } from '../../lib/emissionWindow'

type PanelState = ReturnType<typeof useEmissionPanelState>

/**
 * Barra de filtros da Emisión, no molde do Historial: rótulo e controle na
 * MESMA linha, direto sobre o painel da aba. Antes ficava numa caixa própria,
 * que punha borda dentro de borda e destoava das outras telas.
 *
 * Os presets do período; o 422 de janela invertida aparece AO LADO do filtro,
 * com a tela mantendo o dado anterior (D6 do Dashboard).
 */
export function EmissionFilters({ s, turma }: { s: PanelState; turma: EmissionPanelTurmaData | undefined }) {
  const { t } = useTranslation()
  const turmaInputId = useId()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-auto">
          <PeriodFilter
            preset={s.preset}
            presets={EMISSION_PERIOD_KEYS.map((value) => ({
              value,
              label: t(`certificate.period.${value}`, { months: EMISSION_PANEL_WINDOW_MONTHS }),
            }))}
            customKey="custom"
            period={s.period}
            staleError={s.staleError}
            onPresetChange={s.setPreset}
            onPeriodChange={s.setPeriod}
            onRetry={s.staleRetry}
          />
        </div>
        {/* O rótulo é a correção do UI-02 da run de Certificados (2026-08-25).
          * O nome acessível vinha do PLACEHOLDER — o PrimeReact o usa como
          * texto do botão que abre a lista — e no visual não havia rótulo.
          * `useId` + `inputId`, a forma dos filtros de estado irmãos. */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:min-w-64 sm:flex-1">
          <label htmlFor={turmaInputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.turmaConcluida')}
          </label>
          <div className="min-w-48 max-w-xl flex-1">
            <AppDropdown
              inputId={turmaInputId}
              value={s.turmaId}
              options={s.options}
              optionLabel="label"
              optionValue="value"
              placeholder={t('certificate.selectTurma')}
              onChange={(e) => s.setTurmaId(e.value)}
            />
          </div>
        </div>
      </div>
      {turma && (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {turma.course_name} · {turma.client_name} ·{' '}
          {t('certificate.concludedAt', { date: formatDate(new Date(`${turma.end_date}T00:00:00`)) })}
        </p>
      )}
    </div>
  )
}

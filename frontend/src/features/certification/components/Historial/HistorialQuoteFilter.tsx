import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDropdown } from '@shared/ui'
import type { CertificateQuoteOptionData } from '@shared/types/generated'

/**
 * O filtro de cotação do Historial — par rótulo+dropdown, como o
 * `HistorialStatusFilter` (o rótulo é o que diz ao leitor de tela o que se
 * filtra). Dropdown com busca porque a lista cresce com cada cotação certificada
 * e ninguém caça `Scap 41 - R2` a olho; `showClear` devolve ao "todas" sem uma
 * opção-fantasma de `null` no meio da busca.
 *
 * `emptyFilterMessage` é obrigatório aqui: o `AppDropdown` não traz piso para o
 * caminho do `filter` e o default do Prime é inglês (ver docblock do wrapper).
 */
export function HistorialQuoteFilter({
  value,
  options,
  onChange,
}: {
  value: number | null
  options: CertificateQuoteOptionData[]
  onChange: (quoteId: number | null) => void
}) {
  const { t } = useTranslation()
  const inputId = useId()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('certificate.colQuote')}
      </label>
      <div className="w-56">
        <AppDropdown
          inputId={inputId}
          value={value}
          options={options}
          optionLabel="code"
          optionValue="id"
          placeholder={t('certificate.filterAllFeminine')}
          filter
          showClear
          emptyFilterMessage={t('common.noOptions')}
          onChange={(e) => onChange((e.value as number | null | undefined) ?? null)}
        />
      </div>
    </div>
  )
}

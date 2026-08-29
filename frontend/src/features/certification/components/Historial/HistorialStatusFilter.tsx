import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDropdown } from '@shared/ui'
import type { CertificateDisplayStatus } from '@shared/types/generated'

const STATUSES: CertificateDisplayStatus[] = ['vigente', 'por_vencer', 'vencido', 'revocado']

/**
 * O filtro de estado do Historial — par rótulo+dropdown, não um
 * `<div className="w-48">` solto com o dropdown dentro.
 *
 * O rótulo é a correção do UI-01 da revisão de Certificados (2026-08-25), o
 * mesmo achado que já tinha aparecido no UI-07 de Operação e no UI-02 de
 * Comercial: o dropdown expunha só o VALOR corrente ("Todos") e o leitor de
 * tela anunciava "Todos, combo box", sem dizer o que se filtra. `useId` (e não
 * uma string fixa) porque a aba pode ganhar uma segunda tabela um dia; um id
 * hardcoded duplicaria em silêncio. `inputId`, não `id` — o `AppDropdown`
 * documenta por quê. A chave do rótulo é a que já titula a coluna.
 *
 * Extraído da `HistorialTable` em 2026-08-29, quando o rebase sobre a `main`
 * do item 18 somou as linhas das duas lanes e a tabela passou da régua de 150.
 * Mesmo movimento que o `TurmaStatusFilter` registra desde 2026-08-24, e igual
 * a ele: literal, nenhuma condicional mudou de forma.
 */
export function HistorialStatusFilter({
  value,
  onChange,
}: {
  value: CertificateDisplayStatus | null
  onChange: (status: CertificateDisplayStatus | null) => void
}) {
  const { t } = useTranslation()
  const inputId = useId()

  const options = [
    { label: t('certificate.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`certificate.status.${s}`), value: s })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('certificate.colStatus')}
      </label>
      <div className="w-48">
        <AppDropdown
          inputId={inputId}
          value={value}
          options={options}
          optionValue="value"
          onChange={(e) => onChange(e.value as CertificateDisplayStatus | null)}
        />
      </div>
    </div>
  )
}

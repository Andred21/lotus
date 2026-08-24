import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDropdown } from '@shared/ui'
import type { TurmaDisplayStatus } from '../../lib/turmaStatus'

const STATUSES: TurmaDisplayStatus[] = ['em_andamento', 'habilitada', 'concluida']

/**
 * O filtro de estado da lista de turmas — par rótulo+dropdown, não um
 * `<div className="w-48">` solto com o dropdown dentro.
 *
 * O rótulo é a correção do UI-07 da revisão de 2026-08-23: o dropdown expunha só
 * o VALOR corrente ("Todos"), sem nome nenhum — nem visual, nem para leitor de
 * tela. `useId` (e não uma string fixa) porque a tabela pode ganhar irmã na
 * mesma tela um dia; um id hardcoded duplicaria em silêncio. `inputId`, não
 * `id` — o `AppDropdown` documenta por quê (`dropdown.cjs.js:1577`).
 *
 * Extraído da `TurmasTable` em 2026-08-24, quando a tabela passou da régua de
 * 150 linhas ao declarar a largura das últimas três colunas. Movimento literal:
 * nenhuma condicional mudou de forma.
 */
export function TurmaStatusFilter({
  value,
  onChange,
}: {
  value: TurmaDisplayStatus | null
  onChange: (status: TurmaDisplayStatus | null) => void
}) {
  const { t } = useTranslation()
  const inputId = useId()

  const options = [
    { label: t('operation.table.filterAll'), value: null },
    ...STATUSES.map((s) => ({ label: t(`operation.status.${s}`), value: s })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('operation.table.status')}
      </label>
      <div className="w-48">
        <AppDropdown
          inputId={inputId}
          value={value}
          options={options}
          optionValue="value"
          onChange={(e) => onChange(e.value as TurmaDisplayStatus | null)}
        />
      </div>
    </div>
  )
}

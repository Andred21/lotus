import type { ReactNode } from 'react'

/** Cabeçalho de módulo: título + descrição + tags/ações à direita. Presentational
 * puro (não conhece feature).
 *
 * `actions` está em remoção: a ação primária de módulo desceu para a toolbar do
 * card (spec de 2026-07-26, D1). Sai quando a Parte 2 migrar os últimos
 * consumidores. */
export function PageHeader({
  title,
  description,
  tags,
  actions,
}: {
  title: string
  description?: string
  tags?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{title}</h2>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
      {(tags || actions) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {tags}
          {actions}
        </div>
      )}
    </div>
  )
}

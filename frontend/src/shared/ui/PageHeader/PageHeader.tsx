import type { ReactNode } from 'react'

/** Cabeçalho de módulo: título + descrição à esquerda, tags à direita.
 * Apresentacional puro (não conhece feature).
 *
 * Não tem slot de ação: a ação primária de módulo mora na toolbar do card
 * (spec de 2026-07-26, D1). */
export function PageHeader({
  title,
  description,
  tags,
}: {
  title: string
  description?: string
  tags?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>{title}</h2>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
      {tags && <div className="flex shrink-0 flex-wrap items-center gap-2">{tags}</div>}
    </div>
  )
}

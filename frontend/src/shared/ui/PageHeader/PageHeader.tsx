import type { ReactNode } from 'react'

/** Cabeçalho de módulo: título + descrição à esquerda, tags à direita.
 * Apresentacional puro (não conhece feature).
 *
 * Não tem slot de ação: a ação primária de módulo mora na toolbar do card
 * (spec de 2026-07-26, D1).
 *
 * O título é `h1` porque este componente é o dono único do título de página
 * desde a UI-05 de 2026-08-11 — quando o `h1` saiu do Header, ninguém assumiu
 * o nível 1 e toda rota autenticada passou a abrir a árvore de cabeçalhos no
 * nível 2, pressupondo um pai inexistente (UI-02 do review de 2026-08-12).
 *
 * A margem vertical é cravada porque o projeto não carrega o Preflight: o
 * user-agent dá 0.83em ao h2 e 0.67em ao h1, então a troca de nível mexeria no
 * espaçamento de todas as páginas. Fixar o valor do h2 mantém a correção
 * semântica invisível na tela, que é o ponto. */
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
        <h1 className="my-[0.83em] font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>{title}</h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
      {tags && <div className="flex shrink-0 flex-wrap items-center gap-2">{tags}</div>}
    </div>
  )
}

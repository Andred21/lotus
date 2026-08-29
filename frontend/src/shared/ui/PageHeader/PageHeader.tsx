import type { ReactNode } from 'react'
import { pageTitleClass } from '../typography'

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
 * A margem de baixo é degrau da escala (`mb-4`), não mais o valor que o agente
 * do usuário dava ao `h2`. A de CIMA não existe: o mini-reset de `index.css`
 * (P-46) zera `h1..h6`, e o respiro acima do cabeçalho é responsabilidade do
 * contêiner da página — achado E2 do audit de 2026-08-26. */
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
        <h1 className={`mb-4 ${pageTitleClass}`} style={{ color: 'var(--text-color)' }}>{title}</h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
      {tags && <div className="flex shrink-0 flex-wrap items-center gap-2">{tags}</div>}
    </div>
  )
}

import { useEffect, useRef, type RefObject } from 'react'

export type MoveTarget = 'up' | 'down' | 'add' | 'remove'

const OPPOSITE: Partial<Record<MoveTarget, MoveTarget>> = { up: 'down', down: 'up' }

/** Foco que sobrevive à reordenação de uma lista por índice.
 *
 * A lista usa `key={i}` (replace-total no backend), então o botão que o usuário
 * apertou continua no mesmo lugar do DOM enquanto o CONTEÚDO troca de linha: o
 * módulo movido passa a morar noutro índice, e o foco ficava no vizinho — ou
 * sumia, quando a linha deixava de existir (A-3). Quem move chama `focusAfter`
 * com o índice NOVO do item; o foco é aplicado depois do render, no mesmo botão
 * (`data-move-index` + `data-move`) dentro do `containerRef`.
 *
 * Botão desabilitado não recebe foco: nas pontas vai ao oposto do mesmo item.
 * `AppButton` não repassa ref (wrapper apresentacional), por isso a busca é por
 * atributo de dado e não por ref de botão. */
export function useMoveFocus(): {
  containerRef: RefObject<HTMLDivElement | null>
  focusAfter: (index: number, target: MoveTarget) => void
} {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pending = useRef<{ index: number; target: MoveTarget } | null>(null)

  // Sem deps de propósito: o alvo é consumido no PRIMEIRO render depois do pedido,
  // que é o que já traz a lista reordenada.
  useEffect(() => {
    const wanted = pending.current
    const root = containerRef.current
    if (!wanted || !root) return
    pending.current = null

    const find = (target: MoveTarget) =>
      root.querySelector<HTMLButtonElement>(
        target === 'add'
          ? '[data-move="add"]'
          : `[data-move-index="${wanted.index}"][data-move="${target}"]`,
      )
    const first = find(wanted.target)
    const opposite = OPPOSITE[wanted.target]
    const next = first && !first.disabled ? first : opposite ? find(opposite) : null
    next?.focus()
  })

  return {
    containerRef,
    focusAfter: (index, target) => {
      pending.current = { index, target }
    },
  }
}

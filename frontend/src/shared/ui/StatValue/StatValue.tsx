import type { ReactNode } from 'react'
import { statValueClass } from '../typography'

export interface StatValueProps {
  children: ReactNode
  /** `page`: o número É o assunto da dobra (KPI). `card`: o número dentro de um
   * cartão que já tem outro assunto. */
  size: 'page' | 'card'
}

/**
 * Número de estatística. Componente, e não constante, porque o papel é o
 * ELEMENTO — quem compõe não escolhe a tag nem precisa lembrar do `tabular-nums`
 * (spec D2).
 *
 * O `tabular-nums` é o motivo de existir: sem ele o dígito muda de largura
 * entre renders e o número dança na coluna. Era o caso do UF do
 * `BudgetStatCard` (achado A3 do audit de 2026-08-26).
 *
 * Sem cor: quem compõe sabe sobre que superfície o número pousa — o `AppCard
 * variant="stat"` já tinge texto, fundo e borda pelo `tone`.
 */
export function StatValue({ children, size }: StatValueProps) {
  return <span className={statValueClass(size)}>{children}</span>
}

import { Divider } from 'primereact/divider'
import type { DividerProps } from 'primereact/divider'

export type AppDividerProps = DividerProps

/**
 * Divisor do PrimeReact. O traço não é borda do elemento: é o `::before`, que
 * o tema pinta com o cinza da superfície clara. Alcançar esse pseudo-elemento
 * do call site é exatamente o que o ADR-16 §3 proíbe — então quem o pinta é o
 * wrapper, e o que ele lê é um token.
 *
 * O padrão do token vive no brand-theme.css; superfície que não acompanha o
 * tema (a navy fixa do header) redeclara só a variável, sem tocar no traço.
 */
export function AppDivider({ className, ...props }: AppDividerProps) {
  const merged = ['before:border-(--divider-stroke)', className].filter(Boolean).join(' ')

  return <Divider className={merged} {...props} />
}

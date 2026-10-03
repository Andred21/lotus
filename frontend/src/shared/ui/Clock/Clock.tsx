import { useClock } from '@shared/hooks/useClock'
import { Timestamp } from '../Timestamp'

/**
 * Relógio ao vivo do cabeçalho: o tick vive no `useClock`, e a hora e a data
 * são um `Timestamp` (item 23) — a mesma peça do "Último acceso" das tabelas.
 *
 * A cor NÃO se fixa aqui: o texto herda de quem o posiciona (a barra navy do
 * shell), e só os ícones do `Timestamp` têm cor própria.
 *
 * A inscrição no idioma (D-P12) mora no `Timestamp`, que é quem formata. O
 * `className` do posicionador (`hidden md:block` no Header) fica num `div`
 * por fora: no próprio `<time>` o `md:block` trocaria a grade por bloco.
 */
export function Clock({ className = '' }: { className?: string }) {
  const now = useClock()

  return (
    <div className={className}>
      <Timestamp value={now} />
    </div>
  )
}

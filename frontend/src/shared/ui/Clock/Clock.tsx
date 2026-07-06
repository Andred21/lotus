import { useClock } from '@shared/hooks/useClock'
import { formatDate, formatTime } from '@shared/lib'

/**
 * Relógio ao vivo (HH:MM + data), es-CL. Presentational — o tick vive no
 * useClock e a formatação em shared/lib; aqui só renderiza.
 */
export function Clock({ className = '' }: { className?: string }) {
  const now = useClock()

  return (
    <div className={`text-right text-xs leading-tight text-slate-500 ${className}`}>
      <p className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(now)}</p>
      <p>{formatDate(now)}</p>
    </div>
  )
}

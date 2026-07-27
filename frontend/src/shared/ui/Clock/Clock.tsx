import { useClock } from '@shared/hooks/useClock'
import { formatDate, formatTime } from '@shared/lib'

/**
 * Relógio ao vivo (HH:MM + data), es-CL. Presentational — o tick vive no
 * useClock e a formatação em shared/lib; aqui só renderiza.
 */
export function Clock({ className = '' }: { className?: string }) {
  const now = useClock()

  return (
    <div className={`text-right text-sm leading-tight ${className} `} style={{ color: 'var(--text-color-secondary)' }}>
      <p className="font-semibold" style={{ color: 'var(--text-color)' }}>{formatTime(now)}</p>
      <p>{formatDate(now)}</p>
    </div>
  )
}

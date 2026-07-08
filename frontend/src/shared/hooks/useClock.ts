import { useEffect, useState } from 'react'

/**
 * Retorna a hora atual, re-renderizando a cada `intervalMs` (default 60s).
 * Limpa o intervalo no unmount.
 */
export function useClock(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

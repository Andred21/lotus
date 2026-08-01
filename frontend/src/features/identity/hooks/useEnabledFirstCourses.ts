import { useState } from 'react'
import type { CourseData } from '@shared/types/generated'

/**
 * Ordena os cursos com os habilitados primeiro, **congelando** quais eram os
 * habilitados no momento em que o diálogo abriu (spec D9).
 *
 * Reordenar a cada toggle faria o card recém-clicado saltar para o outro grupo
 * sob o ponteiro — dois cliques seguidos acertariam o curso errado. A ordem se
 * recalcula na próxima abertura, que é o que `resetKey` identifica
 * (`<id>:<mode>`).
 *
 * O congelado é o conjunto de **ids**, não o array ordenado: a lista de cursos
 * costuma chegar depois do primeiro render, e ela precisa ser ordenada pelo
 * mesmo critério quando chegar.
 *
 * Ajuste de estado durante o render é o padrão do projeto para "resetar quando
 * uma prop muda" — `useEffect` com `setState` é proibido pelo lint.
 */
export function useEnabledFirstCourses(
  courses: CourseData[],
  enabledIds: number[],
  resetKey: string,
): CourseData[] {
  const [snapshot, setSnapshot] = useState({ key: resetKey, enabled: enabledIds })

  if (snapshot.key !== resetKey) setSnapshot({ key: resetKey, enabled: enabledIds })

  const frozen = snapshot.key === resetKey ? snapshot.enabled : enabledIds
  const wasEnabled = (c: CourseData) => frozen.includes(c.id as number)

  // `Array.prototype.sort` é estável: dentro de cada grupo a ordem que a API
  // devolveu se mantém. Introduzir ordenação alfabética aqui seria decisão nova.
  return [...courses].sort((a, b) => Number(wasEnabled(b)) - Number(wasEnabled(a)))
}

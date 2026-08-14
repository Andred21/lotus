import { useLoadState } from '@shared/hooks'
import { coursesApi } from '@shared/api/coursesApi'
import { useEnabledFirstCourses } from './useEnabledFirstCourses'

/**
 * Query e derivação da seleção de cursos do redator, para o componente ficar
 * declarativo (só ramifica os cinco estados e renderiza).
 *
 * Os estados de carga vêm do `useLoadState`: falha de GET não pode se disfarçar
 * de "sem cursos habilitados" (D11 do bloco de cards).
 */
export function useRedatorCourses(courseIds: number[], orderKey: string) {
  const load = useLoadState(coursesApi.useList())

  const allCourses = load.data
  const enabledCourses = allCourses.filter((c) => courseIds.includes(c.id as number))
  const orderedCourses = useEnabledFirstCourses(allCourses, courseIds, orderKey)

  return {
    ...load,
    enabledCourses,
    orderedCourses,
  }
}

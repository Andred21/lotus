import { coursesApi } from '@shared/api/coursesApi'
import { useEnabledFirstCourses } from './useEnabledFirstCourses'

/**
 * Query e derivação da seleção de cursos do redator, para o componente ficar
 * declarativo (só ramifica os cinco estados e renderiza).
 *
 * `?? []` só serve para derivar as listas; `isError` continua exposto separado,
 * porque falha de GET não pode se disfarçar de "sem cursos habilitados" (D11 do
 * bloco de cards).
 */
export function useRedatorCourses(courseIds: number[], orderKey: string) {
  const courses = coursesApi.useList()

  const allCourses = courses.data ?? []
  const enabledCourses = allCourses.filter((c) => courseIds.includes(c.id as number))
  const orderedCourses = useEnabledFirstCourses(allCourses, courseIds, orderKey)

  return {
    isLoading: courses.isLoading,
    isError: courses.isError,
    errorDetail: courses.error?.detail,
    refetch: () => {
      void courses.refetch()
    },
    isEmpty: allCourses.length === 0,
    enabledCourses,
    orderedCourses,
  }
}

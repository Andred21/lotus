import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { CourseData } from '@shared/types/generated'
import { coursesApi } from '@shared/api/coursesApi'

/**
 * Sincroniza a habilitação redator↔curso pelo lado do curso, via endpoint
 * dedicado (`sync` = substituição total). `CourseData.redator_ids` é read-only na
 * escrita, então esta é a única forma de gravar a habilitação pelo curso. Usado
 * só no create (exceção do produto); em edit a habilitação é leitura — edição
 * mora em Pessoas. Invalida a lista de cursos para refletir a nova contagem.
 */
export function useSyncCourseRedatores() {
  const qc = useQueryClient()
  return useMutation<CourseData, ProblemDetails, { courseId: number; redator_ids: number[] }>({
    mutationFn: ({ courseId, redator_ids }) =>
      api.put<CourseData>(`/api/courses/${courseId}/redatores`, { redator_ids }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: coursesApi.keys.all }),
  })
}

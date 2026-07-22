import { useMutation } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { EnrollPreviewData } from '@shared/types/generated'

/** Preview de RUT antes de matricular (2 passos, D5). GET on-demand → mutation
 * (não query): dispara no clique de "Continuar", não no render. RUT inválido /
 * tipo errado sobe como 422 no ProblemDetails. */
export function useEnrollPreview() {
  return useMutation<EnrollPreviewData, ProblemDetails, { turmaId: number; rut: string }>({
    mutationFn: ({ turmaId, rut }) =>
      api
        .get<EnrollPreviewData>(`/api/turmas/${turmaId}/alunos/preview`, { params: { rut } })
        .then((r) => r.data),
  })
}

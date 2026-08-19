import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { ArchivedEnrollmentData, EnrollmentData, EnrollmentResultData } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'

export const enrollmentKeys = {
  all: ['enrollments'] as const,
  list: (turmaId: number) => ['enrollments', 'list', turmaId] as const,
  archived: (turmaId: number) => ['enrollments', 'archived', turmaId] as const,
}

/** Campos que a UI envia na matrícula individual. Aluno novo (preview.exists=false)
 * exige email (D9 do 6c); o backend valida — o front só pré-marca o campo. */
export type EnrollPayload = {
  rut: string
  name: string
  email?: string | null
  phone?: string | null
}

export function useEnrollments(turmaId: number) {
  return useQuery<EnrollmentData[], ProblemDetails>({
    queryKey: enrollmentKeys.list(turmaId),
    queryFn: () => api.get<EnrollmentData[]>(`/api/turmas/${turmaId}/alunos`).then((r) => r.data),
    enabled: Number.isFinite(turmaId),
  })
}

export function useEnrollStudent() {
  const qc = useQueryClient()
  return useMutation<EnrollmentData, ProblemDetails, { turmaId: number; payload: EnrollPayload }>({
    mutationFn: ({ turmaId, payload }) =>
      api.post<EnrollmentData>(`/api/turmas/${turmaId}/alunos`, payload).then((r) => r.data),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}

/** Registra o resultado acadêmico (Task 10) — o que torna a matrícula
 * elegível a certificado (D-B6). Invalida a MESMA key que o `index` dos
 * alunos usa: é ela quem faz o badge de estado na tabela mudar depois do
 * save, e é a lacuna que este endpoint existia sem UI até esta task. */
export function useRecordResult(turmaId: number) {
  const qc = useQueryClient()
  return useMutation<EnrollmentData, ProblemDetails, { enrollmentId: number; body: EnrollmentResultData }>({
    mutationFn: async (p) =>
      (await api.put<EnrollmentData>(`/api/turmas/${turmaId}/alunos/${p.enrollmentId}/resultado`, p.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
    },
  })
}

export function useRemoveEnrollment() {
  const qc = useQueryClient()
  return useMutation<void, ProblemDetails, { turmaId: number; enrollmentId: number }>({
    mutationFn: ({ turmaId, enrollmentId }) =>
      api.delete(`/api/turmas/${turmaId}/alunos/${enrollmentId}`).then(() => undefined),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: enrollmentKeys.archived(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}

/** Matrículas arquivadas DA turma. Escopada pelo pai porque a matrícula não tem
 * lista de topo — ela vive dentro do detalhe da turma (spec D5). */
export function useEnrollmentsArchivedList(turmaId: number, enabled: boolean) {
  return useQuery<ArchivedEnrollmentData[], ProblemDetails>({
    queryKey: enrollmentKeys.archived(turmaId),
    queryFn: () =>
      api.get<ArchivedEnrollmentData[]>(`/api/turmas/${turmaId}/alunos/archived`).then((r) => r.data),
    enabled: enabled && Number.isFinite(turmaId),
  })
}

/** O id da turma fica FECHADO no hook, e é o que faz o `mutate(id)` do contrato
 * de `useArchivedPage` bastar (spec D12). */
export function useRestoreEnrollment(turmaId: number) {
  const qc = useQueryClient()
  return useMutation<EnrollmentData, ProblemDetails, number>({
    mutationFn: (enrollmentId) =>
      api
        .post<EnrollmentData>(`/api/turmas/${turmaId}/alunos/${enrollmentId}/restore`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: enrollmentKeys.archived(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}

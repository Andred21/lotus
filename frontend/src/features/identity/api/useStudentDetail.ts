import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { studentsApi } from '@shared/api/studentsApi'
import type { StudentDetailData } from '@shared/types/generated'

/**
 * Detalhe do aluno — projeção própria do `show`, com vínculos e turmas.
 *
 * Não usa `studentsApi.useOne` porque o tipo de retorno difere do da listagem;
 * a chave é a mesma da fábrica para o cache não fragmentar.
 */
export function useStudentDetail(id: number | null | undefined) {
  return useQuery<StudentDetailData, ProblemDetails>({
    queryKey: studentsApi.keys.detail(id ?? 'none'),
    queryFn: async () => (await api.get<StudentDetailData>(`/api/students/${id}`)).data,
    enabled: id != null,
    /** Vence o default `false` do `AppProviders`: a coluna Certificado mostra
     * o `display_status` derivado no servidor, que congela no fetch — a tela
     * do aluno fica aberta durante o atendimento inteiro (Q-1 do review de
     * 2026-08-24). Catraca em `useStudentDetail.test.tsx`. */
    refetchOnWindowFocus: true,
  })
}

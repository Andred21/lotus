import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBatchIssue } from './useBatchIssue'
import { api } from '@shared/api/axios'
import type { EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'

vi.mock('@shared/api/axios', () => ({
  api: { post: vi.fn() },
}))

const post = vi.mocked(api.post)

/** `useEmissionPanel` fica ativa atrás do diálogo enquanto ele está aberto
 * (é o painel que o diálogo cobre) — a invalidação do `onSuccess` do
 * `useIssueBatch` a refaz em background, e o `turma` que `BatchIssueDialog`
 * passa para este hook é essa MESMA prop viva, não uma cópia. */
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const enrollment1: EmissionPanelEnrollmentData = {
  enrollment_id: 1,
  student_name: 'Ana Pérez',
  student_rut: '11.111.111-1',
  approval_status: 'aprobado',
  attendance_pct: '100',
  nota_final: '6.5',
  certificate: null,
}

const enrollment2: EmissionPanelEnrollmentData = {
  enrollment_id: 2,
  student_name: 'Bruno Silva',
  student_rut: '22.222.222-2',
  approval_status: 'aprobado',
  attendance_pct: '95',
  nota_final: '6.0',
  certificate: null,
}

function turmaWith(enrollments: EmissionPanelEnrollmentData[]): EmissionPanelTurmaData {
  return {
    turma_id: 1,
    course_name: 'Alta Tensión',
    client_name: 'Cliente X',
    end_date: '2026-01-01',
    template_validity_months: null,
    emission_blocked: null,
    enrollments,
    redatores: [{ redator_id: 9, name: 'Redator Uno' }],
  }
}

describe('useBatchIssue', () => {
  it('mantém os alumnos do lote submetido depois que o painel refaz o fetch em background', async () => {
    // Regressão do achado crítico da Task 7: `pendientes` era derivado de
    // `turma.enrollments` a cada render. O `onSuccess` do `useIssueBatch`
    // invalida a query do painel, que está ativa (o diálogo de resultado
    // continua aberto por cima dela) — o refetch chega com as matrículas
    // recém-emitidas já fora de `sin_emitir`, e o join do relatório por
    // `enrollment_id` (`BatchIssueDialog.tsx:75`) passa a falhar
    // exatamente nas linhas `ok: true`, perdendo o nome do aluno.
    post.mockResolvedValue({
      data: [
        { enrollment_id: 1, ok: true, codigo: 'CERT-1', certificate_id: 10, error: null },
        { enrollment_id: 2, ok: true, codigo: 'CERT-2', certificate_id: 11, error: null },
      ],
    })

    const { result, rerender } = renderHook(({ turma }: { turma: EmissionPanelTurmaData }) => useBatchIssue(turma), {
      wrapper,
      initialProps: { turma: turmaWith([enrollment1, enrollment2]) },
    })

    act(() => result.current.submit())
    await waitFor(() => expect(result.current.results).not.toBeNull())

    // O painel refaz o fetch com o diálogo ainda aberto: as duas matrículas
    // saem de `sin_emitir` porque já têm `certificate`.
    rerender({
      turma: turmaWith([
        { ...enrollment1, certificate: { id: 10, codigo: 'CERT-1', status: 'emitido' } },
        { ...enrollment2, certificate: { id: 11, codigo: 'CERT-2', status: 'emitido' } },
      ]),
    })

    const linha1 = result.current.pendientes.find((e) => e.enrollment_id === 1)
    const linha2 = result.current.pendientes.find((e) => e.enrollment_id === 2)

    expect(linha1?.student_name).toBe('Ana Pérez')
    expect(linha2?.student_name).toBe('Bruno Silva')
  })
})

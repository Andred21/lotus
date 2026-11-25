import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { api } from '@shared/api/axios'
import { createWrapper } from '@shared/testing/providers'
import type { CertificateData, EmissionPanelTurmaData } from '@shared/types/generated'
import { useHistorial } from './useHistorial'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

vi.mock('@shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/hooks')>()),
  usePermissions: () => ({ can: () => true, hasRole: () => true, roles: [] }),
  useServerTable: () => ({ rows: [], loading: false, error: null, refetch: () => {}, meta: undefined }),
}))

const get = vi.mocked(api.get)

/** Turma concluída há mais de 12 meses: fora do default do painel. */
const turmaAntiga: EmissionPanelTurmaData = {
  turma_id: 7,
  quote_code: 'Scap 3 - R1',
  course_name: 'Alta Tensión',
  client_name: 'Cliente X',
  end_date: '2024-02-10',
  emission_blocked: null,
  enrollments: [
    {
      enrollment_id: 55,
      student_name: 'Ana Pérez',
      student_rut: '11.111.111-1',
      approval_status: 'aprobado',
      attendance_pct: '100',
      nota_final: '6.5',
      certificate: null,
      student_photo_url: null,
    },
  ],
  redatores: [],
  manager_signature_missing: false,
}

const certificado = {
  id: 1,
  enrollment_id: 55,
  snapshot: { turma: { end_date: '2024-02-10' } },
} as unknown as CertificateData

describe('useHistorial — Reemitir', () => {
  beforeEach(() => get.mockReset())

  it('pede o painel desde o fim da turma do certificado e acha a matrícula de turma concluída há mais de 12 meses', async () => {
    // O servidor só devolve a turma antiga se a janela abrir em `period_start`:
    // sem o parâmetro vale o default dos 12 meses e o painel vem vazio.
    get.mockImplementation((_url, config) => {
      const params = (config?.params ?? {}) as { period_start?: string }
      return Promise.resolve({ data: params.period_start === '2024-02-10' ? [turmaAntiga] : [] })
    })
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useHistorial(), { wrapper })

    act(() => result.current.setReissuing(certificado))

    await waitFor(() => expect(result.current.findReissueTarget(certificado)).not.toBeNull())
    expect(get).toHaveBeenCalledWith('/api/certificates/emission-panel', {
      params: { period_start: '2024-02-10' },
    })
    expect(result.current.findReissueTarget(certificado)?.turma.turma_id).toBe(7)
  })
})

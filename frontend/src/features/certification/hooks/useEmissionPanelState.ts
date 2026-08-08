import { useMemo, useState } from 'react'
import type { CertificateData } from '@shared/types/generated'
import { useCertificates, useEmissionPanel } from '../api/certificatesApi'
import { rowCertKind } from '../lib/certStatus'

/**
 * Estado da aba Emisión: a query do painel + a turma selecionada (local, sem
 * refletir na rota) + as derivações que `EmissionPanel`/`EmissionStudentsTable`
 * consomem prontas — contagens e opções do dropdown.
 *
 * Também traz `useCertificates()` (Task 5), fora do que o brief desta task
 * pedia explicitamente: a ação "Ver" de uma linha já emitida precisa do
 * `CertificateData` completo (`created_at` para `issuedBy`) para alimentar o
 * MESMO `IssuedDialog` que aparece pós-emissão — o painel só devolve
 * `{id, codigo, status}` por matrícula (`EmissionPanelCertificateData`), sem
 * data. `certificateById` resolve isso por lookup, sem inventar campo nenhum
 * de DTO. A key de `useCertificates()` já é invalidada junto da do painel em
 * toda mutação de emissão/revogação (`certificatesApi.ts`), então o lookup
 * fica fresco sem invalidação própria.
 */
export function useEmissionPanelState() {
  const panel = useEmissionPanel()
  const certificates = useCertificates()
  const [turmaId, setTurmaId] = useState<number | null>(null)

  const turmas = useMemo(() => panel.data ?? [], [panel.data])

  const options = useMemo(
    () => turmas.map((t) => ({ label: `${t.course_name} · ${t.client_name}`, value: t.turma_id })),
    [turmas],
  )

  const selected = useMemo(() => turmas.find((t) => t.turma_id === turmaId), [turmas, turmaId])

  const counts = useMemo(() => {
    const enrollments = selected?.enrollments ?? []
    return {
      total: enrollments.length,
      aprobados: enrollments.filter((e) => e.approval_status === 'aprobado').length,
      emitidos: enrollments.filter((e) => rowCertKind(e) === 'emitido').length,
      pendientes: enrollments.filter((e) => rowCertKind(e) === 'sin_emitir').length,
    }
  }, [selected])

  const certificateById = useMemo(() => {
    const map = new Map<number, CertificateData>()
    for (const c of certificates.data ?? []) map.set(c.id, c)
    return map
  }, [certificates.data])

  return {
    options,
    turmaId,
    setTurmaId,
    selected,
    counts,
    certificateById,
    loading: panel.isLoading,
    loadError: panel.isError ? (panel.error ?? null) : null,
    reload: () => { void panel.refetch() },
  }
}

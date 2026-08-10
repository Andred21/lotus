import { useMemo, useState } from 'react'
import type { CertificateData, EmissionPanelEnrollmentData } from '@shared/types/generated'
import { useCertificate, useEmissionPanel } from '../api/certificatesApi'
import { rowCertKind } from '../lib/certStatus'

/** Contagens da turma selecionada, derivadas UMA vez aqui. `total` e
 * `aprobados` alimentam o rodapé de `EmissionStudentsTable`, que os recalculava
 * do próprio `enrollments` no JSX — a mesma pergunta respondida em dois
 * lugares, com a resposta canônica sem consumidor. */
export type EmissionCounts = {
  total: number
  aprobados: number
  emitidos: number
  pendientes: number
}

/**
 * Estado da aba Emisión: a query do painel + a turma selecionada (local, sem
 * refletir na rota) + as derivações que `EmissionPanel`/`EmissionStudentsTable`
 * consomem prontas — contagens e opções do dropdown.
 *
 * O "Ver" de uma linha já emitida abre o MESMO `IssuedDialog` que aparece
 * pós-emissão, mas o painel só devolve `{id, codigo, status}` por matrícula
 * (`EmissionPanelCertificateData`), sem `created_at`. Em vez de puxar
 * `useCertificates()` inteiro — o histórico é um arquivo legal que só cresce,
 * sem teto — `viewingCertificateId` + `useCertificate(id)` buscam o UM
 * certificado pontual. A query mora aqui, não no componente:
 * `no-restricted-syntax` reprova `useQuery`/`useMutation` sob
 * `features/*\/components/**`.
 */
export function useEmissionPanelState() {
  const panel = useEmissionPanel()
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [viewingCertificateId, setViewingCertificateId] = useState<number | null>(null)
  const [issuing, setIssuing] = useState<EmissionPanelEnrollmentData | null>(null)
  const [batchIssuing, setBatchIssuing] = useState(false)
  const viewingCertificate = useCertificate(viewingCertificateId)

  /** Emissão concluída: fecha a confirmação e abre o diálogo do certificado
   * novo. É UMA transição — enquanto `issuing` morava no componente e
   * `viewingCertificateId` aqui, ela vivia metade no JSX e metade no hook. */
  const openIssuedCertificate = (certificate: CertificateData) => {
    setIssuing(null)
    setViewingCertificateId(certificate.id)
  }

  const turmas = useMemo(() => panel.data ?? [], [panel.data])

  const options = useMemo(
    () => turmas.map((t) => ({ label: `${t.course_name} · ${t.client_name}`, value: t.turma_id })),
    [turmas],
  )

  const selected = useMemo(() => turmas.find((t) => t.turma_id === turmaId), [turmas, turmaId])

  const counts = useMemo<EmissionCounts>(() => {
    const enrollments = selected?.enrollments ?? []
    return {
      total: enrollments.length,
      aprobados: enrollments.filter((e) => e.approval_status === 'aprobado').length,
      emitidos: enrollments.filter((e) => rowCertKind(e) === 'emitido').length,
      pendientes: enrollments.filter((e) => rowCertKind(e) === 'sin_emitir').length,
    }
  }, [selected])

  return {
    options,
    turmaId,
    setTurmaId,
    selected,
    counts,
    issuing,
    setIssuing,
    batchIssuing,
    setBatchIssuing,
    openIssuedCertificate,
    viewingCertificateId,
    setViewingCertificateId,
    viewingCertificate: viewingCertificate.data ?? null,
    viewingCertificateLoading: viewingCertificate.isLoading,
    viewingCertificateError: viewingCertificate.isError ? (viewingCertificate.error ?? null) : null,
    reloadViewingCertificate: () => { void viewingCertificate.refetch() },
    loading: panel.isLoading,
    loadError: panel.isError ? (panel.error ?? null) : null,
    reload: () => { void panel.refetch() },
  }
}

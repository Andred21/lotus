import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWindowedQuery } from '@shared/hooks'
import { currentCalendarPeriod, type Period } from '@shared/lib'
import type { CertificateData, EmissionPanelEnrollmentData, EmissionPanelTurmaData } from '@shared/types/generated'
import { useCertificate, useEmissionPanel, type EmissionPanelPeriod } from '../api/certificatesApi'
import { rowCertKind } from '../lib/certStatus'
import { turmaOptionLabel, type EmissionPeriodKey } from '../lib/emissionWindow'

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

const SEM_CONTAGEM: EmissionCounts = { total: 0, aprobados: 0, emitidos: 0, pendientes: 0 }

/** A função ÚNICA das contagens de uma turma. Alimenta o `counts` da turma
 * selecionada (rodapé da tabela, CTA do lote) e o "N por emitir · M emitidos"
 * dos cards: a mesma pergunta respondida em dois lugares era resposta esperando
 * para divergir (spec 5.1). */
export function countsFor(turma: EmissionPanelTurmaData): EmissionCounts {
  const enrollments = turma.enrollments
  return {
    total: enrollments.length,
    aprobados: enrollments.filter((e) => e.approval_status === 'aprobado').length,
    emitidos: enrollments.filter((e) => rowCertKind(e) === 'emitido').length,
    pendientes: enrollments.filter((e) => rowCertKind(e) === 'sin_emitir').length,
  }
}

/** A janela que o filtro exibe: o calendário corrente nos presets de
 * calendário, as datas do usuário em `custom`. `last12` não tem datas para
 * mostrar (as do servidor não são calculadas aqui), então devolve as de `custom`. */
function shownPeriod(preset: EmissionPeriodKey, custom: Period): Period {
  if (preset === 'week' || preset === 'month' || preset === 'year') return currentCalendarPeriod(preset, new Date())
  return custom
}

/** O que cada preset manda ao servidor. `last12` não manda NADA: a janela
 * default é do backend, no fuso de Santiago (D7). */
function presetParams(preset: EmissionPeriodKey, shown: Period): EmissionPanelPeriod | undefined {
  if (preset === 'last12') return undefined
  return { period_start: shown.start, period_end: shown.end }
}

/**
 * Estado da aba Emisión: a query do painel + a turma selecionada (local, sem
 * refletir na rota) + as derivações que `EmissionPanel`/`EmissionStudentsTable`
 * consomem prontas — contagens e opções do dropdown.
 *
 * O "Ver" de uma linha já emitida abre o MESMO `IssuedDialog` que aparece
 * pós-emissão, mas o painel só devolve `{id, codigo, status}` por matrícula
 * (`EmissionPanelCertificateData`), sem `created_at`. Em vez de puxar a
 * página inteira do Historial — o histórico é um arquivo legal que só cresce,
 * sem teto — `viewingCertificateId` + `useCertificate(id)` buscam o UM
 * certificado pontual. A query mora aqui, não no componente:
 * `no-restricted-syntax` reprova `useQuery`/`useMutation` sob
 * `features/*\/components/**`.
 */
export function useEmissionPanelState() {
  const { t } = useTranslation()
  // `last12` = "a janela é a do servidor" (12 meses de `America/Santiago`), e
  // nenhum parâmetro vai na URL: o seletor só a anuncia, não a calcula.
  // `custom` parte do mês corrente e guarda as duas datas que o usuário mexer.
  const [preset, setPresetState] = useState<EmissionPeriodKey>('last12')
  const [custom, setCustom] = useState<Period>(() => currentCalendarPeriod('month', new Date()))
  const period = shownPeriod(preset, custom)
  const params = presetParams(preset, period)
  const panel = useEmissionPanel(true, params)

  // O piso (de QUALQUER janela), a falha antiga e o `podeRepetir` são a
  // política de query por janela de `useWindowedQuery`, a mesma do Dashboard:
  // sem piso, a recusa 422 de uma janela invertida derrubaria a tela inteira.
  const { data, staleFailed, staleError: staleDetail, staleHint, staleRetry } = useWindowedQuery(panel)

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

  const turmas = useMemo(() => data ?? [], [data])

  const options = useMemo(() => turmas.map((x) => ({ label: turmaOptionLabel(x), value: x.turma_id })), [turmas])

  // A assinatura da gerente é da configuração: o servidor manda o mesmo valor em
  // toda turma, então `some` basta e o aviso aparece antes de escolher a turma.
  const managerSignatureMissing = turmas.some((t) => t.manager_signature_missing)

  const selected = useMemo(() => turmas.find((t) => t.turma_id === turmaId), [turmas, turmaId])

  const counts = useMemo<EmissionCounts>(() => (selected ? countsFor(selected) : SEM_CONTAGEM), [selected])

  // Falha COM dado em mão é aviso ao lado do filtro; só a falha SEM nada em
  // mão substitui a tela. A Emisión imprime UMA string: o detail que sobreviveu
  // ao `screenDetail` (cala o 422) e, na falta dele, a dica por status.
  const staleError = staleFailed ? (staleDetail ?? t(staleHint)) : null

  return {
    preset,
    // Ao abrir as datas, partem do recorte que já estava valendo.
    setPreset: (next: EmissionPeriodKey) => {
      if (next === 'custom' && preset !== 'last12') setCustom(period)
      setPresetState(next)
    },
    period,
    setPeriod: setCustom,
    staleError,
    staleRetry,
    turmas,
    options,
    turmaId,
    setTurmaId,
    selected,
    managerSignatureMissing,
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
    reloadViewingCertificate: (): Promise<unknown> => viewingCertificate.refetch(),
    loading: panel.isLoading,
    loadError: data === undefined && panel.isError ? (panel.error ?? null) : null,
    reload: (): Promise<unknown> => panel.refetch(),
  }
}

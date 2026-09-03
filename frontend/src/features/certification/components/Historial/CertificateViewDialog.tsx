import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppSkeleton, AppErrorState, AppTag, FormField } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'
import type { ProblemDetails } from '@shared/api/axios'
import { formatDate, loadErrorHint, CERTIFICATE_STATUS_SEVERITY, certificateStatusLabelKey } from '@shared/lib'
import { useCertificatePdfOpener } from '../../hooks/useCertificatePdfOpener'
import { CertificateIdentityFields } from './CertificateIdentityFields'
import { dangerText } from '@shared/styles/tokens'

type Props = {
  /** Sempre conhecido de imediato (vem da linha clicada) — o PDF abre pelo id,
   * sem depender do `certificate` ter chegado. */
  certificateId: number
  /** `null` enquanto `loading`/`error`. Vem de `useCertificate` (pontual, em
   * `useHistorial`) e não da linha da lista: um certificado visto e depois
   * revogado precisa refletir a revogação assim que `useRevokeCertificate`
   * invalida `detailKey(certificateId)` — a lista some/atualiza sozinha, mas
   * este diálogo fica aberto por cima dela. */
  certificate: CertificateData | null
  loading: boolean
  error: ProblemDetails | null
  onRetry: () => void
  onHide: () => void
}

/** Detalhe de UM certificado do Historial: resumo do snapshot + Descargar
 * PDF. Mesma forma de diálogo do `IssuedDialog` (loading/error/dado), aqui com
 * mais campos porque o Historial já mostra o certificado emitido por
 * completo, revogado ou não. */
export function CertificateViewDialog({ certificateId, certificate, loading, error, onRetry, onHide }: Props) {
  const { t } = useTranslation()
  const pdf = useCertificatePdfOpener(certificateId)
  const status = certificate?.display_status ?? null

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.close')} text onClick={onHide} />
      {certificate && (
        <AppButton
          variant="primary"
          label={t('certificate.downloadPdf')}
          icon="pi pi-download"
          loading={pdf.pending}
          onClick={pdf.open}
        />
      )}
    </div>
  )

  return (
    <AppDialog visible header={t('certificate.viewTitle')} onHide={onHide} footer={footer}>
      {loading && <AppSkeleton height="14rem" />}

      {error && (
        /* A UNICA tela que imprime o `detail` CRU do servidor, e é deliberado:
           `CorruptedSnapshotException` implementa `PublicDetail` justamente
           para o suporte descobrir aqui QUAIS campos do snapshot faltam (D8 da
           spec de certificação). Todas as outras passam por `screenDetail`
           (shared/lib), que só deixa passar o `detail` de servidor nos status
           da allowlist da P-70 — e o desta exceção é 500, fora dela. Trocá-la
           por `screenDetail` desfaz a D8. A rota pública do
           QR (`ValidationPage`) NÃO é exceção: lá quem lê não é o suporte. */
        <AppErrorState
          title={t('common.loadError')}
          detail={error.detail ?? t(loadErrorHint(error))}
          retryLabel={t('common.retry')}
          onRetry={onRetry}
        />
      )}

      {certificate && status && (
        <div className="space-y-4">
          <CertificateIdentityFields certificate={certificate} />
          {/* Snapshot congelado: campo que nasce só-leitura não tem controle a
              montar. O input desabilitado cortava o nome do curso e o motivo da
              revogação — texto longo, dado de peso legal (spec BD-3 §4). */}
          <FormField label={t('certificate.fieldRut')} readOnly value={certificate.snapshot.aluno.rut ?? '—'} />
          <FormField label={t('certificate.fieldCurso')} readOnly value={certificate.snapshot.curso.name} />
          <FormField
            label={t('certificate.fieldVigencia')}
            readOnly
            value={
              certificate.valido_ate
                ? formatDate(new Date(`${certificate.valido_ate}T00:00:00`))
                : t('certificate.vigenciaIndefinida')
            }
          />
          {/* `readOnly`, e não `children`: a pílula não é controle, e por
              `children` a label saía com `htmlFor` apontando para um id que
              nenhum elemento carrega — label morta, o caso que o próprio
              docblock do `FormField` descreve (P-37, medido no gate do BD-16). */}
          <FormField
            label={t('certificate.fieldEstado')}
            readOnly
            value={<AppTag severity={CERTIFICATE_STATUS_SEVERITY[status]} value={t(certificateStatusLabelKey(status))} />}
          />

          {status === 'revocado' && (
            <>
              <FormField
                label={t('certificate.fieldRevokedAt')}
                readOnly
                value={certificate.revoked_at ? formatDate(new Date(certificate.revoked_at)) : '—'}
              />
              <FormField label={t('certificate.revokeReason')} readOnly value={certificate.revocation_reason ?? '—'} />
            </>
          )}

          {pdf.popupBlocked || pdf.message ? (
            <p className="text-sm" style={{ color: dangerText }}>
              {pdf.popupBlocked ? t('certificate.popupBlocked') : pdf.message}
            </p>
          ) : null}
        </div>
      )}
    </AppDialog>
  )
}

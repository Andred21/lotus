import { useTranslation } from 'react-i18next'
import { AppTag, AppButton } from '@shared/ui'
import type { StudentTurmaData } from '@shared/types/generated'
import {
  CERTIFICATE_STATUS_SEVERITY,
  certificateStatusLabelKey,
  formatDate,
} from '@shared/lib'
import { dangerText } from '@shared/styles/tokens'
import { useStudentCertificatePdfOpener } from '../../hooks/useStudentCertificatePdfOpener'

/**
 * A coluna Certificado da tabela de turmas do aluno. Quatro ramos, e a ordem
 * entre eles é a regra:
 *
 * 1. aprovado sem certificado — "pendente de emissão";
 * 2. o resto sem certificado — "não corresponde";
 * 3. certificado presente com snapshot corrompido — tag de defeito, SEM
 *    afirmar estado. Documento que não sustenta nem o nome do aluno não tem
 *    estado a declarar; as datas continuam válidas e diriam "vigente" sobre
 *    um documento quebrado. Política herdada do Historial, e o defeito NÃO é
 *    um quinto valor do enum. Este ramo vem ANTES do estado no código, ainda
 *    que ambos vivam dentro do `certificate !== null`;
 * 4. certificado presente com snapshot íntegro — código, estado, data (só
 *    quando há prazo) e o PDF.
 *
 * Os ramos 1 e 2 têm significados OPOSTOS e por isso não dividem um traço só:
 * um diz "falta emitir", o outro diz "não vai emitir". A distinção lê apenas
 * `certificate === null` e o `approval_status` que a linha já traz (spec D7).
 */
export function StudentCertificateCell({ turma }: { turma: StudentTurmaData }) {
  const { t } = useTranslation()
  const pdf = useStudentCertificatePdfOpener()
  const certificate = turma.certificate

  if (certificate === null) {
    return turma.approval_status === 'aprobado' ? (
      <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('student.certificatePending')}
      </span>
    ) : (
      <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        — {t('student.certificateNotApplicable')}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm">{certificate.codigo}</span>
        {certificate.snapshot_ok ? (
          <AppTag
            severity={CERTIFICATE_STATUS_SEVERITY[certificate.display_status]}
            value={t(certificateStatusLabelKey(certificate.display_status))}
          />
        ) : (
          <AppTag severity="danger" value={t('certificate.snapshotCorrupted')} />
        )}
        <AppButton
          icon="pi pi-file-pdf"
          text
          aria-label={t('certificate.downloadPdf')}
          loading={pdf.pending}
          onClick={() => pdf.open(certificate.id)}
        />
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {/* Data SÓ quando há prazo: vigência indeterminada é o padrão, e um
            traço no lugar da data faria "sem prazo" parecer dado faltando. */}
        {certificate.valido_ate && <span>{formatDate(new Date(`${certificate.valido_ate}T00:00:00`))}</span>}
        {turma.superseded_count > 0 && (
          <span>{t('student.certificateSuperseded', { count: turma.superseded_count })}</span>
        )}
      </div>

      {/* Um aviso só, na forma que o `IssuedDialog` e o `CertificateViewDialog`
          já usam: popup bloqueado tem texto próprio, o resto é a mensagem do
          erro. Cor pelo token, nunca literal (ADR-16). */}
      {(pdf.popupBlocked || pdf.message) && (
        <span className="text-xs" style={{ color: dangerText }}>
          {pdf.popupBlocked ? t('certificate.popupBlocked') : pdf.message}
        </span>
      )}
    </div>
  )
}

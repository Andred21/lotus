import { useTranslation } from 'react-i18next'
import { AppDialog, AppButton, AppDropdown, AppTag, FormField, FormErrorBanner } from '@shared/ui'
import type { EmissionPanelTurmaData } from '@shared/types/generated'
import { useBatchIssue } from '../../hooks/useBatchIssue'

type Props = {
  turma: EmissionPanelTurmaData
  onHide: () => void
}

/** Confirmação + relatório de emissão em lote. Ao contrário do
 * `ConfirmIssueDialog`, o diálogo NÃO fecha após o POST — a resposta vira o
 * próprio corpo: uma linha por item (nome do aluno, via join com
 * `pendientes` por `enrollment_id`), `AppTag` ✓código quando `ok`, severity
 * danger com o `error` cru do backend (já es-CL — não traduzir, não
 * envolver em `t()`) quando não. Lote parcial (alguns emitidos, outros
 * rejeitados) é o caso normal, não um erro — a invalidação do painel
 * (`useIssueBatch`) já repintou a tabela atrás deste diálogo. */
export function BatchIssueDialog({ turma, onHide }: Props) {
  const { t } = useTranslation()
  const batch = useBatchIssue(turma)

  const okCount = batch.results?.filter((r) => r.ok).length ?? 0
  const failedCount = (batch.results?.length ?? 0) - okCount

  const footer = batch.results ? (
    <div className="flex justify-end">
      <AppButton label={t('common.close')} onClick={onHide} />
    </div>
  ) : (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} outlined disabled={batch.pending} onClick={onHide} />
      <AppButton
        label={t('certificate.confirmEmit')}
        icon="pi pi-check"
        disabled={batch.redatorId == null}
        loading={batch.pending}
        onClick={batch.submit}
      />
    </div>
  )

  return (
    <AppDialog
      visible
      header={t(batch.results ? 'certificate.batchResultTitle' : 'certificate.batchConfirmTitle')}
      onHide={onHide}
      footer={footer}
      closable={!batch.pending}
    >
      {!batch.results ? (
        <div className="space-y-4">
          <FormErrorBanner message={batch.message} />
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('certificate.batchConfirmBody', { count: batch.pendientes.length })}
          </p>
          <FormField label={t('certificate.fieldRedator')} error={batch.fieldErrors?.redator_id?.[0]}>
            <AppDropdown
              value={batch.redatorId}
              options={turma.redatores.map((r) => ({ label: r.name, value: r.redator_id }))}
              optionLabel="label"
              optionValue="value"
              placeholder={t('certificate.fieldRedator')}
              onChange={(e) => batch.setRedatorId(e.value)}
            />
          </FormField>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium">
            {t('certificate.batchResultSummary', { ok: okCount, failed: failedCount })}
          </p>
          <div className="space-y-2">
            {batch.results.map((item) => {
              const student = batch.pendientes.find((e) => e.enrollment_id === item.enrollment_id)
              return (
                <div key={item.enrollment_id} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{student?.student_name ?? String(item.enrollment_id)}</span>
                  {item.ok ? (
                    <AppTag severity="success" value={`✓ ${item.codigo}`} />
                  ) : (
                    <AppTag severity="danger" value={item.error ?? ''} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppDialog>
  )
}

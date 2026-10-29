import { useTranslation } from 'react-i18next'
import {
  AppButton, AppDialog, AppFileUpload, AppSelectableCard, FormErrorBanner, SectionLabel,
} from '@shared/ui'
import type { useBudgetDocumentUpload } from '../../hooks/useBudgetDocumentUpload'
import { BUDGET_DOCUMENT_TYPES } from '../../lib/budgetDocumentType'

/** Diálogo de subir documento do orçamento (bloco 43, spec J1): tipo em
 * cartões, arquivo no seletor e "Subir" só com os dois. Todo o estado mora no
 * `useBudgetDocumentUpload`; este componente só consome. */
export function BudgetDocumentUploadDialog({ u }: { u: ReturnType<typeof useBudgetDocumentUpload> }) {
  const { t } = useTranslation()

  const footer = (
    <div className="flex justify-end gap-2">
      <AppButton label={t('common.cancel')} text disabled={u.pending} onClick={u.close} />
      <AppButton
        variant="primary"
        label={t('common.upload')}
        icon="pi pi-upload"
        disabled={!u.canSubmit}
        loading={u.pending}
        onClick={u.submit}
      />
    </div>
  )

  return (
    // Com o envio em voo, X, ESC e Cancelar ficam travados: fechar soltaria o
    // observer da mutação e o 422 chegaria sem ninguém para exibi-lo.
    <AppDialog
      size="sm"
      visible={u.visible}
      header={t('budget.uploadTitle')}
      onHide={u.close}
      closable={!u.pending}
      closeOnEscape={!u.pending}
      footer={footer}
    >
      <div className="space-y-4">
        <FormErrorBanner message={u.error} />
        <FormErrorBanner message={u.sizeError} />

        <div role="group" aria-label={t('budget.fileTypeLabel')} className="space-y-2">
          <SectionLabel as="h3" rule={false}>{t('budget.fileTypeLabel')}</SectionLabel>
          <div className="flex flex-col gap-2">
            {BUDGET_DOCUMENT_TYPES.map((tipo) => (
              <AppSelectableCard
                key={tipo}
                selected={u.type === tipo}
                disabled={u.pending}
                onToggle={() => u.setType(tipo)}
              >
                {t(`budget.documentType.${tipo}`)}
              </AppSelectableCard>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AppFileUpload
            chooseLabel={t('budget.chooseFile')}
            chooseOptions={{ icon: 'pi pi-paperclip' }}
            disabled={u.pending}
            onSizeReject={u.onSizeReject}
            uploadHandler={u.pickFile}
          />
          {u.file && <span className="min-w-0 truncate text-sm">{u.file.name}</span>}
        </div>
      </div>
    </AppDialog>
  )
}

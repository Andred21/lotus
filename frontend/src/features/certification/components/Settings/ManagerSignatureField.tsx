import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFilePreview } from '@shared/hooks'
import {
  AppFileActions,
  AppFilePreviewDialog,
  AppFileRow,
  AppSignatureUpload,
  ConfirmDialog,
  FormErrorBanner,
  signatureCheckerboard,
} from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import type { ManagerSignatureControl } from '../../hooks/useCertificateSettingsForm'

/**
 * A Firma da gerente: arquivo atual (ver, baixar, remover com confirmação) e o
 * seletor que limpa e sobe o PNG (D16). O `AppSignatureUpload` não se reseta
 * depois do `onConfirm`; a `key` só muda quando o servidor ACEITA, então uma
 * falha deixa a prévia na tela a um clique de reenviar.
 */
export function ManagerSignatureField({ control }: { control: ManagerSignatureControl }) {
  const { t } = useTranslation()
  const labelId = useId()
  const preview = useFilePreview<PreviewableFile>()
  const [uploadKey, setUploadKey] = useState(0)
  const { current } = control

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <p id={labelId} className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('certificateSettings.signature')}
      </p>
      {/* O seletor diz "verás el resultado antes de guardar" e o Guardar está logo
          abaixo; sem esta linha a firma parece rascunho, e ela já vale para todos
          os certificados, inclusive os emitidos (D5). */}
      <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('certificateSettings.signatureHelp')}
      </p>

      <FormErrorBanner message={control.uploadError} />

      {current ? (
        <>
          <div className="rounded-surface border p-3" style={{ borderColor: 'var(--surface-border)', ...signatureCheckerboard }}>
            <img src={current.download_url} alt={current.original_name} className="mx-auto max-h-24 max-w-full object-contain" />
          </div>
          <AppFileRow
            name={current.original_name}
            size={current.size}
            createdAt={current.created_at}
            actions={
              <AppFileActions
                file={current}
                onPreview={preview.open}
                onRemove={control.askRemove}
                removing={control.removing}
                removeLabel={t('certificateSettings.removeSignature')}
              />
            }
          />
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('certificateSettings.noSignature')}
        </p>
      )}

      <AppSignatureUpload
        key={uploadKey}
        label={t(current ? 'certificateSettings.replaceSignature' : 'certificateSettings.sendSignature')}
        busy={control.uploading}
        disabled={control.uploading}
        onConfirm={(png) => void control.upload(png).then((ok) => ok && setUploadKey((k) => k + 1))}
      />

      <ConfirmDialog
        visible={control.confirmingRemove}
        severity="danger"
        title={t('certificateSettings.removeTitle')}
        message={t('certificateSettings.removeMessage')}
        confirmLabel={t('certificateSettings.removeConfirm')}
        confirmIcon="pi pi-trash"
        pending={control.removing}
        error={control.removeError}
        onConfirm={control.confirmRemove}
        onCancel={control.cancelRemove}
      />
      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { useFilePreview } from '@shared/hooks'
import {
  AppFilePreviewDialog,
  AppFileSlot,
  FormErrorBanner,
  SIGNATURE_ACCEPT,
  SIGNATURE_MAX_ORIGINAL_BYTES,
  SignatureHint,
  SignaturePreview,
  signatureCheckerboard,
  useSignatureCleaner,
} from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import type { ManagerSignatureControl } from '../../hooks/useCertificateSettingsForm'

/**
 * A Firma da gerente no padrão do slot: arquivo atual (ver, baixar, substituir,
 * excluir) e a limpeza de D16 no meio. O enviar escolhe a imagem, o
 * `useSignatureCleaner` a limpa e o `SignaturePreview` pede a decisão; só sobe o
 * PNG limpo. A prévia sai quando o servidor ACEITA: uma falha a deixa na tela, a
 * um clique de reenviar. Excluir confirma uma vez só, pelo `AppFileActions`.
 */
export function ManagerSignatureField({ control }: { control: ManagerSignatureControl }) {
  const { t } = useTranslation()
  const preview = useFilePreview<PreviewableFile>()
  const cleaner = useSignatureCleaner()
  const { current } = control

  return (
    <div className="flex flex-col gap-3">
      {/* O seletor diz "verás el resultado antes de guardar" e o Guardar está logo
          abaixo; sem esta linha a firma parece rascunho, e ela já vale para todos
          os certificados, inclusive os emitidos (D5). */}
      <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('certificateSettings.signatureHelp')}
      </p>

      <FormErrorBanner message={control.uploadError} />

      <AppFileSlot
        title={t('certificateSettings.signature')}
        file={current}
        onPreview={preview.open}
        onUpload={cleaner.pick}
        uploadLabel={t('certificateSettings.sendSignature')}
        replaceLabel={t('certificateSettings.replaceSignature')}
        accept={SIGNATURE_ACCEPT}
        maxBytes={SIGNATURE_MAX_ORIGINAL_BYTES}
        uploading={control.uploading || cleaner.processing}
        onSizeReject={cleaner.reject}
        onRemove={control.remove}
        removing={control.removing}
        removeError={control.removeError}
        removeLabel={t('certificateSettings.removeSignature')}
        confirmTitle={t('certificateSettings.removeTitle')}
        confirmMessage={t('certificateSettings.removeMessage')}
        confirmLabel={t('certificateSettings.removeConfirm')}
      >
        <div className="flex flex-col gap-3">
          {current && (
            <div className="rounded-surface border p-3" style={{ borderColor: 'var(--surface-border)', ...signatureCheckerboard }}>
              <img src={current.download_url} alt={current.original_name} className="mx-auto max-h-24 max-w-full object-contain" />
            </div>
          )}
          <SignatureHint />
          <SignaturePreview
            cleaner={cleaner}
            onConfirm={(png) => void control.upload(png).then((ok) => ok && cleaner.reset())}
            busy={control.uploading}
            disabled={control.uploading}
          />
        </div>
      </AppFileSlot>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </div>
  )
}

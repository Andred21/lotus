import { AppFileUpload } from '../AppFileUpload'
import { SignatureHint } from './SignatureHint'
import { SignaturePreview } from './SignaturePreview'
import { SIGNATURE_ACCEPT, SIGNATURE_MAX_ORIGINAL_BYTES, useSignatureCleaner } from './useSignatureCleaner'

export interface AppSignatureUploadProps {
  /** Rótulo do botão de escolher a imagem, já traduzido. */
  label: string
  /** Recebe o PNG LIMPO. O arquivo original nunca sobe. */
  onConfirm: (file: File) => void
  disabled?: boolean
  /** Envio em curso: trava a decisão enquanto o chamador salva. */
  busy?: boolean
}

/**
 * Escolha de assinatura com botão de texto: composição de `useSignatureCleaner`
 * e `SignaturePreview`. O padrão de slot (só-ícone, dentro do `AppFileSlot`) não
 * usa esta peça; ela fica para quem ainda tem o botão de texto avulso
 * (Configuración › Certificados) até migrar.
 */
export function AppSignatureUpload({ label, onConfirm, disabled = false, busy = false }: AppSignatureUploadProps) {
  const cleaner = useSignatureCleaner()
  const { preview, processing } = cleaner

  return (
    <div className="flex flex-col gap-3">
      {!preview && (
        <>
          <div>
            <AppFileUpload
              accept={SIGNATURE_ACCEPT}
              maxBytes={SIGNATURE_MAX_ORIGINAL_BYTES}
              disabled={disabled || processing}
              chooseLabel={label}
              chooseOptions={{ icon: 'pi pi-upload' }}
              uploadHandler={cleaner.pick}
              onSizeReject={cleaner.reject}
            />
          </div>
          {!processing && <SignatureHint />}
        </>
      )}
      <SignaturePreview cleaner={cleaner} onConfirm={onConfirm} busy={busy} disabled={disabled} />
    </div>
  )
}

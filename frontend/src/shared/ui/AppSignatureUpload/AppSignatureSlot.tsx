import type { ReactNode } from 'react'
import { AppFileSlot, type AppFileSlotProps } from '../AppFileSlot'
import type { PreviewableFile } from '../AppFilePreviewDialog'
import { SignatureHint } from './SignatureHint'
import { SignaturePreview } from './SignaturePreview'
import { SIGNATURE_ACCEPT, SIGNATURE_MAX_ORIGINAL_BYTES, useSignatureCleaner } from './useSignatureCleaner'

type SlotFile = PreviewableFile & { created_at?: string | null }

export type AppSignatureSlotProps<T extends SlotFile> = Omit<
  AppFileSlotProps<T>,
  'onUpload' | 'accept' | 'maxBytes' | 'onSizeReject' | 'uploading' | 'children'
> & {
  /** Envio do PNG limpo em curso. */
  uploading: boolean
  /** Recebe o PNG LIMPO. `true` (ou a Promise que resolve `true`) = o destino
   * aceitou, e só então a prévia sai; `false` a deixa na tela, a um clique de
   * reenviar. Ausente = sem enviar nem substituir, e sem a dica de formatos. */
  onConfirm?: (png: File) => boolean | Promise<boolean>
  /** Corpo extra, acima da dica (a firma atual, um aviso). */
  children?: ReactNode
}

/**
 * Slot de assinatura: o `AppFileSlot` com a limpeza de D16 no meio. O enviar
 * escolhe a imagem, `useSignatureCleaner` a limpa e o `SignaturePreview` pede a
 * decisão abaixo da linha. Só o PNG limpo sai daqui.
 *
 * Nasce da fiação que a firma do redator, Mi perfil e a firma da gerente
 * repetiam, e que já divergia (Q-3 da revisão do bloco 47).
 */
export function AppSignatureSlot<T extends SlotFile>({
  uploading, onConfirm, children, ...slot
}: AppSignatureSlotProps<T>) {
  const cleaner = useSignatureCleaner()
  const showing = cleaner.processing || cleaner.preview !== null || cleaner.error !== null

  const confirm = (png: File) => {
    if (!onConfirm) return
    const ok = onConfirm(png)
    if (ok === true) cleaner.reset()
    else if (ok !== false) void ok.then((aceito) => aceito && cleaner.reset())
  }

  // Sem nada a mostrar não há corpo: o slot não abre um vão vazio abaixo da linha.
  const body = (Boolean(children) || onConfirm || showing) && (
    <div className="flex flex-col gap-3">
      {children}
      {onConfirm && <SignatureHint />}
      <SignaturePreview cleaner={cleaner} onConfirm={confirm} busy={uploading} disabled={uploading} />
    </div>
  )

  return (
    <AppFileSlot
      {...slot}
      onUpload={onConfirm ? cleaner.pick : undefined}
      accept={SIGNATURE_ACCEPT}
      maxBytes={SIGNATURE_MAX_ORIGINAL_BYTES}
      uploading={uploading || cleaner.processing}
      onSizeReject={cleaner.reject}
    >
      {body}
    </AppFileSlot>
  )
}

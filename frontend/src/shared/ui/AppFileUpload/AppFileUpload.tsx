import { FileUpload } from 'primereact/fileupload'
import type { FileUploadProps, FileUploadHandlerEvent } from 'primereact/fileupload'
import { useTranslation } from 'react-i18next'
import { MAX_UPLOAD_BYTES, formatFileSize } from '@shared/lib/upload'
import { mergePt } from '../mergePt'

export type { FileUploadHandlerEvent } from 'primereact/fileupload'
export type { FileUploadProps as AppFileUploadProps } from 'primereact/fileupload'

export type AppFileUploadOwnProps = FileUploadProps & {
  /** Recebe a mensagem já traduzida quando o arquivo excede o teto. O chamador
   * decide onde exibi-la (banner do diálogo, erro da seção). */
  onSizeReject?: (message: string) => void
  /** Teto em bytes. Default: o dos documentos (10 MB). A foto de perfil passa
   * `MAX_PHOTO_BYTES` (5 MB) — spec D9. */
  maxBytes?: number
  /** Nome acessível do disparador, já traduzido. Existe porque o RÓTULO visível
   * não basta quando a tela repete o mesmo verbo: quatro slots documentais dizem
   * "Reemplazar" e só o chamador sabe de qual documento se trata (D-23). Ausente,
   * o nome continua vindo do rótulo visível. */
  accessibleName?: string
}

/** Wrapper do FileUpload do PrimeReact. Default: modo básico, upload
 * automático via customUpload (o chamador trata em `uploadHandler`, subindo
 * pela API própria em vez do endpoint embutido do Prime). `customUpload` é
 * invariante do wrapper — fixado APÓS o spread para o chamador nunca poder
 * reativar o uploader XHR embutido do PrimeReact.
 *
 * O teto de tamanho é checado AQUI, não via `maxFileSize` do Prime: em
 * `mode="basic"` a área de mensagens dele não é renderizada, então a rejeição
 * dele seria silenciosa (spec D4). Arquivo acima do teto não vira requisição.
 *
 * **`role="button"` também é invariante, e pela mesma régua do `customUpload`.**
 * O modo básico do Prime entrega `<span class="p-button p-fileupload-choose"
 * tabindex="0">` com `role` nulo: um alvo focável que não se anuncia como nada
 * (D-23 do review de 2026-08-17) — e é o controle que substitui documento de
 * peso legal de forma irreversível. O papel é do wrapper porque vale para os
 * oito sítios; o NOME não pode ser, porque só o chamador sabe qual documento
 * está em jogo. O `pt` funde por `mergePt`, chave a chave: quem passa
 * `pt.basicButton.className` não perde o papel, e o papel não apaga a classe. */
export function AppFileUpload({
  uploadHandler,
  onSizeReject,
  maxBytes = MAX_UPLOAD_BYTES,
  accessibleName,
  pt,
  ...props
}: AppFileUploadOwnProps) {
  const { t } = useTranslation()

  const guarded = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (file && file.size > maxBytes) {
      e.options.clear()
      onSizeReject?.(
        t('common.fileTooLarge', {
          size: formatFileSize(file.size),
          limit: formatFileSize(maxBytes),
        }),
      )
      return
    }
    uploadHandler?.(e)
  }

  const uploadPt = mergePt<FileUploadProps['pt']>(pt, {
    basicButton: { role: 'button', ...(accessibleName ? { 'aria-label': accessibleName } : null) },
  })

  return (
    <FileUpload mode="basic" auto {...props} pt={uploadPt} uploadHandler={guarded} customUpload />
  )
}

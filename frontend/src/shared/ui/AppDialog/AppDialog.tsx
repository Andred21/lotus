import type { DialogProps } from 'primereact/dialog'
import { mergePt } from '../mergePt'
import { DialogFrame } from './DialogFrame'
import { appDialogPt, type AppDialogSize } from './style'

export type { AppDialogSize } from './style'

/** Tamanho obrigatório: um diálogo que esquecesse de dizer o seu voltaria aos
 * 70vw de antes, e uma confirmação de duas linhas abriria do tamanho de um
 * formulário (bloco 43). */
export type AppDialogProps = Omit<DialogProps, 'maximizable'> & { size: AppDialogSize }

/** Moldura dos diálogos de formulário e visualização (bloco 43): três tamanhos,
 * maximizar só no `lg` e header e footer navy — a superfície fixa do sidebar e
 * do navbar, pintada em `brand-theme.css` pela classe `lotus-dialog` que o
 * `appDialogPt` crava no root. Usado pelo `CrudDialog`. Foco de volta e nomes
 * acessíveis moram no `DialogFrame`, que a `ConfirmDialog` também usa.
 *
 * `maximizable` vem DEPOIS do spread e não está no tipo: quem decide é o
 * tamanho, e religá-lo num `sm` passaria por cima da proporção que ele promete. */
export function AppDialog({ size, pt, ...props }: AppDialogProps) {
  return (
    <DialogFrame
      {...props}
      pt={mergePt<DialogProps['pt']>(appDialogPt(size), pt)}
      maximizable={size === 'lg'}
    />
  )
}

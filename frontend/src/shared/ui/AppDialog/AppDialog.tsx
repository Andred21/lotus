import type { DialogProps } from 'primereact/dialog'
import { mergePt } from '../mergePt'
import { DialogFrame } from './DialogFrame'
import { appDialogPt } from './style'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto, header e footer na
 * mesma superfície. Usado pelo CrudDialog. Foco de volta e nomes acessíveis
 * moram no `DialogFrame`, que a `ConfirmDialog` também usa. */
export function AppDialog({ pt, ...props }: DialogProps) {
  return <DialogFrame maximizable {...props} pt={mergePt<DialogProps['pt']>(appDialogPt, pt)} />
}

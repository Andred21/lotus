import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'
import { appDialogPt } from './style'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto, header e footer na
 * mesma superfície. Usado pelo CrudDialog. */
export function AppDialog({ pt, ...props }: DialogProps) {
  return <Dialog maximizable draggable={false} pt={{ ...appDialogPt, ...pt }} {...props} />
}

import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto. Usado para os
 * dialogs unificados de cadastro/visualização/edição. */
export function AppDialog(props: DialogProps) {
  return (
    <Dialog
      maximizable
      dismissableMask
      style={{ width: '48rem' }}
      breakpoints={{ '960px': '90vw' }}
      contentClassName="dark:bg-slate-900 dark:text-slate-100"
      headerClassName="dark:bg-slate-900 dark:text-slate-100"
      {...props}
    />
  )
}

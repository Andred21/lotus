import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import { useTurmaManual } from '../../api/useTurmas'

/** Abre o manual da turma numa aba nova. O PDF é buscado como blob (a rota exige
 * o cookie de sessão) e o objectURL é revogado no unmount para não vazar. */
export function ManualButton({ turmaId }: { turmaId: number }) {
  const { t } = useTranslation()
  const manual = useTurmaManual()
  const { message } = useMutationErrors([manual.error])
  const urlRef = useRef<string | null>(null)
  const tabRef = useRef<Window | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      tabRef.current?.close()
    },
    [],
  )

  const open = () => {
    setPopupBlocked(false)
    const tab = window.open('about:blank', '_blank')
    if (!tab) {
      setPopupBlocked(true)
      return
    }

    tab.opener = null
    tabRef.current = tab
    manual.mutate(turmaId, {
      onSuccess: (blob) => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        tab.location.href = urlRef.current
        tabRef.current = null
      },
      onError: () => {
        tab.close()
        tabRef.current = null
      },
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AppButton
        label={t('operation.documents.manual')}
        icon="pi pi-file-pdf"
        outlined
        loading={manual.isPending}
        onClick={open}
      />
      {(popupBlocked || message) && (
        <p className="text-sm text-red-600">
          {popupBlocked ? t('operation.documents.popupBlocked') : message}
        </p>
      )}
    </div>
  )
}

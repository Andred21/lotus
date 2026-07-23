import { useEffect, useRef } from 'react'
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

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const open = () =>
    manual.mutate(turmaId, {
      onSuccess: (blob) => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        window.open(urlRef.current, '_blank', 'noopener')
      },
    })

  return (
    <div className="flex flex-col items-end gap-1">
      <AppButton
        label={t('operation.documents.manual')}
        icon="pi pi-file-pdf"
        outlined
        loading={manual.isPending}
        onClick={open}
      />
      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  )
}

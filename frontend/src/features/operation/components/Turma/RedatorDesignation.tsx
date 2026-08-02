import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppAvatar, AppButton, AppTag, AppDialog, AppErrorState } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { useRedatorPicker } from '../../hooks/useRedatorPicker'

type Picker = ReturnType<typeof useRedatorPicker>

/** Corpo do diálogo do picker. A ordem das guardas é erro > carregando > vazio >
 * lista: invertê-la faria a falha de carga passar por "nenhum redator elegível"
 * (spec D16). Como guardas sequenciais a ordem é o próprio fluxo do código —
 * antes era um ternário de 4 níveis dentro do `return`. */
function PickerBody({ picker, onPick }: { picker: Picker; onPick: (redatorId: number) => void }) {
  const { t } = useTranslation()

  if (picker.loadError)
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={picker.loadError.detail ?? t('common.loadErrorHint')}
        retryLabel={t('common.retry')}
        onRetry={picker.reloadList}
      />
    )

  if (picker.loadingList)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>

  if (picker.eligible.length === 0)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.pickerEmpty')}</p>

  return (
    <ul className="space-y-2">
      {picker.eligible.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border p-3" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-3">
            <AppAvatar name={r.name} />
            <span className="font-medium">{r.name}</span>
          </div>
          <AppButton
            variant="brandIcon"
            label={t('operation.redator.pick')}
            icon="pi pi-check"
            disabled={picker.pending}
            onClick={() => onPick(r.id!)}
          />
        </li>
      ))}
    </ul>
  )
}

export function RedatorDesignation({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const picker = useRedatorPicker(turma)
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.title')}</h3>

      {turma.redatores.length === 0 && <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.none')}</p>}

      <ul className="space-y-2">
        {turma.redatores.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border p-3"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <div className="flex items-center gap-3">
              <AppAvatar name={r.name} />
              <div>
                <p className="font-medium">{r.name}</p>
                <AppTag value={t('operation.redator.idoneo')} severity="success" />
              </div>
            </div>
            <AppButton
              label={t('operation.redator.remove')}
              icon="pi pi-times"
              outlined
              severity="danger"
              disabled={picker.pending}
              onClick={() => picker.remove(r.id)}
            />
          </li>
        ))}
      </ul>

      <AppButton
        label={turma.redatores.length > 0 ? t('operation.redator.change') : t('operation.redator.designate')}
        icon="pi pi-user-plus"
        outlined
        onClick={() => setOpen(true)}
      />

      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.helpNote')}</p>
      {picker.error && <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}>{picker.error}</p>}

      <AppDialog visible={open} header={t('operation.redator.pickerTitle')} onHide={() => setOpen(false)}>
        <PickerBody
          picker={picker}
          onPick={(redatorId) => {
            picker.designate(redatorId)
            setOpen(false)
          }}
        />
      </AppDialog>
    </div>
  )
}

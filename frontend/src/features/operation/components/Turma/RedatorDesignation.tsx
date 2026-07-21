import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppAvatar, AppButton, AppTag, AppDialog } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { useRedatorPicker } from '../../hooks/useRedatorPicker'

export function RedatorDesignation({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const picker = useRedatorPicker(turma)
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">{t('operation.redator.title')}</h3>

      {turma.redatores.length === 0 && <p className="text-sm text-slate-500">{t('operation.redator.none')}</p>}

      <ul className="space-y-2">
        {turma.redatores.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
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

      <p className="text-sm text-slate-500">{t('operation.redator.helpNote')}</p>
      {picker.error && <p className="text-sm text-red-600">{picker.error}</p>}

      <AppDialog visible={open} header={t('operation.redator.pickerTitle')} onHide={() => setOpen(false)}>
        {picker.eligible.length === 0 ? (
          <p className="text-sm text-slate-500">{t('operation.redator.pickerEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {picker.eligible.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <AppAvatar name={r.name} />
                  <span className="font-medium">{r.name}</span>
                </div>
                <AppButton
                  variant="brandIcon"
                  label={t('operation.redator.pick')}
                  icon="pi pi-check"
                  disabled={picker.pending}
                  onClick={() => {
                    picker.designate(r.id!)
                    setOpen(false)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </AppDialog>
    </div>
  )
}

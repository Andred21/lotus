import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppInputText, FormField } from '@shared/ui'
import type { TriageRow } from '../../hooks/useImportStudentsFlow'

export type RowFields = Pick<TriageRow, 'rut' | 'name' | 'email' | 'phone'>

type Props = {
  row: TriageRow
  onSave: (patch: RowFields) => void
  onCancel: () => void
}

/**
 * Editor inline de uma linha da triagem (D12): RUT, nome, e-mail e telefone.
 * O RUT fica travado em linha já cadastrada — mudá-lo faria dela outro aluno.
 * Campo opcional em branco sai como `null`, como a planilha o entregaria.
 */
export function ImportRowEditor({ row, onSave, onCancel }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({
    rut: row.rut,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
  })
  const rutLocked = row.status === 'registered' || row.status === 'moves'
  const set = (key: keyof typeof draft) => (e: { target: { value: string } }) =>
    setDraft((cur) => ({ ...cur, [key]: e.target.value }))

  const save = () =>
    onSave({
      rut: draft.rut.trim(),
      name: draft.name.trim(),
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
    })

  return (
    <div role="group" aria-label={t('operation.enrollment.import.editRow')} className="space-y-3 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t('operation.enrollment.import.col.rut')}>
          <AppInputText value={draft.rut} onChange={set('rut')} disabled={rutLocked} className="w-full" />
        </FormField>
        <FormField label={t('operation.enrollment.import.col.name')}>
          <AppInputText value={draft.name} onChange={set('name')} className="w-full" />
        </FormField>
        <FormField label={t('operation.enrollment.import.col.email')}>
          <AppInputText value={draft.email} onChange={set('email')} className="w-full" />
        </FormField>
        <FormField label={t('operation.enrollment.import.col.phone')}>
          <AppInputText value={draft.phone} onChange={set('phone')} className="w-full" />
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text onClick={onCancel} />
        <AppButton label={t('common.save')} variant="compact" disabled={!draft.name.trim()} onClick={save} />
      </div>
    </div>
  )
}

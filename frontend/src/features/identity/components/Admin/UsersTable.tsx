import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppTag, AppInputText, AppButton } from '@shared/ui'
import type { UserData } from '@shared/types/generated'

export function UsersTable({
  users, loading, onView,
}: {
  users: UserData[]
  loading: boolean
  onView: (u: UserData) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')

  return (
    <div className="space-y-3">
      <AppInputText leftIcon="pi pi-search" placeholder={t('admin.searchPlaceholder')} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <AppDataTable value={users} loading={loading} globalFilter={filter} globalFilterFields={['name', 'email']} emptyMessage={t('admin.empty')}>
        <AppColumn field="name" header={t('admin.name')} sortable body={(u: UserData) => (
          <div>
            <p className="font-medium">{u.name}</p>
            <p className="text-xs text-slate-500">{u.email}</p>
          </div>
        )} />
        <AppColumn header={t('admin.role')} body={(u: UserData) => u.role} />
        <AppColumn header={t('admin.state')} body={(u: UserData) => (
          <AppTag value={u.is_active ? t('common.active') : t('common.inactive')} severity={u.is_active ? 'success' : 'danger'} />
        )} />
        <AppColumn body={(u: UserData) => <AppButton icon="pi pi-eye" text rounded onClick={() => onView(u)} />} style={{ width: '4rem' }} />
      </AppDataTable>
      <p className="text-sm text-slate-500">{t('admin.count', { count: users.length })}</p>
    </div>
  )
}

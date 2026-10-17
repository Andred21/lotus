import { useTranslation } from 'react-i18next'
import { IdentityCell, AppButton, AppTag, AppErrorState } from '@shared/ui'
import { loadErrorHint, screenDetail } from '@shared/lib'
import type { useRedatorPicker } from '../../hooks/useRedatorPicker'

type Picker = ReturnType<typeof useRedatorPicker>

/** Corpo do diálogo do picker. A ordem das guardas é erro > carregando > vazio >
 * lista: invertê-la faria a falha de carga passar por "nenhum redator
 * disponível" (spec D16). Como guardas sequenciais a ordem é o próprio fluxo do
 * código — antes era um ternário de 4 níveis dentro do `return`. Cada opção
 * inidônea traz uma tag de aviso por motivo (RN-09). */
export function RedatorPickerBody({ picker, onPick }: { picker: Picker; onPick: (redatorId: number) => void }) {
  const { t } = useTranslation()

  if (picker.loadError)
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={screenDetail(picker.loadError) ?? t(loadErrorHint(picker.loadError))}
        retryLabel={t('common.retry')}
        onRetry={picker.reloadList}
      />
    )

  if (picker.loadingList)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('common.loading')}</p>

  if (picker.options.length === 0)
    return <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('operation.redator.pickerEmpty')}</p>

  return (
    <ul role="list" className="space-y-2">
      {picker.options.map(({ redator: r, motivos }) => (
        <li key={r.id} className="flex items-center justify-between gap-4 rounded-surface border p-3" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
            {motivos.map((m) => (
              <AppTag key={m} value={t(`operation.redator.motivo.${m}`)} severity="warning" />
            ))}
          </div>
          <AppButton
            variant="primary"
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

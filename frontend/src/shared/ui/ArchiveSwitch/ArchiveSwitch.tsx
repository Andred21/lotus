import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'

/** Estrutural de propósito: `shared/ui` NÃO importa `shared/hooks`, em nenhuma
 * direção. O mesmo motivo do `SearchableTableState`. */
type Mode = 'active' | 'archived'

/**
 * Alterna a FONTE DE DADOS da tabela entre ativos e arquivados.
 *
 * Não é filtro, e por isso não entra pelo `filterSlot`: filtro corta as linhas
 * que a moldura já tem, isto troca de onde elas vêm. Confundir os dois quebraria
 * o `clear()` composto (spec D11).
 */
export function ArchiveSwitch({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useTranslation()

  return (
    <div className="inline-flex gap-1" role="group">
      {/* Selecionado `outlined`, o outro `text`: sem papel o lado corrente caía
        * no `.p-button` preenchido do Lara e disputava com a CTA da mesma barra
        * (f1 UI-01, run de 2026-08-28). A tinta é `--brand-ink` no claro (5,3:1)
        * e celeste no escuro, pelo tema. */}
      <AppButton
        label={t('archive.active')}
        size="small"
        outlined={value === 'active'}
        text={value !== 'active'}
        onClick={() => value !== 'active' && onChange('active')}
      />
      <AppButton
        label={t('archive.archived')}
        icon="pi pi-inbox"
        size="small"
        outlined={value === 'archived'}
        text={value !== 'archived'}
        onClick={() => value !== 'archived' && onChange('archived')}
      />
    </div>
  )
}

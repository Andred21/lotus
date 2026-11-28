import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'

/** Estrutural de propósito: `shared/ui` NÃO importa `shared/hooks`, em nenhuma
 * direção. O mesmo motivo do `SearchableTableState`. */
type Mode = 'active' | 'archived'

/** O `plain` do tema pinta o rótulo em `--text-color-secondary`, que reprova
 * 4,5:1 sobre o hover/active do próprio botão (claro: 4,34:1 e 3,86:1; escuro,
 * active: 4,36:1). `--text-color` fica ≥ 6:1 nos dois temas em repouso, hover e
 * active. A utility vence a regra do tema porque o Prime vive em `@layer`. */
const NAO_SELECIONADO = 'text-[var(--text-color)]'

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
    <div className="inline-flex gap-1" role="group" aria-label={t('archive.groupLabel')}>
      {/* Selecionado `secondary outlined`, o outro `text plain`: sem papel o lado
        * corrente caía no `.p-button` preenchido do Lara e disputava com a CTA da
        * mesma barra (f1 UI-01, run de 2026-08-28). Desde o B-2 nenhum dos dois
        * é celeste — o celeste é da CTA —, e a tinta neutra vem do tema. */}
      <AppButton
        label={t('archive.active')}
        aria-pressed={value === 'active'}
        size="small"
        outlined={value === 'active'}
        text={value !== 'active'}
        plain={value !== 'active'}
        className={value !== 'active' ? NAO_SELECIONADO : undefined}
        severity={value === 'active' ? 'secondary' : undefined}
        onClick={() => value !== 'active' && onChange('active')}
      />
      <AppButton
        label={t('archive.archived')}
        aria-pressed={value === 'archived'}
        icon="archive"
        size="small"
        outlined={value === 'archived'}
        text={value !== 'archived'}
        plain={value !== 'archived'}
        className={value !== 'archived' ? NAO_SELECIONADO : undefined}
        severity={value === 'archived' ? 'secondary' : undefined}
        onClick={() => value !== 'archived' && onChange('archived')}
      />
    </div>
  )
}

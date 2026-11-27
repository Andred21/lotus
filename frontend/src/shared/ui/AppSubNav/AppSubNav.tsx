import { AppButton } from '../AppButton'

export interface AppSubNavItem {
  key: string
  /** Já traduzido. */
  label: string
}

export interface AppSubNavProps {
  items: AppSubNavItem[]
  activeKey: string
  onSelect: (key: string) => void
  /** Nome da região de navegação, já traduzido. */
  ariaLabel: string
}

/**
 * Navegação vertical de submódulos dentro de uma aba (Configuración › Certificados).
 * Apresentacional puro: não conhece rota nem feature, e o item atual é marcado
 * com `aria-current="page"` para o leitor de tela, não só com cor.
 *
 * O item atual leva também borda inferior em `--brand-ink` e peso 600, para o
 * estado não depender só do tinte. Fundo por `color-mix` com `--surface-card`, a mesma fórmula do
 * `AppSelectableCard`: mantém contraste nos dois temas.
 */
export function AppSubNav({ items, activeKey, onSelect, ariaLabel }: AppSubNavProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0">
        {items.map((item) => {
          const active = item.key === activeKey
          return (
            <li key={item.key}>
              <AppButton
                type="button"
                text
                label={item.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect(item.key)}
                className="w-full justify-start text-left text-[var(--text-color)]!"
                style={{
                  // Borda de 2px nos DOIS estados (transparente no inativo): o
                  // item atual não desloca a lista. O tinte sozinho não chega a
                  // 3:1 contra o card; `--brand-ink` chega nos dois temas (A-12).
                  borderBottom: `2px solid ${active ? 'var(--brand-ink)' : 'transparent'}`,
                  ...(active && {
                    fontWeight: 600,
                    background: 'color-mix(in srgb, var(--primary-color) 10%, var(--surface-card))',
                  }),
                }}
              />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

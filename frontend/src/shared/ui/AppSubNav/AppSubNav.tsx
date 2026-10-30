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
 * Fundo do item atual por `color-mix` com `--surface-card`, a mesma fórmula do
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
                style={active ? { background: 'color-mix(in srgb, var(--primary-color) 10%, var(--surface-card))' } : undefined}
              />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

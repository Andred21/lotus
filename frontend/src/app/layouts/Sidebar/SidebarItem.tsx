import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { NavModule } from '@/shared/config/navigation'

interface Props {
  module: NavModule
  collapsed: boolean
}

/** Item de nav custom (NavLink) — estado ativo via router, sem PrimeReact. */
export function SidebarItem({ module, collapsed }: Props) {
  const { t } = useTranslation()
  const label = t(module.labelKey)
  return (
    <NavLink
      to={module.path}
      end={module.path === '/'}
      /* Só COLAPSADO. Ali o rótulo trunca dentro dos 80px do rail, e o `title`
       * é onde o valor integral fica recuperável — deixou de ser o único
       * portador do nome, não deixou de existir.
       *
       * Expandido ele fica FORA: o texto visível já é o rótulo, e `title` sobre
       * texto idêntico vira *accessible description*, fazendo o leitor de tela
       * anunciar nome E descrição ("Comercial, link, Comercial"). Regressão
       * pequena de acessibilidade dentro da correção de acessibilidade (Q-2 do
       * review de 2026-08-27). */
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center rounded-control font-medium transition-colors no-underline border-l-2',
          isActive
            ? 'border-(--brand) bg-white/5 text-(--brand)'
            : 'border-transparent text-(--shell-ink) hover:bg-white/10',
          /* Colapsado o item EMPILHA: o rail mede 80px (`w-20`) e o rótulo ao
           * lado do ícone não caberia. Abaixo de 1024px o colapso é imposto
           * pela viewport, então este é o único menu que o telefone tem — com o
           * rótulo fora do DOM, o nome do módulo dependia de hover, que no toque
           * não existe (D-03).
           *
           * O `gap` mora nos DOIS ramos e não na base: `gap-4` e `gap-1` na
           * mesma string não se resolvem pela ordem em que foram escritas — a
           * ordem é a do CSS gerado, e o resultado seria sorteio. */
          collapsed
            ? 'flex-col justify-center gap-1 px-1 py-2 text-center'
            : 'gap-4 px-3 py-2.5',
        ].join(' ')
      }
    >
      <i className={module.icon} />
      {/* Sempre no DOM. Colapsado ele encolhe e trunca dentro dos 80px do rail;
        * expandido é o rótulo de sempre, sem classe extra. */}
      <span className={collapsed ? 'w-full truncate text-[10px] leading-tight' : ''}>{label}</span>
    </NavLink>
  )
}

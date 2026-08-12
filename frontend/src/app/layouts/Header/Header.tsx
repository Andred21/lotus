import { AppDivider, AppHeader, AppearanceControls, Clock } from '@shared/ui'
import { UserMenu } from './UserMenu'

/** Barra utilitária do shell: controles, relógio e usuário. O título de página
 * tem UM dono — o PageHeader (UI-05 do review de 2026-08-11).
 *
 * Navy fixa nos DOIS temas, como a sidebar (spec §6/UI-04). Daí o texto branco
 * cravado: os tokens de tema pintam para superfície clara e sobre a navy davam
 * 1,42:1 no nome do usuário (D-P13). Os botões seguem no visual de marca por
 * decisão do João no checkpoint — o `AppButton` fica como estava.
 *
 * O traço de foco também se redeclara aqui, pela mesma razão da sidebar: o
 * achado 3 pôs azul-poste no claro, e azul-poste sobre esta navy é invisível.
 *
 * Altura fixa no lugar da altura mínima que havia aqui: a barra media 94px de
 * verdade, porque sem Preflight os <p> do relógio e do usuário ainda carregam
 * a margem de 1em do user-agent (42px de altura morta em cada bloco). Zeradas
 * as margens, o teto de conteúdo passa a ser o avatar de 48px e a altura vira
 * escolha, não resultado — 80px, valor que o João fixou no checkpoint.
 *
 * Nenhuma classe morta citada acima de propósito: o scanner do Tailwind lê
 * comentário e emitiria a regra no bundle (mesma armadilha da UI-03). */
export function Header() {
  return (
    <AppHeader className="h-20 border-white/10 bg-(--brand-navy) px-3 text-white [--focus-stroke:var(--brand)] sm:px-6">
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
        <AppearanceControls />
        {/* O traço do divisor mora no ::before do tema, em cinza de superfície
          * clara — daí a variante `before:` em vez de uma classe no root. */}
        <AppDivider
          layout="vertical"
          className="mx-0! hidden h-6 before:border-white/20 sm:block"
        />
        <Clock className="hidden md:block" />
        <UserMenu />
      </div>
    </AppHeader>
  )
}

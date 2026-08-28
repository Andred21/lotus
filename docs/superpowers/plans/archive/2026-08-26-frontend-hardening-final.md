# `frontend-hardening-final` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar acessibilidade, navegação e guardrails de fronteira do frontend — rótulo do rail alcançável no toque, foco preservado no olho da senha, ban de PrimeReact em `src/app/**`, mini-reset escopado no lugar das grafias espalhadas de margem, e a medida de truncamento saindo do jsdom para o navegador.

**Architecture:** Cinco eixos independentes, um por task, cada um com guarda vista reprovar antes de a correção entrar. A sexta task é a varredura no navegador, que é onde o DoD deste bloco realmente se prova — build, lint e suíte não veem nenhum dos cinco defeitos.

**Tech Stack:** React 19 + TypeScript (Vite), PrimeReact via `shared/ui`, Tailwind v4 sem Preflight, vitest + jsdom + @testing-library/react, ESLint flat config.

## Global Constraints

- **Frontend puro.** Nenhum arquivo de `backend/` entra no diff, e `generated.ts` não é tocado. `pint` e `typescript:transform` só podem ser declarados N/A depois de o fence ser **medido** vazio (spec §1).
- **Features não importam PrimeReact direto nem outra feature** — CLAUDE.md §5.6 / ADR-05. Este bloco estende a mesma fronteira a `src/app/**`.
- **Sem redesign estético.** Achado visual fora das famílias listadas em §5 da spec vira ficha em `backlog.md`, não correção neste bloco.
- **Comandos** (de `frontend/`): `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test -- <arquivo>` para um só, `pnpm dev` para o harness.
- **Toda guarda é vista reprovar antes de a correção entrar.** Teste que nasce verde não prova nada.
- **Um commit por task.**

---

### Task 1: D-35 — ban de PrimeReact em `src/app/**`

**Files:**
- Modify: `frontend/eslint.config.js` (bloco novo, depois do bloco `src/shared/**/*.{ts,tsx}` que declara `no-restricted-imports`, hoje em `:464-480`)

**Interfaces:**
- Consumes: nada.
- Produces: nada em código. Produz a régua que as tasks seguintes herdam — qualquer arquivo criado em `src/app/**` a partir daqui nasce coberto.

- [ ] **Step 1: Ver a régua reprovar — plantar a sonda**

A régua nasce verde (zero import de `primereact` em `src/app`, medido). Sem sonda, não há como distinguir "regra funcionando" de "regra escrita errado e nunca disparando" — que é exatamente o defeito que o próprio `eslint.config.js` documenta no comentário do merge raso.

Acrescente no topo de `frontend/src/app/layouts/AppLayout.tsx`:

```ts
import { Button } from 'primereact/button'
```

- [ ] **Step 2: Rodar o lint e confirmar que ele NÃO reclama**

Run: `cd frontend && pnpm lint`
Expected: **PASS** (exit 0), ou falha apenas por variável não usada — **nunca** por fronteira PrimeReact. É este silêncio que a task fecha.

- [ ] **Step 3: Escrever o bloco novo**

Em `frontend/eslint.config.js`, logo **depois** do bloco `files: ['src/shared/**/*.{ts,tsx}']` que declara `no-restricted-imports`:

```js
  // D-35: `src/app/**` era o único lado do seam `shared/ui` sem o ban de
  // PrimeReact. O bloco por feature (`:434`) cobre `src/features/**` e o de
  // cima cobre `src/shared/**`; a camada do shell ficava de fora, com 28
  // arquivos só em `app/pages/Dashboard/`.
  //
  // UM grupo só, de propósito: `app/` importa CINCO features pelo AppRouter, e
  // compor rota é o trabalho desta camada — o ban de feature→feature não vem
  // junto (o comentário do bloco de shared já registra a exceção).
  //
  // Sem colisão de merge raso: os dois blocos que casam `src/app/**` hoje
  // declaram `max-lines` e `no-restricted-syntax`, não `no-restricted-imports`.
  // O glob é `{ts,tsx}` e não só `.tsx` porque um `.ts` de `app/` importa
  // componente igual, e o ban de fronteira é barato.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['primereact', 'primereact/*'],
              message:
                'app/ não importa PrimeReact direto: use o wrapper de @shared/ui (CLAUDE.md §5.6, ADR-05).',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 4: Rodar o lint e ver a sonda reprovar**

Run: `cd frontend && pnpm lint`
Expected: **FAIL**, nomeando `src/app/layouts/AppLayout.tsx` com a mensagem `app/ não importa PrimeReact direto: use o wrapper de @shared/ui (CLAUDE.md §5.6, ADR-05).`

Se o lint passar, a regra está sendo apagada por merge raso: procure outro bloco que case `src/app/**` e declare `no-restricted-imports`.

- [ ] **Step 5: Remover a sonda e confirmar verde**

Apague a linha `import { Button } from 'primereact/button'` de `frontend/src/app/layouts/AppLayout.tsx`.

Run: `cd frontend && git diff --stat -- src/ && pnpm lint`
Expected: `src/` sem diff, lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/eslint.config.js
git commit -m "fix(lint): bane import de PrimeReact em src/app (D-35)

O seam shared/ui tinha ban por feature e em shared/, e a camada do shell
ficava de fora -- 28 arquivos so em app/pages/Dashboard/. A regua nasce
verde (zero import medido) e por isso a sonda e obrigatoria: vista
reprovar em AppLayout.tsx e revertida.

Feature->feature fica liberada: o AppRouter importa cinco features e
compor rota e o trabalho da camada."
```

---

### Task 2: D-03 — o rail passa a dizer o nome

**Files:**
- Modify: `frontend/src/app/layouts/Sidebar/SidebarItem.tsx`
- Create: `frontend/src/app/layouts/Sidebar/SidebarItem.test.tsx`

**Interfaces:**
- Consumes: `NavModule` de `@/shared/config/navigation` (`key`, `labelKey`, `icon`, `path`, `permission?`), `mockUseTranslation` de `@shared/testing/i18n`.
- Produces: `SidebarItem({ module, collapsed })` — assinatura inalterada. O que muda é o DOM: o `<span>` do rótulo passa a existir nos dois estados.

- [ ] **Step 1: Escrever o teste que falha**

Crie `frontend/src/app/layouts/Sidebar/SidebarItem.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { NavModule } from '@shared/config/navigation'

// Mesmo idiom do `PendenciasList.test.tsx`: `importOriginal` preserva o resto
// do módulo, e o `t` devolve a chave — o que se prova aqui é QUAL texto a tela
// escolhe, não a tradução dele.
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

import { SidebarItem } from './SidebarItem'

afterEach(() => cleanup())

const modulo: NavModule = {
  key: 'comercial',
  labelKey: 'nav.comercial',
  icon: 'pi pi-file',
  path: '/comercial',
}

function montar(collapsed: boolean) {
  return render(
    <MemoryRouter>
      <SidebarItem module={modulo} collapsed={collapsed} />
    </MemoryRouter>,
  )
}

describe('SidebarItem', () => {
  /**
   * D-03. Abaixo de 1024px o colapso é IMPOSTO pela viewport
   * (`useViewport.ts:28`), então o rail de 80px é o único menu que o telefone
   * tem. Enquanto o rótulo saía do DOM e sobrava só `title`, o nome do módulo
   * dependia de hover — que no toque não existe.
   *
   * A asserção é sobre o TEXTO estar no documento, não sobre o atributo novo:
   * é o que a ficha pede e é o que a sonda de remoção derruba.
   */
  it('colapsado, mantém o rótulo no DOM', () => {
    montar(true)

    expect(screen.getByText('nav.comercial')).toBeTruthy()
  })

  /** Rótulo escondido de leitor de tela seria o mesmo defeito com outra roupa:
   * quem enxerga continuaria sem o nome. */
  it('colapsado, o rótulo NÃO é sr-only', () => {
    const { container } = montar(true)

    expect(container.querySelector('.sr-only')).toBeNull()
  })

  /** O `title` deixa de ser o único portador do nome, mas continua: colapsado o
   * rótulo trunca, e sem ele o nome longo fica sem recuperação. */
  it('colapsado, o link carrega o rótulo em `title`', () => {
    const { container } = montar(true)

    expect(container.querySelector('a')?.getAttribute('title')).toBe('nav.comercial')
  })

  /** Expandido nada muda — a correção não pode mexer no menu que já funcionava. */
  it('expandido, mantém o rótulo e não empilha', () => {
    const { container } = montar(false)

    expect(screen.getByText('nav.comercial')).toBeTruthy()
    expect(container.querySelector('a')?.className).not.toContain('flex-col')
  })
})
```

- [ ] **Step 2: Rodar e ver os testes falharem**

Run: `cd frontend && pnpm test -- src/app/layouts/Sidebar/SidebarItem.test.tsx`
Expected: **FAIL**. `colapsado, mantém o rótulo no DOM` falha com `Unable to find an element with the text: nav.comercial` — o `<span>` está condicionado a `!collapsed`. `colapsado, o link carrega o rótulo em `title`` já passa hoje (o `title` existe quando colapsado); as outras duas também. **Uma** falha é o esperado.

- [ ] **Step 3: Implementar**

Substitua o corpo de `frontend/src/app/layouts/Sidebar/SidebarItem.tsx` por:

```tsx
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
      /* O `title` continua nos DOIS estados, mas deixou de ser o único portador
       * do nome: colapsado o rótulo trunca, e é aqui que o valor integral fica
       * recuperável. */
      title={label}
      className={({ isActive }) =>
        [
          'flex items-center rounded-md font-medium transition-colors no-underline border-l-2',
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
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `cd frontend && pnpm test -- src/app/layouts/Sidebar/SidebarItem.test.tsx`
Expected: **PASS**, 4 testes.

- [ ] **Step 5: Rodar lint e build**

Run: `cd frontend && pnpm lint && pnpm build`
Expected: exit 0 nos dois.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/layouts/Sidebar/SidebarItem.tsx frontend/src/app/layouts/Sidebar/SidebarItem.test.tsx
git commit -m "fix(sidebar): rotulo do modulo sempre no DOM, empilhado no rail (D-03)

Abaixo de 1024px o colapso e imposto pela viewport, entao o rail de 80px
e o unico menu do telefone -- e o rotulo saia do DOM, deixando so title,
que no toque nao existe. Colapsado o item passa a empilhar icone e
rotulo truncado; expandido nada muda.

O gap vive nos dois ramos e nao na base: gap-4 e gap-1 na mesma string
se resolvem pela ordem do CSS gerado, nao pela ordem escrita."
```

---

### Task 3: D-33 — o foco volta ao olho da senha

**Files:**
- Modify: `frontend/src/shared/ui/AppPassword/AppPassword.tsx`
- Modify: `frontend/src/shared/ui/AppPassword/AppPassword.test.tsx`

**Interfaces:**
- Consumes: o objeto `togglePt` que já existe no wrapper (carrega hoje `role: 'button'`, `aria-checked: undefined` e o alvo de 28px).
- Produces: `AppPasswordProps` inalterada. O que muda é o `pt` interno: `showIcon`/`hideIcon` passam a carregar `onClick`.

**Por que isto funciona sem quebrar o toggle:** o `mergeProps` do PrimeReact **encadeia** funções em vez de sobrescrevê-las (`node_modules/primereact/utils/utils.cjs.js:2693-2697`: `existingFn.apply(...)` e depois `value.apply(...)`). O `onClick: toggleMask` do Prime roda primeiro; o nosso roda em seguida.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao fim de `frontend/src/shared/ui/AppPassword/AppPassword.test.tsx` (e inclua `waitFor` no import de `@testing-library/react`):

```tsx
/**
 * D-33, medida no BD-16 (2026-08-18) em Chromium real: o Prime troca `showIcon`
 * por `hideIcon` ao alternar, o nó focado sai do DOM e `document.activeElement`
 * vira `BODY`. Quem alterna pelo teclado perde o lugar na página.
 *
 * O ícone já é focável — o Prime crava `tabIndex: props.tabIndex || '0'`
 * (`password.cjs.js:601,610`). O que falta é continuidade, não alcance.
 *
 * O âncora é `[role="button"]` dentro do `.p-password`: o `role` é pinado por
 * este wrapper (o default do Prime é `switch` com `aria-checked` invertido,
 * UI-04 de 2026-08-13) e é o único controle dentro do campo.
 */
describe('AppPassword devolve o foco ao olho', () => {
  function olho(container: HTMLElement) {
    const alvo = container.querySelector('.p-password [role="button"]')
    if (!alvo) throw new Error('olho não encontrado')
    return alvo as SVGElement & { focus: () => void }
  }

  it('depois de alternar, o foco fica no ícone e não no <body>', async () => {
    const { container } = render(<AppPassword aria-label="senha" />)

    olho(container).focus()
    fireEvent.click(olho(container))

    await waitFor(() => {
      expect(document.activeElement).toBe(olho(container))
      expect(document.activeElement?.tagName).not.toBe('BODY')
    })
  })

  /** O foco só volta para quem o tinha. Alternar por clique de mouse não pode
   * roubar o foco de outro campo — seria um defeito novo no lugar do antigo. */
  it('não rouba o foco quando o olho não o tinha', async () => {
    const { container } = render(<AppPassword aria-label="senha" />)
    const campo = screen.getByLabelText('senha')

    campo.focus()
    fireEvent.click(olho(container))

    await waitFor(() => expect(document.activeElement).toBe(campo))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test -- src/shared/ui/AppPassword/AppPassword.test.tsx`
Expected: **FAIL** em `depois de alternar, o foco fica no ícone e não no <body>` — `document.activeElement` é o `<body>` depois do clique. O segundo teste passa hoje (nada devolve foco a ninguém).

Se o primeiro teste falhar com `olho não encontrado` ou com `focus is not a function`, o jsdom desta versão não expõe `focus()` em `SVGElement`: nesse caso troque o âncora para o elemento pai focável mais próximo (`olho(container).parentElement`) e ajuste os dois testes juntos — a limitação está declarada na spec §7, e a medição no navegador (Task 6) vale de qualquer forma.

- [ ] **Step 3: Implementar**

Em `frontend/src/shared/ui/AppPassword/AppPassword.tsx`, logo **antes** da declaração de `togglePt`, acrescente:

```tsx
    // D-33. O Prime troca `showIcon` por `hideIcon` ao alternar: o nó focado sai
    // do DOM e `document.activeElement` vira `BODY`. O ícone já é focável
    // (`tabIndex: '0'`, password.cjs.js:601,610) — o que falta é continuidade.
    //
    // Vai no `pt` e não num handler próprio porque o `mergeProps` do Prime
    // ENCADEIA funções (utils.cjs.js:2693-2697): o `onClick: toggleMask` dele
    // roda primeiro e este roda em seguida. Um handler próprio no lugar dele
    // alternaria a máscara duas vezes — o mesmo defeito que o docblock acima
    // registra para o teclado.
    //
    // A condição existe para não ROUBAR foco: alternar por clique de mouse
    // enquanto o cursor está no input não pode arrastar o foco para o olho.
    // `queueMicrotask` porque o nó novo só existe depois do commit do React.
    const devolverFoco = (event: React.MouseEvent<Element>) => {
      const alvoAntigo = event.currentTarget
      const campo = alvoAntigo.closest('.p-password')
      if (document.activeElement !== alvoAntigo) return
      queueMicrotask(() => {
        const novo = campo?.querySelector('[role="button"]')
        if (novo instanceof HTMLElement || novo instanceof SVGElement) novo.focus()
      })
    }
```

E acrescente `onClick: devolverFoco` ao `togglePt`, que passa a ser:

```tsx
    const togglePt = {
      role: 'button',
      'aria-checked': undefined,
      onClick: devolverFoco,
      style: { boxSizing: 'content-box' as const, padding: '0.375rem' },
    }
```

Se `React` ainda não estiver importado como tipo no arquivo, acrescente `import type { MouseEvent } from 'react'` e use `MouseEvent<Element>` no lugar de `React.MouseEvent<Element>`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm test -- src/shared/ui/AppPassword/AppPassword.test.tsx`
Expected: **PASS**, incluindo os testes de largura que já existiam — o `pt` novo não pode ter apagado `showIcon.className` nem o `iconField.root`.

- [ ] **Step 5: Rodar lint e build**

Run: `cd frontend && pnpm lint && pnpm build`
Expected: exit 0 nos dois.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppPassword/AppPassword.tsx frontend/src/shared/ui/AppPassword/AppPassword.test.tsx
git commit -m "fix(AppPassword): devolve o foco ao olho depois de alternar (D-33)

O Prime troca showIcon por hideIcon, o no focado sai do DOM e o
activeElement vira BODY -- quem alterna pelo teclado perde o lugar.

Vai no pt e nao em handler proprio porque o mergeProps do Prime encadeia
funcoes (utils.cjs.js:2693-2697): o toggleMask dele roda primeiro. Um
handler no lugar dele alternaria a mascara duas vezes.

So devolve o foco a quem o tinha: clique de mouse com o cursor no input
nao arrasta o foco para o olho."
```

---

### Task 4: P-46 — mini-reset escopado no lugar das grafias espalhadas

**Files:**
- Modify: `frontend/src/index.css`
- Create: `frontend/tests/preflight-escopado.test.ts`
- Modify: `frontend/src/shared/ui/AppCard/AppCard.tsx` (`:97` e `:155`)
- Modify: `frontend/src/app/pages/Dashboard/SectionLabel.tsx` (`:28`)
- Modify: `frontend/src/app/pages/Dashboard/AgendaPanel.tsx` (`:99` e `:110`)
- Modify: `frontend/src/app/pages/Dashboard/AlertList.tsx` (`:28`)
- Modify: `frontend/src/app/pages/Dashboard/admin/PendingList.tsx` (`:23`)
- Modify: `frontend/src/app/pages/Dashboard/admin/PipelineFunnel.tsx` (`:17`)
- Modify: `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx` (`:37`)

**Interfaces:**
- Consumes: a ordem de camada já declarada em `index.css:10` (`@layer theme, base, components, utilities`), que é o que faz `utilities` vencer `base`.
- Produces: o bloco `@layer base` de `index.css`. As tasks seguintes contam com ele para que `h1`–`h6`, `p`, `ul`, `ol`, `dl`, `blockquote` e `figure` nasçam sem margem.

**Não remova** os `my-[0.83em]` do `PageHeader` e do `DetailHeader` (spec D6): eles não neutralizam UA, declaram margem por intenção, e sobrevivem ao reset porque `utilities` vence `base`.

- [ ] **Step 1: Escrever a catraca que falha**

Crie `frontend/tests/preflight-escopado.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = () => readFileSync(resolve(__dirname, '..', 'src/index.css'), 'utf8')

/** O bloco `@layer base { ... }` de `index.css`, sem o resto do arquivo. */
function blocoBase(): string {
  const texto = css()
  const inicio = texto.indexOf('@layer base {')
  if (inicio === -1) return ''
  let profundidade = 0
  for (let i = texto.indexOf('{', inicio); i < texto.length; i++) {
    if (texto[i] === '{') profundidade++
    if (texto[i] === '}') {
      profundidade--
      if (profundidade === 0) return texto.slice(inicio, i + 1)
    }
  }
  return ''
}

/**
 * P-46. O Preflight do Tailwind é omitido de propósito (`index.css:1-9`, ADR-16):
 * ele zera botão, input e borda, e a aparência dos componentes vem exatamente
 * de lá. A consequência não decidida era que TODA tag de bloco herdava a margem
 * do agente do usuário — proporcional ao tamanho da fonte, o que fez o número
 * em `text-3xl` do `KpiRow` receber `margin: 30px 0` e a faixa do
 * `AppCardHeader` medir 80px de altura para 24px de texto.
 *
 * O mini-reset fecha a classe inteira. E é por isso que ESTA catraca existe: a
 * regressão perigosa aqui não é alguém apagar o reset — é alguém "completar" o
 * reset acrescentando form control, e derrubar o tema numa mudança que parece
 * melhoria.
 */
describe('mini-reset escopado (P-46)', () => {
  it('zera a margem das tags de bloco', () => {
    const bloco = blocoBase()

    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'dl', 'blockquote', 'figure']) {
      expect(bloco, `tag de bloco ausente do reset: ${tag}`).toMatch(new RegExp(`(^|[\\s,])${tag}([\\s,{]|$)`, 'm'))
    }
    expect(bloco).toContain('margin: 0')
  })

  it('NÃO alcança form control, tabela nem imagem', () => {
    const bloco = blocoBase()

    for (const proibido of ['button', 'input', 'select', 'textarea', 'table', 'img', 'fieldset', 'legend']) {
      expect(bloco, `o reset alcançou ${proibido} — é o que quebra o PrimeReact`).not.toMatch(
        new RegExp(`(^|[\\s,])${proibido}([\\s,{:]|$)`, 'm'),
      )
    }
  })

  it('o Preflight completo continua fora', () => {
    expect(css()).not.toContain('tailwindcss/preflight')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm test -- tests/preflight-escopado.test.ts`
Expected: **FAIL** em `zera a margem das tags de bloco` — não existe `@layer base {` em `index.css`, então `blocoBase()` devolve string vazia. Os outros dois passam (vazio não contém proibido, e o Preflight de fato está fora).

- [ ] **Step 3: Escrever o mini-reset**

Em `frontend/src/index.css`, logo **depois** do bloco `html, body, #root { ... }`:

```css
/* Mini-reset escopado (P-46). Sem Preflight, toda tag de bloco herda a margem
 * do agente do usuário — e ela é PROPORCIONAL ao tamanho da fonte, então o
 * mesmo `h3` custa 16px num card e o número em `text-3xl` do KpiRow recebia
 * `margin: 30px 0`, somando 75–95px de área morta por card.
 *
 * O remédio existia em cinco grafias espalhadas (`m-0`, `[&_p]:m-0`,
 * `m-0 list-none p-0`, `my-[0.83em]`), aplicadas caso a caso, e ninguém as
 * contava. Isto fecha a classe inteira.
 *
 * É a mesma lista que o Preflight aplica a estas tags, MENOS tudo que ele faz
 * com form control, borda, tabela e imagem — que é precisamente o que
 * sobrescreveria a estilização do PrimeReact e o motivo pelo qual o Preflight
 * foi omitido (cabeçalho deste arquivo, ADR-16). Acrescentar `button`, `input`,
 * `select`, `textarea` ou `table` aqui derruba o tema; há catraca em
 * `tests/preflight-escopado.test.ts` medindo isso.
 *
 * Dentro de `@layer base` porque `utilities` vence `base` na ordem declarada
 * acima: uma classe `my-[0.83em]` continua ganhando deste reset, que é o que
 * mantém a margem DECLARADA por intenção do PageHeader e do DetailHeader. */
@layer base {
  h1, h2, h3, h4, h5, h6,
  p, dl, blockquote, figure {
    margin: 0;
  }

  ul, ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
}
```

- [ ] **Step 4: Rodar a catraca e ver passar**

Run: `cd frontend && pnpm test -- tests/preflight-escopado.test.ts`
Expected: **PASS**, 3 testes.

- [ ] **Step 5: Ver a catraca do proibido reprovar — sonda**

Acrescente `button,` à primeira lista de seletores do `@layer base`.

Run: `cd frontend && pnpm test -- tests/preflight-escopado.test.ts`
Expected: **FAIL** com `o reset alcançou button — é o que quebra o PrimeReact`.

Remova o `button,` e rode de novo.
Expected: **PASS**.

- [ ] **Step 6: Retirar as grafias que só neutralizavam UA**

Sete arquivos. Em cada um, remova **apenas** a classe indicada — nada mais da string:

| Arquivo | Trecho hoje | Vira |
|---|---|---|
| `src/shared/ui/AppCard/AppCard.tsx:97` | `stat ? 'px-4 py-3.5 [&_p]:m-0' : ''` | `stat ? 'px-4 py-3.5' : ''` |
| `src/shared/ui/AppCard/AppCard.tsx:155` | `className="m-0 text-base font-semibold"` | `className="text-base font-semibold"` |
| `src/app/pages/Dashboard/SectionLabel.tsx:28` | `className="m-0 text-xs font-semibold tracking-wider uppercase"` | `className="text-xs font-semibold tracking-wider uppercase"` |
| `src/app/pages/Dashboard/AgendaPanel.tsx:99` | `className="m-0 flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-semibold tracking-wider uppercase"` | mesma string sem `m-0 ` |
| `src/app/pages/Dashboard/AgendaPanel.tsx:110` | `<ul className="m-0 list-none p-0">` | `<ul>` |
| `src/app/pages/Dashboard/AlertList.tsx:28` | `<ul className="m-0 list-none p-0">` | `<ul>` |
| `src/app/pages/Dashboard/admin/PendingList.tsx:23` | `<ul className="m-0 list-none p-0">` | `<ul>` |
| `src/app/pages/Dashboard/admin/PipelineFunnel.tsx:17` | `<ul className="m-0 flex list-none flex-col gap-3 p-4">` | `<ul className="flex flex-col gap-3 p-4">` |
| `src/app/pages/Dashboard/redator/PendenciasList.tsx:37` | `<ul className="m-0 list-none p-0">` | `<ul>` |

Atenção ao `PipelineFunnel`: o `p-4` dele **não** é neutralização de UA — é espaçamento intencional do painel, e o reset zera `padding` de `ul`. Ele fica, e por isso a linha mantém `className`.

Ajuste também os docblocks que passaram a mentir: `SectionLabel.tsx:10` e `AppCard.tsx:95,130` explicam o `m-0` que deixou de existir. Troque a explicação por uma linha dizendo que a margem agora é zerada pelo mini-reset de `index.css` (P-46), sem repetir o porquê — ele mora lá.

- [ ] **Step 7: Rodar a suíte inteira**

Run: `cd frontend && pnpm test`
Expected: **PASS**. Se algum teste afirmava `m-0` na string de classe, ele está medindo o remédio antigo — corrija-o para afirmar o comportamento, ou remova a asserção citando esta task no commit.

- [ ] **Step 8: Rodar lint e build**

Run: `cd frontend && pnpm lint && pnpm build`
Expected: exit 0 nos dois.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/index.css frontend/tests/preflight-escopado.test.ts frontend/src/shared/ui/AppCard/AppCard.tsx frontend/src/app/pages/Dashboard/
git commit -m "fix(css): mini-reset escopado no lugar das grafias de margem (P-46)

Sem Preflight, toda tag de bloco herdava a margem do agente do usuario --
proporcional a fonte, entao o numero em text-3xl do KpiRow recebia
margin: 30px 0 e a faixa do AppCardHeader media 80px para 24px de texto.
O remedio existia em cinco grafias espalhadas que ninguem contava.

O reset cobre as tags de bloco e NADA de form control, borda, tabela ou
imagem -- que e o que quebraria o PrimeReact e o motivo de o Preflight
ser omitido. A catraca mede isso e foi vista reprovar com button na lista.

Os my-[0.83em] do PageHeader e do DetailHeader ficam: declaram margem por
intencao, e utilities vence base."
```

---

### Task 5: herança da P-41 — o contrato do `IdentityCell` fica explícito

**Files:**
- Modify: `frontend/src/shared/ui/IdentityCell/IdentityCell.test.tsx`

**Interfaces:**
- Consumes: `IdentityCell` de `./IdentityCell` — assinatura inalterada.
- Produces: nada. Esta task não muda comportamento; ela declara no teste o que jsdom **pode** provar, para que a Task 6 saiba o que sobra para o navegador.

**Contexto:** a `P-41` foi encerrada no item 17 (2026-08-24). O que ficou declarado para este bloco é o outro ramo do gatilho — o teste medir `scrollWidth > clientWidth` em vez de contar classe. jsdom não faz layout: os dois são sempre `0`. A medida real é da Task 6; aqui o teste passa a guardar o par `truncate` + `min-w-0`, que hoje ele não guarda.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao `describe('IdentityCell')` de `frontend/src/shared/ui/IdentityCell/IdentityCell.test.tsx`:

```tsx
  /**
   * Herança da P-41. O `truncate` das duas linhas só EXISTE por causa do
   * `min-w-0` do bloco de texto: item de flex nasce com `min-width: auto` e não
   * encolhe abaixo do próprio conteúdo, então o texto empurrava a célula e o
   * corte nunca acontecia — CLIENTE media 249px e REDATOR 263px na tabela de
   * turmas, 45% da largura, com a largura declarada na coluna sem efeito
   * nenhum (UI-02 de 2026-08-22).
   *
   * O par é o contrato, e este teste guarda o par. O que ele NÃO faz é medir:
   * jsdom não tem layout, `scrollWidth` e `clientWidth` são sempre 0. A medida
   * de `scrollWidth > clientWidth` acontece no navegador e vive em `audits/`
   * (spec §4.5) — dito aqui para ninguém supor cobertura que não existe.
   */
  it('a forma empilhada mantém o par min-w-0 + truncate', () => {
    const { container } = render(<IdentityCell title="Juan Soto" description="juan@lotus.cl" />)

    const blocoDeTexto = container.querySelector('.min-w-0')
    expect(blocoDeTexto, 'sem min-w-0 o truncate das linhas não corta nada').toBeTruthy()
    expect(blocoDeTexto?.querySelectorAll('span.truncate')).toHaveLength(2)
  })

  /** A forma inline NÃO trunca de propósito: ela carrega nó arbitrário (botão,
   * tag), e `truncate` cortaria o nó em vez do texto. */
  it('a forma inline não trunca nem declara min-w-0', () => {
    const { container } = render(<IdentityCell title="Enel Chile" description="RUT 76.123.456-7" inline />)

    expect(container.querySelectorAll('span.truncate')).toHaveLength(0)
    expect(container.querySelector('.min-w-0')).toBeNull()
  })
```

- [ ] **Step 2: Rodar e confirmar que os dois PASSAM**

Run: `cd frontend && pnpm test -- src/shared/ui/IdentityCell/IdentityCell.test.tsx`
Expected: **PASS**. Guarda de contrato sobre código que já está certo nasce verde — o que a torna útil é a sonda do passo seguinte.

- [ ] **Step 3: Ver a guarda reprovar — sonda**

Em `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx:74`, troque `className="flex min-w-0 flex-col gap-2"` por `className="flex flex-col gap-2"`.

Run: `cd frontend && pnpm test -- src/shared/ui/IdentityCell/IdentityCell.test.tsx`
Expected: **FAIL** com `sem min-w-0 o truncate das linhas não corta nada`.

Reverta a sonda.

Run: `cd frontend && git diff -- src/shared/ui/IdentityCell/IdentityCell.tsx && pnpm test -- src/shared/ui/IdentityCell/IdentityCell.test.tsx`
Expected: sem diff no componente, **PASS**.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/ui/IdentityCell/IdentityCell.test.tsx
git commit -m "test(IdentityCell): guarda o par min-w-0 + truncate (heranca da P-41)

O truncate das duas linhas so existe por causa do min-w-0 do bloco de
texto, e o teste nao guardava o par -- so contava a classe truncate.
Sonda vista reprovar removendo o min-w-0 do componente e revertida.

O que jsdom NAO pode fazer fica dito no teste: sem layout, scrollWidth e
clientWidth sao sempre 0. A medida real vive em audits/."
```

---

### Task 6: DoD — a varredura no navegador

**Files:**
- Create: `docs/superpowers/audits/2026-08-26-frontend-hardening-final-medicoes.md`

**Interfaces:**
- Consumes: tudo das Tasks 1–5, na árvore já mesclada.
- Produces: o relatório que prova os seis itens do DoD (spec §6). Nenhum deles é provável pela suíte.

**Nada aqui se prova por build verde.** Cada linha do relatório carrega número medido, não impressão.

- [ ] **Step 1: Subir a stack desta árvore**

Run: `cd /home/jvbat/projetos/fix-frontend && docker compose up -d && cd frontend && pnpm dev`

Confirme o offset desta árvore no `.env` da raiz antes de abrir o navegador — o Compose isola projeto e volume por diretório, mas não isola porta host (ADR-13). Se `artisan test` fatalar por memória nesta worktree, é a **P-57** (imagem velha, anterior ao `memory-cli.ini`), não regressão: `docker compose build app && docker compose up -d --no-deps app`.

- [ ] **Step 2: Provar o DoD 1 — o nome do módulo no rail a 390px**

Emule 390x844. Faça login e percorra a aplicação com a sidebar no rail.

Registre, para cada um dos módulos visíveis ao papel logado: o rótulo lido na tela e a altura do item em px. O critério é **legível sem interação nenhuma** — nem toque, nem hover, nem foco. Se algum rótulo estiver cortado a ponto de não identificar o módulo, é achado deste bloco e volta para a Task 2.

Registre também a altura total ocupada pela `<nav>` contra a altura da viewport: sete módulos empilhados não podem exigir rolagem para alcançar o último.

- [ ] **Step 3: Provar o DoD 2 — o foco no olho da senha**

Em `/perfil`, com o campo de senha visível: alcance o olho pelo teclado (Tab), acione com Enter, e leia `document.activeElement` no console.

```js
document.activeElement.getAttribute('aria-label')
```

Expected: o rótulo do olho (`Mostrar contraseña` / `Ocultar contraseña` conforme o idioma), **não** `null` e **não** `BODY`.

Repita no cadastro de staff. Registre os dois resultados e o idioma da sessão.

- [ ] **Step 4: Provar o DoD 5 — o truncamento do `IdentityCell`**

Abra uma tabela com `IdentityCell` empilhado e nome longo o bastante para cortar (a tabela de turmas, com um cliente de nome longo). No console:

```js
const linha = document.querySelector('.min-w-0 > span.truncate')
;[linha.scrollWidth, linha.clientWidth, linha.scrollWidth > linha.clientWidth]
```

Expected: `scrollWidth` maior que `clientWidth`, terceiro valor `true`.

**Sonda negativa, obrigatória:** pelo DevTools, remova `min-w-0` do bloco de texto dessa mesma linha e releia os dois números.
Expected: empatam (`scrollWidth === clientWidth`) — é isso que prova que o `min-w-0` é o que faz o corte existir. Devolva a classe.

Registre os quatro números (com e sem `min-w-0`) e o texto usado.

- [ ] **Step 5: Provar o DoD 4 — as sete famílias de espaçamento**

Cada alvo em **1440x900 e 390x844**, nos **dois temas** (claro e escuro):

| Alvo | Onde abrir | O que medir |
|---|---|---|
| `PageHeader` | qualquer listagem | altura da faixa do `h1` e distância até o primeiro conteúdo |
| `DetailHeader` | detalhe de turma | altura do bloco e alinhamento do título com o avatar |
| `AppCard variant="stat"` / `KpiRow` | Dashboard | altura do card e se as duas listas seguintes ficam na dobra |
| listas `ul` do Dashboard | Dashboard (alertas, pendências, funil, agenda) | recuo à esquerda (não pode aparecer marcador) e espaçamento entre itens |
| `AppCardHeader` | listagem com card | altura da faixa contra a altura do texto |

Para cada célula da matriz, registre o número medido e o veredito. **Regressão de espaçamento é achado deste bloco** e volta para a Task 4. Achado estético fora dessas cinco famílias vira ficha em `backlog.md` — o item 8 exclui redesign.

- [ ] **Step 6: Provar o DoD 3 e o gate**

Run: `cd frontend && pnpm lint && pnpm build && pnpm test`
Expected: lint exit 0, build verde, suíte sem regressão de contagem — registre o número de arquivos e de testes.

Fence de escopo, **medido** e não suposto:

Run: `cd /home/jvbat/projetos/fix-frontend && git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
Expected: **vazio**. Só com a saída vazia é que `pint` e `typescript:transform` podem ser declarados N/A por escopo.

- [ ] **Step 7: Escrever o relatório**

Crie `docs/superpowers/audits/2026-08-26-frontend-hardening-final-medicoes.md` com uma seção por DoD (1 a 6), cada uma carregando os números dos passos acima, o viewport e o tema de cada medição, e a sonda negativa do passo 4 com os quatro valores.

Onde algo não pôde ser medido, escreva **o que** não foi medido e **por quê** — limitação declarada vale; silêncio não.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/audits/2026-08-26-frontend-hardening-final-medicoes.md
git commit -m "docs(audit): DoD do frontend-hardening-final provado no navegador

Seis provas: rotulo do rail legivel sem interacao a 390px, foco no olho
apos alternar em /perfil e no cadastro de staff, lint reprovando import
de PrimeReact em src/app, as cinco familias de espacamento medidas em
dois viewports e dois temas, truncamento por scrollWidth com sonda
negativa, e o fence de backend medido vazio."
```

---

## Handoff de execução

**executor: `claude`**

**Critério.** Quatro das seis tasks não fecham sem julgamento fora do plano: a Task 2 decide se um rótulo truncado ainda identifica o módulo, a Task 4 alcança **toda** tela da aplicação e é aceita ou rejeitada por leitura de espaçamento, a Task 6 é medição no navegador do começo ao fim, e a Task 3 tem um ramo declarado que só se resolve contra a API real (`focus()` em `<svg>` no jsdom, spec §7). A Task 1 é mecânica e de paths fechados, mas isolá-la para o Codex pagaria custo de contexto por um bloco de dez linhas de configuração.

`paths_autorizados`: não se aplica — executor `claude`.

**Sequência.** As tasks são independentes entre si e podem ser executadas em qualquer ordem, com uma exceção: a **Task 6 vem por último**, porque ela mede a árvore com as cinco correções dentro. A ordem escrita (1 → 6) é a recomendada, do guardrail mais barato ao mais caro.

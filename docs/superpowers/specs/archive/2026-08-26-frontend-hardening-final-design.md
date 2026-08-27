# Spec — `frontend-hardening-final`

**Data:** 2026-08-26 · **Item:** 8 da fila (`backlog.md`) · **Lane:** `lane-c` ·
**Árvore:** `../fix-frontend` · **Branch:** `refactor/frontend-hardening-final` (de `main@5550178a`)
**Context Packet:** `null` — o item marca `Contexto: não por padrão` e as cinco fontes do bloco são
medição local com ficha no repositório.

---

## 1. Objetivo

Fechar acessibilidade, navegação e guardrails de fronteira do frontend, **sem abrir redesign
estético geral**. O bloco absorve o antigo BD-11 e paga cinco dívidas de origens diferentes que
compartilham a mesma natureza: defeito que build, lint e suíte não veem, porque o que falha é
comportamento de tela.

O bloco é **frontend puro**. Não toca `backend/`, não toca `generated.ts`, e por isso o gate P-03
não é disparado e `pint`/`typescript:transform` são N/A por escopo — a ser **medido** no
fechamento, não suposto.

## 2. Escopo

| Fonte | O que está errado hoje | Medido em |
|---|---|---|
| `D-03` | O rótulo do item de navegação sai do DOM no rail e sobra só `title` | `SidebarItem.tsx:29` |
| `D-33` | O foco cai no `<body>` quando o olho da senha alterna | `AppPassword.tsx` (BD-16, 2026-08-18) |
| `D-35` | `src/app/**` é o único lado do seam `shared/ui` sem o ban de PrimeReact | `eslint.config.js` |
| `P-46` | Sem Preflight, toda tag de bloco herda a margem do agente do usuário | `index.css:1-9` |
| herança da `P-41` | O teste do `IdentityCell` conta classe em vez de medir truncamento | `IdentityCell.test.tsx` |

**Fora, por escrito:**

- **`D-32`** — a ordem de foco de `/perfil` abaixo de `xl`. A correção existiu e foi revertida por
  decisão de layout em 2026-08-18; a ficha espera desenho do João e não entra de carona.
- **Playwright** — a suíte é vitest/jsdom e não há runner de navegador no projeto. Trazer um é
  infra nova (dependência, config, e a CI do item 11 não a conhece): bloco próprio, não carona.
- **As telas do item 16** — Cursos, Pessoas e Administração seguem sem run de `/lotus-ui-review`.
  O item 16 continua na fila e este bloco não o consome.

## 3. Decisões

| # | Decisão | Alternativa recusada e por quê |
|---|---|---|
| **D1** | O rail passa a **empilhar ícone + rótulo**, com o rótulo sempre no DOM | Drawer off-canvas abaixo de 1024px: muda a navegação (estado novo, foco preso, fechar ao navegar) e é o redesign que o item exclui. Tooltip por toque: o item é `NavLink`, então o mesmo toque que revelaria o nome já navega. Só `sr-only`: fecha leitor de tela e **não** fecha o DoD da ficha, que pede o nome alcançável no toque |
| **D2** | O empilhamento vale nos **dois** colapsos — o imposto abaixo de 1024px e o manual do desktop | Ramo duplo (empilhado só em compact): dois desenhos de rail são duas verdades a manter, e no desktop colapsado o ganho é o mesmo |
| **D3** | **Mini-reset escopado** em `@layer base`, sem nenhum form control | Preflight inteiro: o ADR-16 registra a omissão como decisão com motivo, e o Preflight zera botão, input e borda — a aparência dos componentes vem exatamente de lá. Catraca sem reset: congela a dívida mas mantém as grafias espalhadas e o custo por tela nova. Adiar: a ficha já foi adiada e o gatilho dela é esta decisão |
| **D4** | A medição de truncamento do `IdentityCell` acontece **no navegador**, registrada em `audits/` | Playwright: bloco próprio (ver §2). Catraca de lint exigindo `min-w-0`: continua contando classe, que é exatamente o que a herança diz não bastar |
| **D5** | A varredura do harness é **dirigida pelo que o bloco toca**, com um representante por família de espaçamento | Run completa nas telas restantes: é escopo do item 16. Só sidebar + senha: deixaria o mini-reset entrar sem medição, e ele é a única mudança que alcança tela que ninguém abriu |
| **D6** | Os `my-[0.83em]` do `PageHeader` e do `DetailHeader` **ficam** | Removê-los junto das outras grafias: eles não neutralizam UA, eles **declaram** margem por intenção — o docblock do `PageHeader` registra o motivo. Sobrevivem ao reset porque `utilities` vence `base` na ordem de camada já declarada em `index.css:10` |

## 4. Desenho por eixo

### 4.1 D-03 — o rail diz o nome

`SidebarItem` deixa de condicionar o rótulo ao estado. O `<span>` do rótulo fica **sempre** no DOM.

- **Colapsado:** o item vira coluna (`flex-col`), com o ícone acima e o rótulo abaixo em tipo
  pequeno, truncado numa linha. O `justify-center` atual continua centrando o conteúdo no rail.
- **Expandido:** nada muda — ícone e rótulo lado a lado, como hoje.
- O `title` permanece, mas deixa de ser o único portador do nome: vira apoio para o rótulo
  truncado.

O rail mede 80px (`w-20`) e hospeda seis módulos no máximo (`NAV_MODULES` filtrado por permissão);
o item cresce em altura, e a altura do rail não é disputada — a `<nav>` é `flex-1`.

**Guarda:** teste de `SidebarItem` no estado colapsado exigindo o texto do rótulo presente **e**
visível (sem `sr-only`), com sonda removendo o `<span>` vista reprovar antes de a correção entrar.

### 4.2 D-33 — o foco volta ao olho

O ícone do olho **já é focável**: o Prime crava `tabIndex: props.tabIndex || '0'`
(`password.cjs.js:601,610`). O defeito não é alcance, é continuidade — ao alternar, o Prime troca
`showIcon` por `hideIcon`, o nó focado sai do DOM e `document.activeElement` vira `BODY`.

O `AppPassword` intercepta o clique dos dois ícones pelo `pt` que **já existe** (`togglePt`, hoje
carregando `role`, `aria-checked` e o alvo de 28px) e devolve o foco ao ícone recém-montado depois
da troca.

Nada de handler de teclado novo. O docblock do wrapper registra, com a linha do Prime, que Enter e
Espaço já funcionam e que um segundo handler alternaria **duas** vezes — defeito pior e invisível.

**Guarda:** teste que aciona o olho e afirma `document.activeElement` no ícone novo, não em `BODY`.
`focus()` em `<svg>` pode não existir no jsdom; se não existir, o plano escolhe o âncora real
(container focável ou consulta ao nó montado) e a medição no navegador vale de qualquer forma.

### 4.3 D-35 — o último lado do seam ganha o ban

Bloco novo em `eslint.config.js` para `src/app/**/*.{ts,tsx}` declarando `no-restricted-imports`
com **um** grupo: `primereact` e `primereact/*`.

- **Feature→feature fica liberada de propósito.** O `AppRouter` importa cinco features, e compor
  rota é o trabalho da camada — a exceção comentada no arquivo já diz isso.
- **O glob é `{ts,tsx}`**, não só `.tsx`: o ban de fronteira é barato e um `.ts` de `app/` pode
  importar componente igual.
- **Não há colisão de merge raso.** O `eslint.config.js` documenta que dois blocos casando o mesmo
  arquivo com a **mesma** regra se apagam em silêncio (o último vence por inteiro). Medido: os dois
  blocos que casam `src/app/**` hoje (`:401` e `:525`) declaram `max-lines` e
  `no-restricted-syntax` — nenhum declara `no-restricted-imports`.

A régua **nasce verde**: zero import de `primereact` em `src/app`, medido nesta árvore.

**Guarda:** sonda com `import { Button } from 'primereact/button'` num arquivo de `src/app`, vista
reprovar e revertida.

### 4.4 P-46 — mini-reset escopado

Um `@layer base` em `index.css` zera a margem das tags de bloco:

```css
@layer base {
  h1, h2, h3, h4, h5, h6,
  p, dl, blockquote, figure { margin: 0 }
  ul, ol { margin: 0; padding: 0; list-style: none }
}
```

É a mesma lista que o Preflight do Tailwind aplica a essas tags, **menos** tudo que o Preflight faz
com form control, borda, tabela e imagem — que é precisamente o que sobrescreveria a estilização do
PrimeReact e o motivo pelo qual o Preflight foi omitido.

As grafias que existiam **só** para neutralizar a margem do agente saem:

- `[&_p]:m-0` no `AppCard variant="stat"`;
- `m-0` no `h3` do `AppCardHeader`, no `h2` do `SectionLabel`, no `h4` do `AgendaPanel`;
- `m-0 list-none p-0` nos cinco `ul` (`AlertList`, `PendingList`, `AgendaPanel`, `PipelineFunnel`,
  `PendenciasList`).

Os `my-[0.83em]` do `PageHeader` e do `DetailHeader` ficam (D6).

**Guarda:** teste em `tests/` lendo `index.css` e exigindo que o bloco de reset **não** nomeie
`button`, `input`, `select`, `textarea` nem `table`. A regressão perigosa aqui não é alguém apagar
o reset — é alguém "completar" o reset e derrubar o tema numa mudança que parece melhoria.

### 4.5 Herança da P-41 — a medida sai do jsdom

A `P-41` foi **encerrada** no fechamento do item 17 (2026-08-24); o que sobrou declarado para este
bloco é o outro ramo do gatilho: o teste medir `scrollWidth > clientWidth` em vez de contar classe.

jsdom não faz layout — `scrollWidth` e `clientWidth` são sempre `0`. Então:

- o teste do `IdentityCell` **continua** guardando contrato (`truncate` e `min-w-0` presentes), que
  é o que jsdom pode provar;
- a medida real acontece **no navegador**, contra uma tabela com dado longo de verdade, e vai para
  um relatório datado em `audits/`, com sonda negativa: sem `min-w-0`, `scrollWidth` e
  `clientWidth` empatam.

**Consequência aceita:** não é catraca. Se alguém remover o `min-w-0`, o teste de contrato reprova,
mas o truncamento visual regride sem que a suíte veja a largura. Fechar isso exige runner de
navegador, que está fora (§2).

## 5. Varredura do harness

Dirigida pelo que o bloco toca, cada alvo em **1440x900 e 390x844**, nos **dois temas**:

| Alvo | Por quê |
|---|---|
| Sidebar em 390 / 768 / 1024 | D-03 e o degrau do colapso imposto (`max-width: 1023px`) |
| `/perfil` e cadastro de staff | D-33 — os campos de senha da aplicação |
| `PageHeader` | família de espaçamento: `h1` com margem declarada |
| `DetailHeader` | família: `h1` com margem declarada e alinhamento por topo de bloco |
| `AppCard variant="stat"` / `KpiRow` | família: o `p` que carregava `margin: 30px 0` |
| listas `ul` do Dashboard | família: as cinco listas que perdem `m-0 list-none p-0` |
| `AppCardHeader` | família: o `h3` que fazia a faixa medir 80px para 24px de texto |

Achado estético fora dessas classes vira **ficha**, não correção — o item 8 exclui redesign.

## 6. Definition of Done

Cada item prova **comportamento**, não pacote instalado nem build verde:

1. A 390px, com a sidebar no rail, o nome de cada módulo visível é legível **sem interação
   nenhuma** — medido no dispositivo emulado, não pelo atributo novo no DOM.
2. Alternar o olho da senha deixa o foco **no ícone**, não em `BODY` — medido em Chromium real,
   em `/perfil`.
3. `pnpm lint` reprova, nomeando o arquivo, um import de `primereact` colocado em `src/app` — sonda
   vista reprovar e revertida.
4. Nenhuma das sete famílias de §5 regride de espaçamento na varredura, nos dois viewports e nos
   dois temas.
5. O truncamento do `IdentityCell` é provado por `scrollWidth > clientWidth` contra tabela real, com
   a sonda negativa registrada no relatório.
6. Gate: `pnpm lint` 0, `pnpm build` verde, `pnpm test` sem regressão de contagem, e o fence de
   `backend/` **medido vazio** antes de declarar `pint`/`typescript:transform` N/A.

## 7. Limitações declaradas

- **O truncamento não ganha catraca** (§4.5). Fica registrado, não escondido.
- **A varredura é por representante, não exaustiva.** O mini-reset alcança toda tela da aplicação;
  medir todas não cabe num bloco. A cobertura é por **família** de espaçamento, e uma família não
  representada seria buraco — a lista de §5 é o que se afirma ter coberto, nada além.
- **`focus()` em `<svg>`** pode não ser suportado pelo jsdom; o âncora final do teste da §4.2 é
  decisão do plano, contra a API real.

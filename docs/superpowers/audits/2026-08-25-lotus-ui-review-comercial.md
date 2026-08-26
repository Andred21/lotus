# Revisão de UI — Comercial (`/comercial` e `/comercial/presupuestos/:id`)

**Data:** 2026-08-25 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/features/commercial/components/` (índice com duas abas + detalhe do
orçamento) · **Base:** `refactor/frontend-revisao-ui-f2` @ `24b3b226`
**Evidência bruta:** `.artifacts/ui-review/2026-08-25-1840-comercial/` (8 capturas + `report.txt`,
coberta pelo `.gitignore`)

> Run 1 da fatia 2 do item 16 (`frontend-revisao-ui-por-modulo-f2`), Task 7 do plano
> `2026-08-25-frontend-revisao-ui-por-modulo-f2.md`. Papel **admin** — Comercial é módulo de admin
> e o redator não alcança a rota (D1 da spec).
>
> A §2 é o `report.txt` verbatim. A §3 é o que foi feito com ele na Task 8 e **não** faz parte do
> relatório.

## 1. Escopo e limites da run

- Papel: **admin** (`admin@lotus.cl`), sessão real criada pela tela de login. Sessão Playwright
  própria (`f2-comercial`), separada da sessão `f2-minors` usada para provar os Minors 2/3/5.
- Chromium **empacotado** (`--browser=chromium`), e não o canal `chrome`: esta máquina não tem
  `/opt/google/chrome/chrome`, e o default do CLI falha com
  `Chromium distribution 'chrome' is not found`. É limitação de ambiente, não da run — nenhuma
  evidência depende do canal.
- Alvo medido: SPA em `http://localhost:5175` e API em `http://localhost:8082`, que são as portas do
  offset +2 desta árvore (Task 1 do plano). O preflight da skill confirmou `200` nas duas com
  `LOTUS_UI_REVIEW_FRONTEND_URL`/`..._BACKEND_URL` apontando para elas.
- Read-only: nenhuma mutação além do login. `git status --short` vazio antes e depois, mesmo branch,
  mesmo commit (`24b3b226`).
- Viewports percorridos: `1440x900`, `1024x768`, `390x844`.
- Idioma: a sessão nasceu em **EN** (perfil efêmero, sem preferência gravada) e a run foi feita em
  **es-CL**, que é a referência de rótulo do cliente chileno. A troca foi feita pelo
  `localStorage` (`lotus-lang`), porque o popup do menu de idioma não aparece no snapshot do CLI —
  o menu do PrimeReact fecha ao perder foco. É preferência de interface no perfil efêmero da sessão
  de revisão, não dado de negócio, e a sessão foi encerrada.
- Tema: a run correu no **claro**. O escuro foi exercitado nesta mesma árvore na prova dos Minors
  2 e 3, em `/operacion`, e está registrado nos commits `52cda95f` e `d27029fb`.
- Tabulação: percorrida no índice (14 paradas, ordem coerente). No detalhe **não** foi percorrida —
  fica declarada como não testada, não como adequada.
- Estados não testados, por exigirem mock, falha fabricada ou escrita: `loading`, erro de carga
  (`AppErrorState`), aviso lateral com cache em mão (`InlineLoadState`), a lista de **presupuestos**
  archivados (só a de clientes foi aberta) e tudo que dependa de mutação — criar, editar, aprovar,
  rechazar, arquivar, subir documento.
- Chrome DevTools MCP: `complementary_unavailable`. Toda a evidência é do Playwright CLI.

**Falso positivo descartado, para não voltar na passada seguinte:** entrar em `/comercial` dispara
`GET /api/clients` **e** `GET /api/budgets`, mesmo com só a aba Clientes visível. Não vira achado:
são duas requisições pequenas, ambas `200`, sem falha funcional e sem repetição — a rubrica do eixo
9 pede custo mensurável **com** impacto, e aqui não há. Fica registrado nos sinais técnicos do
relatório.

- Régua de abas (Task 11 do plano, selector `.p-tabview-nav-container .p-tabview-nav`):
  `[scrollWidth, clientWidth, transborda]` = `[1134, 1134, false]` em 1440x900 e `[276, 276, false]`
  em 390x844. **Não transborda em nenhum dos dois viewports**, então a prop `scrollable` NÃO foi
  ligada: o review da fatia 1 desfez justamente o ligar por padrão, porque `p-tabview-scrollable`
  troca a nav por um contêiner com `overflow: hidden` e o efeito em tela não medida é suposição.

## 2. `report.txt` — verbatim

```text
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Comercial — `/comercial` (abas Clientes e Presupuestos) → `/comercial/presupuestos/1`, papel admin
Local URL: http://localhost:5175 (API http://localhost:8082 — árvore `../fix-frontend`, offset +2)
Branch/commit: refactor/frontend-revisao-ui-f2 @ 24b3b226
Date/time: 2026-08-25 15:45–15:53 (America/Santiago -03)
Agent: Claude Opus 5 (1M) — Claude Code
Playwright CLI: @playwright/cli, sessão `f2-comercial`, chromium empacotado (`--browser=chromium`; o canal `chrome` não existe nesta máquina)
Chrome DevTools: complementary_unavailable
Git working tree before/after: limpo / limpo (`git status --short` vazio nos dois momentos)

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Índice, aba Clientes | 1440x900 | 1024x768 | 390x844 | 01-clientes-1440x900.png, medição de layout do botão primário nos três viewports |
| Índice, aba Presupuestos | 1440x900 | 1024x768 | 390x844 | 02-presupuestos-1440x900.png, 04-presupuestos-1024x768.png, 05-presupuestos-390x844.png |
| Busca por texto (2 resultados) e sem resultado | 1440x900 | — | — | 03-busca-sem-resultado-1440x900.png |
| Filtro de estado (dropdown "Todos") | 1440x900 | — | — | leitura de DOM (sem `aria-label`/`aria-labelledby`/`<label>`) |
| Lista de archivados (vazia) | 1440x900 | — | — | 08-archivados-vacio-1440x900.png |
| Detalhe do orçamento + cotações | 1440x900 | — | 390x844 | 07-detalle-cotizaciones-1440x900.png, 06-detalle-390x844.png |

## Technical signals
Console: 3 mensagens na sessão, 0 erros e 0 warnings. A única de nível info é o convite do React DevTools (`react-dom_client.js`), esperada em dev.
Network: `GET /api/me` 200, `GET /api/clients` 200, `GET /api/budgets` 200. Nenhum 4xx/5xx; nenhuma repetição inesperada. As duas listas do módulo são buscadas ao entrar em `/comercial`, mesmo com só a aba Clientes visível — custo de duas requisições pequenas, sem falha funcional; registrado aqui e não promovido a achado.
Performance: nenhuma medição tomada — nenhuma alegação de performance neste relatório.
Untested states: loading (transitório demais para capturar sem mock, e mock é proibido); erro de carga (exigiria falha fabricada de rede); lista de presupuestos archivados (só a de clientes foi aberta); qualquer estado que dependa de escrita (criar, editar, aprovar, rechazar, subir documento) — a run é read-only; tema escuro (a run correu no claro; o tema escuro foi exercitado nesta mesma árvore na prova dos Minors 2/3, em `/operacion`); navegação completa por teclado no detalhe (só o índice foi percorrido).

## Findings
### UI-01 — a ação primária do módulo fica ilegível e sai da viewport em 390x844
Classification: C
Surface/journey: `/comercial`, toolbar do card, botão "Nuevo cliente" (aba Clientes) e "Nuevo presupuesto" (aba Presupuestos).
Viewport: 390x844
Reproduction: abrir `/comercial` em 390x844 e olhar a faixa de controles do card. Medido no DOM, o mesmo botão nos três viewports: 1440x900 → 174px de largura, borda direita em 1399 contra 1440 de viewport; 1024x768 → 174px, borda direita em 983 contra 1024; 390x844 → **44px**, borda esquerda em 349, borda direita em **393**, ou seja **36px além do próprio slot** (que termina em 357) e **3px além da viewport** (390). O rótulo "Nuevo presupuesto" fica quebrado em duas sílabas cortadas ("Nu / esu").
Evidence: 05-presupuestos-390x844.png (botão cortado no canto direito); medição de `getBoundingClientRect()` dos três viewports citada acima.
Observed fact: em 390x844 o botão de criação encolhe a 44px, ultrapassa o contêiner e a viewport, e o rótulo dele fica ilegível.
Inference: o slot `end` do `AppCardToolbar` (`shared/ui/AppCard/AppCard.tsx:193`) é `flex shrink-0 items-center gap-2` — sem `flex-wrap`. Abaixo do breakpoint `sm` a linha inteira já empilha (`flex-col`), mas o `end` continua uma linha só, com o grupo Activos/Archivados e a ação primária lado a lado; `shrink-0` impede o grupo de ceder e o botão é o que sobra para ser espremido.
Impact: em telefone o operador não lê o que o botão faz e a borda dele fica fora da tela — a ação primária do módulo, que é como se cadastra cliente e orçamento. É a condição C do eixo 4: controle cortado e criando overflow indevido.
Recommendation: corrigir no wrapper, não na tela — o `end` do `AppCardToolbar` precisa poder quebrar linha (`flex-wrap`) e não impedir o encolhimento dos filhos. Alcança toda tela que compõe a toolbar com grupo + ação primária, e não só Comercial.
Rule/reference: rubrica eixo 4 (condição C); `frontend-fsliced.md` — "achado de wrapper corrige-se no wrapper"; `shared/ui/AppCard/AppCard.tsx:186-194`.

### UI-02 — o filtro de estado dos presupuestos não tem nome, visual nem acessível
Classification: B
Surface/journey: `/comercial`, aba Presupuestos, dropdown ao lado do campo de busca.
Viewport: 1440x900 (independe do viewport)
Reproduction: abrir a aba Presupuestos e ler o DOM do `.p-dropdown`: `{aria:null, labelledby:null, selAria:null, prevText:null}` — não há `aria-label`, não há `aria-labelledby`, não há `<label>` e não há texto adjacente que o nomeie. O único texto exposto é o VALOR corrente ("Todos"). É preciso abrir o dropdown para descobrir que ele filtra estado (Todos / Pendiente / Aprobada / Rechazada).
Evidence: 02-presupuestos-1440x900.png (o dropdown lê apenas "Todos"); leitura de DOM citada acima.
Observed fact: o controle é operável, mas não expõe nome — nem para leitor de tela, nem visualmente.
Inference: é o MESMO defeito do UI-07 da run de Operação de 2026-08-23, que foi corrigido lá (`TurmaStatusFilter.tsx` ganhou `useId` + `<label htmlFor>` + `inputId`) e não foi propagado ao irmão: `BudgetStatusFilter.tsx:33-40` ainda é um `<div className="w-48">` com o `AppDropdown` solto dentro.
Impact: quem usa leitor de tela ouve "Todos, combo box" sem saber o que filtra; quem enxerga precisa abrir o dropdown para descobrir. A jornada não trava — dá para buscar por texto —, e por isso não é C, na mesma classificação que o UI-07 recebeu.
Recommendation: repetir no `BudgetStatusFilter` a forma já provada do `TurmaStatusFilter` — par rótulo visível + `inputId` de `useId`. A chave de rótulo já existe no domínio (`budget.filterAll` é a opção; o rótulo do filtro é o que falta).
Rule/reference: rubrica eixo 6 (condição B) e eixo 7 (consistência com tela irmã); `BudgetStatusFilter.tsx:33-40` contra `TurmaStatusFilter.tsx:36-40`.

### UI-03 — no detalhe, a régua de cotações gasta uma linha inteira com um par de botões encostado à direita
Classification: B
Surface/journey: `/comercial/presupuestos/1`, card "Cotizaciones".
Viewport: 1440x900
Reproduction: abrir o detalhe e medir a linha do grupo Activos/Archivados: `div.flex.justify-end.px-4.pt-4`, 1134px de largura e 56px de altura, com **um** filho de 228px encostado na direita (borda esquerda em 1171). Sobram 943px de faixa vazia entre o cabeçalho "Cotizaciones 3" e a primeira cotação.
Evidence: 07-detalle-cotizaciones-1440x900.png (a faixa vazia entre o título do card e a primeira cotação).
Observed fact: uma linha de 56px de altura carrega só o alternador Activos/Archivados, com a largura restante vazia.
Inference: diferente das listas do índice, este card não tem campo de busca para ocupar o lado esquerdo da régua, e o alternador foi posto numa linha própria em vez de subir para a linha do cabeçalho do card, que tem espaço sobrando à direita do contador.
Impact: a varredura vertical do card ganha um degrau vazio antes do conteúdo e o alternador fica longe do rótulo que ele qualifica. Não impede a jornada — os dois estados continuam alcançáveis —, então é B pelo eixo 3.
Recommendation: subir o alternador para o slot de ações do cabeçalho do card (`AppCardHeader` já tem `actions`, `AppCard.tsx:174`), que é onde ele fica ao lado de "Cotizaciones 3" e não abre faixa própria. Decisão de tela, não de wrapper.
Rule/reference: rubrica eixo 3 (condição B); `AppCard.tsx:174` (slot já existente).

## Summary
A: jornada completa e sem erro de console ou rede: abas, busca com resultado, busca sem resultado (vazio nomeando o termo e oferecendo "Limpiar búsqueda"), filtro por estado, lista de archivados vazia com texto próprio, abertura do orçamento e leitura das cotações; ordem de tabulação coerente no índice (menu → navegação → controles do cabeçalho → aba → busca → alternador); rótulos em es-CL corretos, com RUT, UF e datas no formato chileno; a régua de abas do módulo não transborda em nenhum viewport medido (1134/1134 em 1440x900, 276/276 em 390x844), então nada pede `scrollable` aqui.
B: 2 (UI-02, UI-03)
C: 1 (UI-01)
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

Feita na Task 8 do plano. O critério é o do plano: `C` corrige aqui, um commit por achado, medido
na tela antes e depois; `B` corrige se couber no escopo desta fatia, senão vira ficha `D-*` no
`backlog.md`.

| Achado | Classe | Destino | Commit |
|---|---|---|---|
| UI-01 | `C` | corrigido no wrapper — `AppCardToolbar` | `4b851d21` |
| UI-02 | `B` | corrigido na tela — `BudgetStatusFilter` | `74e7c922` |
| UI-03 | `B` | ficha no `backlog.md` (Task 12) | — |

**UI-01 — corrigido no wrapper, não na tela.** O slot `end` do `AppCardToolbar`
(`shared/ui/AppCard/AppCard.tsx`) era `flex shrink-0 items-center gap-2`: uma linha só, sem quebra,
com o grupo Activos/Archivados e a ação primária lado a lado. Em 390x844 o botão de criação era o
que sobrava para ser espremido — 44px de largura, borda direita em 393 contra 390 de viewport, e o
rótulo "Nuevo presupuesto" partido em duas sílabas ilegíveis. Virou
`flex flex-wrap items-center justify-end gap-2`. É achado de wrapper e foi pago no wrapper
(`frontend-fsliced.md`): alcança toda tela que compõe a toolbar com grupo + ação primária, e não só
Comercial.

**UI-02 — corrigido na tela, repetindo a forma do irmão.** É o MESMO defeito que o UI-07 da run de
Operação (2026-08-23) já tinha pago no `TurmaStatusFilter` e que não foi propagado ao
`BudgetStatusFilter`: dropdown sem `<label>`, sem `aria-label`, sem `aria-labelledby` e sem texto
adjacente. Ganhou `useId` + `<label htmlFor>` + `inputId`, com catraca própria
(`BudgetStatusFilter.test.tsx`, `getByLabelText('budget.status')`) — antes vermelha com
`Unable to find a label with the text of: budget.status`. Medido na tela depois: rótulo "Estado"
com `htmlFor` apontando para o INPUT do dropdown, e em 390x844 o par embrulha na régua com borda
direita em 358px contra 390 de viewport.

**UI-03 — vira ficha, não código.** A recomendação é subir o alternador Activos/Archivados para o
slot `actions` do `AppCardHeader` no card "Cotizaciones" do detalhe. É decisão de composição de UMA
tela, não defeito de wrapper, e mexer nela pede remedir o detalhe inteiro nos três viewports —
trabalho que esta fatia não orçou, e cujo custo hoje é uma faixa vazia de 56px, com os dois estados
alcançáveis. Registrada no `backlog.md` na Task 12.

**Repetição que o passe expõe.** UI-02 aqui e UI-07 lá são o mesmo achado, na mesma classe de
componente, encontrado por duas runs diferentes com dois dias de intervalo — o par
rótulo+`inputId` não tem nada que o reprove quando falta. É a evidência que a Task 12 leva ao
`backlog.md` junto com a ficha do UI-03.

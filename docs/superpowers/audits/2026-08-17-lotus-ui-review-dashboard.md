# Revisão de UI — Dashboard admin (`/`)

**Data:** 2026-08-17 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/app/pages/Dashboard/` · **Base:** `main` @ `18bf487`
**Passe de correção:** branch `fix/dashboard-revisao-visual-2026-08-17`, commits `abff4be`…`2fc0bd8`

> Este arquivo existe porque o fechamento do `dashboard-frontend-central-controle` (2026-08-16)
> registrou que o `/lotus-ui-review` **rodou e não deixou artefato** aqui. A execução de
> 2026-08-17 deixa. O relatório da §2 é o artefato bruto da skill, verbatim; a §3 é o que foi
> feito com ele, e não faz parte do relatório.

## 1. Por que a revisão não era redundante

O fechamento anterior deixou dois fatos escritos, e os dois valem como motivo:

1. `f38585e` tocou `DashboardItemRow`, `KpiRow` e `PipelineFunnel` **depois** do commit da revisão
   visual `3273cbf`, e os passos visuais do DoD não foram re-rodados — a tela revisada não era a
   tela entregue.
2. O `/lotus-ui-review` daquele bloco não deixou artefato, então não havia contra o que comparar.

**Resultado da comparação:** as cinco correções de 2026-08-16 se sustentam, re-medidas. Em 390×844
não há vazamento horizontal (`scrollWidth == clientWidth` em `main` e no documento); o rótulo do
item recebe a linha inteira; o funil desenha proporção correta ao maior valor (3 e 1 rendem 100% e
33,3% do trilho) e barra de contagem zero não recebe o mínimo de 4px; a fileira de KPI é única em
`xl`.

## 2. Relatório da skill — verbatim

Evidência (13 capturas + 5 snapshots) em `.artifacts/ui-review/2026-08-17T10-13-dashboard/`,
coberta por `.gitignore:24-25`. O relatório abaixo é o `report.txt` daquela pasta.

```
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Dashboard admin (`/`) — `frontend/src/app/pages/Dashboard/`, jornada read-only: carga, leitura das 5 seções (KPIs, Pendientes, Alertas, Agenda, Flujo), 2 CTAs, retorno, 3 viewports, 2 temas
Local URL: http://localhost:5173/ (frontend) + http://localhost:8080 (backend) — ambos loopback, preflight `PREFLIGHT_OK`
Branch/commit: `main` @ `18bf487`
Date/time: 2026-08-17 10:13–10:40 -03:00
Agent: Claude Code (Opus 5), skill `lotus-ui-review`
Playwright CLI: 0.1.18, Chromium 152 bundled (`~/.cache/ms-playwright/chromium-1237`). Sessão `lotus-ui-dash-headed`, `--headed`, viewport controlado por `resize`.
  DESVIO DECLARADO 1: a exploração inicial correu HEADLESS (sessão `lotus-ui-dashboard`, `playwright-cli open` sem `--headed`). Detectado pelo user-agent (`HeadlessChrome/152`). Toda medição que sustenta achado foi RE-MEDIDA na sessão headed e os números batem, salvo o efeito de barra de rolagem em 1024 (359px headless vs 351,5px headed); o relatório usa os valores headed.
  DESVIO DECLARADO 2: o passo 7 da skill pede login MANUAL do João. Ele instruiu explicitamente "pode fazer o login você"; o login foi feito pelo agente com as credenciais de seed (`admin@lotus.cl`, `DatabaseSeeder.php:26,30`). Nenhum dado de negócio foi digitado ou submetido.
Chrome DevTools: complementary_unavailable (nenhuma tool `chrome-devtools` no runtime; console e rede vieram do Playwright)
Git working tree before/after: idêntico. Antes: ` M backend/config/cors.php` (WIP pré-existente do João, preservado). Depois: ` M backend/config/cors.php`. `main` @ `18bf487` nos dois momentos. Evidências em `.artifacts/ui-review/` e `.playwright-cli/`, ambos cobertos por `.gitignore:24-25`.

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Login e bootstrap da sessão | 1440x900 | — | — | `00-login-1440.png` |
| Dashboard carregado, tema claro, es-CL, 5 seções | 1440x900 | 1024x768 | 390x844 | `01-desktop-1440x900-fold.png`, `07-tablet-1024-top.png`, `09-mobile-390-top.png`, `snap-tablet-1024.yml`, `snap-mobile-390.yml` |
| Rolagem até Agenda e Flujo comercial y operativo | 1440x900 | 1024x768 | 390x844 | `03-desktop-1440-bottom.png`, `08-tablet-1024-bottom.png`, `11-mobile-390-agenda-funil.png` |
| Listas Pendientes/Alertas (7 e 3 itens) | 1440x900 | 1024x768 | 390x844 | `01-...fold.png`, `08-...bottom.png`, `10-mobile-390-listas.png` |
| CTA de pendência "Cotización por aprobar" → `/comercial/presupuestos/1` e retorno | 1440x900 | — | — | `snap-desktop-1440-antes-cta.yml`, `snap-desktop-1440-depois-cta.yml`, `snap-desktop-1440-retorno.yml` |
| CTA de alerta "Clase vencida" → `/operacion/turmas/4` e retorno | 1440x900 | — | — | log de rede (`Page URL: http://localhost:5173/operacion/turmas/4`) |
| Tema escuro nas 5 seções | 1440x900 | — | — | `06-desktop-1440-dark-fold.png`, `05-desktop-1440-dark-bottom.png` |
| Teclado: ordem de foco e anel de foco | 1440x900 | — | — | `12-focus-sidebar-1440.png` + `getComputedStyle` do `:focus` |

## Technical signals
Console: 0 erros, 0 warnings na jornada após o login. Leitura zerada pelo reload pós-autenticação; o único `[ERROR] 401 /api/me` do bootstrap pré-login ficou fora da janela medida e é ruído de autenticação, não achado. Restou 1 `[INFO]` do React DevTools (dev server).
Network: `GET /api/dashboard/metricas` → 200, 102ms, `application/json`. Uma chamada por montagem: sair para `/cursos` e voltar a `/` dispara exatamente um refetch (`#391`), comportamento esperado do TanStack sem `staleTime` (`AppProviders.tsx:6-10` define só `refetchOnWindowFocus:false` e `retry:false`). Sem repetição em laço, sem 4xx/5xx na jornada.
Performance: única medição tomada — 102ms no endpoint do dashboard. Nenhuma outra medição foi feita; ausência de medição é limitação, não fato.
Untested states: `loading` (o esqueleto de `DashboardSkeleton` não foi capturado — o backend responde em ~100ms e interceptar rota para prolongar é proibido pela skill); `error` e `staleError` (exigiriam falha fabricada); `empty` de Pendientes/Alertas/Agenda e funil todo-zero (exigiriam mutação de dado); `unauthorized` (tela `noAccess` — exigiria criar papel-sonda, mutação); `unsupported` (view do Redator — é do bloco B2 e nenhum redator autentica hoje, RN-01); alertas `certificate_*` e `redator_document_*` (sem gatilho no seed, então a limitação de rota da D8 não pôde ser exercida); `disabled`/`read-only` não se aplicam — a superfície não tem controle de escrita.

## Findings
### UI-01 — Agenda com uma janela: metade do card vazia enquanto o nome do curso trunca ao lado
Classification: B
Surface/journey: Dashboard `/`, seção Agenda (`AgendaPanel.tsx:64`)
Viewport: 1024x768 (também presente em 1440x900 em grau menor; ausente em 390x844)
Reproduction: logar como admin, abrir `/`, redimensionar para 1024x768, rolar `main` até `scrollTop=1300`.
Evidence: `08-tablet-1024-bottom.png`; medição no DOM: `gridTemplateColumns: "351.5px 351.5px"`, `sections: 1`, caixa do nome do curso `142px` contra `scrollWidth` de `255px`.
Observed fact: a grade da agenda é `sm:grid-cols-2` e renderiza só as janelas com itens (`AgendaPanel.tsx:65`). Com o seed atual só `overdue` tem turmas, então uma coluna de 351,5px fica inteiramente vazia enquanto, na coluna preenchida, "Trabajos en líneas energizadas 220kV" é truncado para "Trabajos en líneas e…" numa caixa de 142px.
Inference: o número de colunas é fixo, não função de quantas janelas têm conteúdo; a coluna vazia não devolve sua largura para a que tem texto.
Impact: o nome do curso é a identidade da linha na varredura "o que está atrasado". Em 1024 ele fica ilegível e o `title` só se recupera por hover — que não existe em toque. Em 390 o mesmo nome aparece inteiro, ou seja, o pior caso está na viewport do meio, não na menor.
Recommendation: fazer a contagem de colunas depender das janelas efetivamente preenchidas (uma janela → uma coluna de largura total), ou trocar a grade fixa por `auto-fit`/`minmax`. Layout é Tailwind, dentro da regra (`.claude/rules/frontend-fsliced.md`, "Tailwind = layout").
Rule/reference: régua eixo 3 (condição B) e eixo 4; `AgendaPanel.tsx:64-65`

### UI-02 — Cards de KPI com 75–95px de área morta; uma única linha de dica infla os seis
Classification: B
Surface/journey: Dashboard `/`, fileira de KPIs (`KpiRow.tsx:71-85`)
Viewport: 1440x900, 1024x768 e 390x844
Reproduction: abrir `/` como admin e medir os seis filhos da primeira `.grid` do `main` em cada viewport.
Evidence: `01-desktop-1440x900-fold.png`, `07-tablet-1024-top.png`, `09-mobile-390-top.png`. Medição (1440): altura `212px` em todos os seis; espaço livre abaixo do último parágrafo = `95, 95, 95, 75, 29, 75`px. Estilo computado do número: `margin-top: 30px`, `margin-bottom: 30px` (o `p` herda `margin: 1em` do agente do usuário e o número é `font-size: 30px`).
Observed fact: o Preflight do Tailwind está omitido DE PROPÓSITO (`frontend/src/index.css:1-9`, para não sobrescrever o PrimeReact), então os `<p>` do card carregam a margem default do navegador, proporcional ao tamanho da fonte. O card mais alto — o único com linha de dica ("250 UF pendientes") — define a altura da linha da grade, e os outros cinco herdam ~95px de vazio. Custo agregado: 372px em 1024x768 (54% dos 688px de altura útil, com as listas começando em y=622 — só o cabeçalho de "Pendientes" cabe na dobra) e 1092px em 390x844, onde as listas só começam em 1274px de um scroll de 3210px, isto é, 1,7 tela depois do topo.
Inference: a altura da fileira não é uma escolha de espaçamento — é margem de UA não neutralizada mais o efeito do card mais alto sobre os irmãos.
Impact: contradiz a tese escrita da própria página (`DashboardPage.tsx:32-34`: as duas listas que respondem "o que faço agora" devem estar "na primeira tela"). Em 1024 e 390 elas não estão. É a mesma classe de problema que a UI-05 da revisão de 2026-08-16 corrigiu em 1440 — a correção não alcançou as outras duas viewports.
Recommendation: neutralizar a margem de UA no card (`m-0` nos `<p>` + espaçamento explícito no container) e reservar a linha de dica para todos os cards, para que a altura pare de ser refém do card com hint. Não reintroduzir o Preflight — a decisão de omiti-lo está registrada e tem outro motivo.
Rule/reference: régua eixo 3 (condição B) e eixo 4; `KpiRow.tsx:71`, `AppCard.tsx:60`, `index.css:1-9`

### UI-03 — Os seis números do KPI ficam em duas linhas de base diferentes
Classification: B
Surface/journey: Dashboard `/`, fileira de KPIs
Viewport: 1440x900 (a fileira só é única a partir de `xl`)
Reproduction: abrir `/` em 1440x900 e medir o topo do segundo `<p>` de cada card relativamente ao card.
Evidence: `01-desktop-1440x900-fold.png`; medição: topo do número = `81px` nos três primeiros cards (rótulo de uma linha) e `101px` nos três últimos (rótulo de duas linhas).
Observed fact: o rótulo tem altura variável (20px ou 40px) e o número vem logo abaixo, então os três primeiros números ficam 20px acima dos três últimos na mesma fileira.
Inference: nada alinha os números entre si; a posição de cada um é consequência do comprimento do rótulo, que muda com a locale.
Impact: a fileira existe para ser lida na horizontal, comparando seis grandezas. Com dois patamares, a varredura quebra e a leitura vira card a card. O efeito muda com o idioma — em EN os rótulos quebram em pontos diferentes dos de es-CL.
Recommendation: fixar o bloco de rótulo em duas linhas (ou empurrar o número para a base do card com `mt-auto` num container em coluna), de modo que os seis números partam da mesma linha de base independentemente do rótulo.
Rule/reference: régua eixo 2 (condição B) e eixo 3; `KpiRow.tsx:73-83`

### UI-04 — Contraste do número em tom `warning` fica abaixo do mínimo AA no tema claro
Classification: B
Surface/journey: Dashboard `/`, KPIs "Clases por terminar" e "Conclusiones por confirmar"
Viewport: 1440x900, tema claro (o tema escuro passa)
Reproduction: abrir `/` no tema claro e calcular a razão de contraste entre `color` do número e `background-color` do card.
Evidence: `01-desktop-1440x900-fold.png`; medição — número em tom `warning`: `color(srgb 0.702 0.568 0.122)` sobre `color(srgb 0.993 0.976 0.923)` = **2,86:1**, com `font-size: 30px` e `font-weight: 600` (texto grande, cujo mínimo AA é 3,0:1). Demais tons: `info` 3,69:1, `danger` 4,67:1, `neutral` 10,35:1. Rótulos secundários de 14px sobre card tingido: **4,28:1** (danger), **4,41:1** (info), 4,52:1 (warning), 4,76:1 (neutral) — o mínimo AA para texto normal é 4,5:1. No tema escuro o mesmo número em `warning` mede 7,28:1.
Observed fact: `warningText = color-mix(in srgb, var(--yellow-500) 70%, var(--text-color))` (`shared/styles/tokens.ts:31`) resolve, no tema claro, para um âmbar que não alcança 3,0:1 contra o fundo `warningSurface` do próprio par.
Inference: o docblock do arquivo afirma que compor com `--text-color` "é o que mantém contraste nos dois temas". Medido, isso vale no escuro e não vale no claro — no claro `--text-color` é escuro mas entra com apenas 30%, e os 70% de `--yellow-500` dominam.
Impact: o número É o sinal do card (o próprio `AppCard` diz isso em `AppCard.tsx:9-11`). Em tom de aviso ele é o elemento de menor contraste da tela. Não impede a leitura — é glifo grande —, mas é o pior caso da superfície e o token é compartilhado, então o mesmo par reaparece em qualquer aviso do sistema.
Recommendation: elevar a participação de `--text-color` na fórmula de `warningText` (ou escurecer o amarelo base) até passar de 3,0:1 para o número e reavaliar os rótulos secundários sobre fundo tingido, que estão 0,1–0,2 abaixo de 4,5:1. A correção é no token, não no Dashboard — ele é só onde o caso aparece.
Rule/reference: régua eixo 6 (condição B) e eixo 7; `tokens.ts:28-34`, `AppCard.tsx:26-32`

### UI-05 — A hierarquia de cabeçalhos salta de `h1` para `h3`
Classification: B
Surface/journey: Dashboard `/`, cabeçalho da página e cabeçalhos de card
Viewport: independente de viewport (semântica)
Reproduction: abrir `/` e listar `main h1, main h2, main h3, main h4`.
Evidence: `snap-desktop-1440-antes-cta.yml`; medição: `["H1","H3","H3","H3","H4","H3"]` — nenhum `h2` na página.
Observed fact: `PageHeader` emite o `h1` ("Bienvenido, Andreoli") e `AppCardHeader` emite `h3` fixo (`AppCard.tsx:83`) para Pendientes, Alertas, Agenda e Flujo comercial y operativo; a janela da agenda emite `h4` (`AgendaPanel.tsx:67`).
Inference: o nível do cabeçalho do card é constante no wrapper, não parametrizável por quem compõe — logo qualquer página sem `h2` próprio herda o salto.
Impact: leitor de tela que navega por cabeçalhos recebe uma árvore com um degrau faltando; as quatro seções não se apresentam como filhas diretas do título da página. Não bloqueia a leitura nem a jornada.
Recommendation: expor o nível como prop no `AppCardHeader` (default `h3`, com `h2` onde o card é seção de primeiro nível da página) ou introduzir um `h2` de agrupamento. A mudança é de `shared/ui`, então vale para todas as telas irmãs — não é correção local do Dashboard.
Rule/reference: régua eixo 6 (condição B) e eixo 7; `AppCard.tsx:83`, `AgendaPanel.tsx:67`

### UI-06 — Onze paradas de teclado antes do conteúdo, sem link para pular navegação
Classification: B
Surface/journey: shell do Dashboard `/` (sidebar + header), percorrido por `Tab`
Viewport: 1440x900
Reproduction: abrir `/`, focar o `body` e pressionar `Tab` repetidamente; enumerar os focáveis visíveis.
Evidence: medição — 24 elementos focáveis visíveis; o primeiro dentro de `<main>` é o de índice **11**; nenhum elemento cujo texto case `/salt|skip|contenido/i`.
Observed fact: a ordem é botão de menu → 7 links da sidebar → idioma → tema → usuário → primeira pendência. O anel de foco é visível e contrastado nos dois contextos medidos: `rgb(202,213,226)` 2px sobre a sidebar navy `rgb(15,43,61)`, e `rgb(15,43,61)` 2px sobre card branco.
Inference: a ausência do atalho é do shell, não desta página; o Dashboard apenas o herda, como toda rota protegida.
Impact: quem usa teclado paga 11 tabulações por visita para chegar ao primeiro item acionável — e o Dashboard é a rota inicial, então é a que mais paga.
Recommendation: adicionar um "saltar al contenido" como primeiro focável do `AppLayout`, visível só no foco, apontando para `<main>`. Fora do escopo de propriedade do Dashboard — decisão do João sobre em qual bloco entra.
Rule/reference: régua eixo 6 (condição B)

## Summary
A: as cinco correções da revisão de 2026-08-16 se sustentam na entrega atual, medidas de novo: em 390x844 não há vazamento horizontal (`scrollWidth == clientWidth` em `main` e no documento) e o rótulo do item recebe a linha inteira (UI-01/UI-02 anteriores); o funil desenha proporção correta ao maior valor (3 e 1 rendem 100% e 33,3% do trilho) e barra de contagem zero não recebe o mínimo de 4px (UI-03 e achado da segunda lente); a fileira de KPI é única em `xl` e as duas listas ficam lado a lado só a partir de `xl` (UI-04/UI-05 anteriores). Também adequados: os dois CTAs exercidos levam ao destino certo (`/comercial/presupuestos/1` e `/operacion/turmas/4`) e o retorno reconstrói as 6 seções; console limpo; endpoint em 102ms com um refetch por montagem; es-CL renderizado em toda a interface, com o detalhe do item em espanhol nas demais locales exatamente como a D17 decidiu; datas em `DD-MM-YYYY` e valor em UF no formato chileno; tema escuro legível nas 5 seções (número em `warning` mede 7,28:1 lá); anel de foco visível sobre a sidebar navy e sobre card claro; nenhuma seção anulável escondida indevidamente com o papel de admin.
B: 6 — UI-01 (agenda: coluna vazia com truncagem ao lado), UI-02 (área morta do KPI empurrando as listas para fora da dobra em 1024 e 390), UI-03 (números do KPI em duas linhas de base), UI-04 (contraste 2,86:1 no tom de aviso, tema claro), UI-05 (salto `h1`→`h3`), UI-06 (11 paradas de teclado sem skip link).
C: 0
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção — 2026-08-17, fora de bloco

O João leu o relatório e instruiu o passe de correção na mesma sessão, cruzando os achados com a
skill `frontend-design`. **O estado ficou em `idle` e nenhum item foi promovido** — está registrado
assim de propósito, na §"Trabalho fora de bloco" do `state.md`.

**Tese de desenho que amarra as correções:** cor de sinal vive em traço e marca; texto fica em
contraste cheio. É o que fecha a UI-04 na raiz — o tom sai do número e vai para o trilho, onde 3:1
basta — e é o que dá a gramática reusada no ponto de urgência da janela da agenda.

### 3.1 Os seis achados, medidos depois

| Achado | Antes | Depois |
|---|---|---|
| UI-01 | `gridTemplateColumns: "351,5px 351,5px"`, 1 janela; caixa do nome 142px para 255px de texto | `"703px"`; caixa 493px, sem truncar |
| UI-02 | card 212px; morto 95/95/95/75/29/75px | card 92px; morto 15px nos seis |
| UI-02 (dobra) | listas em y=622 (1024) e 1274px de 3210 (390) | 406px e 698px de 2500 |
| UI-03 | topo do número 81px vs 101px | 47px nos seis |
| UI-04 (claro) | número 2,86:1; rótulos 4,28–4,52:1 | número 10,35:1; rótulos 4,76:1; trilhos 5,21–5,83:1 |
| UI-04 (escuro) | número 7,28:1 (aviso) / 5,15:1 (erro) | número 11,4:1; rótulos 6,23:1; trilhos 3,93–10,98:1 |
| UI-05 | `["H1","H3","H3","H3","H4","H3"]` | `["H1","H2","H3","H3","H2","H3","H4","H3"]` |
| UI-06 | primeiro focável dentro de `main` no índice 11 | índice 1; Enter põe foco em `main#contenido`, Tab seguinte no primeiro item |

### 3.2 Três achados que não estavam no relatório

Apareceram ao corrigir, e todos entraram:

1. **A faixa do `AppCardHeader` media 80px para 24px de texto** — o `h3` sem `m-0` herdava
   `margin: 1em` do agente do usuário. Mesma causa da UI-02, e vale para **todo card da
   aplicação**, não só o Dashboard. Passa a 49px.
2. **A barra do funil reprovava o 3:1 de elemento gráfico** contra o próprio trilho: 2,33:1 no
   claro e 2,77:1 no escuro. Duas trocas foram necessárias, porque só mudar a barra deixaria o
   escuro reprovando: barra em `--brand-ink`, trilho em `--surface-ground`. Depois: 5,37 e 6,76:1.
3. **`QuoteRow.tsx` e `DocumentTypeCard.tsx` pintavam texto com `var(--red-500)` cru** — 3,52:1 em
   14px. Achados ao conferir o alcance da mudança de token fora do Dashboard. É o caso que a
   **P-36** descreve: a catraca `COR_HARDCODED` só enxerga `className`.

### 3.3 O que a correção alcança fora da superfície revisada

Declarado, não descoberto no review: as quatro tintas de tom mudam de valor em ~20 sítios
(`FormField`, `AppErrorState`, `InlineLoadState`, `LoginForm`, entre outros); o `AppCardHeader`
encurta nos 8 consumidores; `variant="stat"` também é do `BudgetStatCard`, e a tela de orçamento
foi conferida no navegador (trilhos verde/vermelho/neutro sobre branco, corretos); o link de salto é
do shell e vale para toda rota protegida.

### 3.4 Gate

`pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **39 arquivos / 223 testes** (baseline 38/205
+ 18 asserções de `tone-ink.test.ts`). Zero mutação de dado; `backend/config/cors.php` (WIP do João)
ficou fora de todo `git add`.

### 3.5 O que continua não provado

Os mesmos estados que o relatório declara como `Untested`: `loading`, `error`/`staleError`, `empty`
das três seções, funil todo-zero, `unauthorized`, `unsupported` e os alertas `certificate_*` /
`redator_document_*`. Nenhum deles foi exercido no passe de correção — alcançá-los exigiria mutação
de dado ou interceptação de rota, que a skill proíbe.

**A causa raiz da UI-02 é sistêmica e não foi fechada:** sem Preflight, toda tag de bloco carrega
margem do agente do usuário. A neutralização foi feita onde custava (card `stat`, cabeçalho de card,
`h2` de seção, `h4` da agenda); o reset escopado que resolveria a classe inteira mexe no espaçamento
de todas as telas de uma vez e é decisão do João. Registrado como **P-46**.

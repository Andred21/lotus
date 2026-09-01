# Spec — `frontend-triagem-dos-audits-do-item-18`

**Data:** 2026-08-29 · **Item:** 19 da fila (`backlog.md`) · **Lane:** `lane-c` ·
**Árvore:** `../fix-frontend` (offset +2: `:8082` API, `:5175` Vite) ·
**Branch:** `fix/frontend-triagem-audits-item-18` (de `main@37e0e2d4`)
**Context Packet:** `null` — `Contexto: não por padrão`; a fonte é medição local: as quatro runs
`audits/2026-08-28-item18-fase{1,2,3,4}.md` (49 achados, nenhum aplicado) mais a ficha `P-67`.

---

## 1. Objetivo

Dar veredito escrito a cada um dos 49 achados das quatro runs de `/lotus-ui-review` do item 18 —
**A:21 · B:26 · C:2** — e corrigir só o que sobreviver, **na raiz e não no sítio**. O audit
reporta, não autoriza: recusar com razão escrita é resultado válido, e "virou ficha" também.

Bloco **frontend puro**. Não toca `backend/` nem `generated.ts`; `pint` e `typescript:transform`
são N/A por escopo, **medidos no fechamento** (`git diff --stat main...HEAD -- backend/
frontend/src/shared/types/generated.ts` vazio). O dado de prova (§9) entra pela API do stack de
dev desta árvore, não por código.

## 2. Gabarito da triagem

Cada achado recebe exatamente um veredito:

| Veredito | Significa | Prova exigida |
|---|---|---|
| `adequado` | achado `A`: linha de base, sem ação | nenhuma — registrado em bloco |
| `corrigir` | defeito confirmado; raiz nomeada; correção neste bloco | medida no navegador **ou** teste visto reprovar antes |
| `ficha` | decisão de design/produto que não é da lane — vira `D-*` com recomendação escrita | a ficha existe no `backlog.md` |
| `recusado` | falso-positivo, ou decisão anterior já registrada | a razão, com o path que a sustenta |
| `sem evidência` | a run não alcançou o estado; fecha com dado de prova (§9) | pintado na run 5 |

O entregável da triagem é **`docs/superpowers/audits/2026-08-29-item19-triagem.md`**: uma linha
por achado (fase, id, classe, veredito, raiz, remédio, prova), 49 linhas mais as da run 5.
Nenhuma linha fica "pendente" no fechamento.

## 3. Raízes — o que explica o grosso da lista

Os vereditos preliminares abaixo vêm de **leitura do código em 2026-08-29** sobre `main@37e0e2d4`;
a execução confirma cada um com a prova da tabela do §2.

| Raiz | Mecanismo medido | Achados que ela fecha |
|---|---|---|
| **R1 · `AppButton` sem papel cai no `.p-button` preenchido do Lara** | `AppButton.tsx:13-17` não acrescenta classe sem `variant`; `.p-button` base é celeste preenchido com rótulo navy (`lara-*-lotus.css:2252`). Sonda AST em `features/**` + `app/**`: **13 sítios** sem `variant`/`text`/`outlined`/`link`/`severity` — 6 nos diálogos de certificação, 5 nos submits de auth, 2 no Perfil. Mais dois em `shared/ui`: o alvo interno do `AppSelectableCard` (`:63-70`) e o lado selecionado do `ArchiveSwitch`. | f4 UI-01 (**C**), f4 UI-04, f3 UI-08, f1 UI-01 |
| **R2 · dado técnico sem peça** | A rule manda `font-mono` **com** `tabular-nums`; não há constante nem catraca. Sonda AST: **20 sítios** com `font-mono` literal em `features/**`/`app/**` (7 em `app/pages/Dashboard`, 13 em features), mais 3 em `shared/ui` (`AppFileRow`, `CertificateFolio`, e o pill de contagem do `AppCard:154` que nem `font-mono` tem). O RUT do `BudgetDetailPage:66` e da `EmissionStudentsTable:48` viajam como string crua. | f1 UI-03, f2 UI-05, f2 UI-06, f2 UI-07, f3 UI-02 |
| **R3 · invalidez não chega ao controle** | `fieldContext.ts:38-42`: `useFieldProps` devolve `id`, `aria-invalid` e `aria-describedby`, nunca `invalid` — a única porta para `.p-invalid` do Prime. `CrudDialog.tsx:64` passa `loading={pending}` ao botão de salvar; o Prime o desabilita, o navegador solta o foco no `<body>`, e ninguém o traz de volta. | f4 UI-02, f4 UI-03 |
| **R4 · `dataKey` cravado no primitivo** | `AppDataTable.tsx:106` fixa `dataKey="id"`; `EmissionPanelEnrollmentData` expõe `enrollment_id` e não `id` (`generated.ts`). Das 12 famílias de linha, só esta não tem `id`. | f3 UI-06 |

Singletons (uma linha de código cada, raiz própria): f1 UI-02, f2 UI-03 (metade semântica),
f2 UI-09, f2 UI-10 (**C**), f3 UI-03, f3 UI-09, f4 UI-06.

## 4. Triagem preliminar — os 49

### Fase 1 — Comercial, vocabulário de botão (10)

| Id | Cl. | Veredito | Raiz / razão | Remédio |
|---|---|---|---|---|
| A1–A6 | A | adequado | linha de base do item 18: ausência de delta nas CTAs, B2 e B3 entregues, foco/tab, console limpo. **Nota factual da A3 fica registrada**: o plano do item 18 dizia "Voltar + CTA lado a lado"; a tela tem "Volver" em linha própria acima do título (`DetailHeader.tsx:41`, `flex-col gap-4`, decisão do item 8/BD). Não é achado. | — |
| UI-01 | B | corrigir | **R1** — o lado selecionado do `ArchiveSwitch` é `AppButton` sem papel (`ArchiveSwitch.tsx:21,27`): celeste preenchido, igual à CTA no escuro e mais pesado que ela no claro | selecionado `outlined`, não selecionado `text`, os dois `size="small"`; tinta `--brand-ink` no claro (5,3:1), celeste no escuro. Único preenchido/contornado de marca da barra passa a ser a CTA |
| UI-02 | B | corrigir | "Rechazar" (`outlined`, geometria do tema, 46px/16px) ao lado de "Aprobar" (`compact`, 44px/14px) — `QuoteRow.tsx:63-66` | `size="small"` no Rechazar: `p-button-sm` mede 44px/14px, a mesma escala do `compact`; o `severity` segue sendo o sinal do destrutivo |
| UI-03 | B | corrigir | **R2** — `BudgetDetailPage.tsx:66` passa `` `RUT ${rut}` `` como prosa; quebra no hífen verificador a 1024px | `identifierClass` (mono + tabular + `whitespace-nowrap`) no `description` do `IdentityCell` |
| UI-04 | B | recusado | a costura do diálogo no escuro é **decisão escrita**: `AppDialog/style.ts` pinta header e footer em `--surface-section` e o corpo em `--surface-card` ("o footer recebe a mesma superfície do header — no default do Lara ele flutua"). A fase 4 mediu a mesma costura (A3) e a registrou coerente. Duas runs discordaram; vence a decisão com razão | — |

### Fase 2 — Dashboard, Cursos e Perfil, tipografia (10)

| Id | Cl. | Veredito | Raiz / razão | Remédio |
|---|---|---|---|---|
| UI-01 | A | adequado | `h1` com dono único, 18/18 medições iguais | — |
| UI-02 | B | ficha **D-63** | o `h2` de faixa (12px, caixa alta) é menor que o `h3` de card (16px) — são dois REGISTROS (eyebrow × título), não dois degraus de uma escala; decidir se o produto quer escala monotônica é do João | ficha com as duas saídas e recomendação |
| UI-03 | B | corrigir (semântica) + **D-63** (grafia) | o Perfil emite `h1,h3,h3,h3`: `FormSection` é `h3` fixo (`FormSection.tsx:34`) porque nasceu para diálogo; no Perfil as três seções dividem a PÁGINA | `FormSection` ganha `as?: 'h2' \| 'h3'` (default `h3`); as três seções do Perfil passam `as="h2"`. Grafia igual à do Dashboard: a decisão visual fica na D-63 |
| UI-04 | B | recusado | **falso-positivo de mecanismo**: `AgendaPanel.tsx:99` e `KpiRow.tsx:77` **consomem** `sectionLabelClass` por template, não copiam — o lint `GRAFIA_LITERAL` mede exatamente isso e está verde. A run leu a string no DOM. O `h4` de janela sob o `h3` do card "Agenda" é aninhamento, não salto; o `<p>` do KPI não é heading | — |
| UI-05 | B | corrigir | **R2** — pill de contagem do `AppCard:154` em Inter; colunas numéricas de `CoursesTable.tsx:82,89` em Inter 600 | `technicalDataClass` nos três |
| UI-06 | B | corrigir | **R2** — `font-mono` sem `tabular-nums` em `ProfileIdentityCard:76`, `ProfilePersonalSection:62`, `DashboardItemRow:72`, `AgendaPanel:68` e nos RUTs de `StudentsTable`, `RedatoresTable`, `RedatorCard` | as duas constantes em todos os 20 sítios medidos |
| UI-07 | B | corrigir | **R2** — `Sidebar.tsx:71` imprime `APP_VERSION` em Inter | `technicalDataClass`; `LoginPage:48` já é tabular e passa a consumir a constante |
| UI-08 | B | ficha **D-64** | "1" (Archivo 30px) e "250 UF" (mono 12px) encostados leem "1250 UF"; o comentário de `KpiRow.tsx:104` explica por que a grandeza secundária divide a linha; a forma da fronteira é decisão de desenho | ficha com recomendação |
| UI-09 | B | corrigir | `AppLineChart.tsx:82` deixa o Recharts pintar o texto da legenda com a tinta da série (3,41–4,47:1 a 12px no claro) | legenda com conteúdo próprio: texto em `--text-color-secondary`, marcador com a tinta da série, `<ul role="list">` — **paga a P-63** (gatilho: "bloco que tocar gráfico") |
| UI-10 | **C** | corrigir | `AgendaPanel.tsx:97` `<section>` é item de grid sem `min-w-0`; o `overflow-hidden` do card corta 26px a 390px e a reticência cai fora | `min-w-0` na `<section>`; medir `scrollWidth == clientWidth` |

### Fase 3 — Certificados (15)

| Id | Cl. | Veredito | Raiz / razão | Remédio |
|---|---|---|---|---|
| A1–A6 | A | adequado | nome acessível dos dropdowns, vazios, `/validar` responsivo, sem overflow, es-CL, `tabular-nums` no `td` | — |
| UI-01 | B | ficha **D-65** | `stickyActionsColumn('8rem')` fixo contra `tableWidths` em % sobre `min-w-[48rem]`: 99px de oclusão a 1024px. Vale para as 12 tabelas com ação presa; escolher entre reserva em % e sinal de rolagem é desenho da moldura (item 17), a remedir nas 12 | ficha com as duas direções |
| UI-02 | B | corrigir | **R2** — `EmissionStudentsTable.tsx:48` passa `e.student_rut` cru | `identifierClass`, como o Historial |
| UI-03 | B | corrigir | a `AppTag` do bloqueio é irmã solta entre o card financeiro e a linha do CTA (`EmissionPanel.tsx:89-95`), 536px do controle que explica | a tag entra na MESMA linha do CTA (`flex items-center justify-end gap-3`), ganha `id`; o CTA e os 13 "Emitir" apontam `aria-describedby` para ela. Texto inalterado |
| UI-04 | B | recusado | a opacidade de `disabled` é **calibração por folha do Lara** (`0.6` claro / `0.4` escuro, `lara-*-lotus.css:292`), no tema gerado; controle desabilitado é isento da 1.4.3 e o próprio achado não reporta falha WCAG. Sem sinal de usuário, mexer no gerador por uma diferença sem custo medido é redesenho | — |
| UI-05 | B | ficha **D-66** | a escala de raio da rule (`lg`/`md`/`full`) não é a da tela: tema em 4px para botão, input **e** tag (`.p-tag` `border-radius: 4px`); `rounded` do Tailwind v4 = 4px; `rounded-md` = 6px só nos banners do `FormField`; `rounded-full` só no pill de contagem do `AppCard`. Junto com os 10 sítios da **P-67** | ficha com os fatos e recomendação; P-67 rehospedada na D-66 |
| UI-06 | B | corrigir | **R4** | `dataKey` vira prop (default `'id'`); a Emisión passa `enrollment_id`; console limpo ao selecionar turma |
| UI-07 | B | ficha **D-67** | o ramo `notFound` (`ValidationPage.tsx:114-118`) tem só o `h1`; ecoar o identificador e dizer o passo seguinte é texto de página PÚBLICA de peso legal | ficha com redação proposta |
| UI-08 | B | corrigir | **R1** — os 6 diálogos: CTA sem `variant` (`ConfirmIssueDialog:43`, `BatchIssueDialog:30`, `IssuedDialog:47`, `CertificateViewDialog:39`), "Cerrar" cru (`BatchIssueDialog:25`, `ReissueDialog:60`), e as secundárias em `outlined` onde o `CrudDialog` usa `text` | CTA → `variant="primary"`; Cerrar/Cancelar → `text`; `RevokeDialog` mantém `severity="danger"` |
| UI-09 | B | corrigir | **mecanismo isolado** (a run não isolou): `useHistorial.ts:10` monta um segundo observador de `useEmissionPanel` na mesma chave `[...panelKey, 'default']` para o Reemitir; com `staleTime` 0, observador novo refaz o GET. Não é foco: `refetchOnWindowFocus: false` é global | `staleTime: 30_000` no painel — precedente de `useCrudPage`/`CourseStep.tsx:42`; invalidação pós-emissão ignora `staleTime` |

### Fase 4 — Login, shell e CourseDialog (14)

| Id | Cl. | Veredito | Raiz / razão | Remédio |
|---|---|---|---|---|
| A1–A8 | A | adequado | foco visível, ordem de Tab, **costura do diálogo coerente por tema (A3)**, diálogo cabe a 390, alvos ≥ 44px, sem overflow, colapso, console | — |
| UI-01 | **C** | corrigir | **R1** — `AppSelectableCard.tsx:63` renderiza o alvo como `AppButton` sem `variant`: o `.p-button` preenchido cobre 94% do card e apaga o `color-mix` que o `<div>` externo já calculou | `variant="noSurface"` + `text` + `text-[var(--text-color)]` no alvo interno (o mesmo par do `UserMenu.tsx:52`); quem pinta é o `<div>` externo. Medir: alvo transparente nos dois temas; selecionado ≠ não selecionado por fundo e borda |
| UI-02 | B | corrigir | **R3** | `ariaProps` devolve também `invalid`; nos cinco wrappers `{...fieldProps}` antecede `{...props}`, então prop do chamador continua vencendo. Medir `.p-invalid` no CourseDialog em 422 |
| UI-03 | B | corrigir | **R3** | `CrudDialog` observa a descida de `pending`: se o diálogo segue aberto, foca o primeiro `[aria-invalid="true"]` do corpo, senão o botão de salvar. Sem live region: o foco no campo faz o leitor anunciar o `aria-describedby` |
| UI-04 | B | corrigir (pela raiz) | **R1** — o token secundário foi calibrado para `--surface-card`; a UI-01 é quem põe o RUT sobre celeste | fecha com a UI-01; medir ≥ 4,5:1 nos dois temas |
| UI-05 | B | ficha **D-68** | `#cbd5e1` sobre `#ffffff` mede 1,48:1 (`lara-light-lotus.css:1317`); a 1.4.11 pede 3:1 no limite de controle; nenhum `-400` do Tailwind passa (slate-400 2,36:1) e o `-500` mede 4,76:1 — decisão de tema com cara nova para todo input do claro | ficha com as opções medidas |
| UI-06 | B | corrigir | dois recibos de rótulo: `LoginForm:67` (16px/500/`--text-color`) × `FormField:66` (14px/400/secundária); o `FormField` é o molde declarado ("o molde correto já vivia no LoginForm" — e agora vive no `FormField`) | os cinco campos de auth (`LoginForm` ×2, `ForgotForm`, `SetPasswordPage` ×2) passam a **consumir `FormField`**: id por contexto, erro por prop, `invalid` pela R3. Some a fiação manual de `aria-*`; `AuthPanel.test` acha por rótulo |

**Totais:** adequado 21 · corrigir 19 · ficha 6 (D-63..D-68; a f2 UI-03 divide-se entre corrigir e
D-63) · recusado 3. Os dois **C** são `corrigir`.

## 5. Decisões

| # | Decisão | Alternativa recusada e por quê |
|---|---|---|
| **D1** | Triagem por **raiz**, não por sítio: quatro raízes fecham 12 dos 28 B/C, cada uma com catraca ou teste | 49 correções item a item: o backlog já mediu que a raiz é mais barata, e sítio corrigido sem catraca é a P-67 de novo |
| **D2** | Catraca **`BOTAO_SEM_PAPEL`**: `AppButton` em `features/**` e `app/**` precisa de `variant`, `text`, `outlined`, `link` ou `severity`. O `.p-button` cru do Lara **não é papel** deste produto — o `primary` é o contorno de marca, não o preenchido | Só corrigir os 13 sítios: o próximo diálogo nasce no preenchido cru de novo, e foi assim que os 6 de certificação escaparam da varredura do item 18. `rounded` sozinho não conta como papel: sem `text` ele segue preenchido |
| **D3** | Os cinco submits de auth (`LoginForm`, `ForgotForm`, `SetPasswordPage` ×3) viram `variant="primary"` — **mudança visível**: contorno de marca no claro, preenchido no escuro, como toda CTA do produto | Exceção para auth na catraca: exceção embutida que ninguém vê. Um variant novo "preenchido" só para o login: terceiro vocabulário para um papel que a rule já nomeia. O João pode vetar a D3 antes do `/executar-bloco`; nesse caso os cinco recebem um variant `filled` documentado, e a catraca continua verde |
| **D4** | Secundária de diálogo é **`text`**, como o `CrudDialog`; `outlined` sai das 5 secundárias de certificação | Manter `outlined`: dois recibos para a mesma ação, e a fase 3 já mediu o custo de dois recibos no RUT |
| **D5** | Dado técnico vira **constante**, não componente (D2 do item 18: grafia sobre elemento existente): `technicalDataClass = 'font-mono tabular-nums'` e `identifierClass = technicalDataClass + ' whitespace-nowrap'` (RUT, folio, código — token único, não quebra no hífen). Catraca **`MONO_LITERAL`** na família do `GRAFIA_LITERAL`, nas duas camadas | Um `<Mono>`: 20 sítios embrulhados para trocar uma string; `IdentityCell` com prop `rut`: a peça é apresentacional e não conhece domínio (spec D1/D11 dela) |
| **D6** | `invalid` entra pelo **contexto** (`useFieldProps`; `useSplitFieldProps.control` — no Calendar `invalid` é prop do componente, não do `pt.input`) | Passar `invalid` na mão nos 55 campos: é o que o Login fazia, e é a P-37 com outra roupa |
| **D7** | O foco pós-422 é do **`CrudDialog`**, na borda de descida de `pending`: primeiro `[aria-invalid="true"]` do corpo, senão o botão de salvar; só se o diálogo continuar aberto | Live region no `FormField`: anuncia sem mover o foco, e o Tab continuaria partindo do `<body>`. Foco no `FormErrorBanner`: ele só recebe o erro GERAL |
| **D8** | `dataKey` vira **prop** do `AppDataTable`, default `'id'`; quem não tem `id` declara | Renomear `enrollment_id` no DTO: toca `generated.ts` e o backend por um problema do primitivo |
| **D9** | Legenda com **conteúdo próprio** (`content` do `<Legend>`): texto em `--text-color-secondary`, marcador com a tinta da série, `<ul role="list">` — a **P-63** fecha aqui, porque o gatilho dela é este bloco | Escurecer a rampa das séries no claro: mexe no `chart-tokens.test.ts` e nas linhas, que passam 3:1; o problema é texto, não traço |
| **D10** | Auth **consome `FormField`** (f4 UI-06); `AuthPanel.test` deixa de achar por `#login-email` e passa a `getByLabelText` | Constante `formLabelClass` para os cinco rótulos: continuaria copiando o resto do molde (`aria-*`, erro), que o `FormField` existe para não copiar |
| **D11** | `staleTime: 30_000` em `useEmissionPanel` | Deixar como está: 64 ms hoje, mas o payload cresce com as turmas concluídas, e o precedente (`useCrudPage`) já escolheu |
| **D12** | Motivo do bloqueio na **mesma linha** do CTA, com `aria-describedby` nos 14 controles; o texto e a `AppTag` não mudam | `title` nos botões: hover não existe em toque. Substituir a tag por texto ao lado de cada "Emitir": 13 repetições |
| **D13** | `FormSection` ganha `as` (default `h3`); o Perfil passa `h2` | Faixa `h2` nova acima das três seções: inventa heading para dar degrau |
| **D14** | Decisões que não são da lane viram **fichas `D-63`..`D-68`** em `backlog.md` §"Decisões não promovíveis isoladamente", com fatos medidos e recomendação; **este bloco não aplica mudança visual sem decisão**. Decisão do João antes do `/executar-bloco` muda o veredito e entra como task no plano | Aplicar a recomendação por conta própria: o backlog nomeia três delas como "decisão do João, não conserto" |
| **D15** | **Dado de prova**: um template (`POST /api/courses/{id}/templates`, só JSON) para o curso da turma 3 e **um certificado emitido pela própria UI** no stack de dev desta árvore (`:8082`), para a run 5 pintar os 6 diálogos, o ramo `valid` de `/validar` e o `CertificateFolio` | Esperar certificado real: a lacuna já está na terceira run sem pintura, e o folio é a assinatura do ADR-16 sem veredito |

## 6. Catracas e testes

| Frente | Mecanismo | Onde | Prova de que morde |
|---|---|---|---|
| R1 | `BOTAO_SEM_PAPEL` nos quatro arrays de `no-restricted-syntax` (`features/**` ×3, `app/**`) | `eslint.config.js` | sonda negativa: tirar o `variant` de um CTA e ver o lint nomear o arquivo |
| R1 | alvo do `AppSelectableCard` sem superfície própria; `ArchiveSwitch` sem preenchido | `AppSelectableCard.test.tsx` (novo), `ArchiveSwitch.test.tsx` | teste visto reprovar antes |
| R2 | `MONO_LITERAL` (`font-mono` em `className`, literal ou template, nas duas camadas) | `eslint.config.js` | sonda negativa |
| R2 | as duas constantes travadas | `typography.test.ts` | — |
| R3 | wrapper dentro de `FormField` com `error` renderiza `.p-invalid`, nos cinco wrappers | `fieldAssociation.test.tsx` | visto reprovar |
| R3 | `CrudDialog` devolve o foco após `pending` cair com erro | `CrudDialog.test.tsx` (novo) | visto reprovar |
| R4 | `dataKey` chega ao `DataTable`; tabela sem `id` não emite o warning de `key` | `AppDataTable.test.tsx` | visto reprovar |
| Legenda | `<ul role="list">`, texto fora da tinta da série | `AppLineChart/legend.test.tsx` (novo) | visto reprovar |
| Painel | `staleTime` do painel | `certificatesApi.test.tsx` | visto reprovar |

`shared/ui` fica fora das duas catracas de lint de propósito — é onde a grafia e o papel são
DEFINIDOS; os sítios de `shared/ui` que este bloco corrige têm teste próprio.

## 7. Fichas para o João (D-63..D-68)

Cada uma entra com os fatos medidos pelas runs e uma recomendação. Resumo:

- **D-63** (f2 UI-02/03) — escala de heading: faixa 12px caixa alta × título de card 16px. Recomendação: **manter** os dois registros (eyebrow e título codificam profundidade por caixa e posição, não por corpo); se o João quiser escala monotônica, o degrau muda em `typography.ts` e o título de card sobe para lá.
- **D-64** (f2 UI-08) — "1250 UF". Recomendação: separador visível entre contagem e grandeza (`·` com `aria-hidden`, ou o rótulo curto "UF aprob." antes do valor), na mesma linha — sem terceira linha, pela razão do `KpiRow.tsx:104`.
- **D-65** (f3 UI-01) — reserva da coluna presa em tablet. Recomendação: sinal de rolagem (sombra) no wrapper **e** `min-width` da tabela abaixo da reserva onde ela não cabe; a reserva em % reabre as 12 medições do item 17.
- **D-66** (f3 UI-05 + **P-67**) — escala de raio. Fatos: tema em 4px para botão, input e tag; `rounded` = 4px; `rounded-md` (6px) só nos banners do `FormField`; `rounded-full` só no pill de contagem. Recomendação: superfície `rounded-lg`; controle, faixa fina **e tag** herdam o raio do tema (4px = `rounded`); `rounded-full` só para o que é círculo ou cápsula de contagem; os banners voltam de `rounded-md` para o raio do tema; os 10 sítios da P-67 se classificam por essa régua e a catraca nasce depois.
- **D-67** (f3 UI-07) — corpo do `notFound` público. Recomendação: ecoar o identificador consultado em `identifierClass` e uma linha de passo seguinte ("verifica el código impreso o contacta a Lotus"), sem link, sem dado do certificado.
- **D-68** (f4 UI-05) — borda do input no claro (1,48:1). Opções medidas: slate-500 (`#64748b`, 4,76:1, dentro da paleta, mais pesado); fundo `--surface-ground` no input (não resolve 1.4.11 sozinho); valor fora da paleta ≈ 3:1 (contra a regra "sem hex paralelo"). Recomendação: slate-500 na borda de repouso, medida nos dois temas antes de entrar no gerador.

A **P-67** passa a apontar para a D-66 como hospedeira; a **P-63** encerra neste bloco (D9).

## 8. Fora, por escrito

- Redesenho de tela; sidebar de 80px a 390px (a f2 UI-10 sugere rever — o item 8 já recusou
  layout de navegação, e a correção do C não depende disso).
- Cursos, Pessoas e Administração sem run própria (item 16 continua na fila).
- A catraca de raio da P-67: nasce depois da D-66, não antes.
- Qualquer mudança no tema gerado (`pnpm brand-theme`): a D-68 leva a decisão.
- Backend e `generated.ts`.

## 9. Prova e Definition of Done

1. **`audits/2026-08-29-item19-triagem.md`** com veredito, raiz, remédio e prova para os 49 e para
   os achados da run 5 — zero linhas pendentes.
2. **Nenhum C aberto, medido**: f4 UI-01 — alvo interno transparente nos dois temas, selecionado ≠
   não selecionado por fundo e borda, RUT ≥ 4,5:1; f2 UI-10 — `scrollWidth == clientWidth` no card
   "Agenda" a 390×844 e reticência visível.
3. **Raízes com catraca vista reprovar** por sonda negativa (`BOTAO_SEM_PAPEL`, `MONO_LITERAL`) e
   os testes do §6 vistos reprovar contra o código antigo.
4. **Run 5 de `/lotus-ui-review`** com dado de prova (D15): os 6 diálogos de certificação, o ramo
   `valid` de `/validar/<uuid>`, e o **veredito do `CertificateFolio`** escrito — degrau de tamanho
   e tracking julgados, com screenshot nos dois temas. Mais a remedição das superfícies corrigidas:
   barra do Comercial (f1 UI-01/02/03), Agenda a 390 (f2 UI-10), legenda (f2 UI-09), Emisión
   (f3 UI-03/06), CourseDialog em 422 (f4 UI-01/02/03/04), login (D3, f4 UI-06). Achado novo da
   run 5 entra na triagem: **C corrige; B corrige se a raiz já foi tocada, senão vira ficha**.
5. Fichas D-63..D-68 escritas; P-63 encerrada com medida; P-67 rehospedada; rule atualizada
   (`.claude/rules/frontend-estilizacao.md`: as duas constantes e a `MONO_LITERAL`, a
   `BOTAO_SEM_PAPEL`, a secundária de diálogo, e os fatos de raio que a D-66 espera).
6. Gate: `pnpm lint` 0, `pnpm build` verde, `pnpm test` verde, suíte backend inalterada, e
   `pint`/`typescript:transform` **N/A por escopo medido** (diff vazio em `backend/` e
   `generated.ts`).

## 10. Limitações declaradas

- Os vereditos do §4 são **leitura de código**, não medição; a execução mede, e um veredito pode
  virar — a triagem final é a do `audits/`, não esta tabela.
- A **D3 muda a cara do login** (contorno no claro). É reversível em cinco linhas e o João pode
  vetá-la antes da execução.
- A **D-68 deixa uma reprovação 1.4.11 aberta por escrito** até o João decidir o tema.
- A run 5 depende do Gotenberg do stack `+2` gerar o PDF do certificado de prova; se falhar, os
  diálogos pintam mas o `IssuedDialog` com PDF e o folio ficam sem pintura, e isso vai registrado.
- O dado de prova é **mutação no banco de dev desta árvore** (template + certificado): feito pelo
  bloco antes da run, nunca pela skill de review, que segue read-only.

# Spec — `frontend-estilizacao-padronizacao-de-componentes`

**Data:** 2026-08-28 · **Item:** 18 da fila (`backlog.md`) · **Lane:** `lane-c` ·
**Árvore:** `../fix-frontend` · **Branch:** `refactor/frontend-estilizacao-componentes`
(de `main@b7283736`)
**Context Packet:** `null` — o item marca `Contexto: não por padrão`, e a fonte é medição local:
`audits/2026-08-26-estilizacao-componentes.md` mais a ficha `D-62` do `backlog.md`.

---

## 1. Objetivo

Fechar a última milha da estilização: o mesmo papel visual sai hoje em 3 a 5 grafias diferentes, e
a assinatura que o ADR-16 elegeu — o folio tratado como artefato — nunca foi executada.

**Não é redesenho.** O audit mede o código contra a direção JÁ fechada (ADR-16 + consolidação de
2026-08-11) e declara por escrito que o alicerce não se toca: `brand-theme.css`/`tokens.ts`, o
contraste travado por `tone-ink.test.ts` e `chart-tokens.test.ts`, e as decisões medidas em review
do `AppCard`, `AppTag` e `AppDataTable`. Toda padronização aqui **consome** esses tokens; nenhuma
cria hex paralelo.

O bloco é **frontend puro**. Não toca `backend/` nem `generated.ts` — o gate P-03 não é disparado e
`pint`/`typescript:transform` são N/A por escopo, **a medir no fechamento**, não a supor.

## 2. Escopo

Quatro fases, na ordem que o audit propôs (§7) e o João aprovou como bloco único.

| Fase | Achados | Natureza |
|---|---|---|
| 1 · Vocabulário de botão | B1, B2, B3 | rename por papel + varredura de call sites |
| 2 · Tipografia | A1, A2, A3, A5, E2 | três tratamentos compartilhados |
| 3 · Dado técnico e assinatura | A4, D4, C4 | regra mono + `CertificateFolio` |
| 4 · Higiene | C1, C2, C3, D1, D3, E1 + `D-62` | correções pontuais + a rule + a catraca |

Estado medido em 2026-08-28, sobre o código pós-item 8:

| Achado | O que está errado hoje | Medido em |
|---|---|---|
| B1 | `brandIcon` ("marca, só-ícone" pelo próprio contrato) é a CTA do produto em **17** call sites com `label=`; `brandLabel` sobrou em 2 | `AppButton/style.ts` + 16 arquivos |
| B2 | "Voltar" usa o mesmo variant de marca da CTA que ele antecede | `DetailHeader.tsx:43` |
| B3 | `CrudDialog` confirma com marca, `ConfirmDialog` com `severity` cru do Lara | `CrudDialog.tsx:61`, `ConfirmDialog.tsx` |
| A1 | Os dois `h1` do produto têm vozes diferentes (`font-display … tracking-tight` × `text-2xl font-bold`) | `PageHeader.tsx:30`, `DetailHeader.tsx:96` |
| A2 | O papel "encabeçar um grupo" sai em 5 grafias | `FormSection.tsx:26`, `SectionLabel.tsx`, `RedatorDesignation.tsx:74`, `TurmaConfigCard.tsx:55`, `TurmaDocuments.tsx:31`, `ConcludePanel.tsx:17` |
| A3 | Número de estatística em três tratamentos; UF **sem** `tabular-nums` | `KpiRow.tsx:93` (alvo), `BudgetStatCard.tsx:10`, `ProfileSummaryCard.tsx:35` |
| A5 | O título de auth está copiado literal 5× | `LoginForm.tsx:45`, `ForgotForm.tsx:38`, `SetPasswordPage.tsx:25,36,51` |
| A4 | Folio e RUT sem mono em dois sítios, um deles a tela pública | `ValidationPage.tsx:34`, `HistorialTable.tsx:90` |
| D4 | A assinatura da direção não existe: o folio é `text-sm font-medium`, igual ao nome do aluno | `ValidationPage.tsx:34` |
| C4 | Card montado à mão onde o `CertificateFolio` vai morar | `IssuedDialog.tsx:72` |
| C1 | Escala de raio implícita; banners com `rounded` solto | `FormField.tsx:138,175` |
| C2 | Única tela do produto em paleta Tailwind crua | `ValidationPage.tsx:80` |
| C3 | `...(pt ?? appTabViewPt)` apaga o default de quem passa qualquer `pt` | `AppTabView.tsx:41` |
| D1 | 120px de logo compensados por 60px de margem manual | `Sidebar.tsx:47` |
| D3 | Tinta de marca no papel de texto de apoio | `LoginPage.tsx` (tagline/setor) |
| E1 | Três dialetos de padding interno, sem regra escrita | `ValidationPage` (`p-5`), `IssuedDialog`/login (`p-6`) |
| E2 | `my-[0.83em]` herdado do UA nos dois títulos | `PageHeader.tsx:30`, `DetailHeader.tsx:96` |
| `D-62` | Nada reprova `AppDropdown` de filtro sem nome acessível — 4 correções à mão, 3 runs, zero catraca | `eslint.config.js` (medido: nenhuma linha sobre `AppDropdown`, `inputId` ou `aria-label`) |

**Fora, por escrito:**

- **`P-63`** — as 2 legendas do Recharts sem `role="list"`. Está agrupada neste item, mas o remédio
  é escolher entre afrouxar o mini-reset para lista de terceiro ou injetar `role` por ref; nenhum
  dos dois é estilização de componente próprio, e este bloco não toca gráfico em lugar nenhum.
  Segue agrupada para o bloco que tocar gráfico ou o mini-reset.
- **Redesenho de paleta, tema ou contraste** — medido e travado por teste; não há achado ali.
- **Dashboard** (placeholder declarado) e as telas do item 16 ainda sem run de UI-review — Cursos,
  Pessoas e Administração. O item 16 continua na fila e este bloco não o consome.
- **Layout de navegação** (drawer e afins) — a spec do item 8 já recusou.
- **Motion novo** — a direção é instrumental; `transition-colors` basta. Animação seria decoração
  sem tese.
- **`D-34`** — segue sem hospedeiro por decisão do João; o candidato que sobra é o item 9.

## 3. Decisões

| # | Decisão | Alternativa recusada e por quê |
|---|---|---|
| **D1** | Bloco **único**, quatro fases como tasks | Fatiar em 1+2 e 3+4: as duas primeiras fases tocam os MESMOS arquivos (o call site que troca de variant é o que abre com `h1`/rótulo), então fatiar produz segundo passe nos mesmos 16 arquivos e segunda medição das mesmas telas |
| **D2** | Grafia sobre elemento existente vira **constante exportada**; papel com markup próprio vira **componente** | Tudo componente: o `h1` já mora dentro de `PageHeader`/`DetailHeader`, e embrulhar de novo só adiciona camada. `@utility` do Tailwind v4: sai do TS, e nem a catraca nem o scanner do Tailwind alcançam igual — sem precedente no repo, que já publica grafia por `style.ts` |
| **D3** | `primary` **não declara padding** — herda `.p-button` do Lara-Lotus (`0.75rem 1.25rem`, `1rem`) | Herdar a geometria do `brandLabel` (`px-3 py-2.5 text-sm`): encolheria as 17 CTAs do produto (fonte 16→14, padding 20→12). O audit supôs "byte-idêntico" sem medir; medido, os dois lados divergem, e o lado com 17 sítios é o que fica parado |
| **D4** | Quatro variants por PAPEL: `primary`, `compact`, `iconToggle`, `noSurface` | Manter `brandIcon`/`brandLabel` e só corrigir a geometria: o vocabulário continuaria mentindo sobre o uso, e a próxima CTA nasce no variant errado de novo |
| **D5** | Rótulo de **seção** (heading) e rótulo de **campo** (`dt`) são peças diferentes | Uma peça só, como a tabela do A2 sugere: os `<dt>` da `ValidationPage`/`IssuedDialog` não encabeçam grupo nenhum — promovê-los a heading inventaria hierarquia numa página pública de peso legal |
| **D6** | `SectionLabel` sobe para `shared/ui` com **nível por prop** (`h2` default, `h3` dentro de card/diálogo) e hairline opcional | Nível fixo `h2`: os três sítios de operation são `h3` dentro de card sob o `h1` da página; forçar `h2` inverteria a árvore de headings. Nível fixo `h3`: quebraria o degrau que o `SectionLabel` do Dashboard existe para marcar (UI-05 do review de 2026-08-17) |
| **D7** | O folio vira **bloco próprio abaixo do status** na `ValidationPage`, fora da `<dl>` | Folio acima do status: a resposta que a pessoa foi buscar desceria de posição, e em 390px empurraria o veredito para perto da dobra. Só trocar a grafia dentro da lista: continua sendo mais um campo, e a assinatura do ADR-16 segue sem existir |
| **D8** | As regras novas vão para uma rule **própria**, `.claude/rules/frontend-estilizacao.md` | Seção nova no `frontend-fsliced.md`: ele tem 291 linhas sobre fatiamento, dependência e padrões de código — outro assunto e outro gatilho de leitura |
| **D9** | Os `my-[0.83em]` **saem** agora, virando `mb-4` de escala, com screenshot antes/depois | Mantê-los (D6 da spec do item 8): aquela decisão valia enquanto o `h1` não era unificado; unificar é o momento que o audit reservou (E2), e adiar reabre a mesma pergunta na próxima leitura |
| **D10** | A catraca da `D-62` é regra de lint **por forma**, medida com o próprio seletor antes de valer | Grep por grafia: o `AppDropdown` sem nome aparece em formas diferentes, e grep casaria a grafia de hoje. Foi a lição do `eslint.config.js` que nasceu casando só `arguments.0` |

## 4. Desenho por fase

### 4.1 Fase 1 — vocabulário de botão (B1, B2, B3)

`appButtonStyles` passa a nomear papel. O `brandOutline` (a camada de marca, com o docblock que
registra as duas medições de contraste de 2026-08-11/12) **não muda** — só quem o consome:

| Variant | Grafia | Call sites |
|---|---|---|
| `primary` | `flex items-center justify-center` + `brandOutline` — a string de HOJE do `brandIcon`, **sem padding próprio** | os 17 com `label=` |
| `compact` | `flex items-center gap-1 px-3 py-2.5 text-sm` + `brandOutline` | `LanguageMenu.tsx:45`, `QuoteRow.tsx:67` |
| `iconToggle` | `flex items-center justify-center` + `brandOutline` | `AppearanceControls.tsx:26`, `Sidebar.tsx:53` |
| `noSurface` | inalterado | inalterado |

A grafia do `primary` é a do `brandIcon` de hoje, **caractere por caractere** — é o que torna a D3
verificável: o variant muda de nome, não de cascata, e qualquer `gap`/padding acrescentado aqui
viraria delta nos 17 sítios. `brandIcon` e `brandLabel` deixam de existir: `AppButtonVariant` deriva de `keyof typeof
appButtonStyles`, então o `tsc` aponta todo call site remanescente — a varredura não depende de
grep estar completo.

**B2:** o "Voltar" do `DetailHeader:43` sai do variant de marca e vira ação terciária — botão
`text` do Prime com `pi-arrow-left`, tinta secundária indo a `--text-color` no hover. A sujeira de
formatação do sítio (`className="flex w-fit "`, indentação torta, `</AppButton >`) sai junto.

**B3:** `ConfirmDialog` sem `severity` passa a confirmar com `primary`, igual ao `CrudDialog`.
Com `severity="danger"` continua o preenchido de severidade — ação destrutiva não veste marca.

### 4.2 Fase 2 — tipografia (A1, A2, A3, A5, E2)

Um `frontend/src/shared/ui/typography.ts` publica a grafia por papel:

- `pageTitleClass` — `font-display text-2xl font-semibold tracking-tight`, a grafia que o
  `PageHeader` já paga. Consumida por `PageHeader`, `DetailHeader` (hoje `text-2xl font-bold`) e
  pelos 5 sítios de auth.
- `sectionLabelClass` — `text-xs font-semibold tracking-wider uppercase`, a grafia do
  `SectionLabel` do Dashboard.
- `fieldLabelClass` — `text-xs uppercase tracking-wide`, o papel do `<dt>`.
- `statValueClass` — dois degraus (`page` = `text-3xl`, `card` = `text-2xl`), sempre com
  `font-display` e `tabular-nums`.

**D9 aplicada:** `my-[0.83em]` → `mb-4` nos dois títulos, com screenshot antes/depois. A margem
deixa de ser a do agente do usuário cravada em `em` e passa a ser degrau declarado da escala.
**A troca não é só de valor: `my` vira `mb`**, então some também a margem SUPERIOR (19,92px em
`text-2xl`), que passa a ser responsabilidade do espaçamento do contêiner. É exatamente o que o
screenshot da fase 2 tem de mostrar nos dois cabeçalhos.

**A2, pela D5/D6:** `SectionLabel` sai de `app/pages/Dashboard/` para `shared/ui/`, ganha
`as?: 'h2' | 'h3'` (default `h2`) e `rule?: boolean` para a hairline (default `true`, como hoje).
`FormSection` passa a renderizar `SectionLabel as="h3"`; `RedatorDesignation:74`,
`TurmaConfigCard:55`, `TurmaDocuments:31` e `ConcludePanel:17` também. Os `<dt>` da
`ValidationPage` e do `IssuedDialog` recebem `fieldLabelClass` e continuam `<dt>`.

**A3:** `StatValue` novo em `shared/ui` (`{ children, size }`), consumido por `KpiRow` (já é o
alvo, `size="page"`), `BudgetStatCard` e `ProfileSummaryCard` (`size="card"`). O `BudgetStatCard`
exibe UF: hoje sem `tabular-nums`, o dígito dança na coluna a cada re-render de valor.

### 4.3 Fase 3 — dado técnico e a assinatura (A4, D4, C4)

`CertificateFolio` novo em `shared/ui`, com dois tamanhos:

- `size="page"` — bloco da `ValidationPage`: `fieldLabelClass` em cima ("FOLIO"), folio abaixo em
  `font-mono tabular-nums text-3xl tracking-[0.15em]`, para casar com o papel impresso que quem
  escaneia tem na mão.
- `size="dialog"` — o mesmo desenho um degrau abaixo (`text-xl tracking-[0.1em]`), substituindo o
  card ad hoc do `IssuedDialog.tsx:72` (`rounded-lg border p-6 text-center`), que resolve o **C4**
  junto.

Os dois degraus são ponto de partida declarado, não medição: a run de `/lotus-ui-review` da fase 3
pode mover **um** degrau em cada eixo com screenshot, e mais que isso volta para decisão do João —
é a tela pública de um documento com peso legal.

Na `ValidationPage` o folio **sai da `<dl>`** e vira faixa própria logo abaixo do `StatusHeading`;
os dados mínimos descem inalterados. O status continua respondendo primeiro — é o que o
fiscalizador foi checar.

**A4, segundo sítio:** `HistorialTable.tsx:90` passa o RUT como `<span className="font-mono">` no
`description` do `IdentityCell`, que já aceita nó.

### 4.4 Fase 4 — higiene (C1, C2, C3, D1, D3, E1) e a `D-62`

- **C2 + E1:** `ValidationPage` troca `bg-slate-50 dark:bg-slate-950` por `var(--surface-ground)` e
  `p-5` por `p-6` — hero público, pela regra nova. Slate-50 nunca foi o humo da marca (`#f1f5f9` é
  slate-**100**): a tela pública tinha um fundo que nenhuma outra tem, por acidente.
- **C3:** `AppTabView` troca `...(pt ?? appTabViewPt)` por `mergePt`, como `AppDialog`,
  `AppDatePicker`, `AppDataTable`, `AppFileUpload` e `AppPassword` já fazem. É a mesma família do
  Q-5 do review do item 8.
- **C1:** banners do `FormField:138,175` alinham em `rounded-md`; a escala vai para a rule.
- **D1:** `Sidebar.tsx:47` perde `ml-15 h-30` — o `viewBox` do asset é corrigido e o alinhamento
  passa a ser do flex do contêiner. Se o asset não puder ser corrigido nesta árvore, a task para e
  reporta: trocar número mágico por outro número mágico não fecha o achado.
- **D3:** tagline e setor do `LoginPage` saem de `--primary-200`/`--primary-400` para
  `--shell-ink`/`--shell-ink-muted`. O wordmark continua com tinta de marca.
- **`D-62`:** regra `no-restricted-syntax` casando `AppDropdown` em `src/features/**` sem
  `inputId`, `aria-label` nem `aria-labelledby`. Medida com o próprio seletor antes de valer.

## 5. Catracas

O audit vira mecanismo, não recomendação solta. Cada fase deixa a sua:

| Fase | Catraca | Onde |
|---|---|---|
| 1 | `AppButtonVariant` sem `brandIcon`/`brandLabel` — o `tsc` é a régua, mais teste do vocabulário | `AppButton.test.tsx` |
| 2 | Nenhum stat renderiza número sem `tabular-nums`; nenhum `h1` de página fora do `pageTitleClass` | teste de grafia em `shared/ui` |
| 3 | Folio e RUT sem `font-mono` nas telas tocadas reprovam | teste de grafia |
| 4 | `AppDropdown` sem nome acessível reprova o lint, **visto reprovar por sonda negativa** | `eslint.config.js` |

A regra escrita (`.claude/rules/frontend-estilizacao.md`) entra no mesmo PR: escala de raio
(superfície `lg`, controle/nav `md`, pill `full`), padding por papel (faixa de card `px-4 py-3`,
corpo `p-4`, página `p-4 sm:p-6`, hero público `p-6`), mono para folio/RUT/data técnica, e o
vocabulário de botão por papel.

## 6. Definition of Done

1. **Screenshot antes/depois por fase**, via `/lotus-ui-review`, nos **dois temas**, com relatório
   datado em `audits/`. A fase 1 prova **ausência de delta** nas 17 CTAs (é o que a D3 promete);
   as fases 2, 3 e 4 provam a mudança pretendida.
2. **Guardas de grep verdes:** zero `variant="brandIcon"` no repositório, zero número de stat sem
   `tabular-nums`, zero folio/RUT sem mono nas telas tocadas.
3. **A `D-62` provada pela sonda negativa da ficha:** remover o `inputId` de um dos quatro sítios
   já corrigidos e ver o mecanismo reprovar **nomeando o arquivo**; depois devolver.
4. **`.claude/rules/frontend-estilizacao.md` escrita**, no mesmo PR.
5. Gate: `pnpm lint` 0, `pnpm build` verde, `pnpm test` verde, suíte backend inalterada, e
   `pint`/`typescript:transform` medidos como N/A por escopo (`git diff --stat main...HEAD --
   backend/ frontend/src/shared/types/generated.ts` **vazio**).

## 7. Limitações declaradas

- **O audit foi leitura estática, sem navegador.** Onde a recomendação depende de pixel, quem
  decide é a run de `/lotus-ui-review` da fase, não o texto do audit.
- **A D3 promete ausência de delta nas 17 CTAs por construção**, não por medição prévia: o variant
  novo não declara padding, então a cascata é a mesma de hoje. A prova é o screenshot da fase 1.
- **O contraste do `--shell-ink*` sobre o degradê navy do Login (D3) não foi medido aqui.** O audit
  registra "provavelmente passa"; a fase 4 mede antes de trocar, e se reprovar a troca não entra —
  o papel errado é menos grave que texto ilegível.
- **A P-63 fica aberta**, por escrito, com o motivo na §2.

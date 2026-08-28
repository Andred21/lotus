# Medições — `frontend-hardening-final` (Task 6, DoD)

Bloco: `docs/superpowers/plans/archive/2026-08-26-frontend-hardening-final.md`. Base para as seis provas:
árvore com as Tasks 1–5 mescladas, mais uma correção adicional encontrada durante esta própria
varredura (registrada no DoD 2).

**Método.** Sem ferramenta de navegador interativa disponível para o controlador nesta sessão, a
varredura foi automatizada com Playwright/Chromium real (não headless simulado, não jsdom) contra a
stack desta árvore (offset +2: `http://localhost:5175`, backend `http://localhost:8082`), login real
como `admin@lotus.cl` (seed `DatabaseSeeder.php`), sessão em `es-CL` (idioma de referência do
produto). Isto é mais rigoroso que o roteiro manual original do brief (DevTools clicado à mão), não
menos: cada número abaixo vem de `getBoundingClientRect()`/`getComputedStyle()`/`document.activeElement`
lidos ao vivo no motor de renderização real, não de suposição nem de jsdom. Script descartável, fora
do repositório (`/tmp/.../scratchpad/dod6/run.js`), não versionado.

## DoD 1 — rótulo do módulo no rail a 390×844, legível sem interação

Emulado 390×844, sidebar em rail (colapso automático abaixo de 1024px), sem toque/hover/foco.

| Módulo | Rótulo lido | Altura do item |
|---|---|---|
| Dashboard | "Dashboard" | 49px |
| Comercial | "Comercial" | 49px |
| Operación | "Operación" | 49px |
| Cursos | "Cursos" | 49px |
| Certificados | "Certificados" | 49px |
| Personas | "Personas" | 49px |
| Administración | "Administración" | 49px |

Nenhum rótulo cortado a ponto de não identificar o módulo — os 7 lidos batem exatamente com o
`title` completo do link (nenhuma truncagem visível nos 7 módulos do papel Admin).

`<nav>`: 768px de altura total. Viewport: 844px. **768 < 844 — os sete módulos empilhados cabem sem
rolagem.** DoD 1 provado.

## DoD 2 — foco no olho da senha, por teclado

**Achado durante a varredura, corrigido nesta mesma Task 6:** a primeira rodada de medição (antes da
correção abaixo) mostrou que alternar a máscara **pelo teclado** (Tab até o olho, Enter) deixava
`document.activeElement` em `BODY` — tanto em `/perfil` quanto no cadastro de staff. Causa: o Prime
tem `onKeyDown` **separado** do `onClick` no ícone (`onToggleMaskKeyDown`, `password.cjs.js:587-613`),
que chama `toggleMask()` direto e nunca passa pelo `onClick` — o mecanismo que a Task 3 (commit
`a685fe64`) tinha encadeado. A Task 3 corrigiu o clique de mouse mas não o teclado, que é a descrição
ORIGINAL do D-33 ("quem alterna pelo teclado perde o lugar na página", já escrita no próprio arquivo
de teste antes desta Task 6 existir).

Corrigido em `cde9ba4b` (`fix(AppPassword): devolve o foco ao olho tambem pelo teclado (D-33)`),
mesmo mecanismo aditivo via `mergeProps`, agora também em `onKeyDown`, revisado e aprovado (spec +
qualidade, sem achado Crítico/Importante). Medição REPETIDA depois da correção:

| Tela | Tabs até o olho | `aria-label` depois do Enter | Elemento depois do Enter |
|---|---|---|---|
| `/perfil` | 1 (a partir do campo de senha) | `Ocultar contraseña` | `<svg>` (o ícone, não `BODY`) |
| Cadastro de staff (`/administracion` → "Nuevo usuario") | 1 (a partir do campo de senha) | `Ocultar contraseña` | `<svg>` (o ícone, não `BODY`) |

Idioma da sessão: `es-CL`. Nenhum dos dois resultados é `null` nem `BODY`. DoD 2 provado — só depois
da correção acima; a primeira medição tinha reprovado.

## DoD 3 — gate de build/lint/teste + fence de escopo

Rodado após o commit de correção do DoD 2 (`cde9ba4b`), estado final da árvore:

- `pnpm lint` → exit 0.
- `pnpm build` → exit 0 (só o aviso pré-existente de chunk >500kB, fora de escopo deste bloco).
- `pnpm test` → **111 arquivos, 619 testes, todos verdes** (617 ao fechar a Task 5; +2 da correção de
  teclado do DoD 2 — `fireEvent.keyDown` para Enter e Space).

Fence de escopo, medido:

```
git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts
```

Saída: **vazia.** `pint` e `typescript:transform` são N/A por escopo — nenhum arquivo de backend nem
`generated.ts` mudou nesta branch.

## DoD 4 — as cinco famílias de espaçamento

Cada alvo medido em 1440×900 e 390×844, claro e escuro. Os valores de layout (altura, distância,
recuo) não variam por tema — esperado, já que o mini-reset e o Tailwind aqui só arbitram layout, cor
é assunto do tema — e os quatro números por alvo (2 viewport × 2 tema) colapsaram em 2 (2 viewport),
confirmados idênticos nos dois temas em todas as 4 combinações rodadas.

### PageHeader (`/cursos`)

| Viewport | Altura da faixa | Distância até o primeiro conteúdo |
|---|---|---|
| 1440×900 | 92px | 24px |
| 390×844 | 112px | 24px |

### DetailHeader (`/operacion/turmas/4`, "Trabajos en líneas energizadas 220kV")

| Viewport | Altura do bloco | Topo do `h1` | Topo do avatar (identidade do cliente) |
|---|---|---|---|
| 1440×900 | 182px | 188px | 247px |
| 390×844 | 292px | 180px | 291px |

**Limitação declarada:** o script mede os TOPOS de `h1` e do nó com classe contendo "avatar" (o
`<div>` do `Avatar` do Prime, `avatar.cjs.js:254`) dentro do bloco — não julga visualmente
"alinhamento" no sentido estético (ex.: centralização vertical relativa). Os números confirmam que o
avatar renderiza abaixo do título (esperado: título e subtítulo empilham em `flex-col`), não que a
composição está esteticamente correta — isso ficaria para inspeção visual humana, que não foi feita
aqui. Nenhuma regressão de altura aparente (182px/292px são consistentes com o padrão do `PageHeader`
crescendo ~20px a mais por ter `back` + `subtitle` com identidade).

### `AppCard variant="stat"` / `KpiRow` (Dashboard)

| Viewport | Altura de cada card (6 cards) | As duas listas seguintes (Pendientes, Alertas) ficam na dobra? |
|---|---|---|
| 1440×900 | 100px (6/6 cards) | Sim — topo em 422px, viewport 900px |
| 390×844 | 60px (4 cards) / 75px (2 cards, os com 2 linhas de rótulo) | Pendientes fica (topo 804px < 844px); Alertas NÃO (topo 1662px) |

Em mobile, com 6 cards empilhados (grid de 1 coluna abaixo de `sm`) mais o próprio card de
Pendientes, é esperado que a segunda lista (Alertas) exija rolagem — isto não é o defeito que o P-46
corrigia (margem de UA fantasma), é conteúdo real ocupando espaço real em uma tela de 390×844. Sem
achado aqui.

### Listas `ul` do Dashboard (alertas, pendências, funil, agenda)

| Lista (amostra do 1º item) | `padding-left` do `<ul>` | `list-style` do `<li>` |
|---|---|---|
| Pendientes ("...Cotización por aproba[r]") | `0px` | `none` |
| Alertas ("Alta/Clase vencida/Clase con fec[ha]") | `0px` | `none` |
| Agenda ("Trabajos en líneas energizadas...") | `0px` | `none` |
| Funil comercial ("Cotización pendiente 1") | `16px` (mantém `p-4`, intencional — PipelineFunnel) | `none` |

Nenhum marcador aparece (medido via `getComputedStyle`, não por leitura visual) nas quatro listas, nos
dois viewports e nos dois temas. DoD 4 provado para esta família.

### `AppCardHeader` (altura da faixa × altura do texto)

Amostra (10 cards na Dashboard, 1440×900, idêntico nos dois temas):

| Card | Altura da faixa | Altura do texto (`h3`) |
|---|---|---|
| Pendientes / Alertas / Agenda / Flujo comercial y operativo / Evolución mensual / UF aprobada por mes / Clientes más activos / Carga de relatores | 49px | 24px |
| Cursos más demandados | 49px (1440) / 67px (390 — título quebra linha) | 24px |
| Cumplimiento documental de clases | 49px (1440) / 95px (390 — título quebra 2 linhas) | 24px (1440) / 48px (390) |

A faixa cresce exatamente quando o título quebra linha em 390px (comportamento por desenho do
`AppCardHeader`, `flex-wrap`) — sem faixa fixa desperdiçando espaço nos outros 8 cards. DoD 4 provado
para esta família.

## DoD 5 — truncamento do `IdentityCell` por `min-w-0`

Tabela de turmas (`/operacion`), cliente `"Subestación Norte S.A."`, forma empilhada.

| Estado | `scrollWidth` | `clientWidth` | `scrollWidth > clientWidth` |
|---|---|---|---|
| Com `min-w-0` (código atual) | 160 | 102 | **true** — corta |
| Sonda negativa: sem `min-w-0` (removido via DevTools/JS, revertido depois) | 160 | 160 | **empataram** (`===`) |

Prova exatamente o que a Task 5 declarou como contrato e o que jsdom não podia medir: o corte
depende do `min-w-0`, e sem ele o texto empurra a célula sem cortar. DoD 5 provado.

## DoD 6 — este relatório

Escrito com números medidos nas seções acima, cada um com viewport e tema registrados, e a sonda
negativa do DoD 5 com os quatro valores. Nenhuma seção ficou sem número por omissão — as duas únicas
ressalvas declaradas (alinhamento visual do avatar no DetailHeader; fold de mobile do Dashboard como
comportamento esperado, não defeito) estão marcadas explicitamente acima, com o motivo.

## Achado corrigido durante esta Task

**D-33 estava incompleto** (só mouse) e foi fechado nesta mesma Task 6, com TDD e review completos —
ver DoD 2 acima e commit `cde9ba4b`. Nenhum outro achado além deste.

---

# Regate do fechamento — 2026-08-27

As medições acima foram feitas em `cde9ba4b`. Depois delas o bloco recebeu **sete correções de
review** (`34719e33` Q-1 a Q-6, `922fe723` Q-7), e quatro delas mexem exatamente no que o DoD mede:
o `title` do `SidebarItem` (Q-2), o encadeamento de `on[A-Z]` do `mergePt` que carrega o foco do olho
(Q-5), o `role="list"` das 16 listas (Q-6) e o marcador de volta em duas listas de texto puro (Q-7).
Por isso o gate refez a prova **contra o estado final da branch**, no mesmo método: Chromium real
(Playwright 1.62.1, `chromium-1237`), stack desta árvore no offset +2 (`http://localhost:5175`,
API `http://localhost:8082`), login real `admin@lotus.cl` pela tela, sessão `es-CL`. Script
descartável fora do repositório.

## DoD 1 + Q-2 — rail a 390×844

Os sete módulos leem o nome sem interação (`Dashboard`, `Comercial`, `Operación`, `Cursos`,
`Certificados`, `Personas`, `Administración`), 49px de altura cada, `<nav>` com **768px** contra
844px de viewport — cabem sem rolagem. O `title` está presente nos sete **colapsado** e é `null` nos
sete a 1440px: é o contrato que o Q-2 escreveu.

## DoD 2 — foco no olho da senha, por teclado, depois do Q-5

`/perfil`, Tab a partir do campo de senha e Enter: `document.activeElement` é o `<svg>` do ícone
(`aria-label` passa de `Mostrar contraseña` para `Ocultar contraseña`) e o campo vira `type="text"`.
O encadeamento novo do `mergePt` não desfez o mecanismo do D-33.

## DoD 4 + Q-6 — listas do Dashboard

As quatro famílias medidas na spec §5 continuam sem marcador (`list-style-type: none` no `ul` e no
`li`), recuo `0px` nas três e `16px` no funil (o `p-4` intencional do `PipelineFunnel`), e as quatro
carregam `role="list"`.

## Q-7 — o `list-disc` vence o mini-reset

Sonda no motor real, com as classes exatas das duas listas corrigidas, mais uma sonda negativa:

| Classe medida | `list-style-type` | `list-style-position` | `padding-left` |
|---|---|---|---|
| `mb-4 list-inside list-disc rounded px-3 py-2 text-sm` (`FormErrorSummary`) | `disc` | `inside` | 12px |
| `list-disc pl-5` (`ImportResultSummary`) | `disc` | `outside` | 20px |
| `mb-4 rounded px-3 py-2 text-sm` (negativa, sem `list-disc`) | `none` | `outside` | 12px |

**Limitação declarada:** a sonda mede a **cascata** (a utilitária vence o mini-reset de
`@layer base`), no DOM da aplicação real, e não o fluxo de usuário que faz as duas listas
aparecerem — `FormErrorSummary` exige um 422 com chave fora do `mapped`, e `ImportResultSummary`
exige um import de matrícula concluído. Os dois fluxos ficaram fora desta prova.

## DoD 5 — `IdentityCell`, com sonda negativa

Tabela de turmas de `/operacion`, cliente `Enel Distribución`: `scrollWidth` 118 contra
`clientWidth` 102 — corta. Removendo o `min-w-0` do pai pela DevTools e remedindo, os dois empatam
em 118 (a célula deixa de cortar) e a classe volta depois. É o mesmo par medido em 2026-08-26, agora
sobre o código final.

## Achado do regate — o `role="list"` não alcança lista de terceiro

Varrendo **todo** `ul` do Dashboard, dois ficaram sem `role`: as duas legendas do Recharts
(`ul.recharts-default-legend`, dentro de `.recharts-legend-wrapper`). Elas não são JSX deste
repositório, então a régua de lint do Q-6 não as vê — e o mini-reset da P-46, que é global por
desenho, tira a semântica de lista delas no WebKit do mesmo jeito. É a borda que o Q-6 não cobre.
Não é regressão do Q-6 e não reabre o DoD 4 (as quatro famílias medidas estão certas); virou a
**P-63**.

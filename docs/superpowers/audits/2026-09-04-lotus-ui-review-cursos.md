# Revisão de UI — Cursos (`/cursos`)

**Data:** 2026-09-09/10 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/features/catalog/components/` (lista de cursos + diálogo de curso) ·
**Base:** `refactor/frontend-revisao-ui-f3` @ `88bc9d81`
**Evidência bruta:** `.artifacts/ui-review/20260909-184334-cursos/` (14 capturas + `report.txt`,
coberta pelo `.gitignore`)

> Run 1 da fatia 3 do item 16 (`frontend-revisao-ui-por-modulo-f3`), Task 2 do plano
> `2026-09-04-frontend-revisao-ui-por-modulo-f3.md`. Papel **superadmin** — `admin@lotus.cl`.
>
> A §2 é o `report.txt` verbatim. A §3 é o que foi feito com ele na Task 3 e **não** faz parte do
> relatório.

## 1. Escopo e limites da run

- Papel: **superadmin** (`admin@lotus.cl`), sessão real criada pela tela de login (única mutação
  permitida pela skill).
- Chromium **empacotado** (`--browser=chromium`), e não o canal `chrome`: esta máquina não tem
  `/opt/google/chrome/chrome`, e o default do CLI falha com
  `Chromium distribution 'chrome' is not found`. É limitação de ambiente, não da run — nenhuma
  evidência depende do canal.
- Alvo medido: SPA em `http://localhost:5175` e API em `http://localhost:8082`, portas do offset +2
  desta árvore (Task 1 do plano).
- Read-only: nenhuma mutação além do login. `git status --short` vazio antes e depois, mesmo branch
  e mesmo commit (`88bc9d81`) nas duas pontas — a run foi interrompida entre a captura das telas e o
  passe de teclado por uma queda do stack local (Docker + Vite caíram), e retomada depois de
  religar os dois; o commit não mudou no intervalo.
- Viewports percorridos: `1440x900`, `1024x768`, `390x844`.
- Idioma: **es-CL**, setado via `localStorage` (`lotus-lang`) — é a referência de rótulo do cliente
  chileno.
- Tema: claro nas três larguras; amostra adicional em `1440x900` no **escuro** (Step 3 do plano),
  porque é a classe de defeito que só o tema oposto expõe e não depende de largura.
- Tabulação: percorrida na lista (busca → Activos → Archivados → Nuevo curso → cabeçalho sortável →
  ação "Ver" da primeira linha) e no diálogo (foco preso no `tabindex="-1"` raiz ao abrir via
  Enter; `Escape` fecha e devolve o foco à página). Confirmado por leitura de
  `document.activeElement` entre cada `Tab`, não só pelo snapshot de acessibilidade.
- **`/cursos` não usa `ModuleTabs`; não há régua de aba nesta superfície** — `CatalogPage` é um
  `AppCard` com `CoursesTable` dentro, sem `TabView`. A medição de régua de aba (Task 8 do plano) só
  alcança Personas e Administración.
- Fichas conhecidas verificadas contra esta tela: **P-16** e **P-10** são de `/personas` (aba
  Alumnos/coluna Cliente) — não se aplicam aqui. **P-44** é sobre usuário de sonda de e2e, sem
  relação com a superfície de UI. **P-74** (botão de severidade reprova AA no claro) não se aplica:
  `CourseRowActions`/`ArchiveRowActions` não usam variant de severidade — as ações da linha são
  "Archivar"/"Restaurar"/"Ver", sem chip ou botão de status colorido.
- Estados não testados, por exigirem mock, falha fabricada ou escrita: `loading`, erro de carga
  (`AppErrorState`), lista vazia (o seed local tem 3 cursos ativos), criação/edição de curso (a
  jornada do plano é só view), paginação (lista pequena demais para paginar).
- Chrome DevTools MCP: não necessário — toda a evidência é do Playwright CLI.

## 2. `report.txt` — verbatim

```text
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: /cursos (papel superadmin) — lista de cursos, busca, alternador Activos/Archivados, abrir curso em modo view, fechar
Local URL: http://localhost:5175/cursos (nginx: http://localhost:8082)
Branch/commit: refactor/frontend-revisao-ui-f3 @ 88bc9d81
Date/time: 2026-09-09 18:43 — 2026-09-10 16:37 (run interrompida por queda de stack entre os dois trechos; retomada no mesmo commit, sem drift)
Agent: Claude Sonnet 5 (Claude Code)
Playwright CLI: @playwright/cli 0.1.18, sessão nomeada lotus-cursos, browser chromium (canal "chrome" indisponível no ambiente; fallback documentado)
Chrome DevTools: not-needed
Git working tree before/after: limpo / limpo (mesmo commit 88bc9d81 nas duas pontas — nenhuma mutação de código nesta run)

## Coverage
| Journey step | Desktop (1440x900) | Tablet (1024x768) | Mobile (390x844) | Evidence |
|---|---|---|---|---|
| Lista de cursos, claro | OK | OK | OK | screens/01, 05, 07 |
| Busca | OK | — | — | screens/02 |
| Archivados (alternador) | OK | — | — | screens/03 |
| Abrir curso em modo view | OK | OK | OK | screens/04, 06, 08 |
| Lista + view, escuro | OK (amostra 1440x900) | — | — | screens/09, 10 |
| Teclado — busca → Activos → Archivados → Nuevo curso → header sortável → ação Ver | OK | — | — | screens/11-14 |
| Teclado — abrir/fechar diálogo (Enter/Escape), foco preso no diálogo | OK | — | — | verificado via eval(document.activeElement) + snapshot pós-Escape |

## Technical signals
Console: sem erro novo atribuível à tela; 1 entrada de console pré-existente no boot da SPA (login), não relacionada a /cursos.
Network: sem 4xx/5xx observado nas jornadas percorridas.
Performance: não medido (fora do escopo desta run — nenhuma jornada envolveu carregamento pesado ou lista grande).
Untested states: estado de erro de rede (API fora do ar), estado vazio da lista (0 cursos), papéis diferentes de superadmin, criação/edição de curso (fora do escopo — jornada é view-only), paginação (lista tem só 3 cursos no seed local).

## Findings
### UI-01 — cabeçalho "Redactores" trunca para "RED" em 1024x768
Classification: C
Surface/journey: /cursos, lista de cursos (tabela), tema claro e escuro
Viewport: 1024x768 (não reproduz em 1440x900 nem 390x844, que usa layout de cartão)
Reproduction: abrir /cursos com viewport 1024x768; observar o cabeçalho da 4ª coluna da tabela.
Evidence: screens/06-view-1024x768-claro.png e captura de depuração full-page em 1024 (debug-full-1024.png); confirmado em tema claro e escuro.
Observed fact: o texto do cabeçalho "Redactores" some visualmente após "RED" no viewport 1024x768. O `textContent` e o nome acessível do elemento continuam "Redactores" (confirmado via eval) — não é truncamento por texto cortado (sem `text-overflow`), e nem o `<th>` nem o `.p-column-title` interno mostram `overflow` próprio (scrollWidth/clientWidth equivalentes).
Inference: a coluna "Redactores" usa o peso `COL.count` (o mais estreito do vocabulário de `columnWidth.ts`, pensado para número curto) para um cabeçalho de 10 letras; no viewport estreito a caixa da coluna fica menor que o texto, que continua a `overflow: visible` — e a coluna vizinha (ações), pintando seu próprio fundo por cima em ordem normal de stacking, oculta visualmente o que passou da borda.
Impact: usuário em notebook/tablet lê "RED" em vez de "Redactores" — cabeçalho de conteúdo essencial fica ambíguo, sem indicativo visual de truncamento (sem reticências, sem tooltip).
Recommendation: em `frontend/src/features/catalog/components/Course/courseColumns.ts`, trocar o peso de `redatorCount` de `COL.count` para um peso que acomode o rótulo "Redactores" (ex.: `COL.short` ou `COL.tag`), redistribuindo a largura das colunas via `tableWidths()`.
Rule/reference: frontend/src/features/catalog/components/Course/courseColumns.ts (redatorCount: COL.count); frontend/src/shared/ui/AppDataTable/columnWidth.ts (vocabulário COL e tableWidths — mecanismo correto, mau uso pontual na feature)

## Summary
A: 0
B: 0
C: 1 (UI-01)
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

| Achado | Classe | Destino | Commit |
|---|---|---|---|
| UI-01 — cabeçalho "Redactores" trunca para "RED" em 1024x768 | `C` | corrige aqui | `0bdb2e7a` |

`redatorCount` trocou de `COL.count` (peso 7) para `COL.short` em `courseColumns.ts`: o cabeçalho é
uma palavra de uma peça só, não um numeral, e a faixa estreita deixava o texto sumir atrás da coluna
de ações. RED visto (`width` `13.11%` vs `21.66%` esperado), GREEN depois. Zero `C` aberto ao fim
desta run.

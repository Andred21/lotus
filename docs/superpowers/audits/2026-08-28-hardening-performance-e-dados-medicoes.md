# Medições — bloco `hardening-performance-e-dados`

> Arquivo nasce na Task 5; a Task 12 o completa com as demais seções do bloco.

## DoD 7 — Students

Prova no navegador (Chromium, es-CL, `admin@lotus.cl`), stack local
(`docker compose up -d` + `pnpm dev`), rota `/personas` → aba **Alumnos**.
URLs capturadas via `playwright-cli requests` (aba DevTools → Network):

| Ação                                          | GET disparado                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| Montar a aba Alumnos                           | `GET /api/students?page=1&per_page=10`                           |
| Digitar "an" na busca (após a pausa de debounce) | `GET /api/students?page=1&per_page=10&q=an` — **um único** GET |
| Clicar no cabeçalho "Nombre" (1º clique, asc)  | `GET /api/students?page=1&per_page=10&sort=name`                 |
| Clicar de novo (2º clique, desc)               | `GET /api/students?page=1&per_page=10&sort=-name`                |
| Clicar em "Page 2"                             | `GET /api/students?page=2&per_page=10&sort=-name`                |

Confirmado: busca dispara UM GET por pausa (sem request por tecla), sort manda
`sort=name`/`sort=-name` alternando por clique, paginação manda `page=N`
preservando o sort ativo. O dialog "Ver" abriu com o `StudentData` já presente
na página (sem GET extra) para um aluno visível na lista — o fallback
`useOne` (deep link / linha fora da página) não foi exercitado nesta sessão.

**Observação fora de escopo desta task:** ao abrir o dialog de visualização,
o console acusa um warning React (`key` ausente em lista) originado em
`StudentDetailSections`/`AppDataTable` das seções de vínculos/turmas do
detalhe — arquivo não tocado pela Task 5. Registrado aqui para triagem futura,
não corrigido neste bloco.

## DoD 7 — Historial

Prova no navegador (Chromium, es-CL, `admin@lotus.cl`), stack local
(`docker compose up -d` + `pnpm dev`), rota `/certificados` → aba
**Historial**. URLs capturadas via `playwright-cli requests` (aba DevTools →
Network):

| Ação                                             | GET disparado                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Montar a aba Historial                             | `GET /api/certificates?page=1&per_page=10`                                        |
| Selecionar "Por vencer" no dropdown "Estado"       | `GET /api/certificates?page=1&per_page=10&display_status=por_vencer`              |
| Digitar "16.200" na busca (com filtro ainda ativo, após a pausa de debounce) | `GET /api/certificates?page=1&per_page=10&q=16.200&display_status=por_vencer` — **um único** GET |
| Voltar filtro para "Todos" e clicar no cabeçalho "Código" | `GET /api/certificates?page=1&per_page=10&sort=codigo`                    |

Confirmado: o dropdown de estado dispara `display_status=<valor>&page=1`
(volta à primeira página), a busca compõe com o filtro ativo no mesmo `q=`
sem request por tecla, e o cabeçalho ordenável manda `sort=<campo>`. O rodapé
de resumo por status leu do `meta.summary` do envelope paginado — antes do
qualquer filtro de estado, mostrou `13 vigentes · 0 por vencer · 0 vencidos ·
2 revocados` (contagem sobre o escopo de `q`, sem o filtro de status, como a
spec D6 exige) — e não sobre a lista inteira renderizada. Console sem erros
nem warnings durante toda a sessão (`playwright-cli console`: 0/0).

## DoD 7 — Turmas (Task 9)

Prova no navegador (Chromium, es-CL, `admin@lotus.cl` — o seed de demonstração
não tem senha conhecida para um redator individual; ver "Preocupações" no
report da Task 9 sobre a checagem de escopo por redator ter ficado pendente),
stack local (`docker compose up -d` + `pnpm dev`), rota `/operacion`. URLs
capturadas via `playwright-cli requests`:

| Ação                                                    | GET disparado                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Montar o hub (modo ativo)                                | `GET /api/turmas?page=1&per_page=10`                                |
| Selecionar "Habilitada" no dropdown "Estado"             | `GET /api/turmas?page=1&per_page=10&status=habilitada`              |
| Alternar para "Archivados" com o filtro ainda ativo      | `GET /api/turmas/archived?page=1&per_page=10&status=habilitada`     |
| Limpar o filtro de estado (ainda em Archivados)          | `GET /api/turmas/archived?page=1&per_page=10`                       |
| Voltar para "Activos" e digitar "Transelec" na busca     | `GET /api/turmas?page=1&per_page=10&q=Transelec` — **um único** GET |
| Limpar a busca e clicar no cabeçalho "Código"            | `GET /api/turmas?page=1&per_page=10&sort=created_at`                |

Confirmado: o dropdown de estado manda `status=<valor>` e volta à página 1; a
troca de modo troca o endpoint (`/api/turmas` ↔ `/api/turmas/archived`)
preservando o filtro de estado corrente na URL; a busca compõe `q=` sem
request por tecla (debounce); o cabeçalho "Código" ordena por `created_at` (é
o único `sortable` da tabela, por decisão do brief — as demais colunas não
estão na allowlist do backend). O rodapé mostrou "1 turma" com o filtro de
busca ativo e "7 classes"/"7 turmas" sem filtro algum. O seed de demonstração
não tem nenhuma turma arquivada, então o modo Archivados renderizou o empty
state ("No hay registros archivados") em vez de linhas com `archived_at`/
`archived_by` — o achatamento do DTO composto (`{ turma, archived_at,
archived_by }` → `TurmaRow`) está coberto pelo teste `useTurmasPage.test.tsx`
("modo arquivado: ... ACHATA o DTO composto"), não pela sessão de navegador.
Console sem erros nem warnings durante toda a sessão
(`playwright-cli console`: 0/0).

## DoD 7 — Painel de emissão com janela por data (Task 10)

API real (dev, `http://localhost:8080`, sessão de `admin@lotus.cl`, seed de
demonstração — turmas concluídas em `2026-08-20` e `2026-06-26`):

| Requisição                                                | Resposta                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /api/certificates/emission-panel`                     | 200, 2 turmas (default de 12 meses — hoje 2026-08-29, janela desde 2025-08-29)                     |
| `GET …?concluidas_desde=2021-01-01`                        | 200, 2 turmas (janela aberta, mesma forma de payload)                                              |
| `GET …?concluidas_desde=2026-08-25`                        | 200, 0 turmas (borda: a de `2026-08-20` sai)                                                       |
| `GET …?concluidas_desde=01-01-2021`                        | 422 `application/problem+json` — "El campo concluidas desde debe coincidir con el formato Y-m-d." |

A forma do payload não mudou (o painel continua sem paginar: lote e dropdown
precisam da turma inteira em memória). O 422 sobe pelo handler global, não por
`abort()`. O seletor da tela e seu default de 12 meses (`emissionWindow.ts`,
espelho de `EmissionPanelQuery::JANELA_MESES`) estão cobertos pela catraca de
UI em `EmissionPanel.test.tsx`, vista reprovando sem o `AppDatePicker`.

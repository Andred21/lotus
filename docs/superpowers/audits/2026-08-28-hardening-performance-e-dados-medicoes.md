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

## Catraca de contagem — `ListQueryBudgetTest` (Task 11)

26 casos verdes, 171 asserções. Números medidos e gravados:

| Cenário                                | Resultado                                                            |
| -------------------------------------- | -------------------------------------------------------------------- |
| 17 rotas `GET api/*` de lista sem pai  | contagem idêntica com N=2 e N=20                                     |
| 5 listas aninhadas (`{budget}`/`{turma}`) | contagem idêntica com N=2 e N=20                                  |
| `dashboard/metricas` — admin           | **40 queries**, fixas (as sete seções do painel inteiro)             |
| `dashboard/metricas` — relator         | **7 queries**, fixas (só as turmas dele)                             |

**Sonda (DoD 5):** removido `'enrollment.student.user'` de
`CertificateQueryBuilder::LISTING`, `api/certificates` passa a responder **500**
— a guarda global (`Model::preventLazyLoading()`, ligada nesta task) derruba o
request antes de a contagem crescer — e o caso `api/certificates` da catraca
reprova. Restaurado o eager-load, os 17 casos voltam verdes. A catraca continua
necessária mesmo com a guarda: ela não marca instância vinda de `hydrate()` com
uma linha só e não vê query feita NA relação.

**Dois achados da medição**, ambos corrigidos no teste (nunca no código medido):
o cache de permissões do spatie é esvaziado pela própria semeadura, então o
aquecimento passou a ser simétrico nos dois lados da comparação (sem isso,
`api/roles` parecia crescer com N por 2 queries de recarga); e a sessão do
primeiro autenticado sobrevive dentro do mesmo teste, então o orçamento do
relator ficou em teste próprio — sem isso ele media o dashboard do admin
(40 queries) achando que media o do relator (7).

## Índices — EXPLAIN antes/depois (Task 12)

Cenário: `PerformanceScenarioSeeder` sobre MySQL 8 de dev — **5.045 alunos, 200
clientes, 50 relatores, 504 turmas em cinco anos, 8.045 matrículas, 6.000
certificados, 20.000 logins**. `ANALYZE TABLE` antes de cada rodada: sem ele o
otimizador ainda enxerga `rows: 1` nas tabelas recém-carregadas em lote e todo
EXPLAIN mente.

| Candidato | Consulta real | Antes (`key` / `rows`) | Depois | Veredito |
| --- | --- | --- | --- | --- |
| `turmas(status, end_date)` | painel de emissão (Task 10) | `NULL` / 504, filesort | `turmas_status_end_date_index` / **32**, backward index scan | **aprovado** |
| `turmas(start_date)` | agenda do Dashboard | `NULL` / 504 | `turmas_start_date_index` / **1** | **aprovado** |
| `certificates(status, valido_ate)` | alertas de vencimento do Dashboard | `NULL` / 5.890 | `certificates_status_valido_ate_index` / 5.700, **Using index** (covering) — e **103** na forma com janela (`BETWEEN hoje E horizonte`) | **aprovado** |
| `certificates(created_at)` | Historial, ordem default `LIMIT 25` | `NULL` / 5.890, filesort | `certificates_created_at_index` / **25**, backward index scan | **aprovado** |
| `files(valid_until)` | documentos de relator vencendo | `files_fileable_type_fileable_id_index` / 7 | `files_valid_until_index` / **1** — **só na forma SEM `date()`** | **aprovado**, com a troca de `whereDate` por `where` nos dois callers |
| `login_logs(created_at)` | poda da P-66 (`PodarLogins`) | `NULL` / 20.042 | `login_logs_created_at_index` / **10.021** no `DELETE … LIMIT 1000` que o comando realmente executa | **aprovado** |
| `users(name)` | ordem da lista de alunos | `NULL` / 5.045, temporary + filesort | idêntico — o otimizador não usa | **recusado** |
| `enrollments(student_id)` | `withCount('enrollments')` | `enrollments_student_id_foreign` já usado | — | **não era candidato**: a FK já cria o índice |

Dois detalhes que só o EXPLAIN mostrou:

- **`DELETE` inteiro vs. `DELETE … LIMIT`.** `DELETE FROM login_logs WHERE
  created_at < ?` sem limite continua full scan mesmo com o índice — recorta 80%
  da tabela, e varrer é mais barato. O comando real (`PodarLogins`) deleta em
  chunks de `RetentionPolicy::CHUNK`, e ESSE plano usa o índice. Medir a
  consulta que existe, não a que se imagina.
- **`whereDate` cega o índice**, e o dano não é uniforme: em `valido_ate` a
  coluna é `date` e o MySQL 8 ainda faz range; em `files.valid_until` não fez.
  Os dois callers (`IdentityMetricsQuery`, `RedatorScopeQuery`) passaram a
  `where('valid_until', '<=', DashboardWindows::expiryHorizon())` — o horizonte
  é `endOfDay()`, então o conjunto selecionado é o mesmo.

**Busca no `snapshot` (risco §8):** `EXPLAIN ANALYZE` do `LIKE '%…%'` sobre
`codigo` + `json_extract(snapshot, '$.aluno.name')` com 6.000 certificados —
table scan, **0,69 ms** para as 25 primeiras linhas (625 lidas). Muito abaixo
dos 100 ms que abririam o plano B (coluna gerada indexada). Fica registrado, não
vira pendência.

### Latência — antes e depois (mediana de 5, sessão de admin do seed)

| Endpoint | Antes | Depois |
| --- | --- | --- |
| `GET /api/students?per_page=25` | 62 ms | 66 ms |
| `GET /api/certificates?per_page=25` | 53 ms | 52 ms |
| `GET /api/dashboard/metricas` | 578 ms | 574 ms |
| `GET /api/turmas?per_page=25` | 51 ms | 52 ms |
| `GET /api/certificates/emission-panel` | 129 ms | 126 ms |

A latência quase não se move, e isso é o resultado honesto: neste volume o
custo dominante não é o plano de acesso (o MySQL varre 6.000 linhas em
milissegundos), é a montagem do payload em PHP. Os índices valem pela ordem de
grandeza que impedem — 5.890 linhas varridas viram 25 no Historial —, não por
milissegundos hoje. O Dashboard em ~575 ms é o número a vigiar: são as 40
queries fixas da catraca da Task 11, e nenhuma delas cresce com N.

## Gate final do bloco (Task 13)

Contra a stack local com o cenário grande no lugar (`migrate:fresh --seed` +
`db:seed --class=PerformanceScenarioSeeder`, 5.045 alunos / 504 turmas / 8.045
matrículas / 6.000 certificados) e a migration de índices migrada. Sessão de
`admin@lotus.cl` por cookie Sanctum; **os GETs precisam do header `Origin`** —
sem ele o `EnsureFrontendRequestsAreStateful` não reconhece o request como
stateful e a rota devolve 401 mesmo com o cookie de sessão no jar.

### 1. `GET /api/students` — envelope, teto e allowlist

| Request | Resultado |
| --- | --- |
| `?per_page=10&q=Camila&sort=-name` | 200, 10 linhas; `meta` = `{page:1, per_page:10, total:253, last_page:26, total_unfiltered:5045}` |
| `?per_page=101` | 422 `application/problem+json` — "El campo per page no debe ser mayor que 100." |
| `?sort=email` | 422 `application/problem+json` — "El campo sort no está en la lista de valores permitidos." |

`total` (253) < `total_unfiltered` (5045): a busca mede EFEITO, e o teto e a
allowlist recusam em vez de clampar.

### 2. `GET /api/certificates?display_status=por_vencer&per_page=100`

`{r['display_status'] for r in data}` = `{'por_vencer'}` — o `CASE` em SQL não
deixa passar outra classe. `meta.summary` = `{vigente:1391, por_vencer:91,
vencido:4218, revocado:300}`, que soma **6000** = `meta.total_unfiltered`; o
`meta.total` do recorte é 91, igual ao `por_vencer` do summary.

### 3. `GET /api/turmas` — escopo do redator

| Sessão | Request | Resultado |
| --- | --- | --- |
| admin | `?status=habilitada&per_page=100` | `{habilitada}` = `{True}`, `meta.total` 1, `total_unfiltered` **504** |
| redator | `?per_page=100` | 10 turmas, `total_unfiltered` **10** — o `visibleTo` corta antes da contagem |
| redator | `?status=habilitada&per_page=100` | 0 linhas, `total_unfiltered` segue 10 |

**Achado corrigido aqui:** o `PerformanceScenarioSeeder` criava os 50 redatores
com `type=redator` e `is_active=true` mas **sem a role `redator`**, e o
`permission:` da rota devolvia 403 — o cenário media a porta, não o escopo. O
seeder passou a inserir `model_has_roles` em lote (uma query para os 50, em vez
de duas por `syncRoles()`). Provado em seed limpo: o mesmo login que dava 403 dá
200 com as 10 turmas dele.

### 4. `GET /api/certificates/emission-panel` — janela por data

Hoje = 2026-08-29. Sem parâmetro: **32 turmas**, `end_date` de `2025-08-29` a
`2026-06-26` — o limite inferior é exatamente hoje − 12 meses. Com
`?concluidas_desde=2021-01-01`: **501 turmas**, safras `2021…2026`. No
navegador, o campo "Classes concluded since" já monta com `8/29/2025`, o mesmo
default calculado no front (`EMISSION_PANEL_WINDOW_MONTHS`).

### 5. Catraca de contagem

`ListQueryBudgetTest` verde dentro da suíte; a sonda que a justifica está na
seção da Task 11 (remover o eager-load de `api/certificates` derruba a rota em
500 sob o `preventLazyLoading()` global).

### 6. `EXPLAIN` e latências

Seção "Índices — EXPLAIN antes/depois" acima, com aprovado/recusado por
candidato e a tabela de latência.

### 7. Navegador com o cenário grande (Chromium via `playwright-cli`, locale EN)

| Tela | Evidência |
| --- | --- |
| `/personas` → aba Students | rodapé "**5045 students**" = `meta.total`; paginador com páginas 1..5 e "Next Page" |
| `/personas` página 3 → "View" | dialog abre com o aluno da página 3 (`alumno2826@perf.demo.cl`) — a moldura não perde a linha fora da primeira página |
| `/certificados` → aba History | rodapé "**1391 valid · 91 expiring · 4218 expired · 300 revoked**", idêntico ao `meta.summary` do endpoint |
| `/operacion` | rodapé "**504 classes**" = `meta.total` |
| `/certificados` → aba Issuance | campo de data com `8/29/2025` e o dropdown de turma concluída, sem paginador (o painel não pagina) |

Console: **um** erro, o warning React de `key` em `TableBody` já registrado na
seção "DoD 7 — Students" (vem de `StudentDetailSections`/`AppDataTable`, fora do
escopo deste bloco). Nenhum erro novo.

### 8. Os 30 dias têm um dono só

```
grep -rn "= 30;" backend/app/Domains/Identity/Enums/DocumentValidityStatus.php \
  backend/app/Domains/Dashboard/Services/DashboardWindows.php \
  backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php
```

Sem saída (`exit 1`): o número vive só em `JanelaDeAviso` (D-15).

### 9. Gate mecânico

| Comando | Saída |
| --- | --- |
| `docker compose exec -T app php artisan test` | **1108 passed / 5 skipped** (3.974 asserções, 89,25 s) |
| `php artisan typescript:transform` + `git status --short frontend/src/shared/types/generated.ts` | vazio — nenhum diff residual |
| `pnpm lint` | 0 problemas |
| `pnpm build` | verde (`tsc -b` + `vite build`) |
| `pnpm test` | **114 arquivos / 645 testes**, todos verdes |
| `./vendor/bin/pint --test <arquivos do diff contra main>` | `{"tool":"pint","result":"passed"}` |

Duas correções que o próprio gate cobrou, e não a inspeção: o `pnpm test` da
primeira volta reprovou em `repo-docs-refs.test.ts` porque a ficha de `users` no
`der-fisico.md` citava a `audits/…` com reticências — referência que a catraca
de docs resolve como caminho e não achou; virou o caminho inteiro. E a role
faltante do seeder (item 3). O flake conhecido de timer pós-teardown em
`useServerTable.test.tsx` **não reproduziu** nesta volta.

## Gate de fechamento — reprova pós-correções do review (2026-08-29)

O "Gate final" acima foi medido em `c0bcf87a`, **antes** das cinco correções do
review (`3e24c6ff`). A Q-1 e a Q-2 mudaram exatamente o que os itens 4 e 7
daquela seção descreviam: o painel de emissão deixou de ligar no mount do
Historial e o seletor de data deixou de nascer preenchido. Por isso o DoD §7 foi
**reprovado inteiro** contra `3e24c6ff`, com o mesmo cenário grande no lugar
(5.045 alunos / 504 turmas / 8.045 matrículas / 6.000 certificados), sessão de
`admin@lotus.cl` por cookie Sanctum e `Origin` + `Accept` nos GETs.

### API real (`:8080`)

| DoD | Request | Resultado |
| --- | --- | --- |
| 1 | `/api/students?per_page=10&q=Camila&sort=-name` | 200, 10 linhas, `meta` = `{page:1, per_page:10, total:253, last_page:26, total_unfiltered:5045}` |
| 1 | `/api/students?per_page=101` | 422 `application/problem+json` |
| 1 | `/api/students?sort=email` | 422 `application/problem+json` |
| 2 | `/api/certificates?display_status=por_vencer&per_page=100` | `{'por_vencer'}`; `summary` `{vigente:1391, por_vencer:91, vencido:4218, revocado:300}` soma **6000** = `total_unfiltered`; `total` 91 |
| 3 | `/api/turmas?status=habilitada&per_page=100` (admin) | 1 linha, `habilitada: true` com `status: em_andamento`; `total_unfiltered` **504** |
| 3 | `/api/turmas?per_page=100` (redator `relator258@perf.demo.cl`) | 10 linhas, `total_unfiltered` **10** — o `visibleTo` corta antes da contagem |
| 3 | `/api/turmas?status=habilitada&per_page=100` (redator) | 0 linhas, `total_unfiltered` segue 10 |
| 4 | `/api/certificates/emission-panel` (sem parâmetro) | 32 turmas, `end_date` de `2025-08-29` a `2026-06-26` — o piso é hoje − 12 meses, calculado **no backend** |
| 4 | `/api/certificates/emission-panel?concluidas_desde=2021-01-01` | 501 turmas, safras `2021…2026` |

**Q-1, o caminho que o review abriu.** `LOT-2021-00600` é revogado, e a turma
dele (54) concluiu em `2021-01-10` — fora da janela default por mais de cinco
anos. Com `?concluidas_desde=2021-01-10`, que é o `end_date` congelado no
snapshot daquele certificado, a turma 54 volta ao painel **com a matrícula 844**
(`approval_status: aprobado`, `certificate: null`); sem parâmetro ela não
aparece. O painel devolve `emission_blocked: sin_plantilla` para essa turma — o
curso do cenário semeado não tem plantilla —, que é bloqueio **real e nomeado**,
não a tarja genérica `reissueUnavailable` que a Q-1 descreveu.

### Navegador (Chromium via `playwright-cli`, locale EN)

| DoD | Tela | Evidência |
| --- | --- | --- |
| 7 / Q-2 | `/certificados` → Issuance | campo "Classes concluded since" com `value` **vazio** e `placeholder` "Last 12 months"; o GET sai como `emission-panel` **sem** `concluidas_desde` — o default de `America/Santiago` roda no backend |
| 7 / Q-1 | `/certificados` → History (mount) | único GET é `/api/certificates?page=1&per_page=10`; **nenhum** `emission-panel` no mount |
| 7 / Q-1 | History → "Reissue" em `LOT-2021-00600` | dispara `emission-panel?concluidas_desde=2021-01-10` e o diálogo mostra "The course has no certificate template" (`sin_plantilla`), não `reissueUnavailable` |
| 7 | History | rodapé "1391 valid · 91 expiring · 4218 expired · 300 revoked" = `meta.summary` |
| 7 / Q-4 | `/operacion` | nenhum `columnheader` da tabela de turmas é clicável — a "Code" perdeu o `sortable`; rodapé "504 classes" = `meta.total` |
| 7 / Q-3 | `/operacion`, página 3 → "Archived" | `GET /api/turmas/archived?page=1&per_page=10` — a troca de modo volta à página 1, sem o `page=3` desperdiçado |
| 7 | `/personas` → Students | rodapé "5045 students"; página 3 dispara `?page=3&per_page=10` |
| 7 | Students, página 3 → "View" | diálogo abre por `GET /api/students/984` (fallback `useOne`), aluno `alumno1246@perf.demo.cl` |

Console: **um** erro, o mesmo warning React de `key` em `TableBody` já registrado
acima como fora do escopo. Nenhum erro novo.

### Gate mecânico da reprova

| Comando | Saída |
| --- | --- |
| `docker compose exec -T app php artisan test` | **1108 passed / 5 skipped** (3.974 asserções, 95,74 s) |
| `php artisan typescript:transform` + `git status --short` | árvore limpa — nenhum diff residual |
| `pnpm lint` | 0 problemas |
| `pnpm build` | verde (`tsc -b` + `vite build`) |
| `pnpm test` | **114 arquivos / 647 testes** verdes |
| `./vendor/bin/pint --test` (58 arquivos PHP do diff) | `{"tool":"pint","result":"passed"}` |
| `grep "= 30;"` nos três sítios antigos | sem saída — `JanelaDeAviso::DIAS` é o dono único |

**O que este gate chamou de flake não era flake — e o fechamento mediu o
mecanismo.** A primeira volta do `pnpm test` reprovou com um erro não tratado
originado em `useTurmasPage.test.tsx`, e a segunda passou limpa; o arquivo
isolado passou 5 de 5, o que fez a rodada anterior classificar como oscilação de
timer. **Estava errado.** No rebase sobre `main@b4101da9` a reprovação voltou, 1
volta em 4, e desta vez com a mensagem inteira:

```
ReferenceError: window is not defined
 ❯ Timeout._onTimeout src/shared/hooks/useServerTable.ts:91:33
```

A causa é determinística. `frontend/vite.config.ts` não declara `setupFiles` nem
`globals: true`, então o `cleanup()` automático do Testing Library **nunca roda**:
o que um teste monta fica montado até o vitest destruir o jsdom do arquivo. Para
quase todo componente isso é inócuo. Para o `useServerTable` não é — ele agenda
um `setTimeout` de debounce no mount, e esse timer dispara **depois** do
teardown, sobre um `window` que já não existe. Não reprova asserção nenhuma:
reprova a rodada, o que é pior, porque some do relatório de testes.

O repositório já tem a grafia do remédio — `afterEach(cleanup)` por arquivo, como
em `AppCard.test.tsx`, `PageHeader.test.tsx` e `SectionLabel.test.tsx`. A
medição mostrou que **exatamente os dois arquivos que reprovaram** eram os dois
que montam o `useServerTable` sem esse `afterEach`: `useServerTable.test.tsx` e
`useTurmasPage.test.tsx`. Os cinco componentes que consomem o hook por baixo
(`TurmasTable`, `HistorialTable`, `PeoplePage`) já tinham `cleanup` e nunca
vazaram. Com o `afterEach(cleanup)` nos dois: **6 voltas de 6 verdes, `Errors 0`
em todas** — contra 1 reprovação em 4 antes.

Fica declarado o que NÃO foi feito: o `setupFiles` global, que seria o mecanismo
de verdade (lição 14) e alcançaria todo arquivo futuro, não entra neste bloco —
mudar a configuração do runner do repositório inteiro no gate de fechamento é
escopo próprio, e o custo dele é o de descobrir quantos outros arquivos dependem
hoje de não desmontar. Virou a **P-69**.

# Auditoria de sincronização — hardening-doc-sync-sprint4

**Data:** 2026-07-30 · **Spec:** `docs/superpowers/specs/2026-07-30-hardening-doc-sync-sprint4-design.md`
**Packet:** `docs/superpowers/context-packets/hardening-doc-sync-sprint4.md`

## 1. Capacidade de escrita externa

| Alvo | Runtime | Tools encontradas | Escreve? | Evidência |
|---|---|---|---|---|
| Google Drive | Claude (`mcp__claude_ai_Google_Drive__*`) | `read_file_content`, `search_files`, `create_file`, `copy_file`, `download_file_content`, `get_file_metadata`, `get_file_permissions`, `list_recent_files` | não | `ToolSearch("+google_drive update edit write")` não devolveu nenhuma tool de update/edit — o namespace só cria (`create_file`) e lê, nunca atualiza arquivo existente |
| Google Drive | Codex (`mcp__codex_apps__google_drive_*`) | não sondado | fallback (decisão do João, 2026-07-30) | Duas tentativas de invocar `mcp__codex__codex` em modo `read-only` para a sondagem foram interrompidas pelo João por demora — ele decidiu pular a sondagem e ir direto para o fallback D5 (patch manual), aplicando o write no Drive por conta própria depois. Via não confirmada nem descartada; só não foi exercitada nesta execução |
| Notion | Claude (`mcp__claude_ai_Notion__*`) | `notion-update-page` | sim | `ToolSearch("select:mcp__claude_ai_Notion__notion-update-page")` carregou o schema completo da tool sem chamá-la — disponibilidade confirmada sem escrita |

**Veredito:** `drive_write: fallback` · `notion_write: claude`

Nota: como o `notion_write` já saiu confirmado pelo Step 2 (schema carrega = tool existe e é chamável), a sondagem pulada do Codex (Step 3) só deixa em aberto a via do Drive — que cai no fallback declarado na spec D5 independente do resultado que o Codex daria, por decisão do João.

## 2. Eixo código ↔ /docs (subagente auditor-docs)

| ID | Doc | Divergência | Evidência (arquivo:linha) | Sugestão |
|---|---|---|---|---|
| E1-01 | `docs/pendencias.md` P-04 | Gatilho **vencido**: "reavaliar quando a Sprint 3 fechar" (Pest Arch tests + eslint-boundaries para as leis §5/6) — Sprint 3 fechou e a reavaliação não ocorreu | `docs/superpowers/progress.md:14` (Sprint 3 "Entregue" em 2026-07-23); `docs/superpowers/state.md:115-116` (o próprio estado admite o vencimento); `frontend/package.json` sem `eslint-plugin-boundaries`; `backend/tests/` sem teste Arch (greps vazios) | Reavaliar a P-04 explicitamente (decidir instalar os guardrails ou renovar o adiamento com novo gatilho) |
| E1-02 | `docs/pendencias.md` P-06 | Gatilho **vencido**: "Doc-sync da Sprint 3" — `der-fisico.md` ainda lista `turmas`/`enrollments` em "Tabelas PLANEJADAS" (PT/ES, `redator_id` FK 1:N) quando ambas estão implementadas em inglês com pivot N:N | `docs/der-fisico.md:68-69` (seção "PLANEJADAS") vs. `backend/database/migrations/2026_07_21_000001_create_turmas_table.php:14-43` (`turma_redator` N:N, colunas em inglês) e `2026_07_21_100000_create_enrollments_table.php:11-24`; `docs/superpowers/state.md:117-118` confirma o vencimento | Mover `turmas`/`enrollments`/`turma_redator` para "IMPLEMENTADAS" no der-fisico.md com os nomes/colunas reais |
| E1-03 | `docs/estrutura-monolito.md` | `Operation/` documentado como `[scaffold vazio]` (backend) e `.gitkeep` (frontend); na verdade tem código real e extenso dos dois lados | `docs/estrutura-monolito.md:31,113,147` vs. `backend/app/Domains/Operation/` (Actions, Services, Controllers, Models — ex. `CreateTurmaAction.php`, `EnrollStudentAction.php`) e `frontend/src/features/operation/components/` (ex. `TurmaDetailPage.tsx`, `EnrollmentTable.tsx`) | Atualizar a seção "Divergências" e a árvore para refletir `operation` como código real (só `certification`/`feedback` seguem scaffold) |
| E1-04 | `.claude/rules/backend-ddd.md` | "Estado atual: Identity, Commercial e Catalog têm código real; os demais são placeholder" — desatualizado, `Operation` já é código real | `.claude/rules/backend-ddd.md:21-22` vs. `backend/app/Domains/Operation/` com ~30 arquivos reais (Actions/Services/Data/Enums/Controllers) | Atualizar a linha de estado para incluir `Operation` |
| E1-05 | `docs/estrutura-monolito.md` | `Providers/RouteServiceProvider.php` documentado como existente ("carrega os routes.php de cada domínio"); o próprio código afirma que ele **não existe** e usa `glob()` em `routes/api.php` | `docs/estrutura-monolito.md:46` vs. `backend/routes/api.php:10-13` (comentário: "RouteServiceProvider planejado (estrutura-monolito.md) ainda não existe; agregamos por glob aqui") | Remover `RouteServiceProvider.php` da árvore ou documentar o `glob()` como o mecanismo real |
| E1-06 | `docs/estrutura-monolito.md` | `Providers/AuthServiceProvider.php` documentado ("registra Policies dos domínios"); arquivo não existe e não há nenhuma classe `Policy` no repo | `docs/estrutura-monolito.md:45` vs. `backend/app/Providers/` (só `AppServiceProvider.php` e `TypeScriptTransformerServiceProvider.php`); busca por `Policies/*.php` em todo `backend/app/Domains` = vazio | Remover a linha ou marcar como `[A CONFIRMAR]` até existir Policy |
| E1-07 | `.claude/rules/backend-ddd.md` | "Policy fica para data-scoping (Turma: 'redator só vê as suas')" descreve um mecanismo que não existe — `TurmaController@index` não filtra por redator, só por `permission:` middleware | `.claude/rules/backend-ddd.md:98-99` vs. `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:26-34` (só middlewares `permission:operation.turma.*`) e `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php` (sem filtro por redator) | Marcar como débito/backlog explícito ou implementar o scoping antes de descrevê-lo como regra vigente |

**Total:** 7 divergências, das quais 2 são gatilhos vencidos (E1-01/P-04, E1-02/P-06).

## 3. Eixo `/docs` ↔ Drive

Verificação do path canônico (Step 2): `docs/README.md:3` afirma `V2/Planejamento/` — confirmado
via `search_files` (`Lotus.cl` → `V2` → `Planejamento`, com as três subpastas `1-inicial`,
`2-intermediario`, `3-avancado`, mais `Templates`). A lista de "Fontes que NÃO foram espelhadas"
(`docs/README.md:135-143`: camadas 1-inicial/2-intermediario, fluxos UI/UX, protótipos Figma,
diagramas de arquitetura) bate com a estrutura real — `1-inicial` e `2-intermediario` existem como
pastas próprias fora de `3-avancado`, que é de onde vêm os 4 documentos lidos nesta task. Sem achado
nesse ponto.

| ID | Drive afirma | Repo afirma | Evidência | Quem está errado (D10) |
|---|---|---|---|---|
| E2-01 | `redatores ‖--o{ turmas : "ministra"` (1:N), `turmas.redator_id FK` — em `modelo-fisico-e-diagramas.md` e `modelo-conceitual.md` | Pivot `turma_redator` N:N, sem `turmas.redator_id` | DRIVE-SCHEMA/DRIVE-DOMAIN (Drive) vs. `backend/database/migrations/2026_07_21_000001_create_turmas_table.php` + `..._create_turma_redator_table.php` | Drive — decisão posterior explícita do João (spec `2026-07-21-bloco6b-turma-designacao-design.md` D5). Já rastreado em `pendencias.md` P-06 (= E1-02, gatilho vencido) e P-01 (write externo pendente) |
| E2-02 | `POST/PUT /api/alunos` (`tela-pessoas.md` §B) | `GET/POST/PUT /api/students` | DRIVE-PEOPLE vs. `backend/app/Domains/Identity/routes.php` | Drive — decisão posterior explícita do João (spec `2026-07-27-bloco-alunos-modulo-design.md` D7). Já rastreado em `pendencias.md` P-14, mesmo gatilho de P-01 |
| E2-03 | ADR-15 versão em `decisao-stack.md`: "sistema de localização do Laravel como fonte; compartilhar dicionários... compilar traduções PHP → JSON via Vite"; biblioteca `[A CONFIRMAR FASE 2]` | ADR-15 revisado em 2026-07-17 (`docs/adrs.md:108-112`): "Nada disso foi construído... não existe plugin de compilação no `vite.config.ts`, e os dois dicionários vivem separados" | DRIVE-STACK vs. `docs/adrs.md:93-116` | Drive — decisão posterior registrada e datada no próprio ADR. **Sem pendência hoje** — achado novo |
| E2-04 | ADR-16 (Tailwind/PrimeReact runtime) ausente | Presente, com nota de sync própria: "nasceu no desenvolvimento (repo) e ainda não foi espelhado para o canônico do Drive" (`docs/adrs.md:147-148`) | DRIVE-STACK (sem ADR-16) vs. `docs/adrs.md:120-148` | Drive — repo já se autodeclara não-espelhado. **Sem pendência hoje** — achado novo |
| E2-05 | ADR-18 (clientes REST `createCrudResource`) ausente | Presente, sem nota de sync | DRIVE-STACK (sem ADR-18) vs. `docs/adrs.md:171-189` | Drive. **Sem pendência hoje** — achado novo |
| E2-06 | ADR-19 (dinheiro em decimal + bcmath) ausente | Presente, sem nota de sync | DRIVE-STACK (sem ADR-19) vs. `docs/adrs.md:190-...` | Drive. **Sem pendência hoje** — achado novo |

**Total:** 6 divergências (E2-01 a E2-06). Duas (E2-01, E2-02) já têm pendência aberta (P-06/P-01,
P-14) — a Task 7 decide se a triagem consolida ou mantém separado. Quatro (E2-03 a E2-06) são
achados novos, todos do tipo "o canônico está desatualizado" (destino candidato: `write-externo`,
mesmo bloqueio de via do Drive registrado na seção 1).

## 4. Eixo `/docs` ↔ Notion

**Task H.1.3.1 (esta task):** `notion-fetch` confirma o que o packet já registrou —
`Critério de aceite`, `Depende de` e `ADR ref` vazios, `Status: Backlog`, `Descrição: "Alinhar
código ↔ /docs ↔ Drive canônico ↔ Notion."`. Sem achado novo aqui, só confirmação.

**Board Sprint 3 · Acadêmico vs. `progress.md` (2026-07-20 a 2026-07-27):** consulta SQL nas 26
tasks do board (`Tasks · Lotus Fase 2`, filtro `Sprint = 'Sprint 3 · Acadêmico'`) mostra **nenhuma**
com status `Feito`/`Concluído` — todas em `A fazer` ou `Backlog` — enquanto `progress.md` registra
9 entregas nesse intervalo, a maior parte mapeando 1:1 para EAPs deste board.

| ID | EAPs | Status no Notion | Estado real (`progress.md`) | Evidência | Destino sugerido |
|---|---|---|---|---|---|
| E3-01 | 7.1.1–7.1.5 (migration/model/actions de Turma) | `A fazer` (todas) | Entregue — Bloco 6b "Turma + redator" (2026-07-21) e Bloco 6d "Conclusão + manual" (2026-07-21, cobre 7.1.5) | `progress.md:12-13`; páginas `93bbc960…`, `66ebc960…`, `6b1bc960…`, `8bbbc960…`, `c03bc960…` | `write-externo` (Notion, D11) |
| E3-02 | 7.1.6 (anexos polimórficos de documentação) | `A fazer` | Entregue — endpoints de documentos já existentes antes da Exec 3 frontend (pré-flight do plano `2026-07-23-bloco6-frontend-exec3.md` cita as rotas prontas); sem commit isolado identificado para esta linha | `progress.md:14`; página `82dbc960…` | `write-externo` (Notion, D11) — confirmar o commit exato antes de aplicar, evidência mais fraca que as demais |
| E3-03 | 7.2.1, 7.2.3 (migrations students/logs; regra 1 cliente por vez) | `A fazer` | Entregue — Bloco 6a "Aluno + vínculo" (2026-07-20) | `progress.md:10`; páginas `fd3bc960…`, `be9bc960…` | `write-externo` (Notion, D11) |
| E3-04 | 7.2.2 (import xlsx/csv → alunos) | `A fazer` | Entregue — Bloco 6c "Matrícula + importação" (2026-07-21) | `progress.md:11`; página `09bbc960…` | `write-externo` (Notion, D11) |
| E3-05 | 7.2.4–7.2.7 (DTO, actions CRUD, querybuilder, controller de alunos) | `Backlog` (todas) | Entregue — Bloco Pessoas · Alunos, Tasks 1–5 backend (2026-07-27) | `progress.md:17`; páginas `3aabc960…` (4 URLs distintas, mesmo prefixo) | `write-externo` (Notion, D11) |
| E3-06 | 7.3.1–7.3.2 (migration enrollments; matrícula em lote) | `A fazer` | Entregue — Bloco 6c (2026-07-21) | `progress.md:11`; páginas `b8bbc960…`, `848bc960…` | `write-externo` (Notion, D11) |
| E3-07 | 7.3.3 (endpoint do redator p/ lançar notas/presença) | `A fazer` | **Sem evidência de entrega** em `progress.md` — não é achado de status, pode seguir pendente de verdade | página `8f3bc960…` | nenhum — verificar no código antes de mexer, fora do escopo desta task |
| E3-08 | 7.4.1, 7.4.3 (hook useTurma+detalhe 5 abas; aba Redator) | `A fazer` | Entregue — Sprint 3 Operação frontend, Exec 1 (2026-07-23) | `progress.md:14`; páginas `accbc960…`, `befbc960…` | `write-externo` (Notion, D11) |
| E3-09 | 7.4.2 (aba Alumnos: upload/preview import) | `A fazer` | Entregue — Exec 2 (2026-07-23) | `progress.md:14`; página `6c5bc960…` | `write-externo` (Notion, D11) |
| E3-10 | 7.4.4–7.4.5 (aba Documentación; aba Conclusión) | `A fazer` (ambas) | Entregue — Exec 3 (2026-07-23) | `progress.md:14`; páginas `08fbc960…`, `7fabc960…` | `write-externo` (Notion, D11) |
| E3-11 | 7.4.6–7.4.8 (hook useStudents; aba Alumnos em Personas; detalhe do aluno) | `Backlog` (todas) | Entregue — Bloco Pessoas · Alunos, Tasks 6–10 frontend (2026-07-27) | `progress.md:17`; páginas `3aabc960…` (3 URLs distintas) | `write-externo` (Notion, D11) |
| E3-12 | H.1.3 (Refinamento UI/UX por módulo, cópia Sprint 3) | `Backlog` | Entregue — Bloco visual · Refinamento de UI (2026-07-27, 39 tasks) | `progress.md:18`; página `c18bc960…` | `write-externo` (Notion, D11) |
| E3-13 | H.1.3.1 (Sincronização de documentação, cópia Sprint 3) | `Backlog` | **Correto ficar `Backlog`** — nunca foi executado; é a origem do gatilho vencido de P-06 ("doc-sync da Sprint 3"). Este próprio bloco (`hardening-doc-sync-sprint4`) está fazendo agora, retroativamente, o que essa task pedia | página `a25bc960…` | Sem achado — só registrar que H.1.3.1/Sprint 3 fecha quando a Task 14 deste bloco reexecutar a auditoria |
| E3-14 | H.1.3.2 (Fechamento técnico de sprint, cópia Sprint 3, página `6a8bc960…`) | `Backlog` | Sprint 3 fechou de fato em 2026-07-23 (citado em `docs/superpowers/state.md`, P-04) mas a página de gate nunca mudou de status | `docs/superpowers/state.md` (P-04); página `6a8bc960…` | `write-externo` (Notion, D11) |
| E3-15 | Anomalia de dado (não é E1/E2/E3 no sentido usual) — página `f88bc960…` tem `Descrição: "Fechamento — Sprint 3"` mas a propriedade `Sprint` real é `Sprint 2 · Comercial` | — | Mislabel dentro do próprio Notion, não é código vs. doc | `notion-fetch` de `f88bc960…` | Fora do escopo do D11 (autoriza só status e critério de aceite de H.1.3.1) — só reportar ao João, não corrigir nesta task |

**Total:** 15 linhas (E3-01 a E3-15). 12 são status desatualizado com destino candidato
`write-externo` via D11 (Notion, `notion_write: claude` confirmado na seção 1); uma (E3-07) não é
achado; uma (E3-13) confirma que o gatilho de P-06 está correto em apontar para cá; uma (E3-15) é
uma anomalia de dado fora do escopo de autorização do D11.

## 5. Eixo docs de agente

**Step 1 — afirmações vigentes capturadas:**
- `AGENTS.md:83` — `| Notion | **indisponível** — o MCP do plugin não carrega neste runtime | — |`
- `AGENTS.md:85-88` — "Não declare uma fonte `unavailable` sem ter tentado a tool correspondente...
  Reavalie a linha do Notion quando o MCP do plugin passar a carregar."
- `.agents/skills/lotus-context-packet/SKILL.md:75` — "GitHub via `mcp__codex_apps__github_*`.
  Notion is not loaded in this runtime."

**Step 2 — confronto com evidência real (duas provas independentes):**
1. O packet `hardening-doc-sync-sprint4.md` (fato 2) recuperou `NOTION-H131` com sucesso via
   `notion-fetch`/`notion-search` durante a geração do packet em 2026-07-30 — runtime que gera
   packet é o do Codex conforme `.agents/skills/lotus-context-packet/SKILL.md`.
2. A Task 4 desta execução leu a mesma página (`e30bc960…`) e listou as 26 tasks do board via
   `mcp__claude_ai_Notion__notion-query-data-sources`, pelo runtime do Claude (não do Codex) — uma
   terceira via, ainda mais direta.

As duas provas (mais a terceira desta sessão) contradizem a linha "indisponível" com dados de
2026-07-30, sete dias depois da verificação registrada (2026-07-23) que a gerou.

**Step 3 — inventário de conectores (limitação declarada):** o plano pedia confrontar a tabela de
`AGENTS.md:78-83` (Drive/Figma/GitHub via `mcp__codex_apps__*`) com os nomes de tool que a Task 1
devolveria da sondagem do runtime do Codex. Essa sondagem foi pulada por decisão do João (seção 1)
— não há, nesta execução, uma lista real de tools do namespace `mcp__codex_apps__*` para confrontar.
As linhas de Drive/Figma/GitHub da tabela **não foram re-verificadas** e não entram como achado
(nem confirmadas nem refutadas) — ficam como estavam, com a mesma data de verificação de 2026-07-23.

| ID | Doc | Divergência | Evidência | Sugestão |
|---|---|---|---|---|
| E4-01 | `AGENTS.md:83`, `AGENTS.md:85-88`, `SKILL.md:75` | Notion declarado "indisponível"/"not loaded" — falso há pelo menos desde 2026-07-30 (packet), possivelmente antes | Packet `hardening-doc-sync-sprint4.md` fato 2; Task 4 desta execução (`notion-query-data-sources` real) | Corrigir as três linhas para "disponível", com data de verificação 2026-07-30 (Task 9 já prevista no plano para isso) |

**Total:** 1 divergência (E4-01) — a mesma que a Task 9 do plano já existe para corrigir. Inventário
de Drive/Figma/GitHub não re-verificado nesta execução (Step 3, limitação declarada acima), sem
achado por falta de evidência, não por confirmação de que está correto.

## 6. Tabela consolidada

27 achados com destino proposto (evidência completa nas seções 2–5); mais 2 linhas sem achado
(E3-07, E3-13, mantidas nas respectivas seções, não repetidas aqui).

| ID | Eixo | Divergência (resumo) | Destino proposto |
|---|---|---|---|
| E1-01 | código↔docs | `pendencias.md` P-04 — gatilho vencido (Sprint 3 fechou, guardrail §5 não reavaliado) | pendência |
| E1-02 | código↔docs | `pendencias.md` P-06 — gatilho vencido (der-fisico.md ainda modela `turmas` como planejada/1:N) | corrigir-agora |
| E1-03 | código↔docs | `estrutura-monolito.md` — `Operation/` documentado como scaffold vazio, tem código real | corrigir-agora |
| E1-04 | código↔docs | `backend-ddd.md` — estado desatualizado, falta `Operation` como domínio real | corrigir-agora |
| E1-05 | código↔docs | `estrutura-monolito.md` — `RouteServiceProvider.php` documentado, não existe (é `glob()`) | corrigir-agora |
| E1-06 | código↔docs | `estrutura-monolito.md` — `AuthServiceProvider.php`/Policies documentados, não existem | corrigir-agora |
| E1-07 | código↔docs | `backend-ddd.md` — data-scoping de Turma por Policy descrito, não implementado | corrigir-agora (lição 13 — marcar como não-construído, não como regra vigente) |
| E2-01 | docs↔Drive | Drive: `redator_id` FK 1:N; repo: pivot `turma_redator` N:N | write-externo (já P-01/P-06) |
| E2-02 | docs↔Drive | Drive: `/api/alunos`; repo: `/api/students` | write-externo (já P-14) |
| E2-03 | docs↔Drive | ADR-15 revisado 2026-07-17 no repo, Drive com a versão pré-revisão | write-externo |
| E2-04 | docs↔Drive | ADR-16 (Tailwind/PrimeReact) ausente do Drive | write-externo |
| E2-05 | docs↔Drive | ADR-18 (`createCrudResource`) ausente do Drive | write-externo |
| E2-06 | docs↔Drive | ADR-19 (dinheiro decimal+bcmath) ausente do Drive | write-externo |
| E3-01 | docs↔Notion | EAP 7.1.1–7.1.5 (Turma backend) status desatualizado | write-externo (D11) |
| E3-02 | docs↔Notion | EAP 7.1.6 (anexos documentação) status desatualizado, evidência mais fraca | write-externo (D11) |
| E3-03 | docs↔Notion | EAP 7.2.1/7.2.3 (students migration/regra vínculo) status desatualizado | write-externo (D11) |
| E3-04 | docs↔Notion | EAP 7.2.2 (import xlsx/csv) status desatualizado | write-externo (D11) |
| E3-05 | docs↔Notion | EAP 7.2.4–7.2.7 (CRUD alunos backend) status desatualizado | write-externo (D11) |
| E3-06 | docs↔Notion | EAP 7.3.1–7.3.2 (enrollments/matrícula lote) status desatualizado | write-externo (D11) |
| E3-08 | docs↔Notion | EAP 7.4.1/7.4.3 (hook+detalhe turma, aba Redator) status desatualizado | write-externo (D11) |
| E3-09 | docs↔Notion | EAP 7.4.2 (aba Alumnos import) status desatualizado | write-externo (D11) |
| E3-10 | docs↔Notion | EAP 7.4.4–7.4.5 (aba Documentación/Conclusión) status desatualizado | write-externo (D11) |
| E3-11 | docs↔Notion | EAP 7.4.6–7.4.8 (alunos frontend Personas) status desatualizado | write-externo (D11) |
| E3-12 | docs↔Notion | EAP H.1.3 (refinamento UI, cópia Sprint 3) status desatualizado | write-externo (D11) |
| E3-14 | docs↔Notion | EAP H.1.3.2 (fechamento Sprint 3) status desatualizado — sprint fechou de fato | write-externo (D11) |
| E3-15 | docs↔Notion | Página `f88bc960…`: `Descrição` cita Sprint 3, propriedade `Sprint` real é Sprint 2 | pendência (fora do escopo de escrita do D11 — só reportar) |
| E4-01 | docs de agente | `AGENTS.md`/`SKILL.md` — Notion declarado indisponível, falso desde ≥2026-07-30 | corrigir-agora |

## 7. Proveniência

Escopo desta seção: as decisões que **explicam** os achados acima (E1–E4), não um levantamento de
toda decisão já tomada no projeto — isso contrariaria o não-objetivo "redesenhar arquitetura" da
spec. `grep -rn "^[-*] \*\*D[0-9]" docs/superpowers/specs/` só bate o formato de bullet desta spec
(12 ocorrências, todas D1–D12 deste próprio bloco); os specs arquivados registram decisão em outro
formato (tabela `| D5 | ... |` ou heading `### D5 — ...`), lidos manualmente para as decisões abaixo.
`grep -c "^| ADR-" docs/adrs.md` = 19.

| Decisão | Onde está registrada | Proveniência no texto | Governa código vivo? (arquivo:linha) |
|---|---|---|---|
| D5 — Redator↔Turma N:N via `turma_redator` | `specs/archive/2026-07-21-bloco6b-turma-designacao-design.md:41` | Explícita: "João, 2026-07-21" | Sim — `backend/database/migrations/..._create_turma_redator_table.php`, `TurmaRedator` model |
| D7 — Rota `/api/students`, não `/alunos` | `specs/archive/2026-07-27-bloco-alunos-modulo-design.md:81-85` | **Não explícita** — justificativa técnica (evita hack de inflector), sem a frase "decisão do João" | Sim — `backend/app/Domains/Identity/routes.php` |
| D3 — Edição de aluno não toca vínculo de cliente | `specs/archive/2026-07-27-bloco-alunos-modulo-design.md:46-54` | **Não explícita** — justificativa técnica, sem atribuição nominal | Sim — `UpdateStudentAction` só altera campos de `User` |
| D10 — Certificados fora da listagem/detalhe do aluno | `specs/archive/2026-07-27-bloco-alunos-modulo-design.md:103-109` | **Não explícita**, mas justificada por ausência de infra (`Certification/` vazio) — natureza factual, não arbitrária | Sim — `StudentsTable`/`StudentDialog` sem coluna/card de certificados; já rastreada em P-15 |
| D11 — Ordem das abas mantém `Redactores` primeiro | `specs/archive/2026-07-27-bloco-alunos-modulo-design.md:111-114` | Explícita: "decisão do João em 2026-07-27" | Sim — `PeoplePage.tsx`; já rastreada em P-16 |
| ADR-16 — Tailwind como layout, tema PrimeReact em runtime | `docs/adrs.md:120-148` | Nota de sync própria diz "nasceu no desenvolvimento (repo)" — sem atribuição nominal explícita | Sim — é a stack de estilo real do frontend |
| ADR-15 (revisão 2026-07-17) — dicionários i18n separados, sem compilação PHP→JSON | `docs/adrs.md:93-116` | Revisão datada, mas sem "decisão do João" explícito no texto da revisão | Sim — `shared/config/i18n.ts` + `lang/` separados, é o mecanismo real |

D5 e D11 têm proveniência explícita — **não** entram como achado de ratificação (D9), só de
write-externo (já cobertas em E2-01/E3 respectivas). D7, D3, ADR-16 e a revisão do ADR-15 **governam
código vivo e não têm a atribuição nominal explícita** que D9 pede — candidatas a `ratificação` na
Task 7. D10, apesar de sem a frase padrão, é justificada por um fato verificável (pasta vazia, sem
migration) e não por uma escolha discricionária — proposta como `ratificação` mesmo assim, para o
João confirmar a leitura, não porque haja dúvida real sobre o fato.

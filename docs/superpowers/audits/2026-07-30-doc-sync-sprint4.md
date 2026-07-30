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

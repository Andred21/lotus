# Auditoria de sincronização — hardening-doc-sync-sprint4

**Data:** 2026-07-30 · **Spec:** `docs/superpowers/specs/archive/2026-07-30-hardening-doc-sync-sprint4-design.md`
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

> **CORREÇÃO (registrada durante a Task 7):** a primeira versão desta seção consultou
> `collection://6adbc960-3dfa-8269-9d57-8719e44eed2c` — uma base **diferente e obsoleta**, com
> páginas hoje marcadas `deleted` (confirmado por `notion-fetch` retornando `<page ... deleted>`),
> que por acaso também se chama "Tasks · Lotus Fase 2". A base real, canônica, é
> `collection://e64b7d57-d000-4433-b652-a410e75193cc` (`Lotus.cl` → `Lotus · Desenvolvimento
> (Fase 2)` → `Tasks · Lotus Fase 2`, database `7e55d684-cdd4-4bf3-b152-e15ce70d324b`). O João
> identificou a divergência ao ver as 12 "correções de status" propostas — ele já tinha essas tasks
> como concluídas. Reconsultada a base certa, **12 das 15 linhas abaixo eram falso-positivo**. A
> própria task H.1.3.1 desta execução também tinha o ID errado (`e30bc960…`, da base obsoleta) —
> coincidência de conteúdo idêntico entre as cópias salvou o packet de um erro de fato, mas não de
> proveniência; o ID correto é `3a2bc9603dfa803b94bbf27c075b27d6`, confirmado por `notion-fetch`
> nesta correção com as mesmas propriedades (`Critério de aceite` vazio, `Status: Backlog`).

**Board Sprint 3 · Acadêmico (base correta) vs. `progress.md` (2026-07-20 a 2026-07-27):** das 26
tasks do board real, a esmagadora maioria já está `Concluída`. Só 3 exceções, todas verificadas
contra o código, não assumidas:

| ID | EAP | Status no Notion (base correta) | Estado real | Evidência | Destino |
|---|---|---|---|---|---|
| E3-01 | 7.2.6 — QueryBuilder de alunos com filtros/vínculos/histórico | `Backlog` | **Correto.** Não existe `StudentQueryBuilder`; `backend/app/Domains/Identity/QueryBuilders/` está vazio — a listagem de alunos não passa por Custom Query Builder dedicado | `find backend/app/Domains/Identity/QueryBuilders` (vazio) | Sem achado |
| E3-02 | 7.3.3 — Endpoint do redator p/ lançar notas/presença | `A fazer` | **Correto.** Sem evidência de entrega em `progress.md` nem no código | página `388bc9603dfa81eb847ae51b2075f231` | Sem achado |
| E3-03 | 7.4.2 — Aba Alumnos: upload de planilha + preview de import | `Em progresso` | Entregue — Exec 2 (2026-07-23, `progress.md:14`); arquivos reais presentes (`useImportStudents.ts`, `ImportDialog.tsx`, `ImportResultSummary.tsx`) e a Task 6 do ledger fino confirma commits `89e7237`+`5babe3d` | `progress.md:14`; `frontend/src/features/operation/{api/useImportStudents.ts, components/Enrollment/ImportDialog.tsx}`; página `388bc9603dfa814c9c9ee7028d20cd6e` | `write-externo` (Notion, D11) — única linha real |
| E3-04 | H.1.3.1 (Sprint 3), página `3a2bc9603dfa8021b69ee399cd8fd915` | `Backlog` | **Correto ficar `Backlog`** — nunca foi executado; é a origem do gatilho vencido de P-06. Confirmado também na base correta | mesma leitura | Sem achado — mesma nota de antes |
| E3-05 | Anomalia de dado — página `f88bc9603dfa8253b40981686f8ae023` tem `Descrição: "Fechamento — Sprint 3"` mas `Sprint` real é `Sprint 2 · Comercial` | — | Mislabel dentro do próprio Notion, independente da correção acima (confirmada nas duas consultas) | `notion-fetch` de `f88bc960…` | Fora do escopo do D11 — só reportar |

**Total real:** 1 divergência de status (E3-03) — não 12. As outras 4 linhas ou já estavam corretas
ou são achados fora do escopo de escrita autorizada. **Lição para o método:** duas bases com o mesmo
nome de exibição no mesmo workspace é um risco de proveniência que nem o `notion-search` nem o
`notion-fetch` sinalizam sozinhos — só o confronto com quem vive o dado (o João) pegou. Registrado
como achado de processo, não de doc, ao final desta seção como nota — sem ID formal, porque não é
uma divergência entre dois documentos e sim um risco do próprio método de consulta.

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

16 achados com destino proposto (evidência completa nas seções 2–5) — 7 de E1, 6 de E2, 2 de E3
(após a correção da base Notion registrada na seção 4) e 1 de E4.

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
| E3-03 | docs↔Notion | EAP 7.4.2 (aba Alumnos import) status `Em progresso`, entregue de verdade | write-externo (D11) |
| E3-05 | docs↔Notion | Página `f88bc960…`: `Descrição` cita Sprint 3, propriedade `Sprint` real é Sprint 2 | pendência (fora do escopo de escrita do D11 — só reportar) |
| E4-01 | docs de agente | `AGENTS.md`/`SKILL.md` — Notion declarado indisponível, falso desde ≥2026-07-30 | corrigir-agora |

> **Nota de correção:** as linhas antigas E3-01/02/04/06/08/09/10/11/12/14 (10 achados de "status
> desatualizado" via `write-externo`) foram **retiradas** — eram falso-positivo por consulta à base
> Notion errada (ver correção na seção 4). E3-01/E3-02/E3-04 antigos (agora sem achado) confirmaram
> que os EAPs correspondentes já estavam corretamente `Concluída`/`Backlog` na base real.

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

## 8. Triagem

Decidido pelo João em 2026-07-30, em duas rodadas (`AskUserQuestion`, por grupo — não por achado).
Na segunda rodada, o João apontou que já tinha as tasks do Sprint 3 como concluídas, o que levou à
correção da seção 4 (base Notion errada) **antes** de fechar esta triagem — os destinos abaixo já
refletem os números corrigidos, não os originais.

| ID | Destino final | Decisão do João | Data |
|---|---|---|---|
| E1-01 (P-04) | pendência | Gatilho novo: reavaliar em **2026-08-15** (data fixa, não "quando a Sprint X fechar") | 2026-07-30 |
| E1-02 | corrigir-agora | Aprovado em bloco (as 7 correções de texto) | 2026-07-30 |
| E1-03 | corrigir-agora | Aprovado em bloco | 2026-07-30 |
| E1-04 | corrigir-agora | Aprovado em bloco | 2026-07-30 |
| E1-05 | corrigir-agora | Aprovado em bloco | 2026-07-30 |
| E1-06 | corrigir-agora | Aprovado em bloco | 2026-07-30 |
| E1-07 | corrigir-agora | Aprovado em bloco (mantém como correção de texto, não backlog) | 2026-07-30 |
| E4-01 | corrigir-agora | Aprovado em bloco | 2026-07-30 |
| E2-01 | write-externo | Patch aprovado para `modelo-fisico-e-diagramas.md` e `modelo-conceitual.md` | 2026-07-30 |
| E2-02 | write-externo | Patch aprovado para `tela-pessoas.md` | 2026-07-30 |
| E2-03 | write-externo | Patch aprovado para `decisao-stack.md` | 2026-07-30 |
| E2-04 | write-externo | Patch aprovado para `decisao-stack.md` | 2026-07-30 |
| E2-05 | write-externo | Patch aprovado para `decisao-stack.md` | 2026-07-30 |
| E2-06 | write-externo | Patch aprovado para `decisao-stack.md` | 2026-07-30 |
| E3-03 | write-externo | Autorizado — write real via `notion-update-page` (EAP 7.4.2 → `Concluída`) | 2026-07-30 |
| E3-05 | pendência | Só registrar; fora do escopo do D11, sem write | 2026-07-30 |

**Três decisões nominais adicionais (spec §3):**
1. **Gatilho novo de P-04:** 2026-08-15 (ver E1-01 acima).
2. **Documentos do Drive autorizados a receber patch (D1, um a um):** `decisao-stack.md`,
   `modelo-fisico-e-diagramas.md`, `modelo-conceitual.md`, `tela-pessoas.md` — os 4 aprovados.
3. **Notion (D11):** autorizado o write real em 2 pontos — critério de aceite da própria H.1.3.1
   (página `3a2bc9603dfa803b94bbf27c075b27d6`, escopo do backlog como texto) e status de EAP 7.4.2
   (página `388bc9603dfa814c9c9ee7028d20cd6e`, `Em progresso` → `Concluída`).

**Ratificação (seção 7):** as 5 decisões (D7, D3, D10, ADR-16, revisão do ADR-15) foram ratificadas
em bloco pelo João em 2026-07-30 — confirmadas como decisões dele, viram ADR/linha em
`pendencias.md` conforme a Task 13 decidir o formato.

## 9. Correções internas aplicadas (Fase 2 — Tasks 8-10)

Prova de que cada achado `corrigir-agora` reproduziu e depois deixou de reproduzir:

| ID | Comando de prova | Antes | Depois | Commit |
|---|---|---|---|---|
| E1-02 | `grep -n "redator_id" docs/der-fisico.md` | bullet `turmas` em "PLANEJADAS" com `redator_id FK` | Zero ocorrência dentro do bullet `turmas`; `turma_redator` presente em "IMPLEMENTADAS" | `f1e7f8e` |
| E1-03 | `grep -n "scaffold vazio" docs/estrutura-monolito.md` | `Operation/` marcado `[scaffold vazio]` nas 3 linhas (backend, frontend, divergências) | Só `Certification/` segue `[scaffold vazio]` | `2e1bd9d` |
| E1-04 | `grep -n "placeholder" .claude/rules/backend-ddd.md` | "Identity, Commercial e Catalog têm código real; os demais são placeholder" | "Identity, Commercial, Catalog e Operation têm código real; Certification e Feedback são placeholder" | `270008b` |
| E1-05 | `grep -n "RouteServiceProvider.php#" docs/estrutura-monolito.md` | Listado como arquivo real na árvore de `Providers/` | Removido da árvore; nota explica que o agregador real é `glob()` em `routes/api.php` | `2e1bd9d` |
| E1-06 | `find backend/app/Domains -iname "*Policy*"` | `AuthServiceProvider.php` documentado como registrador de Policies | Removido da árvore; nota explica que nenhuma classe `Policy` existe ainda | `2e1bd9d` |
| E1-07 | `.claude/rules/backend-ddd.md:98-99` | "Policy fica para data-scoping (Turma: 'redator só vê as suas')" como regra vigente | Reescrito como intenção não-construída, com débito explícito de backlog | `270008b` |
| E4-01 | `grep -n "indisponível\|is not loaded" AGENTS.md .agents/skills/lotus-context-packet/SKILL.md` | 2 ocorrências | Zero ocorrências | `10341bf` |

Todos os 7 reproduziram antes da correção e pararam de reproduzir depois — nenhuma correção foi
aplicada sem achado reproduzível (regra da Task 10, Step 2).

## 10. Writes externos

| Documento | Via | Aplicado? | Evidência |
|---|---|---|---|
| `decisao-stack.md` (Drive) | fallback | Patch gerado, não aplicado | `docs/superpowers/audits/2026-07-30-drive-patches/decisao-stack.md` — P-17 aberta até o João aplicar |
| `modelo-fisico-e-diagramas.md` (Drive) | fallback | Patch gerado, não aplicado | `docs/superpowers/audits/2026-07-30-drive-patches/modelo-fisico-e-diagramas.md` — P-01 aberta |
| `modelo-conceitual.md` (Drive) | fallback | Patch gerado, não aplicado | `docs/superpowers/audits/2026-07-30-drive-patches/modelo-conceitual.md` — mesma pendência de P-01/E2-01 |
| `tela-pessoas.md` (Drive) | fallback | Patch gerado, não aplicado | `docs/superpowers/audits/2026-07-30-drive-patches/tela-pessoas.md` — P-14 aberta até o João aplicar |
| H.1.3.1 — critério de aceite (Notion) | real (`notion-update-page`) | **Aplicado** | Página `3a2bc9603dfa803b94bbf27c075b27d6` — releitura confirma `Critério de aceite` preenchido |
| EAP 7.4.2 — status (Notion) | real (`notion-update-page`) | **Aplicado** | Página `388bc9603dfa814c9c9ee7028d20cd6e` — releitura confirma `Status: Concluída` |

Nenhum write no Drive foi tentado nesta execução (via `fallback` confirmada na seção 1) — os 4
patches ficam para o João aplicar manualmente; P-01/P-14/P-17 seguem abertas em `pendencias.md` até
confirmação. Os 2 writes no Notion foram aplicados e confirmados por releitura.

> **Adendo 2026-07-31:** o João confirmou ter aplicado os 4 patches no Drive. P-01/P-14/P-17/P-19
> passaram para "Encerradas" em `docs/pendencias.md` e a pasta
> `docs/superpowers/audits/2026-07-30-drive-patches/` foi removida — os caminhos citados na tabela
> acima descrevem o estado da execução de 2026-07-30 e não existem mais na árvore.

## 11. Re-auditoria (Task 14)

Quatro rodadas de `auditor-docs` até zero achado fora de `pendencias.md`:

| Rodada | Achados | Como fechou |
|---|---|---|
| 1 | 5 (seeders `RoleSeeder,PermissionSeeder`; `Console/` documentado como existente; `Support/` ausente da árvore de domínio; `Admin/`/`Student/`/`AdministracionPage.tsx` ausentes do front; `openspout` sem ADR) | 4 correção de texto direta (commit `872906a`); 1 nova pendência **P-20** |
| 2 | 2 (`tsconfig.json` vs `tsconfig.app.json` nos path aliases; `TypeScriptTransformerServiceProvider.php` ausente da árvore de `Providers/`) | Correção de texto direta (commit `ff2929e`) |
| 3 | 3 (`.claude/rules/backend-ddd.md` — achado descartado após não reproduzir via `grep`, texto do alias `'cotacao'` não existe no arquivo; `.claude/rules/migrations.md` — `budgets.codigo` vs `budgets.code` real; `simplesoftwareio/simple-qrcode` instalado sem uso e sem ADR) | 1 correção de texto direta (commit `5edaaa1`); 1 nova pendência **P-21**; 1 falso positivo descartado (não reproduziu) |
| 4 | 0 | Auditoria limpa |

### Verificação do DoD (spec §6)

1. **Re-auditoria zero achados fora de pendências** — rodada 4 confirma, tabela acima é a prova.
2. **Nenhum gatilho vencido ou não verificável** — todos os gatilhos de `pendencias.md` são data fixa
   (P-04, `2026-08-15`, não vencida) ou evento externo verificável (confirmação do João, correção no
   Notion, chegada do Bloco 7); nenhum do tipo vago que a lição 13 proíbe.
3. **P-06 fechada** — `der-fisico.md` modela `turma_redator` N:N e `turmas` em "IMPLEMENTADAS" com
   colunas reais, conferido contra a migration (Task 8); confirmado de novo pela rodada 4.
4. **`AGENTS.md`/SKILL.md dizem a verdade sobre o Notion** — `AGENTS.md:84` e
   `.agents/skills/lotus-context-packet/SKILL.md:75` marcam Notion disponível, com data de
   verificação 2026-07-30.
5. **Todo write externo aprovado tem evidência ou patch+pendência aberta** — seção 10: 2 writes reais
   no Notion com releitura confirmada; 4 patches de Drive entregues com pendência aberta (P-01/P-14/P-17).
6. **Toda decisão com efeito vivo ratificada/rejeitada/pendente, sem linha em branco** — seção 8: as 5
   ratificadas (D7→P-14, D3→P-19, D10→P-15, ADR-16 e revisão do ADR-15→`docs/adrs.md`) têm status
   registrado; nenhuma decisão de proveniência ficou sem destino.
7. **Código tocado → suíte + Pint** — não se aplica: bloco é só de `/docs`, `.claude/rules/`,
   `AGENTS.md` e `.agents/skills/`; nenhum arquivo de `backend/app` ou `frontend/src` foi tocado.

Todos os 7 critérios do DoD atendidos.

## 12. Revisão do bloco (`/revisar-sprint`, 2026-07-30)

Revisão classificada **baixo risco** (nenhum arquivo executável tocado; só `/docs`,
`.claude/rules/`, `AGENTS.md`, `.agents/skills/`), com o gabarito aplicado sobre a verdade de cada
afirmação de doc contra o repositório real. As afirmações de schema do `der-fisico.md`
(`turmas`/`turma_redator`/`enrollments`), `RolePermissionSeeder`, ausência de `Console/` e de classe
`Policy`, o `glob()` de `routes/api.php`, `tsconfig.app.json`, `budgets.code`, a contagem de 32
arquivos em `features/operation` e o total de 19 ADRs foram reconferidos e batem. Os **2 writes no
Notion foram reconfirmados por `notion-fetch` próprio**, na base canônica — não pela palavra da
seção 10.

Seis achados, todos aprovados pelo João em 2026-07-30:

| ID | Achado | Severidade | Como fechou |
|---|---|---|---|
| Q-1 | H.1.3.1 duplicada **dentro** da base canônica: `3a2bc960…b27d6` (Sprint 4, critério preenchido) e `3a2bc960…d8fd915` (Sprint 3, critério vazio). A seção 4 (E3-04) cita uma; as seções 8/10 escrevem na outra; o relatório nunca notou que são duas | 🔴 | **P-22** aberta com os dois IDs — qual é a canônica é decisão do João. Commit `993c1ff` |
| Q-2 | `AGENTS.md`/`SKILL.md` do packet passaram a apontar a base Notion por **nome de exibição**, o nome que existe em duas bases — a lição dos 12 falsos positivos ficou só no relatório arquivado | 🔴 | ID canônico gravado nos dois docs + regra nova "fonte externa se referencia por ID, nunca por nome" em `AGENTS.md` §3, na SKILL do packet e em `.claude/skills/auditar-docs`. Commit `a9131be` |
| Q-3 | `der-fisico.md:85` ainda marcava `students` como `(planejada)`, contra a própria lista de implementadas (linha 107) e contra `create_students_table` | 🟡 | Linha corrigida com o vínculo real (`students.current_client_id`). Commit `993c1ff` |
| Q-4 | A própria H.1.3.1 fecha com `Status: Backlog` no Notion enquanto o `progress.md` diz Entregue — a classe exata de drift que o bloco existiu para matar | 🟡 | **Write autorizado pelo João em 2026-07-30**, a aplicar no `/fechar-sprint` (página `3a2bc9603dfa803b94bbf27c075b27d6` → `Concluída`), não antes: o bloco ainda não estava fechado no momento da revisão |
| Q-5 | Linha de seeders corrigida na rodada 1 da re-auditoria parou no meio — citava só `RolePermissionSeeder`, omitindo `DatabaseSeeder` e `OperationDemoSeeder` | 🟢 | Os três documentados, com o gate local/demo do `OperationDemoSeeder`. Commit `993c1ff` |
| Q-6 | Gatilho de P-03 ("se a concorrência passar a doer") não era verificável e escapou do grep de prova do DoD-2 por diferença de redação | 🟢 | Trocado por condição observável em `state.md` + data-limite `2026-10-31`. Commit `993c1ff` |

**Padrão reincidente virou regra (Q-2):** duas bases com o mesmo nome de exibição derrubaram a Task 4
deste bloco e a lição não tinha mecanismo. Agora tem, nos três documentos que um agente lê antes de
consultar fonte externa.

**Q-4 é a única pendência de execução desta revisão** — o `/fechar-sprint` aplica o write e registra
a evidência de releitura na seção 10.

## 13. Gate de fechamento (2026-07-30)

**Q-4 aplicado:** página `3a2bc9603dfa803b94bbf27c075b27d6` movida de `Backlog` para `Concluída` via
`notion-update-page`; releitura por `notion-fetch` confirma `"Status":"Concluída"` na base canônica
`collection://e64b7d57-d000-4433-b652-a410e75193cc`. A seção 10 fica completa: 2 writes de Notion
aplicados e reconfirmados no fechamento, 4 patches de Drive entregues com pendência aberta.

**O item 0 do gate reprovou na primeira passada.** A re-auditoria de fechamento, com o mesmo prompt
da Task 14, devolveu **14 divergências** — contra as 0 da 4ª rodada do próprio bloco, horas antes.
Nenhuma era invenção: as 8 primeiras foram reconferidas na mão antes de irem para a triagem do João.

> **Lição — "zero achados" mede o auditor, não os docs.** O `auditor-docs` varia em profundidade e em
> recorte entre execuções; uma rodada limpa é evidência sobre *aquela* execução. DoD que se satisfaz
> com uma rodada limpa compra a sensação de sincronia, não a sincronia. Um DoD honesto ou fixa a
> lista de checagens que precisam passar (verificáveis por comando, como as 7 provas da seção 11), ou
> assume que a auditoria por agente é amostragem — nunca prova de exaustão.

Decisão do João no gate: corrigir os 12 fatos antes de fechar (commit `7aabe77`), corrigir também a
§4 do `CLAUDE.md` (comando vs. skill) e mandar o formato do `progress.md` para pendência (**P-23**).

| # | Divergência | Fechou como |
|---|---|---|
| 1 | Contagem-alvo de tabelas não fechava: "25 (18 de domínio + 7)" com `files`/`audits` contados dos dois lados | 26 (19 de domínio + 7 RBAC/transversal), em `der-fisico.md` e `README.md` |
| 2 | `adrs.md` regras herdadas ainda diziam "um redator por turma" contra o N:N implementado | Linha marcada como regra da v1 superada pelo Bloco 6b (D5) |
| 3 | 4 docs com cabeçalho "atualizado em" anterior ao próprio corpo | Datas alinhadas em `adrs.md`, `estrutura-monolito.md`, `der-fisico.md`, `README.md` |
| 4 | `estrutura-monolito.md:64` afirmava que o `RouteServiceProvider` agrega as rotas — 15 linhas depois do mesmo doc dizer que ele não existe | Regra acionável descreve o `glob()` real |
| 5 | `backend-ddd.md` dizia `Certification`/`Feedback` placeholder `.gitkeep`; não há `.gitkeep` no backend e `Domains/Feedback/` não existe | Texto passa a dizer o que é |
| 6 | `frontend-fsliced.md` "5 de 25 wrappers" | "4 dos 34", conferido (34 pastas em `shared/ui`, 4 com `forwardRef<>`) |
| 7 | `generated-types.md` e `pendencias.md` apontavam para "o backlog do `progress.md`", que não existe desde o `backlog.md` | Ponteiros repontados |
| 8 | `CLAUDE.md` mandava `./vendor/bin/pint` da raiz — não há `vendor/` lá | `cd backend && ./vendor/bin/pint <arquivos>`, verificado rodando (`{"tool":"pint","result":"passed"}`) |
| 9 | `CLAUDE.md` §4 listava `/revisar-sprint` e `/fechar-sprint` como comandos (são skills) e omitia `/revisar-frontend` e `/revisar-ui` | Tabela nova separando comando de skill, conferida contra `.claude/commands/` e `.claude/skills/` |
| 10 | `CLAUDE.md` omitia o serviço `createbuckets` do Compose | Incluído |
| 11 | `progress.md` perdeu a coluna `Contexto` que o `progress-archive.md` mantém | **P-23** — é decisão de formato do João, não fato |
| 12 | `app/Http/Controllers/Controller.php`, base de todos os controllers, fora da árvore documentada | Acrescentado |
| 13-14 | `progress.md` "Entregue" com plano/spec fora de `archive/`; seção do item ativo no `state.md` desatualizada | Mecânica deste fechamento — resolvidas nos itens 8-10 do gate |

**Confirmação inline (o subagente da rodada de confirmação foi cortado por limite de sessão; a skill
permite rodar inline nesse caso):** tabela real do `Schema::create` vs. bullets do `der-fisico.md` só
difere nas 5 de framework que o doc declara fora da contagem; 34 wrappers / 4 `forwardRef`; 19 ADRs
batendo com o `README.md`; tabela de comandos batendo com `.claude/`; nenhum gatilho de
`pendencias.md` vencido (as datas fixas são 2026-08-15, 2026-09-30 e 2026-10-31); zero arquivo de
`backend/` ou `frontend/` tocado no bloco inteiro (`git diff --name-only 74e4a2d..HEAD`).

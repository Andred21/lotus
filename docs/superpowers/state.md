---
schema_version: 1
active_feature: null
active_work_item: cards-relacao-curso-redator
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
active_spec: docs/superpowers/specs/2026-08-01-cards-relacao-curso-redator-design.md
active_plan: docs/superpowers/plans/2026-08-01-cards-relacao-curso-redator.md
context_packet: null
blocker: null
resume_state: null
last_completed_work_item: foto-avatar-e-contatos-cliente
state_basis_commit: 8e200b3
updated_at: 2026-08-01T14:30:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Estado atual — `ready_for_review`

`cards-relacao-curso-redator` — executado em worktree (`using-git-worktrees` +
`subagent-driven-development`), 10 tasks de conteúdo + Task 11 (gate). Todas as 10 revisadas por
subagente reviewer com verdict Approved (spec compliance + qualidade), review-package por task.
Achado operacional: o Step 1 da Task 2 tinha um `cd /home/jvbat/projetos/lotus` absoluto herdado do
plano (escrito antes do worktree existir) — o implementador seguiu literalmente e comitou
`redatorStatus` no `main` em vez do worktree. Corrigido por decisão do João: cherry-pick do commit
para o branch do worktree + `git reset --hard` do `main` de volta ao commit do plano (árvore do main
estava limpa, nada perdido). Dispatches seguintes reescreveram os caminhos para o worktree.

Gate da Task 11: `git diff --name-only main...HEAD -- backend/` vazio (D1 preservado); os 3 greps da
lei §5.6 (import cruzado `catalog`↔`identity`, `primereact` direto em feature) sem saída; `pnpm
build` + `pnpm lint` verdes; suíte backend 347 passed (1083 assertions) como regressão, nenhum
arquivo de `backend/` tocado. Prova visual do João aceita nos 6 critérios comportamentais do DoD
(spec §7), dois temas, 1400px e 768px.

Ledger de execução: `.superpowers/sdd/progress.md` (task a task, dentro do worktree).

Próxima ação: solicitar review do bloco (não iniciada automaticamente por este comando).

## Último item fechado — 2026-08-01

`foto-avatar-e-contatos-cliente` — bloco único juntando os itens 1 e 2 do backlog por decisão do
João. Spec de 15 decisões (D1–D15), plano de 12 tasks; Parte A (backend, Tasks 1–4) pelo Codex,
Parte B (frontend, Tasks 5–12) por Claude com `subagent-driven-development`. Commits `4dfe3a9`..
`73870b0`.

**Entrega:** `photo_url` (`#[Computed]`) nos 4 contratos (User/Client/Redator/Student);
`UserPhotoService` guarda a foto em `users.photo_path`, FORA de `files` — foto não é documento, não
vence, não habilita turma, não entra em certificado (D3). 8 rotas nested, uma por módulo dono, para
não recriar acoplamento RBAC cross-módulo (D1). `AppAvatar` com fallback duplo (D7: a URL
pré-assinada expira, e círculo vazio parece defeito, não "sem foto"), `AppPhotoField` +
`useEntityPhoto` (buffer no create D10, `flush` nunca lança D11), avatar nas 4 tabelas, contatos do
cliente em cards com exclusão e mínimo de 1 (D12–D14).

**Dois achados críticos apareceram só na prova visual do João, depois do DoD:**
`UploadedFile::store()` devolve `false` sem lançar — `photo_path` virava `'0'` e o objeto anterior,
que ainda funcionava, era apagado (`9197d08`; 2 clientes reais de dev ficaram assim). E não existe
valor único de `AWS_ENDPOINT` que sirva para escrita e leitura: resolvido assinando a leitura contra
um disco `{disco}_public` separado (`b6dc068`), no mesmo choke point que os documentos de
redator/turma/orçamento já usavam.

**Dois reviews, de duas lentes cada** (Claude + `mcp__codex__codex` read-only). O primeiro sobre
`4dfe3a9..b6dc068`: 7 achados, dos quais **Q1 era falso positivo** — medido, o resolver do spatie
desvia do `CannotSetComputedValue` quando a propriedade é promovida no construtor. Reais: o mínimo
de 1 contato escapava pela rota nested `DELETE /api/contacts/{id}`, e a rota de foto do staff
aceitava `User` de qualquer tipo, driblando a permissão do módulo dono. O segundo, sobre a própria
rodada de correção (`34ab3c2`): 4 achados aprovados — o gate de fechamento não cobria o botão
**Salvar** (quarta saída do diálogo), o retry ressurgia no erro de TAMANHO reenviando o arquivo
errado, o teste do Q5 provava menos do que o Q5 pedia, e o `closeBlocked` sem `timeout` no axios
virava trava dura.

**Lição 10 reapareceu dentro do fix da própria lição 10:** o teste novo de auditoria passou VAZIO na
primeira prova — sem `photo_path` no diff, todos os valores viram `null`, e `null === null` aprova
tudo. Só com `assertNotNull` nos caminhos ele foi visto reprovando.

**Gate de fechamento:** DoD e correções provados contra API real com sessão Sanctum (contato único →
`422` sem apagar; `DELETE` com 3 contatos → `204`; `/api/users/{userDeCliente}/photo` → `404` sem
tocar a foto; `POST /api/clients/1/photo` → `204` e a URL pré-assinada devolvendo `200 image/png`;
`contacts: []` → `422` com os contatos intactos). Suíte 347 passed (1083 assertions), `pnpm build` +
`pnpm lint` verdes, Pint limpo nos 19 arquivos PHP do bloco, `generated.ts` regenerado sem diff.
Prova visual do João aceita.

Arquivado: `plans/archive/2026-07-31-foto-avatar-e-contatos-cliente.md` ·
`specs/archive/2026-07-31-foto-avatar-e-contatos-cliente-design.md` ·
`context-packets/foto-avatar-e-contatos-cliente.md` (`partial` — as 4 imagens de referência eram
caller-held e **nunca foram fornecidas**; o bloco entregou sem elas).

**Aberto, registrado, não resolvido:** P-24 em `docs/pendencias.md` (a compensação do
`UserPhotoService::store()` pode apagar o objeto novo se a auditoria lançar depois do UPDATE já ter
commitado) e, no `backlog.md`, Q-5 (check-then-act sem lock no mínimo de contatos — divergência de
severidade declarada com a segunda lente) e Q-6 (idioma das mensagens de `ValidationException`
inconsistente no repo, pré-existente).

## Penúltimo item fechado — 2026-07-31

`hardening-upload-visualizacao-arquivos` — 11 tasks, execução em 2 partes: Tasks 1–4
(infra+backend) pelo Codex, Tasks 5–10 (frontend) por Claude, ambas com
`subagent-driven-development`. Commits `dfadb0c`..`f271c12` (execução), `faf7c78` (fix de review),
`8a592f1` (transição pós-review).

**Entrega:** o erro reportado como CORS era `client_max_body_size` de 1 MB (default do nginx)
cortando o upload antes do Laravel — as 4 camadas (nginx/PHP/Laravel/frontend) discordavam de
teto. Nginx e PHP sobem para 12 MB de transporte (folga de multipart, D2); o `max:10240` (10 MB)
dos 5 controllers, já existente, passa a ser sempre quem rejeita, com envelope RFC 7807 e header
CORS. `TurmaDocumentData` e `RedatorDocumentData` sobem ao núcleo comum de `FileData` (`mime`,
`size`/`created_at`, `download_url`) — a turma ganhou download, que não tinha. `shared/ui` ganha
`AppFileRow` + `AppFilePreviewDialog` (imagem/PDF inline, fallback explícito nos demais tipos —
D9), adotados pelos 4 consumidores; `AppFileUpload` barra arquivo acima do teto antes da
requisição (D4). Um achado de review virou decisão do João: a Task 9 só colara um botão de
preview em vez de adotar `AppFileRow` — corrigido por completo (`474f97d`).

**Review de alto risco** (Codex tocou infra+backend na Parte A): segunda lente via
`mcp__codex__codex` (read-only) sobre `dfadb0c..f271c12` encontrou 1 achado real —
`UploadSizeLimitTest` só cobria cotação e orçamento, sem regressão do teto de 10 MB em redator,
turma e import de matrícula (D11). João aprovou a correção; fix em `faf7c78` (3 casos novos,
suíte 321 passed).

**DoD provado contra API real, sessão Sanctum autenticada:** 5 MB → `201`; 11 MB →
`422 application/problem+json` com `detail: "El campo file no debe ser mayor que 10240
kilobytes."` (nunca `413` opaco, header CORS presente); `GET /api/turmas/1/documents` expõe
`mime`+`download_url`; `GET /api/redatores/1` expõe `mime`+`size`+`created_at` nos documentos.
Suíte 321 passed, `pnpm build`+`pnpm lint` verdes, Pint limpo. Prova visual do João (preview de
imagem, preview de PDF, fallback `.docx`, upload de 3 MB) aprovada nos 4 consumidores
(orçamento, cotação, turma, redator).

Arquivado: `plans/archive/2026-07-31-hardening-upload-visualizacao-arquivos.md` ·
`specs/archive/2026-07-31-hardening-upload-visualizacao-arquivos-design.md` ·
`context-packets/hardening-upload-visualizacao-arquivos.md` (`partial`, não bloqueante — as 4
imagens de referência eram caller-held, o João as forneceu na sessão de planejamento).
Histórico completo: `docs/superpowers/progress.md`.

**Gatilhos abertos que este bloco não resolveu** (fora de escopo por decisão da spec, sem
alteração silenciosa): autorização/RBAC dos endpoints de arquivo; política de retenção documental
(P-02); débito do arquivo órfão no MinIO em rollback de transação (pré-existente, backlog);
código próprio de turma (P-13); URL pré-assinada/ADR-11 (nenhuma mudança de modelo).

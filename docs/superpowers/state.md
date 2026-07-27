---
schema_version: 1
active_feature: pessoas-alunos
active_work_item: bloco-alunos-modulo
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
last_completed_work_item: bloco-visual-refino-ui
state_basis_commit: 34a8c94
active_spec: docs/superpowers/specs/2026-07-27-bloco-alunos-modulo-design.md
active_plan: docs/superpowers/plans/2026-07-27-bloco-alunos-modulo.md
context_packet: docs/superpowers/context-packets/bloco-alunos-modulo.md
blocker: null
resume_state: null
context_packet_status: partial
updated_at: 2026-07-27
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


## Item ativo — `bloco-alunos-modulo`

Promovido do backlog (item 1, "Pessoas · Alunos") por decisão explícita do João em 2026-07-27.
Módulo novo **backend + frontend**: hoje a aba Alunos de `PeoplePage` é um `<p>` inline e não existe
endpoint de aluno — o domínio tem só `Identity/Models/Student.php` e
`Identity/Services/StudentResolver.php`, consumidos pela matrícula.

Não é refino visual: nasce já no padrão de `shared/ui` entregue em 2026-07-27.

Packet: rota Codex, **condicionada** a uma sondagem prévia dos conectores (Drive, Figma, Notion,
GitHub) no runtime dele — decisão do João em 2026-07-27, motivada pelo v1 do
`bloco-visual-refino-ui`, que voltou `blocked` por gap de tooling e não por ausência de fonte.
A sondagem passou nos 4: **Notion responde neste runtime** (`mcp__codex_apps__notion_*`, base
`Tasks · Lotus Fase 2` encontrada), contra o que o `AGENTS.md` §3 registrou em 2026-07-23 — a
verificação de lá venceu e o `.agents/skills/lotus-context-packet/SKILL.md` ainda afirma
"Notion is not loaded in this runtime".

Packet `partial` em `context-packets/bloco-alunos-modulo.md`, v2 — o v1 foi rejeitado por três
violações do contrato de validação (tabela `student_client_links` inexistente, decisão do João
fabricada sobre CRUD, `identity.user.*` como constraint sem lastro no `PermissionCatalog`).
Duas perguntas abertas entram no brainstorming: alcance CRUD e permissão do módulo. Prints do
protótipo, anexados pelo João, entram como fonte `PROTO` — o Codex não os alcança.

**Execução — Tasks 1-5 (backend, Codex) concluídas em 2026-07-27**, commits `93f415e`, `7a3a1b8`,
`ddf22db`, `05d8ec9`, `aacd13b`. Bloqueou uma vez no meio do caminho: a primeira tentativa via
`mcp__codex__codex` (sandbox `workspace-write`) e a retentativa via `mcp__codex__codex-reply` (que
não tem parâmetro `sandbox` — herda o da sessão original) apanharam
`permission denied ... /var/run/docker.sock`, já que o container `app` exige o socket Docker para
o ciclo TDD do plano. `state.md` foi a `blocked` no commit `0cfd369`. Resolvido reabrindo uma
sessão **nova** de `mcp__codex__codex` com `sandbox: danger-full-access` (sessão, não reply — o
parâmetro só é aplicado na abertura); a primeira chamada com esse sandbox foi barrada pelo
classificador de auto mode do próprio Claude Code, destravada com aprovação explícita do João.
Diff revisado por Claude contra o plano e `.claude/rules/backend-ddd.md`/`generated-types.md`:
302 testes verdes (suíte completa, rodada de novo pelo Claude, não só reportada pelo Codex), Pint
limpo, `git diff --name-only` só nos `paths_autorizados`. Três desvios do código literal do plano,
todos registrados pelo Codex e verificados: (1) `client_id` ausente no `store` não virava 422 —
`rules()` usa `sometimes` porque o mesmo DTO serve o `update`, que não deve exigir `client_id`;
adicionado guard explícito em `CreateStudentAction` lançando `ValidationException`, com teste novo
(`test_cliente_e_obrigatorio_no_cadastro`), fechando D3; (2) `sortByDesc('started_on')` no
`StudentDetailData` não desempatava dois vínculos abertos no mesmo dia — trocado por
`sortBy([['started_on','desc'],['id','desc']])`; (3) dois fixtures de teste da Task 2 criavam
aluno sem RUT (campo obrigatório no DTO) e o RUT de exemplo `12.876.543-K` da Task 5 falha
`ValidRut` — ajustados para RUTs válidos.

**Tasks 6-10 (frontend, Claude) concluídas em 2026-07-27**, commits `f4c1900`, `d939a63`,
`2646c02`, `06700c8`, `42c6366`, `d1db604`. Sem desvios do plano. DoD (spec §7, 6 itens) provado
via HTTP real autenticado (Sanctum, sem browser tool na sessão) — detalhe em
`.superpowers/sdd/progress.md`. Um achado registrado como minor, não bloqueante: `client_id`
inválido enviado no `update` (a UI nunca manda esse campo lá) recebe 422 do DTO antes de chegar
em `UpdateStudentAction`, que o ignoraria — inconsistência latente entre validação do DTO e regra
da Action, sem efeito prático hoje.

**Fix pós stop-gate review do Codex em 2026-07-27**, commit `14ca1a9`. 3 achados reais: (1)
`toFields()` zerava `client_id` ao entrar em view/edit — dropdown de empresa aparecia vazio mesmo
com vínculo existente; (2) o dropdown de empresa em view/edit dependia de `commercial.client.view`
via `clientsApi`, permissão sem relação com `identity.user.*` (o resto do módulo) — quem tivesse
`identity.user.view`/`update` sem `commercial.client.view` batia 403 silencioso; (3) botão Editar
do dialog aparecia sem checar `identity.user.update`. Corrigido trocando o dropdown por texto
read-only (`current_client_name`, já vem no `StudentData`) fora do create, gate duplo
(`identity.user.create` + `commercial.client.view`) no botão "Nuevo alumno", e Editar gated por
`identity.user.update` (mesmo padrão de `RoleDialog`/`StaffUserDialog`). build+lint verdes.

**Correção do fix anterior, mesmo dia, commit `3e0bc36`.** O gate duplo do botão "Nuevo alumno"
(`identity.user.create` + `commercial.client.view`) foi ele mesmo um achado do stop-gate review
seguinte: contradiz D8 da spec e o `StudentController` real, que só exige `identity.user.create`
no `store` — escondia o botão de quem tinha a permissão certa. Revertido para só
`identity.user.create`. O problema de origem (dropdown de cliente sem relação de permissão com o
resto do módulo) fica resolvido tornando a falha **visível** em vez de escondida: dropdown
desabilitado + `clients.error.detail` no `FormField` quando `clientsApi` falha, em vez de opções
vazias sem explicação ou do botão sumir para quem tem autorização real. Não há caminho para
alinhar as permissões de fato sem decisão do João sobre RBAC/spec — fora do escopo desta sessão.

**Terceiro fix, mesmo dia, commit `10043dc`.** Achado seguinte: com o dropdown desabilitado e a
query de clientes sem retry automático, o usuário ficava sem saída — só fechando o dialog (e
perdendo nome/RUT/email já digitados) pra tentar de novo. `CrudDialog` ganhou prop opcional
`disabled` (repassada ao botão salvar, sem efeito nos outros 6 consumidores que não a passam);
`StudentDialog` ganhou botão "Reintentar" chamando `clients.refetch()` sem fechar o dialog, e o
submit fica desabilitado enquanto `clients` está carregando ou com erro.

**Quarto fix, mesmo dia, commit `03280c6`.** O gate por `clients.isError` do fix anterior travava
demais: a TanStack Query mantém `clients.data` do último fetch bem-sucedido mesmo quando um
refetch em background falha, então um erro depois do próprio retry manual (ou refoco de aba)
desabilitava dropdown e submit mesmo com lista utilizável em cache. Trocado por
`clientsUnusable = mode === 'create' && !clients.data` — bloqueia só quando não há opções de
verdade (primeiro load ou erro sem cache prévio); o aviso de erro + retry continuam aparecendo
sempre que `isError`, agora sem bloquear nada quando há dado utilizável.

**Quinto fix, mesmo dia, commit `6654ce2`.** Dois achados reais, um deles fora do escopo do
`StudentDialog` propriamente: `useLogout()` (`features/identity/api/authApi.ts`) só limpava o
`sessionStore`, nunca o `QueryClient` global — dado em cache de QUALQUER recurso sobrevivia ao
logout na mesma aba, atravessando a fronteira de autorização de um usuário pro outro (o cliente
que o usuário anterior podia ver aparecendo pro seguinte, mesmo sem a permissão). Adicionado
`queryClient.clear()` no `onSuccess` do logout. Segundo achado, local: `clientsUnusable` checava
só `!clients.data`, mas `[]` é truthy — uma lista vazia bem-sucedida contava como "utilizável" e
habilitava o submit sem opção nenhuma pra escolher. Trocado por `!clients.data?.length` + mensagem
explícita (`student.noClientsAvailable`, 3 locales) quando a lista volta vazia sem erro.

Bloco **completo, todas as 10 tasks**; próxima ação é revisão (fora deste comando).

## Último item fechado — 2026-07-27

`bloco-visual-refino-ui` — 39 tasks em 4 partes, cada uma com review próprio, worktree própria e
prova visual do João antes do merge. Fechado com `/fechar-sprint` em 2026-07-27; histórico da
entrega em `progress.md`, decisões em `specs/archive/2026-07-26-bloco-visual-refino-ui-design.md`
(D1–D21) e passo a passo em `plans/archive/2026-07-26-bloco-visual-refino-ui.md`.

Merges: Parte 1 `bad3066`, Parte 2 `72ed668`, Parte 3 `29fd9b8`, Parte 4 `ff6bb3a`. As 4 branches
`worktree-bloco-visual-p1..p4` ficam preservadas; as worktrees foram removidas no fechamento.

O que o fechamento moveu, além do arquivamento:

- **P-11 encerrada** — `grep -rn "window.confirm" frontend/src` em zero.
- **P-13 mantida aberta com gatilho novo** — o gatilho antigo ("decisão do João no planejamento do
  bloco visual") venceu e produziu a decisão D8: a coluna fica com `quote_code`. O gatilho agora é
  pedido da Lotus por identificador próprio de turma, o que vira task de backend.
- **Débito novo no backlog** — toggle da sidebar sem efeito abaixo de 1024px corrompendo o
  `sidebarCollapsed` persistido (trade-off previsto pela Task 37; João decidiu manter em 2026-07-27).
- **Dois débitos antigos removidos** por terem sido resolvidos no bloco: `CatalogPage` com
  `ModuleTabs` de uma aba só, e títulos de módulo derivados da entidade errada (namespace `module.*`
  da Task 9).

**Gatilhos vencidos que este bloco não podia resolver** (backend/processo, decisão do João):

- **P-04** — "reavaliar quando a Sprint 3 fechar"; a Sprint 3 fechou em 2026-07-23 e a reavaliação
  dos guardrails (Pest Arch tests + eslint-boundaries) nunca aconteceu.
- **P-06** — "doc-sync da Sprint 3"; o `der-fisico.md` ainda modela `turmas.redator_id` como FK 1:N
  contra o pivot `turma_redator` N:N implementado. Nenhum bloco visual toca schema.

Ambas seguem abertas em `docs/pendencias.md`, sem alteração silenciosa.

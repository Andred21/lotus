---
schema_version: 1
active_feature: pessoas-alunos
active_work_item: bloco-alunos-modulo
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
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

---
schema_version: 1
active_feature: null
active_work_item: hardening-doc-sync-sprint4
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
last_completed_work_item: bloco-alunos-modulo
state_basis_commit: 74e4a2d
active_spec: docs/superpowers/specs/2026-07-30-hardening-doc-sync-sprint4-design.md
active_plan: docs/superpowers/plans/2026-07-30-hardening-doc-sync-sprint4.md
context_packet: docs/superpowers/context-packets/hardening-doc-sync-sprint4.md
blocker: null
resume_state: null
context_packet_status: ready
updated_at: 2026-07-30
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


## Item ativo — `hardening-doc-sync-sprint4`

Promovido do backlog (item 1, "Hardening · H.1.3.1 — Sincronização de documentação e fontes
canônicas") por decisão explícita do João em 2026-07-30. Escopo declarado no backlog: auditar
código ↔ `/docs` ↔ Drive ↔ Notion, reconciliar divergências, identificar decisões sem proveniência
ou sem ciência do João, atualizar a documentação interna, aplicar somente writes externos
explicitamente autorizados, reexecutar a auditoria e registrar as pendências não resolvidas.

Bloco de documentação e proveniência, não de feature: o insumo principal é externo (Drive canônico,
Notion, Figma) confrontado com o repositório, então o Context Packet é pré-requisito e vai pela
rota Codex. `active_spec` e `active_plan` seguem `null` até o planejamento.

Packet `ready` em `context-packets/hardening-doc-sync-sprint4.md`, aceito de primeira: 5 fontes
recuperadas (4 documentos do Drive canônico + a task H.1.3.1 no Notion), provenance conferida contra
`git hash-object` local. Dois achados do packet importam para o planejamento: a task do Notion está
sem critério de aceite, então o escopo do backlog é a definição mais completa que existe; e o Notion
**responde** neste runtime, contra o que `.agents/skills/lotus-context-packet/SKILL.md` §External
retrieval e o `AGENTS.md` §3 ainda afirmam — a própria doc de agentes é divergência a reconciliar
neste bloco. Figma não foi consultado por decisão declarada (bloco não é de UI). Questão aberta
não bloqueante: espelhar no Drive ADR-15 revisado, ADR-16/18/19, schema N:N e rota `/students`
exige autorização explícita do João antes de qualquer write externo.

Plano em `plans/2026-07-30-hardening-doc-sync-sprint4.md`: 14 tasks, `executor: claude`. Tasks 1–6
levantam sem mudar nada, **Task 7 é portão humano** (nenhuma task de 8 a 13 começa sem a triagem
commitada), Tasks 8–13 aplicam e a Task 14 prova reexecutando a auditoria. O Codex entra só na
sondagem de escrita externa (Task 1) e, se ela provar capacidade, no write do Drive (Task 12), sempre
sem tocar o repositório. O subagente `auditor-docs` roda nas Tasks 2 e 14.

Gatilhos vencidos que este bloco tende a encostar (hoje abertos em `docs/pendencias.md`): **P-04**
(reavaliação dos guardrails após a Sprint 3), **P-06** (`der-fisico.md` ainda modela
`turmas.redator_id` 1:N contra o pivot `turma_redator` N:N) e **P-14/P-15/P-16**, nascidas no
fechamento do `bloco-alunos-modulo`. O que entra no escopo é decisão do planejamento, não deste
arquivo.

## Último item fechado — 2026-07-27

`bloco-alunos-modulo` — 10 tasks (backend 1–5 pelo Codex, frontend 6–10 por Claude), executadas no
main tree (P-03). Histórico da entrega em `progress.md`; decisões em
`specs/archive/2026-07-27-bloco-alunos-modulo-design.md` (D1–D11), passo a passo em
`plans/archive/2026-07-27-bloco-alunos-modulo.md`, packet em
`context-packets/bloco-alunos-modulo.md` (`partial`), ledger fino em `.superpowers/sdd/progress.md`.

Provas do gate de fechamento (contra a API real, Sanctum, banco restaurado ao final): criação
gerando `User` inativo `type=aluno` + `current_client_id` + primeira linha de `student_client_logs`
com `ended_on` nulo (DoD-1); RUT repetido em 422 com causa, sem associação silenciosa (DoD-2);
edição de nome refletida no detalhe sem mexer no vínculo (DoD-3); detalhe do aluno 1 do seeder com
vínculo atual, anterior fechado e turma com `approval_status` (DoD-4); os 4 endpoints em 403 para
usuário sem permissão (DoD-6). 313 testes verdes, Pint limpo nos 23 arquivos PHP da sprint,
`pnpm lint` e `pnpm build` verdes, `typescript:transform` sem drift no `generated.ts`.

O que o fechamento moveu, além do arquivamento:

- **P-14, P-15 e P-16 nascem** em `docs/pendencias.md` — as três divergências declaradas na spec
  (rota `students` vs. `alunos` do Drive; certificados fora da listagem e do detalhe até o Bloco 7;
  `Redactores` continua sendo a primeira aba), cada uma com gatilho próprio.
- **P-07 e P-12 saem** da tabela "Encerradas" — cumpriram a sprint de rastro.
- O desalinhamento de RBAC entre `identity.user.*` e `commercial.client.view` **segue aberto no
  backlog**, em "Débitos técnicos". Exige decisão do João sobre RBAC/spec; não é resolvível na UI.

**Gatilhos vencidos que este bloco não resolveu** (seguem abertos em `docs/pendencias.md`, sem
alteração silenciosa — os mesmos dois que o fechamento anterior reportou):

- **P-04** — "reavaliar quando a Sprint 3 fechar"; a Sprint 3 fechou em 2026-07-23 e a reavaliação
  dos guardrails (Pest Arch tests + eslint-boundaries) continua sem acontecer.
- **P-06** — "doc-sync da Sprint 3"; `der-fisico.md` ainda modela `turmas.redator_id` como FK 1:N
  contra o pivot `turma_redator` N:N implementado. Este bloco não tocou schema.

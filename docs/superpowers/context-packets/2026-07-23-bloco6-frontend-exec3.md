---
schema_version: 1
packet_id: lotus-context-packet-bloco6-frontend-exec3
block_id: bloco6-frontend-exec3
status: partial
generated_at: 2026-07-23T04:43:53-03:00
base_ref: chore/lotus-operational-state
base_commit: fb69bbaacd8ac339524652af26f443e72342fcb0
state_path: docs/superpowers/state.md
state_blob_sha: 36b913b7f0d3e76d04e047f90ece795cc50b6824
progress_path: docs/superpowers/progress.md
progress_blob_sha: 4f2008bdd499caa8b5c8e25ccd13e2bf3a76ac3c
plan_path: null
plan_blob_sha: null
spec_path: docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md
spec_blob_sha: 0815e8e5418835b23e9d8e7b8803fe084ce1f551
word_budget: 1200
---

# Context Packet — Bloco 6 Frontend · Exec 3 — Docs + conclusão

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
> Os hashes do frontmatter são **procedência** — registram o que foi lido na geração. O commit que
> armazena este packet também move `state.md` para `ready_for_planning`; essa transição não torna o
> packet obsoleto.

## Scope

**Goal:** Planejar a Exec 3 da interface de Operação: aba `Documentación`, conclusão da turma, abertura do manual PDF e fechamento da pendência P-07 de i18n.

**Non-goals:** alterações de backend; interface própria do redator; escrita de notas, presença ou aprovação; feedbacks; certificação além do aviso pós-conclusão; templates gerados por código; ancoragem cross-module genérica; seed operacional, que permanece task final separada.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| REQ | João Victor | Instrução atual para regenerar `bloco6-frontend-exec3` | 2026-07-23 | available | Estado efetivo, limites read-only e disponibilidade das fontes |
| STATE | Git | `docs/superpowers/state.md` | 2026-07-23 | available | Work item, ponteiros, bloqueio anterior e `resume_state` |
| PROGRESS | Git | `docs/superpowers/progress.md` | 2026-07-22 | available | Confirmar Exec 1 e Exec 2 entregues |
| SPEC | Git | `docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md` | 2026-07-21 | available | Escopo, decisões e critérios de aceite da Exec 3 |
| DRIVE | Google Drive | `Viagem Chile/Projetos/Lotus.cl/V2` | unknown | unavailable | Planejamento canônico externo |
| FIGMA | Figma | Protótipo do módulo Operacional citado pela spec | unknown | unavailable | Referência visual externa |
| NOTION | Notion | `Lotus/Lotus-Desenvolvimento/Tasks-Lotus Fase 2` | unknown | unavailable | Organização de tasks |

## Key facts

1. A Exec 3 entrega `Documentación`, `Conclusión`, manual PDF e P-07; não requer toque de backend. `[SPEC]`
2. `Documentación` usa somente `MANUAL`, `PRUEBAS` e `EVALUACION_REDATOR`, aceita múltiplos arquivos por tipo, mostra progresso e deriva a habilitação; upload e remoção ficam bloqueados após conclusão. `[SPEC]`
3. A conclusão permanece desabilitada até a turma estar `habilitada`, informa `missing_document_types`, exige confirmação irreversível e, no sucesso, anuncia certificados disponíveis para emissão. `[SPEC]`
4. O manual deve abrir o PDF fornecido pelo endpoint existente; documentos, conclusão e manual consomem contratos backend já entregues. `[SPEC]`
5. P-07 exige traduções das permissões `operation_enrollment_manage`, `operation_turma_submit_docs` e `operation_turma_complete`, além do namespace `operation.*`, com chaves idênticas em pt-BR, es-CL e en. `[SPEC]`
6. O aceite exige `pnpm build`, `pnpm lint` e prova do comportamento na UI contra o backend real, incluindo os três tipos documentais, habilitação derivada, conclusão e ausência de chaves cruas no picker de Roles. `[SPEC]`
7. Exec 1 e Exec 2 já foram entregues; a Exec 3 é o work item ativo e ainda não possui plano. `[PROGRESS]` `[STATE]`
8. `bloco6-frontend-exec3` é split interno da sprint; ausência de task 1:1 no Notion é esperada. A spec já contém escopo, decisões e aceite, logo as fontes externas indisponíveis tornam o packet `partial`, não `blocked`. `[REQ]` `[SPEC]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Bloqueio anterior por Notion | O bloqueio registrado decorreu de uma task 1:1 não localizada | Não há fato necessário ausente; ausência da task é não bloqueante | Regra explícita atual e cobertura integral da spec `[REQ]` `[STATE]` `[SPEC]` |
| Taxonomia documental 4×3 | O protótipo Figma mostrava quatro rótulos exploratórios | Permanecem os três tipos do backend | Decisão D6 registrada por João na spec `[SPEC]` |
| Estado para esta geração | `workflow_state: blocked` | Tratar como `context_required`, sem editar o estado | `resume_state: context_required` e instrução explícita atual `[REQ]` `[STATE]` |

## Constraints

- Geração estritamente read-only; nenhuma alteração de arquivo, commit, branch ou estado.
- Working tree estava limpo na geração.
- `active_plan` permanece `null`; o packet não deve inventar etapas de implementação.
- Preservar a taxonomia legal dos três documentos e o caráter irreversível da conclusão.
- Drive, Figma e Notion não podem ser substituídos por busca web ou fontes alternativas.

## External acceptance signals

- Nenhum sinal externo adicional foi recuperado porque os três conectores estão indisponíveis.
- A spec disponível fornece aceite suficiente: três tipos documentais com progresso e habilitação derivada; conclusão protegida e irreversível; manual PDF; P-07 traduzida; build, lint e validação na UI real. `[SPEC]`

## Open questions

- None blocking.

## Deferred

- Seed operacional permanece task final após a Exec 3. `[SPEC]`
- Templates gerados por código, ancoragem cross-module genérica e eventual revisão da taxonomia 4×3 dependem de decisões futuras. `[SPEC]`

## Staleness triggers

- `active_work_item` deixar de ser `bloco6-frontend-exec3`, ou `active_spec` apontar para outro
  arquivo.
- Edição da spec ativa que altere escopo, aceite ou constraint da Exec 3.
- Disponibilização de Drive, Figma ou Notion com fatos materiais mais novos ou divergentes.
- Nova decisão sobre taxonomia documental, conclusão, permissões ou critérios de aceite —
  em especial reabertura da decisão D6.

Não são gatilhos: a transição que promove este packet, o commit que o armazena, nem qualquer edição
de `state.md` que apenas mova `workflow_state`, `next_owner`, `next_action`, `context_packet`,
`blocker` ou `resume_state`.

---
schema_version: 1
packet_id: lotus-context-packet-bloco6-frontend-exec3
block_id: bloco6-frontend-exec3
status: partial
generated_at: 2026-07-23T05:05:36-03:00
base_ref: chore/lotus-operational-state
base_commit: d0b8f0493d77cc0eb96ede7950bb0f0e97832189
state_path: docs/superpowers/state.md
state_blob_sha: 8b9fc246dba84716021793dcaf99ace9fa9f1724
progress_path: docs/superpowers/progress.md
progress_blob_sha: e160e1a0beec4d3099e1b07ffdf9141586d5d0a1
plan_path: null
plan_blob_sha: null
spec_path: docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md
spec_blob_sha: 0815e8e5418835b23e9d8e7b8803fe084ce1f551
word_budget: 1200
---

# Context Packet — Bloco 6 Frontend · Exec 3 — Docs + conclusão

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
> Os hashes do frontmatter são **procedência** — registram o que foi lido na geração. A transição
> que promove este packet não o torna obsoleto.

## Scope

**Goal:** Planejar a Exec 3 da interface de Operação: aba `Documentación`, conclusão da turma, abertura do manual PDF e fechamento da pendência P-07 de i18n.

**Non-goals:** alterações de backend; interface própria do redator; escrita de notas, presença ou aprovação; feedbacks; certificação além do aviso pós-conclusão; templates gerados por código; ancoragem cross-module genérica; seed operacional, que permanece task final separada.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| REQ | João Victor | Instrução atual para regenerar `bloco6-frontend-exec3` | 2026-07-23 | available | Escopo read-only, fontes obrigatórias e regras de reconciliação |
| STATE | Git | `docs/superpowers/state.md` | 2026-07-23 | available | Work item, estado e ponteiros ativos |
| PROGRESS | Git | `docs/superpowers/progress.md` | 2026-07-23 | available | Histórico das Execuções 1 e 2 |
| SPEC | Git | `docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md` | 2026-07-21 | available | Escopo, decisões e aceite da Exec 3 |
| DRIVE-RN | Google Drive | `requisitos-negocio.md` (`1Yk2qFtSBxasiMVatzWzIeipAKeXu5di5`) | 2026-06-09T14:58:52Z | available | Requisitos de turma, documentação, feedback e certificação |
| DRIVE-MOD | Google Drive | `modulo-operacao.md` (`10cZLkhVSswTbJYIiE7kVM8CVi-cE9gEA`) | 2026-06-14T19:14:31Z | available | Fronteira do módulo e terminologia documental |
| DRIVE-UI | Google Drive | `tela-turmas.md` (`1151kuUKZOv-8dUMAJJS62lGG3n0ZqG3w`) | 2026-06-16T15:54:22Z | available | Fluxo da tela, erros e sinais de aceite |
| DRIVE-ENTITY | Google Drive | `entidade-turma.md` (`1LkyQr_g-xqW0-XPpGShPfhLZXHo9v6oJ`) | 2026-06-12T18:06:30Z | available | Estados, RN-15 e RN-16 |
| DRIVE-FLOW | Google Drive | `fluxos.md` (`1XRpMw2MF7hKUwg2tpIR52CcG97tSbRrM`) | 2026-06-19T14:29:39Z | available | Máquina de estados e handoff para certificação |
| FIGMA | Figma | Protótipo Operacional citado pela spec | unknown | not located | O conector respondeu via `whoami`, mas a spec, o repositório e as buscas no Drive não forneceram URL ou file key consultável |
| NOTION | Notion | Task 1:1 de `bloco6-frontend-exec3` | unknown | unavailable | Evidência: descoberta de tools não retornou nenhuma no namespace esperado (`notion` / `mcp.notion.com`); não houve chamada a falhar. Não bloqueante: split interno não tem task 1:1 |

## Key facts

1. A Exec 3 entrega `Documentación`, `Conclusión`, manual PDF e P-07, sem toque de backend. `[SPEC]`
2. A documentação operacional é composta por manual, provas e avaliação do redator; a spec fixa os contratos `MANUAL`, `PRUEBAS` e `EVALUACION_REDATOR`, com múltiplos arquivos por tipo, progresso e habilitação derivada. `[DRIVE-MOD]` `[DRIVE-UI]` `[SPEC]`
3. O ciclo canônico é `em andamento → habilitada → concluída`: documentação completa habilita; o admin confirma; após conclusão, notas e presenças ficam imutáveis e matrículas aprovadas tornam-se certificáveis. `[DRIVE-ENTITY]` `[DRIVE-UI]` `[DRIVE-FLOW]`
4. O manual é gerado sob demanda e a Exec 3 apenas abre o PDF fornecido pelo contrato backend existente. `[DRIVE-MOD]` `[DRIVE-UI]` `[SPEC]`
5. Nesta sprint, uploads documentais ficam na interface admin/superadmin; a interface própria do redator permanece futura, preservando o alvo final descrito no Drive. `[DRIVE-MOD]` `[DRIVE-UI]` `[SPEC]`
6. P-07 exige traduções de `operation_enrollment_manage`, `operation_turma_submit_docs` e `operation_turma_complete`, além de chaves `operation.*` idênticas em pt-BR, es-CL e en. `[SPEC]`
7. O aceite exige os três tipos documentais, habilitação derivada, bloqueio antes de `habilitada`, confirmação irreversível, toast, manual PDF, ausência de chaves cruas, `pnpm build`, `pnpm lint` e prova na UI contra o backend real. `[SPEC]`
8. Execuções 1 e 2 estão entregues; Exec 3 é o item ativo e `active_plan` permanece `null`. `[PROGRESS]` `[STATE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Ator do upload | Drive descreve o redator enviando documentos em sua interface | Admin/superadmin fazem o upload nesta fase; interface do redator fica futura | Drive descreve o alvo final; a spec posterior delimita explicitamente o split atual, sem cancelar o fluxo futuro `[DRIVE-MOD]` `[DRIVE-UI]` `[SPEC]` |
| Feedback como gate | O fluxo antigo exige documentação e feedback completos para habilitar | Exec 3 usa somente os três tipos documentais do backend; feedbacks ficam fora desta sprint | A spec declara `Feedbacks (RF-FBK) → sprint futura` como não-escopo, e a habilitação consumida é a derivada pelo backend. **Não** decorre de D6, que trata apenas da taxonomia documental `[DRIVE-RN]` `[DRIVE-FLOW]` `[SPEC]` |
| Protótipo 4×3 | O arquivo Figma não foi localizável; a spec registra indiretamente quatro rótulos exploratórios nos prints | Permanecem `MANUAL`, `PRUEBAS` e `EVALUACION_REDATOR` | Decisão D6 posterior de João já fechou a divergência; ausência de nova evidência não a reabre `[SPEC]` |

## Constraints

- Operação estritamente read-only; working tree permaneceu limpo.
- `active_plan` é `null`; o packet não inventa etapas de implementação.
- Preservar os três tipos documentais e o caráter terminal da conclusão.
- Planejamento não pode introduzir feedbacks, interface do redator, backend ou seed na Exec 3.
- Figma é indireto, e Notion é indisponível, mas nenhum fato necessário depende dessas fontes.

## External acceptance signals

- O Drive exige painel do estado documental, botão de conclusão habilitado somente em `habilitada`, erro 422 com pendências e blindagem após conclusão. `[DRIVE-UI]` `[DRIVE-ENTITY]`
- A conclusão faz o handoff Operação→Certificação, tornando certificados de matrículas aprovadas emissíveis; financeiro não integra esse gate. `[DRIVE-UI]` `[DRIVE-FLOW]`
- A spec acrescenta confirmação irreversível, toast, abertura do manual e validação dos locales na UI real. `[SPEC]`

## Open questions

- None blocking.

## Deferred

- Interface do redator, feedbacks e seed operacional permanecem entregas futuras. `[SPEC]`
- Templates gerados por código, ancoragem cross-module genérica e eventual revisão da taxonomia 4×3 dependem de nova decisão. `[SPEC]`

## Staleness triggers

- `active_work_item` mudar de `bloco6-frontend-exec3` ou `active_spec` apontar para outro arquivo.
- A spec ou um contrato referenciado mudar materialmente o escopo, aceite, permissões ou gate de conclusão.
- Um documento canônico do Drive receber decisão mais nova que contradiga a reconciliação registrada.
- O protótipo Figma tornar-se localizável e revelar requisito material ainda não reconciliado.
- João reabrir as decisões sobre ator do upload, feedback como gate ou taxonomia documental.

Não são gatilhos: a transição que promove este packet, o commit que o armazena, nem qualquer edição
de `state.md` que apenas mova `workflow_state`, `next_owner`, `next_action`, `context_packet`,
`blocker` ou `resume_state`.

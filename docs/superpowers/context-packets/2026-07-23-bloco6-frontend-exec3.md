---
schema_version: 1
packet_id: lotus-context-bloco6-frontend-exec3-v1
block_id: bloco6-frontend-exec3
status: blocked
generated_at: 2026-07-23T04:37:49-03:00
base_ref: chore/lotus-operational-state
base_commit: 2cb764875af389f1cbdd6f6d8ba601269c588ccb
state_path: docs/superpowers/state.md
state_blob_sha: e6de81ee67499d2777a7a6512d9dfa9f5fe98102
progress_path: docs/superpowers/progress.md
progress_blob_sha: 4f2008bdd499caa8b5c8e25ccd13e2bf3a76ac3c
plan_path: null
plan_blob_sha: null
spec_path: docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md
spec_blob_sha: 0815e8e5418835b23e9d8e7b8803fe084ce1f551
word_budget: 1200
---

# Context Packet — Bloco 6-frontend · Execução 3 · Docs + conclusão

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** Fornecer contexto para planejar a Execução 3 do frontend de Operação: aba `Documentación`, conclusão de turma, manual PDF e fechamento da pendência P-07 de i18n.

**Non-goals:** interface própria do redator; escrita de notas, presença ou aprovação; feedbacks; templates de documentos gerados por código; certificação além do aviso de disponibilidade; seed operacional, que permanece task final separada.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| REQUEST | João Victor | Instrução explícita para `bloco6-frontend-exec3` | 2026-07-23 | retrieved | Identificar bloco, ref e fontes obrigatórias |
| LOCAL-STATE | Repository | `docs/superpowers/state.md` | 2026-07-23T02:56:45-03:00 | retrieved | Estado operacional e ponteiros ativos |
| LOCAL-PROGRESS | Repository | `docs/superpowers/progress.md` | 2026-07-23T01:55:12-03:00 | retrieved | Histórico recente |
| LOCAL-SPEC | Repository | `docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md` | 2026-07-21T18:41:04-03:00 | retrieved | Escopo, decisões e aceite da Execução 3 |
| NOTION-TASK | Notion | `Lotus / Tasks-Lotus Fase 2 / bloco6-frontend-exec3` | unknown | unavailable | Confirmar task, status, escopo e aceite organizacional |
| DRIVE-CANONICAL | Google Drive | `Viagem Chile/Projetos/Lotus.cl/V2` | unknown | unavailable | Verificar planejamento canônico |
| FIGMA-PROTOTYPE | Figma | Protótipo do módulo Operacional referido pela spec | unknown | unavailable | Verificar referência visual e terminologia |

## Key facts

1. O estado local identifica `bloco6-frontend-exec3`, `workflow_state: context_required`, spec ativa e plano nulo; `progress.md` registra as Execuções 1 e 2 como entregues. `[LOCAL-STATE]` `[LOCAL-PROGRESS]`
2. A Execução 3 não prevê toque de backend: consome os endpoints existentes de documentos, conclusão e manual. `[LOCAL-SPEC]`
3. `Documentación` trabalha com exatamente três tipos — `MANUAL`, `PRUEBAS` e `EVALUACION_REDATOR` —, aceita múltiplos arquivos por tipo e apresenta progresso e habilitação derivados. `[LOCAL-SPEC]`
4. A conclusão permanece bloqueada até a turma estar habilitada, exige confirmação irreversível e torna documentos imutáveis após `concluida`; o manual deve abrir como PDF. `[LOCAL-SPEC]`
5. P-07 exige rótulos para `operation_enrollment_manage`, `operation_turma_submit_docs` e `operation_turma_complete` nos três locales, com chaves idênticas e `es-CL` como referência. `[LOCAL-SPEC]`
6. A task indispensável do Notion não pôde ser localizada nem lida porque as ferramentas do conector não ficaram disponíveis; portanto, seu escopo, status e aceite não foram reconciliados. `[NOTION-TASK]`
7. Drive e Figma estão indisponíveis nesta sessão e não foram substituídos por busca web. `[DRIVE-CANONICAL]` `[FIGMA-PROTOTYPE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Taxonomia documental | A spec registra que o protótipo Figma mostrava quatro rótulos, incluindo `Lista de asistencia` e `Acta de cierre`. | Manter somente os três tipos existentes no backend. | Resolvido por decisão explícita D6 de João em 2026-07-21, registrada na spec; a fonte Figma direta está indisponível. `[LOCAL-SPEC]` |
| Organização da task | Task do Notion indisponível para leitura. | O repositório aponta Execução 3 em `context_required`. | Não resolvido: o gating exige ler e reconciliar o achado do Notion antes do planejamento. `[NOTION-TASK]` `[LOCAL-STATE]` |

## Constraints

- Preservar RN-15/RN-16: conclusão irreversível, documentos com peso legal e taxonomia de três tipos.
- Não criar endpoint ou fluxo backend para esta execução.
- Não promover ideias FUT-1/FUT-2 nem o seed operacional para o escopo atual.
- O working tree estava limpo (`git status --short` sem saída) durante a coleta.

## External acceptance signals

- Nenhum sinal de aceite da task foi verificado no Notion porque a fonte ficou indisponível. `[NOTION-TASK]`
- Nenhuma validação direta de Drive ou Figma foi obtida. `[DRIVE-CANONICAL]` `[FIGMA-PROTOTYPE]`

## Open questions

- Qual é o escopo, status e conjunto de critérios de aceite registrados na task `bloco6-frontend-exec3` em `Tasks-Lotus Fase 2`? Esta lacuna é bloqueante até que a task seja recuperada e reconciliada.

## Deferred

- Seed operacional após a Execução 3.
- FUT-1: templates de documentos gerados por código.
- FUT-2: ancoragem cross-módulo genérica.
- Reavaliar quatro tipos documentais somente se a Lotus solicitar formalmente.

## Staleness triggers

- Alteração de `state.md`, `progress.md`, spec ativa, branch ou commit-base.
- Disponibilização ou atualização da task do Notion.
- Disponibilização de Drive ou Figma com evidência conflitante.
- Criação do plano da Execução 3.

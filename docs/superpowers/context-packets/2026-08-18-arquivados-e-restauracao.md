---
schema_version: 1
packet_id: arquivados-e-restauracao-2026-08-18
block_id: arquivados-e-restauracao
status: blocked
generated_at: 2026-08-18T12:15:42-03:00
base_ref: feat/arquivados-e-restauracao
base_commit: 34aa0bea71beb04e836e385510300f7f9f408b97
state_path: docs/superpowers/state.md
state_blob_sha: f65cb9d316a7cfffd2488cca477bafd235b865c5
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 21d3d0a1c089d97c2434611fda410d8e759d40e7
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Arquivados e restauração de soft-delete

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** definir a semântica composta de arquivamento/restauração por aggregate root, implementá-la em Actions transacionais, expô-la por endpoints de módulo e oferecer uma visão de Arquivados com ação Restaurar. `[N-H51]` `[N-H52]` `[N-H53]` `[N-H54]`

**Non-goals:** `forceDelete`, exclusão permanente e endpoint global genérico que ignore regras de domínio. `[N-H51]` `[N-H52]` `[N-H53]` `[N-H54]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-PLAN | Google Drive | folder `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3` | 2026-06-16T16:35:29.892Z | available; no matching scope artifact | Verificar escopo funcional de archive/restore na pasta canônica de planejamento |
| N-H51 | Notion | page `3b1bc960-3dfa-81d8-a989-eddb75169d6f`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-08-03T21:49:34.368Z | available | Agregados, matriz semântica, conflitos, auditoria |
| N-H52 | Notion | page `3b1bc960-3dfa-81e0-82da-ff91c9ed901a`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-08-03T21:49:34.328Z | available | Actions, transação, rollback e auditoria |
| N-H53 | Notion | page `3b1bc960-3dfa-8186-9b2b-fbc2e6f3e771`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-08-03T21:49:34.328Z | available | Endpoints, autorização e ownership |
| N-H54 | Notion | page `3b1bc960-3dfa-8146-9bd8-e19e039876de`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-08-03T21:49:34.328Z | available | Terminologia e experiência de Arquivados/Restaurar |
| N-H31 | Notion | page `39dbc960-3dfa-81f3-9e52-ec6033137656`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-08-04T15:52:21.875Z | available; dependency check | Verificar se a dependência de H.5.3 definia papéis ou apenas ownership |

H.3.1 é o sexto artefato: foi consultado porque H.5.3 o declara como dependência e autorização é um fato bloqueante. Ele cobre ownership/403–404, mas não define papéis. `[N-H53]` `[N-H31]`

## Key facts

1. H.5.1 exige matriz para `Client`, `Redator`, `Student`, `Course`, `Budget/Quote` e `Turma/Enrollment`; essa enumeração define os aggregate roots a analisar, mas não uma ordem de rollout entre eles. `[N-H51]`
2. “Arquivado” é o nome de usuário para um objeto em soft-delete restaurável, não um segundo estado coexistindo com `deleted_at`; a UI deve trocar linguagem de exclusão irreversível por “Arquivar” ou equivalente. `[N-H54]`
3. A fonte exige que a matriz determine filhos restaurados, itens que permanecem arquivados, conflitos de unicidade, referências históricas e mensagens, mas não contém a matriz decidida. `[N-H51]`
4. Arquivar/restaurar deve passar por Actions transacionais, preservar auditoria por instância e provar rollback e conflitos; hooks de Model necessários como invariantes não devem ser removidos silenciosamente. `[N-H52]`
5. A API deve usar `onlyTrashed`/restore por aggregate root e módulo, com autorização equivalente ao módulo, ownership correto e 403/404 para acesso cruzado; histórico que usa `withTrashed` permanece legível. `[N-H53]` `[N-H31]`
6. A UI mínima é uma entrada/alternância para uma visão de Arquivados contendo somente soft-deletados, com restauração, feedback e invalidação da lista ativa; badge na listagem ativa não é exigido pela fonte. `[N-H54]`
7. O rastreio exigido pelas fontes é auditoria do restore e manutenção dos eventos auditáveis; nenhuma fonte define uma superfície para o usuário consultar autor, data ou histórico. `[N-H51]` `[N-H52]`
8. A pasta canônica de planejamento não contém documento funcional específico do bloco; buscas direcionadas encontraram apenas material genérico de arquitetura/entidades. `[DRIVE-PLAN]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Superfície de agregados | Matriz nomeia oito roots em seis grupos. `[N-H51]` | Usar esses roots como escopo semântico; os demais models soft-deletáveis são filhos/infra até a matriz decidir o contrário. Ordem entre roots permanece aberta. | H.5.1 é mais específica que a lista local de 15 models candidatos. |
| Estado “arquivado” | A visão mostra objetos soft-deletados e renomeia a operação restaurável. `[N-H54]` | `arquivado` corresponde ao soft-delete existente; não criar estado paralelo sem nova decisão. | Texto explícito de H.5.4. |
| Autorização | “Equivalente ao módulo”, com ownership adequado; H.3.1 só define escopo do recurso. `[N-H53]` `[N-H31]` | Unresolved: nenhum papel ou permissão por agregado foi definido. | ADR-07 é citado, mas as páginas não fornecem o mapeamento necessário. |
| Manual PDF/DOCX | H.5.1–H.5.4 e a pasta Drive não mencionam o manual. `[N-H51]` `[N-H52]` `[N-H53]` `[N-H54]` `[DRIVE-PLAN]` | Unresolved: não é possível classificá-lo como dentro ou fora deste bloco. | `docs/superpowers/backlog.md:430` registra a interseção, sem decisão externa correspondente. |

## Constraints

- Preservar auditoria por instância, atomicidade e leitura histórica; nenhum `forceDelete`. `[N-H52]` `[N-H53]`
- Endpoints e regras permanecem por domínio; não criar abstração global que apague diferenças entre agregados. `[N-H53]`
- Confirmações de soft-delete não podem afirmar irreversibilidade, e exclusão permanente não aparece na UI. `[N-H54]`

## External acceptance signals

- Matriz completa por root define cascata, permanências, conflitos, mensagens e auditoria. `[N-H51]`
- Testes provam rollback, conflitos, cascata definida e continuidade dos eventos auditáveis. `[N-H52]`
- Cada recurso suportado lista somente arquivados do escopo correto e restaura via Action com autorização/ownership. `[N-H53]`
- Usuário autorizado alterna para Arquivados, restaura com feedback e encontra estados de ausência, erro e loading coerentes. `[N-H54]`

## Open questions

- **Blocking:** qual é a matriz exata por aggregate root — filhos restaurados, itens preservados, conflitos, mensagens e gates por estado downstream, inclusive certificados/turmas concluídas? H.5.1 exige essa decisão, mas não a registra. `[N-H51]`
- **Blocking:** quais papéis podem arquivar e restaurar cada agregado, e quais permissões novas ou restrições por agregado se aplicam? “Autorização equivalente ao módulo” e H.3.1 não respondem. `[N-H53]` `[N-H31]`
- **Blocking:** qual é a ordem de entrega entre os roots enumerados? A única ordem definida é semântica → Actions → endpoints → UI. `[N-H51]` `[N-H52]` `[N-H53]` `[N-H54]`
- **Blocking:** “rastreio” inclui UI para quem/quando, e ela deve ser histórico por registro, listagem global ou ambas? As fontes cobrem geração da auditoria, não consulta. `[N-H51]` `[N-H52]`
- **Blocking:** o manual PDF/DOCX pré-preenchido entra neste bloco ou permanece em FUT-1? Nenhuma fonte externa consultada decide a interseção. `[DRIVE-PLAN]` `[N-H51]` `[N-H52]` `[N-H53]` `[N-H54]`

## Deferred

- Exclusão permanente, `forceDelete` e endpoint global genérico. `[N-H51]` `[N-H52]` `[N-H53]` `[N-H54]`

## Staleness triggers

- `active_work_item` ou `active_spec` mudar para outro item/arquivo.
- Uma spec, plano ou decisão explícita definir ou alterar matriz, papéis, rastreio, ordem dos agregados ou escopo do manual.
- As páginas Notion registradas mudarem materialmente ou surgir documento funcional específico na pasta Drive `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3`.
- Uma decisão da tabela de divergências ser reaberta ou contradita por fonte canônica posterior.

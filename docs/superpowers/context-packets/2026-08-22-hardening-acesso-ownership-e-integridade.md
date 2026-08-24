---
schema_version: 1
packet_id: lotus-context-hardening-acesso-ownership-e-integridade
block_id: hardening-acesso-ownership-e-integridade
status: ready
generated_at: 2026-08-22T16:43:29-03:00
base_ref: feat/hardening-acesso-ownership-e-integridade
base_commit: 79c246c62efbceab97f072f67a3642cd15938610
state_path: docs/superpowers/state.md
state_blob_sha: 19ca106a63c8d32c830fe85535200361c0437763
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: d9c2acd54c3672d294d4e1fcbc97ebe207506fc0
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening de acesso, ownership e integridade

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** completar a autorização de staff por função, estado ativo e ownership; impedir acesso cruzado entre redatores; preservar a integridade durante arquivamento concorrente; e fechar as lacunas RBAC explicitamente associadas ao bloco.

**Non-goals:** autenticação de cliente/aluno; manipulação financeira pelo redator; correção dos cinco campos com default literal da P-51 além de `is_active`; alteração do payload do Dashboard quando seu contrato não for tocado; qualquer implementação ou escrita externa durante esta geração.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-RN | Google Drive | `file:1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` (`requisitos-negocio.md`), parent `folder:1UhzI8Bvvr6ijIzC_eitDBgmzEXrH_Cuo` | 2026-08-22T08:09:38.786Z | retrieved | Texto canônico de RN-01, RN-02 e RN-15 |
| NOTION-733 | Notion | `page:388bc960-3dfa-81eb-847a-e51b2075f231`; `collection://e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-06-23T15:39:56.932Z | retrieved | Task 7.3.3, status e critério de aceite |
| BACKLOG | Git | `docs/superpowers/backlog.md@79c246c62efbceab97f072f67a3642cd15938610` | 2026-08-22T14:18:33-03:00 | retrieved | Escopo, DoD, D-34 e Q-4 |
| PEND | Git | `docs/superpowers/pendencias/abertas.md@79c246c62efbceab97f072f67a3642cd15938610` | 2026-08-22T14:19:26-03:00 | retrieved | P-49, P-51 e P-47 |
| ADR07 | Git | `docs/adrs.md@79c246c62efbceab97f072f67a3642cd15938610` | 2026-08-22T04:31:25-03:00 | retrieved | Regras estruturais do RBAC |

## Key facts

1. Na representação atual, somente usuários ativos dos tipos `admin` e `redator` podem autenticar e continuar autorizados; cliente, aluno e conta revogada devem falhar. SuperADMIN e Administrativo permanecem roles de staff sob o tipo `admin`. `[DRIVE-RN]` `[BACKLOG]`
2. O admin é global; um redator só pode ler ou alterar turmas às quais esteja designado e os recursos derivados dessas turmas. Permissão Spatie isolada não satisfaz o ownership exigido. `[BACKLOG]`
3. RN-02 separa responsabilidades: Administrativo não manipula notas/avaliações acadêmicas e Redator não manipula financeiro. A task 7.3.3 confirma lançamento de notas/presença pelo redator "no escopo RBAC". `[DRIVE-RN]` `[NOTION-733]`
4. RN-15 exige retirar do redator toda escrita de notas e presenças após o encerramento da turma. `[DRIVE-RN]`
5. P-51 exige que omitir `is_active` em atualização de staff jamais reative uma conta; a ficha ainda mantém aberta a escolha entre preservar o valor armazenado ou rejeitar a omissão. `[PEND]`
6. P-49 identifica seis escritores sem o lock do pai: três no eixo redator e três no eixo turma. O mutex só fecha quando arquivador e escritor concorrente tomam o mesmo lock. `[PEND]`
7. ADR-07 exige roles/permissões via seeder, roles essenciais imutáveis e `forgetCachedPermissions()` após mudanças. P-47 registra que os sete redatores do `OperationDemoSeeder` seguem sem a role `redator`. `[ADR07]` `[PEND]`
8. O Q-4 incorporado ao bloco exige testes que detectem a remoção tanto do filtro `guard_name` quanto do `forgetCachedPermissions()` na migration de permissões de feedback. `[BACKLOG]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Vocabulário de acesso | RN-01 nomeia SuperADMIN, Administrativo e Redator | Elegibilidade primária pelos tipos `admin`/`redator`, com conta ativa; RBAC distingue as roles internas | Instrução atual e `[BACKLOG]` especializam `[DRIVE-RN]` sem conceder acesso a cliente/aluno |
| Profundidade do RBAC | Notion 7.3.3 exige apenas "escopo RBAC" e não possui corpo | Fechamento exige ownership real: Redator A não lê/altera turma ou derivados do Redator B | Instrução atual e `[BACKLOG]`, superiores ao Notion na hierarquia |
| Escrita após encerramento | Notion não explicita o limite temporal | Escrita de notas/presenças termina quando a turma é encerrada | RN-15 em `[DRIVE-RN]` decide o tema |

## Constraints

- A árvore estava limpa na geração; branch e HEAD coincidem com o `base_ref` e `base_commit`.
- `active_spec` e `active_plan` são `null`; seus paths e blob SHAs permanecem `null`.
- A suíte SQLite não prova locks porque seu grammar não emite `FOR UPDATE`; o planejamento precisa definir evidência proporcional da integridade concorrente. `[PEND]`
- Se o contrato do Dashboard for tocado, a visibilidade RBAC deve virar campo explícito e `generated.ts` deve ser regenerado; caso contrário, D-34 permanece fora. `[BACKLOG]`
- Atualizar a task Notion requer autorização explícita posterior; este packet apenas a leu por page e collection IDs.

## External acceptance signals

- Acesso restrito ao staff elegível e segregação entre atividade acadêmica e financeira. `[DRIVE-RN]`
- Redator autorizado lança notas/presença no escopo RBAC. `[NOTION-733]`
- Turma encerrada bloqueia novas escritas acadêmicas do redator. `[DRIVE-RN]`

## Open questions

- Não bloqueante: confirmar no planejamento se notas/presença ganham permissão dedicada, separada de `operation.enrollment.manage`, e quais operações ela cobre.
- Não bloqueante: decidir se omitir `is_active` preserva o valor atual ou produz 422; ambas impedem reativação, mas somente a primeira segue a decisão anterior de atualização parcial.
- Não bloqueante: confirmar se `OperationDemoSeeder` continua oficial; se continuar, P-47 entra integralmente.

## Deferred

- Os outros cinco defaults literais catalogados na P-51.
- D-34, salvo se o contrato do Dashboard for efetivamente tocado.

## Staleness triggers

- `active_work_item` mudar, ou spec/plano passar a apontar artefato de outro bloco.
- Uma futura spec ou plano alterar escopo, aceite, ownership, semântica de `is_active` ou prova de concorrência.
- RN-01, RN-02 ou RN-15 mudar no arquivo Drive `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`.
- A task Notion `388bc960-3dfa-81eb-847a-e51b2075f231` mudar de critério, corpo ou base canônica.
- ADR-07, P-49, P-51, P-47, D-34 ou Q-4 sofrer alteração semântica.
- Uma decisão registrada na tabela de divergências ser reaberta.

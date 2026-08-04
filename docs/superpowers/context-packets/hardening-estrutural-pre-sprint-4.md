---
schema_version: 1
packet_id: hardening-estrutural-pre-sprint-4
block_id: hardening-estrutural-pre-sprint-4
status: ready
generated_at: 2026-08-03T22:47:45-03:00
base_ref: main
base_commit: 563e78ccf629085cc41bab3f1c3eac6034f7ec8e
state_path: docs/superpowers/state.md
state_blob_sha: 3d801d3e13d267e9e2f26125405e73f5225bba88
progress_path: docs/superpowers/progress.md
progress_blob_sha: f23b6a7177d1883f6761f33581cf5a6f51ee96c7
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening estrutural pré-Sprint 4

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** registrar o escopo e os sinais de aceite externos dos candidatos ao hardening anterior a Certification, sem selecionar o corte do bloco.

**Non-goals:** propor corte, plano ou implementação; introduzir Repository sobre Eloquent, novo CRUD base genérico, tabela universal, split massivo de DTOs ou split físico imediato dos locales. O `createCrudResource` já ratificado no Drive permanece um contrato existente, não autorização para nova abstração genérica. `[L-BACKLOG]` `[D-ADR]` `[N-H4]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| L-BACKLOG | Git | `docs/superpowers/backlog.md` · blob `0fe51baa7485d739c26996749e4d42c921df90b6` | 2026-08-03T22:41:33-03:00 | retrieved | Declaração local do item 1, categorias e non-goals |
| N-H31 | Notion | H.3.1 · page `39dbc9603dfa81f39e52ec6033137656` · collection `e64b7d57-d000-4433-b652-a410e75193cc` · database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-07-14T11:21:17.569Z | retrieved | Ownership e aceite de rotas nested |
| N-H4 | Notion | H.4.1 `3b1bc9603dfa815a9738c79c44faaa2a`; H.4.2 `3b1bc9603dfa81b998edfa822df96e94`; H.4.3 `3b1bc9603dfa8141aac2cadce33a1c91`; H.4.4 `3b1bc9603dfa816fb0d4d722bdea4432`; H.4.5 `3b1bc9603dfa81faaee2e01540598141`; H.4.6 `3b1bc9603dfa81c0b7d0cc7d46fa04ea`; H.4.7 `3b1bc9603dfa815c991bd10373d74cf6`; H.4.8 `3b1bc9603dfa81f597d0dc2913b38988`; H.4.9 `3b1bc9603dfa81a19eeac038fe485dc2` · collection `e64b7d57-d000-4433-b652-a410e75193cc` · database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | 2026-08-03T21:49:34.328Z–2026-08-03T21:49:34.362Z | retrieved | Escopo, aceite e dependências H.4.1–H.4.9; as nove páginas foram buscadas individualmente porque o bloco agrega explicitamente todos esses IDs |
| D-FOLDER | Google Drive | V2 folder `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM`; Planejamento folder `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3` | 2026-06-16T16:33:47.284Z / 2026-06-16T16:35:29.892Z | retrieved; no hardening-specific match | Inventário e buscas dirigidas por hardening, Sprint 4, guardrails, DTO, traduções e rotas nested |
| D-ADR | Google Drive | `decisao-stack.md` · file `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` | 2026-07-31T16:15:51.504Z | retrieved | ADR-02/04/05/15/18 e limites arquiteturais |
| D-CERT | Google Drive | `modulo-certificacao.md` · file `1Jdm3iiAdK7A1RUrmeEC7pWBRvYIu0SzC` | 2026-06-14T19:16:46.000Z | retrieved | Fronteira futura de Certification; não contém escopo de hardening |
| D-SETUP | Google Drive | `SETUP_AMBIENTE_LOTUS.md` · file `1L8vq7Pp1xFBSvzyISg5sw6SVVihzSR5l` | 2026-06-24T15:37:08.000Z | retrieved; ruled out | Falso positivo das buscas; cobre somente setup/Sprint 0 |

## Key facts

1. H.4.1 limita-se a classificar dependências reais entre Identity, Commercial, Catalog, Operation e Certification e automatizar somente fronteiras estáveis; relações/projeções Eloquent justificadas continuam permitidas, sem Repository ou orquestração genérica. `[N-H4]` `[D-ADR]`
2. H.4.2 acrescenta lint para PrimeReact fora de `shared/ui`, feature→feature e dependência upward de `shared`; a catraca existente de query/mutation permanece sem exceções. `[N-H4]`
3. H.3.1 cobre `addresses`, `contacts`, `templates` e `files`: uma rota nested só pode operar sobre recurso pertencente ao pai informado. `[N-H31]`
4. H.4.3 pede runner reproduzível e testes comportamentais das abstrações compartilhadas críticas; snapshots visuais não são o ponto de partida. `[N-H4]`
5. H.4.4 extrai apenas a moldura recorrente de busca, toolbar, estados, tabela e paginação; colunas, células e regras ficam nas features. RedatoresTable e StudentsTable são os consumidores exigidos. `[N-H4]`
6. H.4.6 é piloto em um DTO real, não migração geral; H.4.7 centraliza apenas transporte multipart, mantendo tipos, query keys, invalidações e regras nos domínios. `[N-H4]`
7. H.4.8 adiciona paridade automática sem reorganizar locales; H.4.9 só extrai builders para setup repetido em pelo menos três cenários. `[N-H4]`
8. H.4.5 também existe no conjunto referenciado: revisar aliases `useXPage`, eliminando-os ou justificando orquestração real. Ele depende de H.4.4, mas não aparece entre os cinco bloqueantes nem entre os quatro pilotos do backlog. `[N-H4]` `[L-BACKLOG]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Documento Drive específico | Nenhum artefato encontrado no V2 delimita este hardening; os documentos inspecionados tratam ADRs, Certification ou setup. `[D-FOLDER]` `[D-ADR]` `[D-CERT]` `[D-SETUP]` | Não há conflito Drive↔repo; Notion fornece o detalhamento operacional mais recente, sujeito às restrições dos ADRs. | Instrução explícita atual + ausência confirmada de escopo específico no Drive |
| H.4.5 | Notion define escopo e aceite próprios. `[N-H4]` | Inclusão e classificação permanecem para o brainstorming; o packet não escolhe silenciosamente. | O backlog referencia H.4.1–H.4.9, mas enumera somente nove itens e declara o corte ainda aberto. `[L-BACKLOG]` |
| CRUD genérico | Drive ratifica o cliente REST existente `createCrudResource`. `[D-ADR]` | "CRUD base genérico" fora de escopo significa não criar nova base universal; não remove o contrato existente. | ADR-18 específico prevalece sobre leitura ampla do non-goal |

## Constraints

- Nenhum corte ou prioridade está decidido.
- Dependências Notion: H.4.2→H.4.1; H.4.3→H.4.2; H.4.4→H.4.3; H.4.5→H.4.4; H.4.6→H.4.1; H.4.7/H.4.8→H.4.2; H.4.9→H.4.6. `[N-H4]`
- Working tree limpo na geração (`git status --short` sem saída).

## External acceptance signals

- H.4.1: matriz documentada, imports classificados e import proibido reprovando o gate. `[N-H4]`
- H.4.2: sondas das três fronteiras reprovam; regra de query continua sem exceções. `[N-H4]`
- H.3.1: acesso cruzado retorna 403/404. `[N-H31]`
- H.4.3: script reproduzível, regressão demonstrada e build/lint verdes. `[N-H4]`
- H.4.4: dois consumidores migrados, comportamento preservado e nenhuma API universal com flags. `[N-H4]`
- H.4.6: service locator removido do piloto, payload testado e tipo TS ainda gerado. `[N-H4]`
- H.4.7: transporte deixa de ser copiado, sem `Content-Type` manual nem invalidação genérica. `[N-H4]`
- H.4.8: gate detecta chave ausente ou excedente e o estado atual passa. `[N-H4]`
- H.4.9: somente repetição comprovada em três cenários é extraída, sem esconder regras. `[N-H4]`

## Open questions

- Nenhuma bloqueante para planejamento. O brainstorming deve decidir o corte e se H.4.5 participa dele.

## Deferred

- Todo candidato não selecionado pelo João permanece fora deste bloco; o packet não os ordena.

## Staleness triggers

- Mudança semântica no item 1 do backlog ou nas tasks Notion H.3.1/H.4.1–H.4.9.
- Novo documento canônico no Drive que delimite ou contradiga este hardening.
- Decisão posterior de João que altere o corte, a classificação de H.4.5, os non-goals ou os sinais de aceite registrados.
- Spec ou plano aprovado que altere, em vez de apenas detalhar, o escopo externo aqui reconciliado.

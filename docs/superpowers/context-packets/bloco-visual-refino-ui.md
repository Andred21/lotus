> **Packet `status: blocked` — NÃO autoriza planejamento.** Gerado pelo Codex em 2026-07-26 sobre
> `fea02a5`. Nenhuma fonte externa foi alcançada. Mantido como registro das buscas executadas e dos
> termos que voltaram vazios. `state.md` mantém `context_packet: null` por isso.
>
> **Verificação posterior do Claude (mesma data, MCP do lado do Claude):** a fonte NOTION **existe e
> é alcançável** — `Refinamento de UI/UX por módulo (responsividade + estados)`, id
> `3a2bc960-3dfa-8059-abdd-e0230ad8e196`, marcada `H.1.3`. O `unavailable` do Codex é gap de tooling
> (o namespace `mcp__codex_apps__notion_*` não existe naquele runtime), não ausência de fonte. As
> buscas no Drive por auditoria/baseline foram reproduzidas pelo Claude e também voltaram vazias —
> esse `unavailable` é real.

BEGIN LOTUS CONTEXT PACKET
---
schema_version: 1
packet_id: bloco-visual-refino-ui-context-v1
block_id: bloco-visual-refino-ui
status: blocked
generated_at: 2026-07-26T02:25:02-03:00
base_ref: main
base_commit: fea02a5f6b504e48f525ee4968f9374f24c4aaf1
state_path: docs/superpowers/state.md
state_blob_sha: aff6dfa4d5af8db8604411b6b5ba1817c513298b
progress_path: docs/superpowers/progress.md
progress_blob_sha: 49fe4168dc6a09dc44e0fa9f9f80eb0dc27e126d
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Bloco visual · Refinamento de UI por módulo

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** Refinar a UI como um único bloco, com review por partes, combinando a camada compartilhada em `frontend/src/shared/ui` e a migração das telas Comercial, Operación, Cursos, Pessoas, detalhe de orçamento e detalhe de turma. `[JOAO]` `[BACKLOG]`

**Non-goals:** shell (`Sidebar.tsx`, `AppLayout.tsx`, `AppHeader`); tokens próprios; PrimeReact `unstyled`; Pessoas · Alunos; qualquer implementação ou decisão de brainstorming neste packet. `[JOAO]` `[STATE]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| JOAO | João Victor | Instrução atual desta geração | 2026-07-26 | retrieved | Escopo, decisões fechadas, fontes exigidas e perguntas reservadas ao brainstorming |
| STATE | Repository | `docs/superpowers/state.md` | base `fea02a5` | retrieved | Estado, item ativo, escopo e exclusões |
| BACKLOG | Repository | `docs/superpowers/backlog.md` item 1 e débitos técnicos | base `fea02a5` | retrieved | Contrato compartilhado, telas e débitos incluídos |
| P13 | Repository | `docs/pendencias.md` P-13 | base `fea02a5` | retrieved; indirect Figma snapshot | Conteúdo visível da coluna CÓDIGO e gatilho da decisão |
| DRIVE-AUDIT | Google Drive | “auditoria de 2026-07-24”, em `Viagem Chile/Projetos/Lotus.cl/V2` | — | unavailable — busca `auditoria 2026-07-24` retornou `{"results":[]}`; pasta canônica listada sem correspondente | Conclusões acionáveis da auditoria |
| DRIVE-BASELINE | Google Drive | “baseline refinada de 2026-07-26”, mesma pasta | — | unavailable — busca `baseline refinada 2026-07-26` retornou `{"results":[]}`; pasta canônica listada sem correspondente | Baseline visual refinada |
| FIGMA | Figma | Frames/prints de Comercial, Operación, Cursos, Pessoas e detalhes | — | unavailable — nenhum `fileKey`/URL foi localizado; chamada `_get_metadata` falhou: `Tool argument fileKey is required` | Decisões visuais verificáveis |
| NOTION | Notion | H.1.3 em `Lotus/Lotus-Desenvolvimento/Tasks-Lotus Fase 2` | — | unavailable — namespace esperado `mcp__codex_apps__notion_*`; tool discovery returned none | Escopo declarado, aceite e subtarefas |

## Key facts

1. O bloco tem duas metades acopladas: contrato compartilhado e migração das telas; separá-las deixaria ações primárias ausentes após a mudança do `ModulePage`. `[JOAO]` `[BACKLOG]`
2. A camada compartilhada abrange `AppCard` variante `stat`, toolbar dentro do card, densidade/zebra/hover do `AppDataTable` via `pt`, paleta semântica do `AppTag`, empty state e convenção de footer/paginação. `[JOAO]` `[BACKLOG]`
3. A ação primária sai do `PageHeader`; sua nova posição visual não pôde ser confirmada sem os frames Figma. `[JOAO]` `[FIGMA]`
4. O escopo permanece dentro do ADR-16: wrapper, `className` na raiz e `pt`; tokens próprios e `unstyled` continuam rejeitados. `[JOAO]` `[STATE]`
5. O shell está fora de escopo porque João aprovou o real; Pessoas · Alunos é outro bloco e não integra este contexto. `[JOAO]` `[STATE]`
6. `CatalogPage` deve deixar o uso de `ModuleTabs` com uma única aba; títulos devem usar o módulo correto, com `Comercial` e `Personas` no vocabulário `es-CL`. `[BACKLOG]`
7. O snapshot indireto do protótipo registra a coluna CÓDIGO com identificadores próprios de turma `TR-45`…`TR-42`; o implementado identifica turma por `quote_code` + `budget_code` e não possui código próprio. `[P13]`
8. Notion, Figma, auditoria e baseline não forneceram evidência direta; critérios de aceite, subtarefas e sinais visuais solicitados permanecem indisponíveis. `[NOTION]` `[FIGMA]` `[DRIVE-AUDIT]` `[DRIVE-BASELINE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Limites técnicos | Não recuperado | ADR-16; sem tokens próprios ou `unstyled` | Decisão explícita atual de João `[JOAO]` |
| Shell | Protótipo não recuperado | Fora de escopo; aparência real aprovada | Decisão explícita atual de João `[JOAO]` |
| Pessoas · Alunos | Não recuperado | Fora deste bloco | Decisão explícita e estado ativo `[JOAO]` `[STATE]` |
| Código da turma | Snapshot indireto: CÓDIGO `TR-45`…`TR-42` | Unresolved; implementação não tem código próprio | P-13 reserva a decisão a João no planejamento `[P13]` |

## Constraints

- Não reabrir decisões já registradas.
- Não inferir composição, cores, estados ou posição da ação primária sem Figma.
- Não transformar este packet em brainstorming ou proposta de implementação.
- Worktree limpo durante a geração; nenhum arquivo foi alterado.

## External acceptance signals

- Nenhum critério de aceite ou conjunto de subtarefas pôde ser recuperado da H.1.3. `[NOTION]`
- Nenhum sinal visual sobre cards, toolbar, tabelas, tags, empty state, paginação ou ação primária pôde ser validado diretamente. `[FIGMA]`
- Nenhuma conclusão acionável pôde ser atribuída à auditoria ou baseline nomeadas. `[DRIVE-AUDIT]` `[DRIVE-BASELINE]`

## Open questions

- **Blocking:** quais são os critérios de aceite e subtarefas por módulo da Notion H.1.3?
- **Blocking:** o que os frames determinam para composição do card, toolbar, tabela, tags, empty state, footer/paginação e nova posição da ação primária?
- **P-13, reservada ao brainstorming:** a coluna CÓDIGO exibirá relacionamento existente, ganhará código próprio ou será removida? Não decidir neste packet.

## Deferred

- Pessoas · Alunos permanece no backlog próprio.
- Qualquer alteração visual do shell permanece fora deste bloco.

## Staleness triggers

- `active_work_item`, escopo, decisões fechadas ou fontes exigidas mudarem semanticamente.
- Notion H.1.3, frames Figma, auditoria de 2026-07-24 ou baseline de 2026-07-26 tornarem-se acessíveis.
- P-13 receber decisão de João ou o contrato de identificação da turma mudar.
- Spec ou plano futuros alterarem escopo, aceite ou restrições deste snapshot.
END LOTUS CONTEXT PACKET
RECOMMENDED_TRANSITION: blocked

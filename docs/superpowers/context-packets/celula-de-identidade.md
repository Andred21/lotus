---
schema_version: 1
packet_id: celula-de-identidade
block_id: celula-de-identidade
status: partial
generated_at: 2026-08-14T13:50:41-03:00
base_ref: feat/celula-de-identidade
base_commit: fb443ee41af677a1e455f0b8a6768431caae6304
state_path: docs/superpowers/state.md
state_blob_sha: f4ac80fc9d1ecef8a1d9131d83c45a24ecd650bf
progress_path: docs/superpowers/progress.md
progress_blob_sha: 35d631aab5dc91a8f44e22383bc3ce41e18f5d58
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Célula de identidade

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
>
> **Uma correção do revisor, medida em `fb443ee` antes de armazenar.** O packet devolvido afirmava
> em `## Constraints` que "o main tree também contém WIP não commitado em `CourseStep.tsx`".
> **Falso:** `git -C /home/jvbat/projetos/lotus status --short` devolve **vazio**, com HEAD em
> `d20bebc`. A cláusula foi removida; o restante do packet está verbatim como o Codex o devolveu.

## Scope

**Goal:** substituir as quatro grafias copiadas de avatar + título + descrição por um componente apresentacional único em `shared/ui`, com formas empilhada e inline, aplicável à superfície medida de 13 sítios.

**Non-goals:** redesenhar tabelas; alterar colunas além da fusão explicitamente aberta para `EmissionStudentsTable`; introduzir regra de domínio no componente; fazer alteração não aditiva em `AppAvatar`; decidir silenciosamente como preencher dados ausentes do Grupo C.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| JOAO | João Victor | instrução atual `celula-de-identidade`, sem ID externo | 2026-08-14 | authoritative | promoção do bloco, operação read-only e tratamento das lacunas |
| SCOPE | Git/repositório | `docs/superpowers/backlog.md:33-137` em `fb443ee41af677a1e455f0b8a6768431caae6304` | 2026-08-14 | retrieved | escopo, 13 sítios, grupos e cinco decisões abertas |
| STATE | Git/repositório | `docs/superpowers/state.md`, blob `f4ac80fc9d1ecef8a1d9131d83c45a24ecd650bf` | 2026-08-14 | retrieved | seleção, exceção de paralelismo e sobreposição com BD-6 |
| DRIVE-PEOPLE | Google Drive | `tela-pessoas.md`, file ID `1NFgZxUmCLynk8q1Rsg-3cP-973740V0V` | 2026-07-31T16:38:45.888Z | retrieved | propriedade dos cadastros e identidade de aluno/redator |
| DRIVE-TURMAS | Google Drive | `tela-turmas.md`, file ID `1151kuUKZOv-8dUMAJJS62lGG3n0ZqG3w` | 2026-06-16T15:54:22Z | retrieved | listagem, matrícula e designação de redator |
| DRIVE-COMERCIAL | Google Drive | `tela-servicos.md`, file ID `16VYcIT4Hfo4i4HE9SrAJSG-JUYhJ0aEV` | 2026-07-16T07:38:57.804Z | retrieved | listagens de clientes/orçamentos e fronteira Comercial |
| NOTION-DB | Notion | `Tasks · Lotus Fase 2`, collection `e64b7d57-d000-4433-b652-a410e75193cc`, database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | não informado pelo conector | retrieved | busca restrita à base canônica |
| NOTION-REDATOR | Notion | `Aba Redator: designação com lista por habilitação`, page ID `388bc960-3dfa-8188-b051-e0f4feb08943` | 2026-07-27T15:14:06.470Z | retrieved | aceite vigente da designação |
| VISUAL-GAP | João Victor | duas capturas: `/comercial/clientes` e `/comercial/presupuestos/:id`; sem arquivo, ID ou path | 2026-08-14 | declared gap; not `unavailable` | referência visual que originou o pedido |
| FIGMA-GAP | Figma | nenhum `fileKey`/`nodeId` localizado nos artefatos canônicos consultados | — | locator gap; not `unavailable` | verificar se protótipo decide aparência ou fallback |

## Key facts

1. O componente deve morar em `shared/ui`, ser apresentacional, não receber DTO e aceitar `ReactNode` na descrição; terá forma empilhada e forma inline. `[SCOPE]`
2. A superfície é de 13 sítios: Grupo A com quatro trocas literais; Grupo B com dois casos em que o dado existe mas foi estreitado; Grupo C com cinco casos sem foto e/ou descrição; mais dois subtítulos inline. `[SCOPE]`
3. A decisão central permanece o Grupo C: aceitar descrição ausente mantém o bloco frontend; alargar DTOs atravessa backend, ADR-04 e a geração de `generated.ts`. Nenhuma fonte externa consultada escolhe uma alternativa. `[SCOPE]` `[DRIVE-PEOPLE]` `[DRIVE-TURMAS]`
4. As fontes do Drive definem responsabilidades e fluxos, mas não prescrevem célula de identidade, uso de foto, fallback sem imagem, fusão de colunas ou tratamento de múltiplos redatores. `[DRIVE-PEOPLE]` `[DRIVE-TURMAS]` `[DRIVE-COMERCIAL]`
5. A task canônica de designação exige que a lista continue filtrada por habilitação; ela não decide a aparência do picker/card nem se o card deve buscar `RedatorData`. `[NOTION-REDATOR]`
6. A busca na collection canônica encontrou tasks de perfil/foto, mas nenhuma task 1:1 para esta célula ou para as cinco decisões; essa ausência é esperada e não bloqueante. `[NOTION-DB]`
7. As duas capturas não estão no repositório — os únicos arquivos de imagem encontrados são assets do produto — e não há locator de protótipo Figma. Isso impede aceite por equivalência visual, mas não impede o brainstorming. `[VISUAL-GAP]` `[FIGMA-GAP]`
8. O BD-6 está em execução em `feat/falha-vs-lista-vazia` (`d20bebc78aa96b4f4e5781bf0eeb0619e69ba0a1`) e sobrepõe `useCommercialClients.ts`, `shared/ui/index.ts` e, condicionalmente, as três locales. `[STATE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Componente e variantes | Drive/Notion não especificam o padrão visual | componente único em `shared/ui`, duas formas, descrição como `ReactNode` | direção explícita do João e escopo promovido têm prioridade; não há conflito externo `[JOAO]` `[SCOPE]` |
| Grupo C e fallbacks | nenhuma fonte consultada decide | unresolved; deve ser decidido com João no brainstorming | ausência de respaldo externo não autoriza escolher backend ou fallback silenciosamente |
| Designação de redator | lista deve ser filtrada por habilitação | filtro é preservado; forma do card e lookup seguem abertos | critério de aceite específico do Notion decide apenas habilitação `[NOTION-REDATOR]` |

## Constraints

- Manter o bloco frontend puro salvo decisão explícita pelo backend; se DTOs forem alargados, corrigir o DTO e regenerar `generated.ts`, nunca editá-lo à mão.
- Preservar o filtro de habilitação/idoneidade da designação e as fronteiras de responsabilidade entre Pessoas, Comercial e Operação.
- Não misturar foto viva com `SnapshotPartyData` de documento legal sem decisão escrita.
- Planejar o Grupo B sobre a versão do BD-6 e tratar explicitamente os três pontos de colisão.
- A ausência das capturas e de locator Figma não pode ser convertida em requisito visual inventado.

## External acceptance signals

- A lista de designação continua limitada a redatores habilitados. `[NOTION-REDATOR]`
- Comercial continua dono de clientes/orçamentos; Pessoas continua cadastro mestre de aluno/redator; Operação consome esses dados sem duplicar regra de domínio. `[DRIVE-COMERCIAL]` `[DRIVE-PEOPLE]` `[DRIVE-TURMAS]`
- Não existe sinal externo para geometria exata, conteúdo do fallback, fusão de colunas ou foto ausente.

## Open questions

- Grupo C: descrição opcional com iniciais ou alargamento explícito dos DTOs?
- `HistorialTable`: confirmar ausência de foto viva e usar RUT congelado como descrição?
- `TurmasTable`: empilhar N redatores, mostrar o primeiro com contador ou manter texto?
- `EmissionStudentsTable`: fundir nome/RUT e redefinir a ordenação, ou manter as colunas?
- `RedatorDesignation`: aceitar assimetria entre card e picker ou resolver `RedatorData` por ID?

## Deferred

- Recuperar/anexar as duas capturas ou fornecer `fileKey` e `nodeId` do Figma para comparação visual; não é requisito para iniciar o planejamento.

## Staleness triggers

- Mudança semântica no item 4, nos 13 sítios, nos DTOs citados ou em uma das cinco decisões.
- O BD-6 alterar ou integrar os contratos sobrepostos antes de o plano fixar a base.
- Surgir fonte canônica do Drive, Notion ou Figma que decida ou contradiga aparência, fallback ou tratamento de identidade em tabela.
- As capturas serem fornecidas e contradizerem a direção visual registrada.
- Spec ou plano deste bloco mudar escopo, aceite ou contrato entre frontend e backend.

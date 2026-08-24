---
schema_version: 1
packet_id: certificacao-historico-do-aluno-2026-08-24
block_id: certificacao-historico-do-aluno
status: partial
generated_at: 2026-08-24T13:18:52-03:00
base_ref: feat/certificacao-historico-do-aluno
base_commit: 25b26c8481d3a0a8437f52575cbcf8638a357ba8
state_path: docs/superpowers/state.md
state_blob_sha: f1c63f20d5c4ffaefdaa1dda78ea976884a122dd
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 3b533b0914329cb53ce552f5d4b29a9401bb3ab3
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Certificação · histórico do aluno

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** permitir que usuário autorizado parta do detalhe do aluno, encontre seu histórico de certificados e abra/baixe o PDF gerado sob demanda, por consulta tipada e sem N+1.

**Non-goals:** alterar emissão/elegibilidade, criar login de aluno, armazenar PDF por aluno, reconstruir status/validade no React ou acrescentar a coluna `CERTIFICADOS` à listagem; o escopo explícito atual fixa a exibição no detalhe.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| LOCAL-BACKLOG | Repository | `docs/superpowers/backlog.md@25b26c8481d3a0a8437f52575cbcf8638a357ba8` | 2026-08-24T13:17:10-03:00 | retrieved | Objetivo, escopo, DoD e prioridade condicional |
| LOCAL-P15 | Repository | `docs/superpowers/pendencias/abertas.md#P-15@25b26c8481d3a0a8437f52575cbcf8638a357ba8` | 2026-08-24T13:17:10-03:00 | retrieved | Divergência do módulo Alunos e decisão anterior sobre card vazio |
| GD-REQ | Google Drive | `requisitos-negocio.md` — file ID `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` | 2026-08-22T08:09:38.786Z | retrieved | RF-ALU-06, RF-CER-07, acesso, emissão e validade |
| GD-CERT | Google Drive | `entidade-certificado.md` — file ID `1KxDZJrELx2dtKA0fqVE68tk0lk-g8NtX` | 2026-06-12T18:23:18.000Z | retrieved | Contrato conceitual, PDF/URL, status e vigência |
| N-817 | Notion | EAP `8.1.7` — page ID `3aabc960-3dfa-816b-ac4f-c56fe1488300`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | 2026-07-27T02:15:36.711Z | retrieved | Query por aluno, campos, autorização e N+1 |
| N-831 | Notion | EAP `8.3.1` — page ID `388bc960-3dfa-8197-8a8b-d685c2ba1ade`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | 2026-06-23T15:40:20.250Z | retrieved | Histórico no perfil, URL e download |
| FIGMA | Figma | published artifact ID `piece-desert-35638359`; fileKey/node ID não recuperados | unknown | unavailable — `get_metadata` failed: `fileKey [pattern]: String does not match pattern '^[0-9a-zA-Z]{22,128}$'` | Confirmar coluna e card do protótipo |

## Key facts

1. A condição de prioridade está satisfeita: RF-CER-07 permanece no requisito canônico atualizado e a task 8.3.1 continua `A fazer` na Sprint 4; o bloco é P0. `[GD-REQ]` `[N-831]` `[LOCAL-BACKLOG]`
2. RF-ALU-06 associa certificado ao curso concluído elegível; RF-CER-07 e 8.3.1 exigem histórico no perfil/detalhe do aluno, com URL gerada sob demanda e download. `[GD-REQ]` `[N-831]`
3. A consulta deve devolver histórico ordenado e pronto para exibição, incluindo curso, turma, matrícula, estado, emissão e validade, com escopo de acesso e sem N+1. `[N-817]`
4. O PDF não é persistido por aluno: nasce do template do curso e dos dados atuais do aluno/matrícula; persistem metadados, e a validação pública usa QR. `[GD-CERT]` `[GD-REQ]`
5. Emissão segue manual pelo admin após turma concluída e aprovação acadêmica; financeiro não é gate. Este bloco apenas encontra e abre certificados já emitidos. `[GD-REQ]` `[GD-CERT]`
6. P-15 recusou card vazio enquanto Certification não existia; os dados e o módulo próprio agora existem, mas Alunos ainda não compõe o histórico. `[LOCAL-P15]`
7. O protótipo sugere coluna na listagem e card no detalhe, mas a instrução/escopo atual e a task 8.3.1 selecionam somente o detalhe. A coluna fica fora deste bloco; a decisão deve permanecer explícita para P-15 não reabrir. `[LOCAL-P15]` `[LOCAL-BACKLOG]` `[N-831]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Prioridade | RF-CER-07 existe; 8.3.1 está `A fazer` na Sprint 4 | P0 | Condição literal do backlog satisfeita por `[GD-REQ]` e `[N-831]` |
| Exposição no módulo Alunos | Drive pede histórico; Notion pede perfil do aluno | Incluir no detalhe do aluno | Fontes canônicas convergem com o escopo/DoD atual `[GD-REQ]` `[N-831]` `[LOCAL-BACKLOG]` |
| Coluna na listagem | Protótipo citado por P-15 mostra `CERTIFICADOS`; Drive/Notion não a exigem | Excluir deste bloco | Instrução explícita limita a entrega ao detalhe; task 8.3.1 também nomeia perfil `[LOCAL-BACKLOG]` `[N-831]` |
| Card vazio de D10 | Omitido quando Certification não existia | Não renderizar ausência de infraestrutura como “sem certificados”; consumir dados reais | O gatilho de P-15 venceu e o bloco atual absorve a ficha `[LOCAL-P15]` |
| Validade | Drive menciona expiração e também validade indeterminada | Expor o valor/status do domínio; não criar cálculo no frontend | DoD proíbe reconstrução no React; o bloco é composição sobre domínio existente `[GD-REQ]` `[GD-CERT]` `[LOCAL-BACKLOG]` |
| Forma visual | Figma publicado não fornece fileKey/node consultável | Sem afirmação de fidelidade ao protótipo | Falha registrada em `[FIGMA]`; escopo e aceite permanecem cobertos pelas demais fontes |

## Constraints

- Contrato tipado nasce no backend e carrega curso, turma, status e validade; React apenas apresenta.
- Autorização e data-scoping pertencem à consulta/API; aluno não autentica.
- Certificados têm peso legal: não esconder, inferir nem reclassificar estado no cliente.
- PDF/URL são gerados sob demanda; nenhum arquivo individual passa a ser persistido.
- Snapshot local: árvore limpa; branch, commit e hashes constam no frontmatter.

## External acceptance signals

- Consulta ordenada, autorizada e sem N+1. `[N-817]`
- Histórico no perfil abre URL sob demanda e oferece download. `[N-831]`
- Usuário autorizado parte do aluno e encontra/abre certificados sem regra de domínio no React. `[LOCAL-BACKLOG]`

## Open questions

- None blocking.

## Deferred

- Fidelidade exata à coluna/card do protótipo até existir `fileKey` e `nodeId` válidos. `[FIGMA]`
- Qualquer mudança em emissão, elegibilidade, vigência ou autenticação do aluno.

## Staleness triggers

- `active_work_item`, spec ou plano passarem a definir outro escopo/aceite.
- João reabrir a decisão de excluir a coluna da listagem ou alterar a absorção de P-15.
- RF-ALU-06, RF-CER-07, 8.1.7 ou 8.3.1 mudarem materialmente.
- Um arquivo/nó Figma válido surgir e contradizer a composição registrada.
- O contrato de Certification mudar status, validade, autorização ou geração de PDF/URL.

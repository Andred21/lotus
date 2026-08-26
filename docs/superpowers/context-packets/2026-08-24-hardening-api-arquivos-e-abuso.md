---
schema_version: 1
packet_id: 2026-08-24-hardening-api-arquivos-e-abuso
block_id: hardening-api-arquivos-e-abuso
status: ready
generated_at: 2026-08-24T23:41:31-03:00
base_ref: feat/hardening-api-arquivos-e-abuso
base_commit: 540cb522095097b63ff89874e7c4b0937c7b601b
state_path: docs/superpowers/state.md
state_blob_sha: 2aeabda02ba4344393f095f0d8499cdf972192ab
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: fa30ebc74b3272284297326fbd062d8615965bce
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening de API, arquivos e abuso

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** limitar abuso e consumo excessivo antes da exposição pública, cobrindo rate limits, salvaguardas de upload/import/batch/PDF, armazenamento privado e erros `429`. [REPO-BACKLOG]
**Non-goals:** fixar números, escolher produto antimalware, decidir a renegociação do requisito, redesenhar arquitetura ou repetir a medição local já registrada em `state.md`.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-RNF | Google Drive | `file_id: 1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` — `requisitos-negocio.md` | 2026-08-22T08:09:38.786Z | retrieved | Texto canônico de RNF-SEC-06, RNF-SEC-08 e RNF-DES-02 |
| NOTION-911 | Notion | `page_id: 388bc960-3dfa-818d-9f05-d9f155db65f0`; parent `collection://e64b7d57-d000-4433-b652-a410e75193cc` | 2026-08-14T18:41:32.973Z | retrieved | Organização e aceite da task 9.1.1 na base canônica |
| REPO-ADRS | Repository | `docs/adrs.md@aa3673c00c22a73eb1c2d1af5752d5aab507b0b6` | 2026-08-24T18:09:39-03:00 | retrieved | ADR-03, ADR-11 e ADR-12 |
| REPO-BACKLOG | Repository | `docs/superpowers/backlog.md@2ba83ce1ec08346efecc868c52d2dfa321c544fd` | 2026-08-24T22:51:24-03:00 | retrieved | Escopo declarado, nota de proporção e DoD do item 4 |

## Key facts

1. O texto integral do RNF-SEC-06 é: “Rate limit para login, troca de senha e ações sensíveis.” Ele não contém exigência de antimalware. [DRIVE-RNF]
2. O texto integral do RNF-SEC-08 é: “Upload de arquivos com validação de tipo/tamanho e escaneamento antivírus (redatores operam de redes não auditadas).” A redação exige o resultado/capacidade de escaneamento antivírus, mas não nomeia sonda, serviço, fornecedor, protocolo ou topologia. [DRIVE-RNF]
3. RNF-DES-02 limita a premissa inicial a até 10 usuários simultâneos e diz que a baixa concorrência não justifica arquitetura distribuída pesada; isso sustenta análise proporcional, sem revogar RNF-SEC-08. [DRIVE-RNF]
4. A task 9.1.1 é “Rate limit em login/troca de senha”; seu único sinal de aceite é “Tentativas excessivas bloqueadas”. Ela não define limiares nem cobre antimalware ou arquivos. [NOTION-911]
5. ADR-03 exige que toda resposta de erro siga Problem Details (`type`, `title`, `status`, `detail`, `instance`) pelo handler global; portanto `429` não pode usar envelope ad hoc. [REPO-ADRS]
6. ADR-11 exige documentos sensíveis no S3 via Flysystem e acesso por `temporaryUrl()`; o binário não deve ser servido pela aplicação. [REPO-ADRS]
7. ADR-12 exige PDF sob demanda via Gotenberg, com stream direto ao S3 e sem escrita em `/tmp`, isolando a carga pesada do servidor da aplicação. [REPO-ADRS]
8. O item 4 cobre throttles de login, validação pública de certificado e ações sensíveis; revisão de senha/convite; limites e validação de upload/import/batch/PDF; S3 privado/URL temporária; antimalware; e `429` em Problem Details. Os valores concretos pertencem ao plano após medição e risco. [REPO-BACKLOG]

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Numeração do antimalware | RNF-SEC-06 trata só de rate limit; RNF-SEC-08 trata de validação e antivírus. | Corrigir a atribuição: a obrigação antimalware vem de RNF-SEC-08. | Drive é canônico e resolve a referência incorreta da nota do backlog a RNF-SEC-06. [DRIVE-RNF] [REPO-BACKLOG] |
| Forma versus resultado | RNF-SEC-08 diz “escaneamento antivírus” e não prescreve mecanismo. | Baseline canônico: resultado de escaneamento exigido; serviço/sonda específico não é exigência documentada. Uma dispensa do resultado ainda requer renegociação formal pelo João. | Texto literal do requisito; nenhuma fonte recuperada nomeia implementação. [DRIVE-RNF] |
| Notion versus escopo do bloco | 9.1.1 organiza somente login/troca de senha. | Não restringe o bloco: Drive e backlog explícito cobrem ações sensíveis, arquivos e PDF. | Notion é fonte organizacional inferior ao Drive e à instrução explícita. [NOTION-911] [DRIVE-RNF] [REPO-BACKLOG] |

## Constraints

- Limiar, janela, chave de identificação, tamanhos, quantidades e custo de PDF ficam sem números neste packet; o plano os define por medição e risco. [REPO-BACKLOG]
- Antimalware deve ser atribuído a RNF-SEC-08; a fonte exige escaneamento, não um produto específico. [DRIVE-RNF]
- Erros, inclusive `429`, preservam Problem Details; documentos preservam S3 privado/URL temporária; PDF preserva Gotenberg sob demanda e stream sem `/tmp`. [REPO-ADRS]

## External acceptance signals

- Tentativas excessivas são bloqueadas e o fluxo normal continua funcional. [NOTION-911] [REPO-BACKLOG]
- Uploads com tipo/tamanho inválidos ou que não passem pelo escaneamento antivírus são bloqueados antes de ficarem acessíveis. [DRIVE-RNF] [REPO-BACKLOG]
- Acesso a documento sensível ocorre por URL temporária; respostas `429` usam Problem Details. [REPO-ADRS] [REPO-BACKLOG]

## Open questions

- Não bloqueante para o packet, obrigatória no brainstorming: João preserva neste bloco o resultado exigido por RNF-SEC-08 ou autoriza uma renegociação formal? O packet não decide.
- O plano deve identificar “ações sensíveis”, limiares e política diante de detecção/indisponibilidade do scanner por medição e risco; nenhuma fonte recuperada fixa esses valores.

## Deferred

- Mecanismo/fornecedor/topologia do antimalware e números concretos ficam para brainstorming/plano; isso não equivale a dispensar RNF-SEC-08.

## Staleness triggers

- `active_work_item` mudar, ou spec/plano serem criados ou alterados com mudança semântica de escopo, aceite ou restrição.
- O conteúdo relevante do Drive `file_id: 1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`, da página Notion `388bc960-3dfa-818d-9f05-d9f155db65f0`, dos ADRs ou do item 4 mudar semanticamente.
- João decidir, reabrir ou formalmente renegociar a obrigação antimalware.

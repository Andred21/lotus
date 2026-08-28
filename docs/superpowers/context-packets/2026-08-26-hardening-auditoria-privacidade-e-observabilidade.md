---
schema_version: 1
packet_id: hardening-auditoria-privacidade-e-observabilidade-2026-08-26
block_id: hardening-auditoria-privacidade-e-observabilidade
status: ready
generated_at: 2026-08-26
base_ref: feat/hardening-auditoria-privacidade-e-observabilidade
base_commit: 4bc49895c3ddb9a4dfe718a7094f0d2808d6af04
state_path: docs/superpowers/state.md
state_blob_sha: 84eeac827712bc6b1643f0e0076eb85fe25a06e8
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: ca9c4b8315eb14243f7e22cceb837dd8f022185c
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening de auditoria, privacidade e observabilidade

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** implementar retenção diferenciada de `audits` e `login_logs`, centralização dos logs de ações dentro do monólito, alertas mensuráveis de acesso suspeito e rotação documentada de segredos, com revisão formal do RNF-SEC-05.

**Non-goals:** criar expiração ou descarte automático para documentos de turma/redator; criar microserviço de logs; provisionar AWS ou cofre gerenciado; reabrir `Shared/Files/ContentClass`, throttle nomeado ou antivírus síncrono; alterar o Superpowers ou fontes externas.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-RNF | Google Drive | `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` — `requisitos-negocio.md`, sob `V2` (`1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM`) | 2026-08-22T08:09:38.786Z | retrieved | RNF-SEC-01/03/04/05/07, documentos, números e divergências |
| NOTION-DB | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc` — database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | not exposed | retrieved | busca das tasks correspondentes |
| NOTION-PRUNE | Notion | page `388bc960-3dfa-815f-85a7-d016f900d0b8` — EAP 9.1.2 | 2026-08-14T18:41:23.316Z | retrieved | pruning de `audits` |
| NOTION-ALERT | Notion | page `388bc960-3dfa-81d4-83d3-ef554fb6b1eb` — EAP 10.1.8 | 2026-08-14T18:42:16.374Z | retrieved | alerta operacional/CloudWatch |

## Key facts

1. RNF-SEC-01 exige conformidade LGPD/legislação chilena; RNF-SEC-03 pede segredos fora do código em cofre; RNF-SEC-04 exige auditoria na aplicação com ator, ação, valores anterior/novo e estrutura central polimórfica; RNF-SEC-05 pede “Micro-serviço em nuvem”; RNF-SEC-07 exige alerta de acesso suspeito com parâmetro definido. `[DRIVE-RNF]`
2. Nenhum RNF-SEC citado fixa retenção, volume, canal ou prazo. Os 7 dias do RNF-DIS-03 são backup de banco e não definem retenção de `audits`, `login_logs` ou documentos. `[DRIVE-RNF]`
3. “Micro-serviço em nuvem” é a forma literal do RNF-SEC-05, não uma inferência sobre centralização. `[DRIVE-RNF]`
4. A fonte descreve PDFs de turma/redator, S3 e metadados, mas não determina expiração, descarte, preservação ou legal hold documental. `[DRIVE-RNF]`
5. A task 9.1.2 exige poda agendada no scheduler, mas não define janelas; a task 10.1.8 cobre queda operacional via CloudWatch, não acesso suspeito. `[NOTION-PRUNE]` `[NOTION-ALERT]`
6. A base canônica não contém task 1:1 para os demais splits internos deste bloco; essa ausência é esperada e não bloqueia o planejamento. `[NOTION-DB]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Retenção | RNFs não fixam janelas; a task 9.1.2 pede poda no scheduler. `[DRIVE-RNF]` `[NOTION-PRUNE]` | `audits`: 5 anos; `login_logs`: 12 meses; ambos podados pelo scheduler. Auditoria acompanha o peso legal do certificado; PII pura sai antes. Fecha o mecanismo esperado por P-02/P-33 e a lacuna do ADR-08. | Instrução explícita de João Victor, 2026-08-26, prioridade máxima. |
| Retenção documental | A fonte não define prazo ou descarte. `[DRIVE-RNF]` | Arquivos de turma/redator não expiram; permanece somente o arquivamento lógico vigente. Decisão documental, sem código novo. | Instrução explícita de João Victor, 2026-08-26, prioridade máxima. |
| Forma dos logs | RNF-SEC-05 exige literalmente “Micro-serviço em nuvem”. `[DRIVE-RNF]` | Centralização dentro do monólito basta. O RNF-SEC-05 será revisado formalmente por escrito; não se declarará equivalência silenciosa. | Instrução explícita de João Victor, 2026-08-26, prioridade máxima. |
| Alerta e cofre | RNF-SEC-07 não define suspeição; RNF-SEC-03 não escolhe produto ou rotação. A task 10.1.8 trata queda operacional. `[DRIVE-RNF]` `[NOTION-ALERT]` | Este bloco define três famílias mensuráveis: falhas repetidas por mesma chave, sessão de conta desativada e sequência de 403; cada uma terá condição, destino e expectativa temporal. Segredos permanecem em `env_file` fora da imagem, com rotação documentada; cofre gerenciado fica no item 10. | Instrução explícita de João Victor, 2026-08-26, prioridade máxima. |

## Constraints

- Auditoria permanece na aplicação, nunca em trigger de banco (`docs/adrs.md`, ADR-08).
- Produção hoje escreve em `stderr`, com rotação local `json-file` de 10 MB × 3; isso não constitui centralização externa.
- O `env_file` já fica fora da imagem; este bloco acrescenta rotação documentada sem provisionar cofre gerenciado.
- Runtime versionado e publicação GHCR por SHA já existem.
- `Shared/Files/ContentClass`, throttle nomeado e antivírus síncrono foram fechados pelo bloco anterior e não se reabrem.

## External acceptance signals

- O scheduler aplica separadamente 5 anos a `audits` e 12 meses a `login_logs`.
- Documentos de turma/redator continuam apenas com soft delete, sem expiração ou descarte automático novo.
- Logs de ações ficam centralizados dentro do monólito sem segredo ou PII desnecessária.
- A revisão formal do RNF-SEC-05 substitui explicitamente a forma “Micro-serviço em nuvem” pela decisão monolítica.
- Cada uma das três famílias de acesso suspeito recebe condição mensurável, destino e expectativa temporal verificáveis.
- Segredos permanecem fora do código/imagem e a rotação fica documentada.

## Open questions

- None blocking.

## Deferred

- Cofre gerenciado real, conta AWS e integração dependente dela permanecem em `infra-producao-provisionamento-aws` (item 10).
- Alerta operacional em CloudWatch da task 10.1.8 permanece dependente da EC2 e não substitui os alertas de acesso suspeito deste bloco.
- Exportação fria para Glacier continua opcional no ADR-08, sem requisito aprovado.

## Staleness triggers

- João Victor reabrir qualquer decisão registrada neste packet.
- O `active_work_item` mudar ou futura spec/plano alterar escopo, aceitação ou restrição de forma incompatível com estas decisões.
- O arquivo Drive `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` mudar, ser substituído ou contradizer uma decisão registrada.
- ADR-08, P-02, P-33 ou as páginas Notion citadas mudarem semanticamente de modo relevante ao bloco.
- Nova obrigação legal ou regulatória alterar retenção, descarte documental, privacidade ou auditoria.

---
schema_version: 1
packet_id: hardening-auditoria-privacidade-e-observabilidade-2026-08-26
block_id: hardening-auditoria-privacidade-e-observabilidade
status: blocked
generated_at: 2026-08-26
base_ref: feat/hardening-auditoria-privacidade-e-observabilidade
base_commit: 2e3016748ec9def796276fa4c0ca3962c89f5253
state_path: docs/superpowers/state.md
state_blob_sha: ef2b9ab01695b595e864143d9bc793b980ae3b3d
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

**Goal:** definir retenção de `audits` e `login_logs`, limites de privacidade, centralização de logs, alertas e gestão de segredos sem inventar números ou comportamento de peso legal.

**Non-goals:** reabrir throttle, política de arquivos ou antivírus do bloco anterior; provisionar a conta AWS; presumir microserviço; alterar o Superpowers ou fontes externas.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-RNF | Google Drive | `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` — `requisitos-negocio.md`, sob `V2` (`1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM`) | 2026-08-22T08:09:38.786Z | retrieved | RNF-SEC-01/03/04/05/07, documentos, números e divergências |
| NOTION-DB | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc` — database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | not exposed | retrieved | busca das tasks correspondentes |
| NOTION-PRUNE | Notion | page `388bc960-3dfa-815f-85a7-d016f900d0b8` — EAP 9.1.2 | 2026-08-14T18:41:23.316Z | retrieved | pruning de `audits` |
| NOTION-ALERT | Notion | page `388bc960-3dfa-81d4-83d3-ef554fb6b1eb` — EAP 10.1.8 | 2026-08-14T18:42:16.374Z | retrieved | alerta operacional/CloudWatch |

## Key facts

1. Texto real: RNF-SEC-01 — “Dados armazenados conforme LGPD (Brasil) e legislação chilena”; RNF-SEC-03 — “Segredos (chaves, tokens, credenciais de e-mail/nuvem) fora do código, em cofre de segredos”; RNF-SEC-04 — “Auditoria na camada de aplicação via biblioteca, registrando quem/o quê/valor antigo/novo numa estrutura central, aplicando o polimorfismo”; RNF-SEC-05 — “Micro-serviço em nuvem com logs das ações do software, com registro das ações feitas”; RNF-SEC-07 — “Alertas de acessos suspeitos, com parâmetro de identificação definido”. `[DRIVE-RNF]`
2. Nenhum desses cinco RNFs fixa janela de retenção, volume, SLA, canal de alerta ou valor do parâmetro de identificação. O único número próximo é RNF-DIS-03, “no mínimo 7 dias”, exclusivamente para backup do banco; ele não pode ser aplicado a `audits`, `login_logs` ou documentos. `[DRIVE-RNF]`
3. RNF-SEC-05 literalmente especifica a forma “Micro-serviço em nuvem”, não somente o resultado “logs centralizados”. A ambiguidade não está no texto: o que permanece aberto é se João mantém essa forma apesar da arquitetura monolítica e de ~10 usuários. `[DRIVE-RNF]`
4. O arquivo canônico descreve PDFs de redator/turma, armazenamento S3 e metadados, mas não define prazo, descarte, preservação ou legal hold documental. A linha do backlog não está confirmada como requisito nem provada como mero atalho para P-02/P-33; é uma decisão independente ainda aberta. `[DRIVE-RNF]`
5. RNF-SEC-03 exige cofre e saída do código, mas não determina rotação, produto, periodicidade ou variável de ambiente. Também não há nos RNFs citados proibição textual de logar password/token/cookie/PII; essa minimização é guardrail interno do backlog, e RNF-SEC-01 não autoriza inferir detalhes legais ausentes. `[DRIVE-RNF]`
6. RNF-SEC-07 exige alerta de acesso suspeito e um parâmetro definido, mas não define o que é suspeito. A task Notion 10.1.8 cobre somente queda operacional via “CloudWatch básico”, critério “Alerta dispara em queda”, depende da EC2 10.1.1 e não satisfaz por si o alerta de acesso suspeito. `[DRIVE-RNF]` `[NOTION-ALERT]`
7. ADR-08 e P-02 continuam abertos no HEAD; P-33 confirma `login_logs` append-only e PII sem retenção. A task 9.1.2 está `A fazer` e exige apenas “Poda agendada roda no scheduler”, sem janela ou política de `login_logs`. `[NOTION-PRUNE]`
8. Na base canônica não há task 1:1 para retenção de `login_logs`, retenção documental, logs centralizados, minimização de PII, alerta de acesso suspeito ou cofre/rotação. Essa ausência é esperada para splits internos e não é, isoladamente, blocker. `[NOTION-DB]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Forma dos logs | RNF-SEC-05 exige literalmente “Micro-serviço em nuvem”. `[DRIVE-RNF]` | Monólito proporcional; não criar microserviço em silêncio. | Não resolvido: a fonte esclarece o texto, mas João precisa manter, substituir ou dispensar a forma. |
| Retenção documental | Documentos têm peso legal, mas nenhuma política de retenção aparece no requisito recuperado. `[DRIVE-RNF]` | Backlog manda decidir se haverá política própria. | Não resolvido; não reutilizar automaticamente P-02/P-33. |
| Secrets | RNF-SEC-03 pede cofre. `[DRIVE-RNF]` | HEAD usa `env_file` externo à imagem e exclui `.env`/cache do build. | Fora do código/imagem está atendido; `env_file` não prova cofre, rotação nem implantação real. |
| Alertas AWS | Notion 10.1.8 prevê CloudWatch após EC2. `[NOTION-ALERT]` | Provisionamento AWS real pertence ao item 10. | Definição pode entrar neste bloco; prova em conta real fica diferida. |

## Constraints

- Auditoria permanece na aplicação, nunca em trigger de banco (`docs/adrs.md`, ADR-08).
- HEAD mantém logs de produção em `stderr` com rotação local `json-file` de 10 MB × 3; isso não é centralização externa.
- Runtime versionado e publicação GHCR por SHA já existem; árvore estava limpa em `git status --short`.
- Não reabrir `Shared/Files/ContentClass`, throttle nomeado ou antivírus síncrono.

## External acceptance signals

- Pruning e retenção obedecem às janelas explicitamente aprovadas, preservando rastreabilidade até a expiração.
- Logs registram ações necessárias sem segredo ou PII desnecessária e têm destino central definido.
- Alertas de acesso suspeito e falhas operacionais possuem condição, destino e expectativa temporal verificáveis.
- Segredos permanecem fora de código/imagem e a exigência de cofre recebe solução ou diferimento explícito.

## Open questions

- **Blocking:** quais são as janelas e destinos finais de `audits` e `login_logs`?
- **Blocking:** documentos de turma/redator têm retenção própria, descarte ou preservação legal? Qual prazo?
- **Blocking:** manter o microserviço literal, aceitar centralização no monólito ou diferir a forma?
- **Blocking:** quais eventos identificam acesso suspeito e quais canal/SLA; qual política de cofre e rotação?

## Deferred

- Provisionamento e prova em EC2/CloudWatch/cofre AWS real permanecem no item 10 quando dependerem da conta AWS.
- Exportação fria para Glacier continua opcional no ADR-08 e sem requisito aprovado.

## Staleness triggers

- João registrar qualquer decisão das perguntas bloqueantes.
- O arquivo Drive `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` mudar ou ser substituído.
- Spec/plano do bloco introduzir escopo, número ou critério incompatível com estas fontes.
- As pages Notion citadas ou ADR-08/P-02/P-33 mudarem semanticamente.

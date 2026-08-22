---
schema_version: 1
packet_id: ctx-infra-producao-runtime-e-aws
block_id: infra-producao-runtime-e-aws
status: partial
generated_at: 2026-08-22T03:45:19-03:00
base_ref: infra/producao-runtime-e-aws
base_commit: 5bcd4b7cd17234937792e917537feadaee7fea19
state_path: docs/superpowers/state.md
state_blob_sha: 25c0634736bd354d26d178f111b26d50ea3bdb30
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 0457320abea178668c65112513c37fc45dcbb281
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Infra de produção: runtime e AWS

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** planejar o runtime real de produção e a base AWS do item 10: imagem/Compose/Nginx, EC2, RDS, S3, e-mail/domínio, TLS, health e observabilidade.  
**Non-goals:** implementar; alterar estado; resolver HA/RPO/RTO do item 13; desenhar CI/CD, promoção ou rollback dos itens 11–12.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| REPO-LOCAL | Repository | `backlog.md@a6ee901d`; `adrs.md@92fa71ce`; `pendencias/abertas.md@b22485ef` | HEAD `5bcd4b7c` | retrieved | escopo/DoD, ADR-09/11/13/14, P-50 e gate do item 13 |
| DRIVE-RNF | Google Drive | `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J` — `requisitos-negocio.md` | 2026-07-16T07:22:27.224Z | retrieved | RNF-DIS e RNF-SEC canônicos |
| DRIVE-AWS | Google Drive | `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI` — `arquitetura-aws-lotus.md` | 2026-06-22T20:17:27Z | retrieved | topologia, sizing sugerido, domínio, região, custo e decisões abertas |
| DRIVE-ADR | Google Drive | `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` — `decisao-stack.md` | 2026-07-31T16:15:51.504Z | retrieved | ADR-09/11/13/14 canônicos |
| NOTION-INFRA | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc`, database `7e55d684-cdd4-4bf3-b152-e15ce70d324b`; 10.1.1 `388bc960-3dfa-81cf-8e8e-fcf401d8b19f`; 10.1.2 `388bc960-3dfa-81a4-9779-ec02137ad238`; 10.1.3 `388bc960-3dfa-818e-897f-e3fd682c1e43`; 10.1.4 `388bc960-3dfa-81c6-932b-f7640d70b45a`; 10.1.5 `388bc960-3dfa-810e-b1eb-f66936836cf2`; 10.1.6 `388bc960-3dfa-8165-b501-cfb89d07f443`; 10.1.8 `388bc960-3dfa-81d4-83d3-ef554fb6b1eb`; 11.1.3 `388bc960-3dfa-819e-a4f5-c497235c724a` | 2026-08-14T18:41Z–18:42Z | retrieved | estado/conteúdo das tasks e divergência do item 13 |

## Key facts

1. Texto canônico: RNF-DIS-01 “Disponível continuamente, com prioridade ao horário comercial brasileiro e chileno”; RNF-DIS-02 “Servidor redundante pronto para assumir em caso de queda”; RNF-DIS-03 “Backup do banco com no mínimo 7 dias de retenção”; RNF-DIS-04 “Cópia do código-fonte e dos serviços em nuvem”. `[DRIVE-RNF]`
2. Vizinhos de segurança relevantes: documentos protegidos (RNF-SEC-02), segredos fora do código em cofre (RNF-SEC-03), logs de ações em serviço de nuvem (RNF-SEC-05) e alertas de acessos suspeitos (RNF-SEC-07). `[DRIVE-RNF]`
3. A topologia registrada é monólito em EC2 única, com `app` PHP-FPM, Nginx e Gotenberg no Compose; MySQL vai ao RDS, arquivos ao S3 e e-mail ao SES. `[DRIVE-AWS]` `[DRIVE-ADR]`
4. As sete tasks requeridas estão **A fazer**, com `Descrição` vazia: 10.1.1 EC2/SG/chaves; .2 RDS/snapshot; .3 S3/IAM/CORS; .4 SES/domínio/DKIM; .5 Compose/imagem multi-stage; .6 Nginx/Let's Encrypt/Certbot; .8 health/CloudWatch. `[NOTION-INFRA]`
5. `db.t4g.micro` é explicitado pela 10.1.2; o Drive apenas sugere EC2 `t4g.small` ARM — subindo para `t4g.medium` se Gotenberg pressionar memória — e RDS single-AZ, gp3 20 GB. Não há sizing final da EC2. `[NOTION-INFRA]` `[DRIVE-AWS]`
6. Rede/segurança registradas: VPC com EC2 pública e RDS privado; SSH restrito ao IP; 3306 somente SG-EC2→SG-RDS; S3 privado/versionado com IAM role e URLs temporárias; segredos via ambiente/Parameter Store. `[DRIVE-AWS]` `[DRIVE-ADR]`
7. E-mail/domínio registrados: SES na mesma região, `lotus.cl`/`api.lotus.cl`, SPF/DKIM e saída do sandbox; para EC2 direta, TLS no Nginx com Let's Encrypt/Certbot. `[DRIVE-AWS]` `[NOTION-INFRA]` `[DRIVE-ADR]`
8. P-50 exige medir o `memory_limit`: 128M já falha na suíte, com pico medido de 129 MB, e o mesmo `conf.d` hoje afeta CLI e PHP-FPM; não escolher valor arbitrário. `[REPO-LOCAL]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Disponibilidade/HA | RNF-DIS-02 exige servidor redundante; `DRIVE-AWS` afirma rebaixá-lo para recuperação rápida sem failover; Notion 11.1.3 associa restore de snapshot ao RNF-DIS-02. `[DRIVE-RNF]` `[DRIVE-AWS]` `[NOTION-INFRA]` | ADR-14 segue com EC2 única, mas EC2 única ou restore **não atendem** ao texto do RNF-DIS-02; conflito `unresolved`, reservado ao gate do item 13. | Instrução explícita atual + item 13 do backlog; não aceitar silenciosamente o “rebaixamento” nem a associação incorreta do Notion. `[REPO-LOCAL]` |
| Borda TLS | `DRIVE-AWS` oferece EC2 direta+Certbot ou ALB+ACM; recomenda a primeira. `[DRIVE-AWS]` | Para o item 10, Nginx + Let's Encrypt/Certbot; ALB permanece evolução ligada à futura decisão de HA. | Notion 10.1.6 e ADR-14 decidem especificamente o TLS do MVP. `[NOTION-INFRA]` `[DRIVE-ADR]` |

## Constraints

- Produção não inclui MySQL, MinIO ou Mailpit de dev; Gotenberg permanece; sem bind mount; `/up` é healthcheck; `APP_DEBUG=false`; secrets não entram na imagem/repo. `[REPO-LOCAL]`
- RDS é separado da EC2 e precisa de snapshot com retenção mínima de 7 dias; S3 é privado e least privilege. `[REPO-LOCAL]` `[DRIVE-RNF]`
- Não declarar EC2 única como atendimento do RNF-DIS-02.
- Worktree estava limpa na geração; `state_basis_commit` é `c8480eee`.
- Antes de prova dependente do Compose, reavaliar P-03 se o bloco backend paralelo entrar em `executing`. `[REPO-LOCAL]`

## External acceptance signals

- 10.1.1: EC2 ativa, SG/chave configurados e SSH comprovado. `[NOTION-INFRA]`
- 10.1.2: RDS ativo com snapshot automático. `[NOTION-INFRA]`
- 10.1.3: bucket least privilege com CORS necessário. `[NOTION-INFRA]`
- 10.1.4: domínio verificado, DKIM ativo e envio de teste. `[NOTION-INFRA]`
- 10.1.5: imagem multi-stage enxuta builda. `[NOTION-INFRA]`
- 10.1.6: HTTPS com renovação automática. `[NOTION-INFRA]`
- 10.1.8: alerta dispara quando há queda. `[NOTION-INFRA]`

## Open questions

- Região: `sa-east-1` pela latência ou `us-east-1` pelo custo; nenhuma foi aprovada. `[DRIVE-AWS]`
- EC2: confirmar `t4g.small` ou outro tamanho após medir app+Gotenberg e separar limites CLI/FPM. `[DRIVE-AWS]` `[REPO-LOCAL]`
- Confirmar controle do DNS de `lotus.cl`/`api.lotus.cl`, conta SES fora do sandbox e canal do alerta CloudWatch. `[DRIVE-AWS]` `[NOTION-INFRA]`
- Aprovar teto de custo: estimativa externa é US$35–55/mês sem ALB, mais US$16–20/mês com ALB; não é orçamento fechado. `[DRIVE-AWS]`

Nenhuma é bloqueante para escrever o plano; todas devem virar decisões explícitas antes do provisionamento correspondente.

## Deferred

- Resolver formalmente RNF-DIS-02 × ADR-14, RPO/RTO e restore real no item 13. `[REPO-LOCAL]`
- CI/CD, promoção de artefato e rollback pertencem aos itens 11–12; 10.1.7 não integra este packet. `[REPO-LOCAL]`
- Definir a evidência final de RNF-DIS-04 e os controles de segurança fora do escopo runtime no go-live/hardening. `[DRIVE-RNF]` `[REPO-LOCAL]`

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` mudar semanticamente.
- Escopo/DoD dos itens 10 ou 13, ADR-09/11/13/14 ou P-50 mudar.
- Qualquer fonte Drive registrada mudar ou contradizer decisão aqui registrada.
- Estado ou conteúdo das páginas Notion requeridas mudar.
- João decidir região, sizing, domínio/SES, orçamento ou resolver a divergência de HA.

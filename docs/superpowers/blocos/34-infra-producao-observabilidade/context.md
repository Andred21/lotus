---
schema_version: 1
packet_id: 2026-10-04-infra-producao-observabilidade
block_id: infra-producao-observabilidade
status: ready
generated_at: 2026-10-04T18:53:59-03:00
base_ref: main
base_commit: 77196049d396e2ec9fad22179380f09da5749040
state_path: null
state_blob_sha: null
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 070df1614b4c9a66d240b52f56e56a16919091a1
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Observabilidade de produção

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
> Gerado sem Codex (`mcp__codex__codex` ausente da descoberta de ferramentas): três leitores
> `contexto-leitor` em paralelo (Drive, Notion, repo), fundidos e conferidos pelo Claude.

## Scope

**Goal:** sair do estado "o único alerta que deixa o host é o de backup atrasado": CloudWatch agent
na EC2, instalado pelo `user-data.sh` versionado, e alarmes mínimos (instância/`/up` fora, disco,
5xx sustentado, certificado a vencer) no SNS `lotus-alertas`, cada um provado disparando e chegando
ao destinatário.

**Non-goals:** APM, tracing, dashboards; auditoria de aplicação (owen-it); HA, ALB, segunda EC2,
multi-AZ; IaC; centralizar logs de ações fora do monólito (ADR-21).

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRV-ADR | Google Drive | ID `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`, `decisao-stack.md` (ADR-01..19) | 2026-07-31T16:15:51Z | retrieved | ADR-14: monitoramento `[FASE 2]` |
| DRV-AWS | Google Drive | ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI`, `arquitetura-aws-lotus.md` | 2026-10-04T18:49:34Z | retrieved | Topologia, custo, região, ALB, RNF-DIS |
| DRV-REQ | Google Drive | ID `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`, `requisitos-negocio.md` | 2026-08-22T08:09:38Z | retrieved | RNF-DIS-01..03, RNF-SEC-05/07 |
| NOT-1018 | Notion | page `388bc960-3dfa-81d4-83d3-ef554fb6b1eb`, EAP `10.1.8` "Healthcheck + alerta de queda (CloudWatch básico)", collection `e64b7d57-d000-4433-b652-a410e75193cc` | 2026-08-14T18:42:16Z | retrieved | Aceite e status da task |
| NOT-EAP | Notion | query na collection `e64b7d57-d000-4433-b652-a410e75193cc`, EAP 10.1.1–10.1.7 e 11.1.1–11.1.3 | não obtido (query sem last edited) | retrieved | Existência de tasks irmãs de alerta |
| L-RUN | Git local | `deploy/aws/README.md` (runbook §4, §6, §7, §9, §10, §11.7) | 2026-10-04 | retrieved | Região, IAM, SNS, cron, certbot |
| L-HOST | Git local | `deploy/aws/user-data.sh`, `deploy/aws/env.prod.example`, `deploy/bin/verificar-backup.sh`, `docker-compose.prod.yml`, `deploy/nginx/tls.conf` | 2026-09-04 / 09-29 / 09-20 / 09-20 / 09-27 | retrieved | O que o host já tem |
| L-SPEC10 | Git local | `docs/superpowers/specs/archive/2026-09-02-infra-producao-provisionamento-aws-design.md` (l. 53-58) | 2026-10-04 | retrieved | Origem do bloco |
| L-DOCS | Git local | `docs/adrs.md` (ADR-14, ADR-21, ADR-23), `docs/superpowers/pendencias/abertas.md` (P-80), `.claude/aceitacao-aliases.conf`, spec do bloco 33 | 2026-10-04 | retrieved | Decisões, custo, formato de prova |

## Key facts

1. ADR-14 e a task 10.1.8 só dizem "healthcheck + alerta de queda (CloudWatch básico)"; o único
   critério de aceite é "Alerta dispara em queda". Nenhuma fonte fixa métrica, limiar, período,
   retenção de log, destinatário ou teto de custo de observabilidade: tudo isso é decisão deste
   bloco. Não há outra task de alerta/log na EAP. `[DRV-ADR]` `[NOT-1018]` `[NOT-EAP]`
2. Tudo vive em `sa-east-1`; o tópico `lotus-alertas` existe lá, com o e-mail do João como único
   assinante confirmado. O ARN fica em `LOTUS_ALERT_TOPIC_ARN` no `/opt/lotus/.env`, e o
   `verificar-backup.sh` é o padrão de publish (`aws sns publish`, região tirada do ARN, recusa sem
   a variável). O Budget `lotus-prod-teto` manda e-mail direto, sem SNS. `[L-RUN]` `[L-HOST]`
3. A role `lotus-ec2` tem inline `s3`, `lotus-alerta` (só `sns:Publish` no tópico), `lotus-ses` e a
   managed `AmazonSSMManagedInstanceCore` — nada de CloudWatch (`PutMetricData`, `logs:*`). IMDSv2
   obrigatório, hop limit 2. IAM não nasce do user-data. `[L-RUN]`
4. O `user-data.sh` é colado à mão no launch e serve também de reparo (guardas de reexecução); hoje
   instala Docker, AWS CLI v2, swap 2G e `/opt/lotus`. Não instala agente, certbot nem crontab: o
   cron de backup (06:10/06:40 UTC) é manual (runbook §9). Artefatos chegam por `scp` (§7).
   `[L-HOST]` `[L-RUN]`
5. Logs: `LOG_CHANNEL=stderr`, então o Laravel escreve no json-file do Docker (10m × 3, todos os
   serviços); o nginx usa o default da imagem (stdout/stderr), sem `access_log` customizado. O
   comentário do compose já prevê "o coletor (CloudWatch)" mantendo o teto local. Nada decide
   agente lendo `/var/lib/docker/containers` vs driver `awslogs`. `[L-HOST]`
6. `/up` é o health do Laravel; o nginx o checa a cada 15 s (cobre nginx + fpm + boot). `app` e
   `scheduler` não têm healthcheck. `/up` é isento do 301 na porta 80 e responde em
   `https://app.lotusotec.cl/up` — única superfície HTTP de prova (`producao GET /up -> 200`).
   `[L-HOST]` `[L-DOCS]`
7. Certbot roda no host (`certbot.timer`, webroot, hook `recarregar-nginx.sh`); o certificado
   atual vence em 2026-12-27. O runbook §11.7 diz textualmente "Não há alarme de expiração até o
   item 34". `[L-RUN]`
8. P-80: previsão do mês USD 35,74 contra teto de 30, revisão em 2026-10-31; resize para
   t4g.medium dobra o compute. A EC2 tem 2 GiB com swap em uso, e o agente consome RAM. Sem ALB
   no MVP: o Drive lista "sem health check gerenciado" como contra aceito. `[L-DOCS]` `[DRV-AWS]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Região | DRV-AWS: `sa-east-1` vs `us-east-1` "[A CONFIRMAR]" | `sa-east-1`, recursos já provisionados | Runbook §1 cita spec v2 §2 e mostra EC2, S3, SNS e SES criados em `sa-east-1` `[L-RUN]`; o Drive está desatualizado, atualizá-lo é fora do bloco |
| Canal de billing | Spec item 10 §13: tópico/alarme em `us-east-1` | Billing é Budgets por e-mail; `lotus-alertas` é `sa-east-1` | Runbook §10 corrigiu na execução do item 12 `[L-RUN]` |
| RNF-SEC-05 (logs em microsserviço) | DRV-REQ | Logs de ações no monólito | ADR-21 `[L-DOCS]` |
| RNF-SEC-07 (alerta de acesso suspeito) | DRV-REQ | Sem arquitetura em nenhuma fonte | Fora da ficha 34; não decidido aqui |
| ADR-14 "monitoramento [FASE 2]" | DRV-ADR | Ainda sem emenda | Este bloco é o construtor; a emenda é entregável dele |
| Destinatário | Ficha: "e-mail do item 33 ou canal do Budget" | O item 33 não criou assinatura SNS; SNS entrega e-mail sem SES | Unresolved: decisão do João no brainstorming |

## Constraints

- Escrita em AWS e no host é do João; a sessão confere por leitura (memória do projeto).
- Mudar `deploy/aws/user-data.sh` não entra na conferência do botão de deploy; um `deploy/bin/*.sh`
  novo trava o botão até reinstalar pelo runbook §7 (item 31).
- Repositório pessoal público: nenhum número de conta ou ARN real no repo (`<conta>`).
- Proporcional a ~10 usuários (RNF-DES-02); custo entra na conversa da P-80.
- A aceitação externa automatiza só `GET`/`HEAD` no alias `producao`; alarme e e-mail são leitura
  do João (`prova: nenhuma`).

## External acceptance signals

- Cada alarme visto em `ALARM` por sonda e o e-mail do SNS recebido; `OK` de volta depois.
- Instância recriada (ou reparada) pelo `user-data.sh` sobe com o agente publicando.
- Medição registrada em `audits/`; `producao GET /up -> 200` ao fim.

## Open questions

- "Instância/`/up` fora": `/up` só é visível de dentro do host — métrica custom do host,
  `StatusCheckFailed` da EC2, ou sonda externa (Route 53 health check custa)?
- 5xx sustentado: filtro de métrica sobre log do nginx exige formato conhecido e coleta de log.
- Certificado: script no host (trava o botão) vs métrica derivada; valor de N dias.
- Destinatário(s) do SNS, retenção dos log groups e teto de custo dentro da P-80.
- Como provar disco cheio e `app` parado sem risco aos dados de produção.

## Deferred

- Atualizar o Drive (região, ADR-14) — fora do repositório.
- RNF-SEC-07, dashboards, APM.

## Staleness triggers

- A ficha 34 mudar de escopo ou o bloco virar outro item.
- Decisão nova do João sobre destinatário, custo (P-80, revisão de 2026-10-31) ou resize da EC2.
- Mudança na role `lotus-ec2`, no tópico `lotus-alertas`, no `user-data.sh` ou no logging do compose.
- ADR-14 emendado fora deste bloco, ou o Drive `arquitetura-aws-lotus.md` fixar alarmes/custo.

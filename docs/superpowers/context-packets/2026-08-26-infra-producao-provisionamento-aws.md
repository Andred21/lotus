---
schema_version: 1
packet_id: ctx-infra-producao-provisionamento-aws
block_id: infra-producao-provisionamento-aws
status: partial
generated_at: 2026-08-26T18:44:19-03:00
base_ref: infra/producao-provisionamento-aws
base_commit: 4a33f835a22086623e612f78244fd8fd94eac3ff
state_path: docs/superpowers/state.md
state_blob_sha: cc6dbd8b0f6019b2282816419ac6fb489a7083a1
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 1365f40d28f04c3108c28cf7cf456d64e7db72a5
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Provisionamento AWS de produção

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** provisionar EC2/SG, RDS MySQL 8, S3/IAM, SES/DNS/DKIM, Certbot/TLS e CloudWatch reais, e entregar um host preparado para executar o par GHCR por SHA sobre esses serviços.
**Non-goals:** refazer imagens/Compose; usar MinIO/Mailpit como prova; construir promoção/rollback do item 12; ALB, segunda EC2, RDS Multi-AZ ou resolver RNF-DIS-02 antes do item 13.

## Source registry

11 artefatos externos excedem cinco porque as sete páginas Notion foram fontes obrigatórias nomeadas; os três documentos Drive e a ref GitHub cobrem requisitos, decisões e base pedida.

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| CURRENT | Instrução atual | Bloco `infra-producao-provisionamento-aws` | 2026-08-26 | retrieved | escopo, decisões abertas e seam com item 12 |
| REPO-PROV | Repository | `state.md@cc6dbd8`; `progress.md@1365f40`; branch/HEAD `4a33f835` | HEAD `4a33f835` | retrieved | estado, proveniência e WIP |
| REPO-SCOPE | Repository | `backlog.md` itens 10/13; `docs/adrs.md` ADR-09/11/13/14 | HEAD `4a33f835` | retrieved | escopo, DoD e gate RNF-DIS-02 |
| REPO-RUNTIME | Repository | `docker-compose.prod.yml`; `docker/Dockerfile.prod`; `backend/.env.production.example`; `docker/php/{entrypoint.sh,memory-cli.ini,www.conf}`; Nginx/config/código storage/mail | HEAD `4a33f835` | retrieved | contrato entregue do host, S3, SES, health e memória |
| REPO-PRED | Repository | `specs/archive/2026-08-22-infra-producao-runtime-e-aws-design.md` | HEAD `4a33f835` | retrieved | heranças `key:generate` e RNF-DIS-02 |
| REPO-DOWNSTREAM | Repository | packet bloqueado do item 12; spec/CI do item 11 | HEAD `4a33f835` | retrieved | pré-requisitos do deploy e contrato GHCR |
| DRIVE-AWS | Google Drive | ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI` — `arquitetura-aws-lotus.md` | 2026-06-22T20:17:27Z | retrieved | região, sizing, custo, DNS, topologia e disponibilidade |
| DRIVE-ADR | Google Drive | ID `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` — `decisao-stack.md` | 2026-07-31T16:15:51.504Z | retrieved | ADR-09/11/13/14 externos |
| DRIVE-RNF | Google Drive | ID `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` — `requisitos-negocio.md` | 2026-08-22T08:09:38.786Z | retrieved | RNF-DIS-01/02/03/04 e RNF-SEC-03 |
| GITHUB-REF | GitHub | repository ID unavailable; locator `Andred21/lotus`, ref `infra/producao-provisionamento-aws`, commit `4a33f835…` | n/a | unavailable — commit call failed: `GitHub API error 422: No commit found for SHA: 4a33f835a22086623e612f78244fd8fd94eac3ff`; branch search returned `[]` | validar ref remota pedida |
| NOTION-10.1.1 | Notion | page ID `388bc960-3dfa-81cf-8e8e-fcf401d8b19f`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:42:12.161Z | retrieved | EC2, SG, chave e SSH |
| NOTION-10.1.2 | Notion | page ID `388bc960-3dfa-81a4-9779-ec02137ad238`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:41:51.135Z | retrieved | RDS e snapshot |
| NOTION-10.1.3 | Notion | page ID `388bc960-3dfa-818e-897f-e3fd682c1e43`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:41:37.890Z | retrieved | S3, IAM e CORS |
| NOTION-10.1.4 | Notion | page ID `388bc960-3dfa-81c6-932b-f7640d70b45a`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:42:07.573Z | retrieved | SES, domínio e DKIM |
| NOTION-10.1.5 | Notion | page ID `388bc960-3dfa-810e-b1eb-f66936836cf2`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:41:03.080Z | retrieved | runtime já entregue |
| NOTION-10.1.6 | Notion | page ID `388bc960-3dfa-8165-b501-cfb89d07f443`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:41:27.662Z | retrieved | Certbot e renovação |
| NOTION-10.1.8 | Notion | page ID `388bc960-3dfa-81d4-83d3-ef554fb6b1eb`; collection `e64b7d57-d000-4433-b652-a410e75193cc` | snapshot 2026-08-14T18:42:16.374Z | retrieved | CloudWatch e alerta |

## Key facts

1. A lane está em `context_required`, plano/spec nulos; branch/HEAD e hashes conferem e a árvore está limpa. A ref GitHub não existe no origin público, limitação não bloqueante porque a base local foi verificada. `[REPO-PROV]` `[GITHUB-REF]`
2. O runtime foi entregue em 2026-08-22; este bloco é somente conta AWS e bootstrap do host. Notion 10.1.5 ainda “A fazer” é snapshot organizacional obsoleto para esse recorte. `[CURRENT]` `[REPO-SCOPE]` `[NOTION-10.1.5]`
3. Topologia-alvo: EC2 Ubuntu 24 pública; RDS MySQL 8 privado, acessível só pelo SG da EC2, sugerido `db.t4g.micro`, single-AZ, gp3 20 GB/autoscaling; S3 privado/versionado; SES; HTTPS direto na EC2; snapshots ≥7 dias. `[DRIVE-AWS]` `[DRIVE-RNF]` `[NOTION-10.1.1]` `[NOTION-10.1.2]`
4. O host deve executar `app`, `nginx`, Gotenberg e ClamAV; usar `/opt/lotus/.env` (0600), sem MySQL/MinIO/Mailpit/worktree; `/up` atravessa Nginx→FPM. CLI=320M; FPM=256M × até 5; num host novo, `key:generate` exige `--entrypoint php`. `[REPO-RUNTIME]` `[REPO-PRED]`
5. Produção configura Flysystem `s3` por region/bucket, sem endpoint/path-style; a aplicação grava/apaga no backend e entrega URLs GET pré-assinadas a `img`/`iframe`/nova aba. Mail entregue usa `MAIL_MAILER=smtp`; Drive descreve driver SES. `[REPO-RUNTIME]` `[DRIVE-ADR]`
6. Item 10 deve estabelecer host/IP, usuário/chave/host-key SSH, `/opt/lotus` com manifesto, Docker+Compose e login GHCR read-only; item 12 os consome e possui workflow, secrets GitHub, promoção e rollback. Nenhum dos dois pode despossuir essa seam. `[CURRENT]` `[REPO-DOWNSTREAM]` `[NOTION-10.1.1]`
7. Drive sugere `t4g.small` 2 GB, subindo a `t4g.medium` 4 GB se Gotenberg pressionar; estima US$35–55/mês em `sa-east-1`, on-demand, sem ALB. São evidências para brainstorming, não decisões fechadas. `[DRIVE-AWS]`
8. RNF-DIS-02 continua realmente `unresolved`: requisito exige servidor redundante pronto; ADR-14 manda EC2 única; Drive propõe rebaixar para restore/redeploy rápido, mas João não ratificou. O gate permanece no item 13. `[DRIVE-RNF]` `[DRIVE-AWS]` `[REPO-PRED]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Runtime/deploy | Notion 10.1.5 e Drive dizem build/`git pull` na VM. | Runtime já entregue; host puxa o par GHCR por SHA, sem rebuild/worktree. | Decisões posteriores dos itens 10–12. `[REPO-SCOPE]` `[REPO-DOWNSTREAM]` |
| Hosts/TLS | Drive antigo mostra `lotus.cl` + `api.lotus.cl` e ACM/ALB opcional. | Origem única; EC2 direta com Certbot, conforme backlog/10.1.6/ADR-14. | Instrução atual posterior e runtime build-time-agnostic. `[CURRENT]` `[NOTION-10.1.6]` |
| S3 CORS | 10.1.3 pede “CORS p/ upload”. | Não há upload direto browser→S3; permitir PUT não tem evidência. Provar e aplicar apenas CORS necessário aos consumidores atuais. | Código vigente mostra multipart→backend e leitura pré-assinada. `[REPO-RUNTIME]` |
| SES transport | Drive pede Laravel SES; molde entregue pede SMTP. | **Unresolved, non-blocking:** escolher SES API ou SMTP do SES no brainstorming. | Ambos satisfazem SES/DKIM, mas mudam credenciais/IAM. `[DRIVE-AWS]` `[REPO-RUNTIME]` |
| Disponibilidade | Drive rebaixa redundância para restore; requisito não. | **Unresolved/deferred:** não alegar que EC2 única satisfaz RNF-DIS-02. | Item 13 é o gate explícito. `[REPO-PRED]` `[DRIVE-RNF]` |

## Constraints

- As quatro decisões do João bloqueiam somente seus recursos, nunca o planejamento.
- IAM por role da EC2, least privilege para os `GetObject/PutObject/DeleteObject` efetivamente usados; bucket sem acesso público. Não materializar access keys na imagem.
- `SESSION_SECURE_COOKIE=true`: aceite exige HTTPS e renovação automática; o runtime atual é HTTP/80, portanto Certbot/Nginx deve fechar essa borda e preservar `/up`.
- A escolha ARM `t4g` exige confirmar manifesto `linux/arm64` de todas as quatro imagens.
- MinIO e Mailpit são substitutos de dev, não sinais de aceite AWS.

## External acceptance signals

- SSH funciona com 22 restrita; RDS privado tem snapshot automático ≥7 dias; S3 é privado/least-privilege; SES sai do sandbox, domínio/DKIM verificam e envio real passa. `[NOTION-10.1.1]`–`[NOTION-10.1.4]`
- HTTPS renova automaticamente; alerta CloudWatch dispara numa queda comprovada. `[NOTION-10.1.6]` `[NOTION-10.1.8]`
- O par promovido por SHA sobe sobre RDS/S3/SES reais, responde `/up` por HTTPS e não depende do working tree. `[REPO-SCOPE]`

## Open questions

- **Região:** `sa-east-1` reduz latência Brasil/Chile e favorece RNF-DES-01; `us-east-1` é mais barata e Drive considera a latência tolerável para ~10 usuários. Drive não quantifica a diferença. `[DRIVE-AWS]`
- **EC2:** `t4g.small` é a sugestão; `medium` compra 4 GB. O envelope FPM sozinho pode reservar 1,25 GB, além de Gotenberg e ClamAV; medir o conjunto e ARM antes de criar. Drive não precifica `medium`. `[DRIVE-AWS]` `[REPO-RUNTIME]`
- **DNS/alerta:** quem controla hoje `lotus.cl`, autoriza records/SES DKIM e recebe CloudWatch? Drive requer os records e estima hosted zone em ~US$0,50, mas não identifica operador/provider/canal. `[DRIVE-AWS]`
- **Teto:** aceitar US$35–55/mês, faixa sa-east-1/on-demand/sem ALB? ALB soma ~US$16–20; us-east-1 é mais barata; medium não foi estimada. `[DRIVE-AWS]`
- **Contratos:** SES API ou SMTP; e qual CORS mínimo é demonstrado pelos previews/leituras pré-assinadas? `[DRIVE-AWS]` `[REPO-RUNTIME]`

Nenhuma pergunta é bloqueante para planejamento; as quatro primeiras fecham no brainstorming antes do recurso correspondente.

## Deferred

- RNF-DIS-02, HA/ALB, segunda EC2, RDS Multi-AZ e teste de restore/RPO/RTO: item 13.
- Workflow de deploy/rollback, aprovação e registro de SHA atual/anterior: item 12.
- S3 Glacier/lifecycle frio.

## Staleness triggers

- O active work item, escopo AWS, runtime/Compose/env/health ou contrato GHCR mudar semanticamente.
- João fechar/reabrir região, sizing, DNS/alerta, custo, transporte SES ou CORS.
- Uma fonte Drive/Notion mudar ou contradizer a reconciliação; a ref GitHub pedida tornar-se disponível.
- O item 12 mudar os pré-requisitos do host ou o item 13 resolver RNF-DIS-02.

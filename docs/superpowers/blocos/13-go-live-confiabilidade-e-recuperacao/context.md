SUGGESTED_PATH: docs/superpowers/blocos/13-go-live-confiabilidade-e-recuperacao/context.md
BEGIN LOTUS CONTEXT PACKET
---
schema_version: 1
packet_id: lotus-13-go-live-confiabilidade-e-recuperacao-20261005
block_id: 13-go-live-confiabilidade-e-recuperacao
status: partial
generated_at: 2026-10-05T22:40:34-03:00
base_ref: main
base_commit: 546be1f1ef18708185697688705e5004eaef89e9
state_path: null
state_blob_sha: null
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 514b4dfa99780b2d2240719492590d276f11e030
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — 13 · go-live: confiabilidade e recuperação

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
> Gerado sem Codex (`mcp__codex__codex` ausente da sessão): quatro leitores `contexto-leitor`
> paralelos (Drive, Notion, repo-dados, repo-infra), fundidos aqui.

## Scope

**Goal:** último gate P0 antes do go-live. Produzir evidência de release, fluxo crítico
(cotação → validação pública do certificado) sobre HTTPS, backup e restore reais com RPO/RTO
medidos, migrations e roles em produção, dados-sonda limpos; e resolver formalmente a
divergência de disponibilidade (`RNF-DIS-02` × EC2 única), replicando a decisão no ADR-14.

**Non-goals:** construir alertas/health (item 34, já entregue, aguarda aceitação do custo);
cofre gerenciado de segredos (adiado em `docs/operacao-segredos.md`); HA/multi-AZ/ALB (trilha
futura do Drive); APM, dashboards; redesign de qualquer tela.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRV-REQ | Google Drive | `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-` · `requisitos-negocio.md` | 2026-08-22 | retrieved | texto exato RNF-DIS-01..04 |
| DRV-AWS | Google Drive | `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI` · `arquitetura-aws-lotus.md` §1.2, §3, §4 | 2026-10-04 | retrieved | rebaixamento do DIS-02, trilha HA, segredos |
| DRV-ADR | Google Drive | `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` · `decisao-stack.md` | 2026-07-31 | retrieved | ADR-09 e ADR-14 originais |
| N-11.1.1 | Notion | `388bc960-3dfa-81ae-b059-f49f57fe5fbc` · "Migrações em produção + seeders de roles/permissões" (A fazer) | 2026-08-14 | retrieved | aceite: "Roles/permissões presentes em prod" |
| N-11.1.2 | Notion | `388bc960-3dfa-8100-86a6-e3531d154165` · "Smoke test do fluxo completo em produção" (A fazer) | 2026-08-14 | retrieved | aceite: "Fluxo cotação→certificado passa em prod" |
| N-11.1.3 | Notion | `388bc960-3dfa-819e-a4f5-c497235c724a` · "Validação de backup/restore (snapshot RDS)" (A fazer) | 2026-08-14 | retrieved | aceite: "Restore de snapshot validado (RNF-DIS-02)" |
| N-10.1.8 | Notion | `388bc960-3dfa-81d4-83d3-ef554fb6b1eb` · "Healthcheck + alerta de queda" (A fazer) | 2026-08-14 | retrieved | status Notion defasado vs item 34 |
| REPO-ADR | repo | `docs/adrs.md` (ADR-09 rev. 2026-09-02; ADR-14 + emendas) | main | retrieved | decisão vigente banco/backup/deploy |
| REPO-RUN | repo | `deploy/aws/README.md` §8.1.1, §8.2, §8.3, §9, §10, §14; `deploy/bin/*.sh`; `.github/workflows/deploy.yml` | main | retrieved | restore, ledger, seed, backup, release |
| REPO-PEND | repo | `docs/superpowers/pendencias/abertas.md` (P-05, P-44, segredos ~l.1142); `backlog.md` (ficha 13, D-37) | main | retrieved | débitos do bloco |
| REPO-34 | repo | `docs/superpowers/blocos/34-infra-producao-observabilidade/{estado,aceitacao}.md`; blocos 32 e 33 `estado.md` | main | retrieved | o que já está provado |
| REPO-MIG | repo | `backend/database/migrations/` (30), `seeders/{DatabaseSeeder,RolePermissionSeeder}.php` | main | retrieved | P-05, D-37, roles |
| REPO-AUD | repo | `docs/superpowers/audits/2026-09-17-item10-v2-provisionamento.md`, `2026-09-21-cicd-promocao-deploy-e-rollback.md` | main | retrieved | ensaios de restore |

Drive: busca por `go-live`, `runbook`, `RTO`, `RNF-DIS` só devolveu os três arquivos acima; não
há checklist de go-live, RPO/RTO numérico nem registro de aceite da Lotus no Drive. Notion: as
quatro páginas estão sem corpo (só propriedades de linha); não há outra task `11.1.x`.

## Key facts

1. `RNF-DIS-02` exige "servidor redundante pronto para assumir em caso de queda"; DIS-03 "backup
   com no mínimo 7 dias de retenção"; nenhum RPO/RTO numérico no requisito. `[DRV-REQ]`
2. O Drive §4 rebaixa o DIS-02 para "RTO de minutos via redeploy + restore de snapshot", HA futura
   = RDS multi-AZ + 2ª EC2 atrás de ALB. É proposta do documento, **sem data, autor nem aceite da
   Lotus registrado**. `[DRV-AWS]`
3. Vigente: MySQL 8 em container na EC2 única (ADR-09 rev. 2026-09-02, teto US$ 30/mês), dump
   diário 06:10 UTC → S3 (lifecycle 30 d), **RPO ≤ 24 h + restore manual**, aceito pelo João, não
   pela Lotus. Gatilhos de reversão a RDS: restore falhar, backup > 7 d sem sucesso, cliente exigir
   RPO menor. Não existe snapshot EBS/RDS: o "snapshot" do Drive e do Notion não corresponde ao
   mecanismo real. `[REPO-ADR]` `[REPO-RUN]`
4. Restore tem procedimento escrito (§8.1.1: baixar, conferir, travar deploy, dump "antes",
   DROP/CREATE, carga, linha `restore` no ledger) e dois ensaios fora do host (WSL 2026-09-17,
   `mysql:8.0` 2026-09-26, onde o restore ingênuo falhou com `ERROR 1050`). **Nenhum restore
   cronometrado, nem sobre o host, nem com certificado emitido.** O dump real tinha
   `certificates=0`. `[REPO-RUN]` `[REPO-AUD]`
5. Release = `workflow_dispatch` "Promover para producao" (SHA + palavra `PROMOVER`, OIDC role
   `lotus-deploy`, `deploy.sh` por SSM). O `deploy.sh` roda `migrate --force`, recusa com código 4
   se o schema do banco estiver à frente, faz dump pré-deploy com migration pendente, grava
   `/opt/lotus/releases.jsonl`. Rollback = promover o SHA anterior. `[REPO-RUN]`
6. P-05: produção já tem as 30 migrations na tabela `migrations` (deploy `a5fc92bb`, 2026-09-04).
   Onze são "adicionais" (alter/add/backfill). Consolidar renomeia arquivos e o `deploy.sh`
   compara `SELECT migration FROM migrations` com `ls database/migrations` → exige reescrever a
   tabela de prod à mão ou vale só para ambiente novo. `[REPO-MIG]` `[REPO-PEND]`
7. D-37: `archived_with_parent` existe em 8 tabelas (`client_addresses`, `client_contacts`,
   `users`, `course_modules`, `course_certificate_templates`, `quotes`, `files`, `enrollments`),
   default `false`, sem backfill. Ninguém mediu se produção tem linha arquivada; se a contagem
   for zero, o D-37 encerra sem decisão caso a caso. P-44 é dado de **dev** (11 usuários ids
   76-89, e-mails `e2e.gate*`, `gate.fechamento@lotus.cl`, `gate-bd9@gate.cl`); o smoke em prod
   criará sondas novas e precisa de critério de limpeza próprio. `[REPO-MIG]` `[REPO-PEND]`
8. Item 34 entregou agente CloudWatch, sonda `/up` por minuto e 4 alarmes (`lotus-prod-up`,
   `-5xx`, `-disco`, `-certificado`) no SNS `lotus-alertas`, provados; só o item 7 (custo no Cost
   Explorer, legível a partir de 2026-10-08) está pendente. Blocos 32 (TLS) e 33 (SES) estão
   `closed`. Roles em prod: `RolePermissionSeeder` idempotente por `db:seed --force` (§8.3), sem
   registro de ter rodado em prod. `[REPO-34]` `[REPO-RUN]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Banco e backup | DRV-AWS/DRV-ADR/N-11.1.3: RDS single-AZ, snapshot diário 7 d, "restore em minutos" | MySQL em container, dump diário S3, RPO ≤ 24 h, restore manual | ADR-09 rev. 2026-09-02 (decisão posterior do João); Drive e Notion desatualizados, não corrigidos |
| Healthcheck/alerta | DRV-ADR ADR-14 `[FASE 2]`; N-10.1.8 "A fazer" | Entregue pelo item 34, aguardando aceitação do item 7 | `blocos/34/estado.md` + `aceitacao.md` |
| Deploy, TLS, domínio | ADR-14 original: git pull, Certbot no nginx, `lotus.cl` | Promoção por SHA/SSM, certbot no host, `app.lotusotec.cl` | Emendas do ADR-14 no repo (2026-09-27) |
| Escopo do bloco | Notion 11.1.x: só roles, smoke até certificado, restore | Ficha do backlog: + P-05, D-37, P-44, RPO/RTO, secrets, smoke até validação pública | Ficha (decisão posterior do João); Notion é organização, não requisito |
| `RNF-DIS-02` | DRV-REQ exige redundância; DRV-AWS rebaixa para RTO de minutos | **Unresolved**: ADR-14 sem emenda; aceite da Lotus inexistente | Emenda 2026-09-26 da ficha: o gate do bloco é confirmar o aceite e replicar no ADR-14 |

## Constraints

- Lei 2 (auditoria só na aplicação) e peso legal dos certificados: restore que perde certificado
  emitido depois do dump é perda legal, não só técnica; o RPO precisa ser declarado à Lotus.
- Escrita remota em produção é do João (`.claude/aceitacao-aliases.conf`, memória da sessão):
  o bloco desenha provas que ele roda e o Claude verifica por leitura.
- Lei 7: financeiro nunca bloqueia; nada do go-live gateia por cotação.
- `deploy.sh` recusa banco à frente do alvo: qualquer consolidação de migration (P-05) tem de
  respeitar esse gate ou declarar "só ambiente novo".
- Alias de aceitação disponível: só `producao` (`https://app.lotusotec.cl`).

## External acceptance signals

- `producao GET /up -> 200` (já usada no 34).
- `producao GET /sanctum/csrf-cookie -> 204` e `producao GET /api/login -> 405` (HTTPS + roteamento).
- `producao GET /validar/<uuid> -> 200` só se o smoke deixar um certificado estável.
- Backup, restore cronometrado, RPO/RTO, migrations e roles em prod, aceite da Lotus: sem
  superfície HTTP → `prova: nenhuma`, Resultado e Data escritos pelo João.

## Open questions

1. A Lotus aceita formalmente o rebaixamento do `RNF-DIS-02` (sem redundância, RTO por
   redeploy + restore de dump, RPO ≤ 24 h)? Quem colhe o aceite e em que forma (e-mail, ata)?
2. RTO alvo: "minutos" do Drive pressupõe snapshot que não existe. Mede-se o RTO real do runbook
   §8.1.1 e declara-se esse número, ou o bloco cria snapshot EBS/AMI?
3. P-05: reescrever a tabela `migrations` de prod à mão, ou consolidar só para ambiente novo e
   fechar a pendência com essa decisão?
4. Restore a provar: em container descartável no host, ou sobre o volume real de produção
   (com dump "antes" e janela)?

## Deferred

- Cofre gerenciado de segredos (RNF-SEC-03 × `docs/operacao-segredos.md`): só conferência do
  `.env` contra o molde entra aqui.
- Reversão a RDS: fica como gatilho do ADR-09, não como entrega, salvo a Lotus exigir RPO menor.
- Alarme de falha de backup via CloudWatch e alarme de memória (D9 do item 34).
- Atualizar `arquitetura-aws-lotus.md` e `requisitos-negocio.md` no Drive: decisão do João.

## Staleness triggers

- Lotus registrar aceite ou recusa do `RNF-DIS-02` rebaixado.
- Item 34 fechar (item 7) ou reabrir algum alarme.
- Emenda ao ADR-09/ADR-14 que mude banco, backup ou RPO/RTO.
- Mudança em `deploy.sh` (gate de schema, dump pré-deploy) ou no runbook §8.1.1.
- Nova migration além das 30, ou decisão sobre P-05/D-37/P-44 fora deste bloco.
END LOTUS CONTEXT PACKET
RECOMMENDED_TRANSITION: ready_for_planning

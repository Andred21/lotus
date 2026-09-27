---
schema_version: 1
packet_id: 2026-09-27-infra-producao-dns-e-tls
block_id: infra-producao-dns-e-tls
status: ready
generated_at: 2026-09-27T19:45:24-03:00
base_ref: infra/producao-dns-e-tls
base_commit: 3d56b5a80bc29bab3e3f8daea5c53b23103c46d3
state_path: docs/superpowers/state.md
state_blob_sha: d61dbdde53b6a8b3cf07692adf237ef3698250eb
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 08837af799ba86b52cce6b39169a9e5f715ee22e
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — DNS e TLS da produção

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** preparar o planejamento do registro DNS e da ativação ponta a ponta de TLS em `app.lotusotec.cl`, incluindo renovação, configuração da aplicação e provas de produção.

**Non-goals:** e-mail/SES, alarmes, cutover do site institucional, integração `8.2.1`, renovação do wildcard do WordPress e publicação de CAA.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| J-1 | João Victor | Instrução atual; emenda de 2026-09-27 do ADR-14 | 2026-09-27 | retrieved | Nome definitivo e prioridade |
| L-1 | Git local | `lotus-infra@3d56b5a80bc29bab3e3f8daea5c53b23103c46d3`: backlog item 32; ADR-14; P-77; rastro encerrado da P-79; runbook §5/§11; `tls.conf`; overlay; molde de env; spec item 10 D7 | 2026-09-27T19:30:29-03:00 | retrieved | Estado, TLS, configuração e aceite |
| S-1 | Git local, `Andred21/lotus-site` | `9c5e393c332ac25bfadb3ede5bcb1dd05fa492bc`: `ADR-SITE-006.md`, inventário/delegação DNS, `infra/lotus-dns.yaml`, runbook AWS e backlog D-49/D-51/D-52 | 2026-09-27T19:29:25-03:00 | retrieved at requested commit | Zona, template, operação e dívidas |
| G-1 | Google Drive | ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI`, `arquitetura-aws-lotus.md` | 2026-06-22T20:17:27Z | retrieved | §1.5/§5, topologia TLS |
| N-1 | Notion | page `3c2bc960-3dfa-8182-8270-f7a2ebd5c20a`, EAP `7.2.1`; parent `collection://2f0e72ec-ef53-4e08-a466-312de7eea7d2` | 2026-09-09T20:20:13.484Z | retrieved | Escopo DNS/HTTPS do site |
| N-2 | Notion | page `3c2bc960-3dfa-81d3-b373-ef6f4c7bdee8`, EAP `8.2.1`; parent `collection://2f0e72ec-ef53-4e08-a466-312de7eea7d2` | 2026-09-09T20:20:38.423Z | retrieved | Integração congelada |

`S-1` comprime os caminhos mutuamente necessários do único snapshot Git solicitado: mecanismo, estado da zona, delegação, template, operação e três dívidas vivem em arquivos distintos.

## Key facts

1. O hostname definitivo é `app.lotusotec.cl`; a decisão posterior de João vence `sistema.`, `intranet.` e o placeholder `lotus.cl`. `[J-1]`
2. A zona está delegada ao Route 53 e não possui `app`. O registro nasce por PR no `lotus-site`: adicionar `A app.lotusotec.cl → 18.230.53.197` a `RecordSets` e ao inventário/catraca, revisar o change set e atualizar o stack `lotus-dns` em `us-east-1`; nunca editar Route 53 manualmente. `[L-1][S-1]`
3. Não deve nascer `AAAA` para `app`: `18.230.53.197` é o EIP IPv4. Os `AAAA` existentes são do WordPress (`2a07:7800::195`); publicar esse valor para `app` desviaria clientes IPv6. Só cabe `AAAA` se a produção ganhar endereço IPv6 próprio e roteado. `[S-1]`
4. A zona não publica CAA. A D-49 adia sua criação até a D-51 ser decidida e exige autorizar simultaneamente `amazon.com` e `letsencrypt.org` enquanto coexistirem ACM e certificados Let's Encrypt. `[S-1]`
5. A D-51 exige decisão até 2026-10-11: o wildcard da 20i vence em 2026-11-10 e sua renovação DNS-01 foi cortada pela delegação. Ela afeta o WordPress em apex/`www`/`sistema`, não o novo `app` apontado à EC2; a interseção é a futura política CAA. `[S-1]`
6. O caminho vigente é a Opção A do Drive: EC2 direta, nginx terminando TLS com Let's Encrypt/Certbot, sem ALB. A emissão inicial usa `certbot --standalone` com nginx parado; depois o overlay monta certificado, `tls.conf` e webroot. `[G-1][L-1]`
7. O runbook exige virar juntos seis campos — `APP_URL`, `FRONTEND_URL`, `CERTIFICATE_VALIDATION_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE=true` —, redeployar, migrar a renovação para webroot, instalar o hook que reinicia nginx e passar `certbot renew --dry-run` com nginx ativo. `[L-1]`
8. A Notion `7.2.1` trata o site/ACM e está desatualizada sobre bloqueio de acesso; `8.2.1` permanece congelada. Criar DNS para `app` não abre integração de cursos. `[N-1][N-2][S-1]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Hostname | Drive: `lotus.cl`; ADR/Notion site: `sistema.`; V1: `intranet.` | `app.lotusotec.cl` | Instrução atual de João e ADR-14 posterior `[J-1][L-1]` |
| Dono do DNS | D7/P-77 antigos: StackDNS e terceiro sem acesso | Route 53; João, via PR e stack `lotus-dns` | Delegação de 2026-09-26 e ADR-14 `[S-1][L-1]` |
| P-79 | Pedido aponta ficha como aberta | P-79 foi encerrada pelo item 29; sua regra HTTPS permanece como restrição operacional | Rastro atual de pendências e progress `[L-1]` |
| TLS | Drive também descreve ACM/ALB como alternativa | Opção A, Certbot no nginx da EC2 | §5 recomenda A e o repositório já implementa esse caminho `[G-1][L-1]` |

## Constraints

- SG `lotus-web` já prevê inbound IPv4 80/443; conferir, não ampliar por suposição. `[L-1]`
- `/up` em HTTP permanece 200; somente os demais caminhos redirecionam 301 para HTTPS. `[L-1]`
- Antes do próximo deploy de `lotus-dns`, D-52 exige termination protection e políticas `Retain` no grupo `Registros`, com catraca; o executor de escrita AWS é João. `[S-1]`
- Não publicar CAA neste bloco sem reabrir explicitamente D-49/D-51. `[S-1]`

## External acceptance signals

- DNS público de `app.lotusotec.cl` devolve exatamente `18.230.53.197` e nenhum AAAA indevido.
- Stack `lotus-dns` termina `UPDATE_COMPLETE` após change set revisado.
- HTTPS `/up` responde 200; HTTP `/inicio` responde 301; sessão real carrega cookie `Secure`.
- Certificado de negócio é emitido com QR em `https://app.lotusotec.cl`.
- `certbot renew --dry-run` passa com nginx ativo e o hook de reload instalado.

## Open questions

- Definir no brainstorming se `app.lotusotec.cl` emitirá HSTS e, se sim, `max-age`, `includeSubDomains` e `preload`. Nenhuma fonte decide HSTS para a intranet; o B3 do site decide apenas o futuro header do site institucional. Não é bloqueante.

## Deferred

- D-49/CAA após decisão da D-51.
- Renovação/cutover do WordPress, SES, alarmes e integração `8.2.1`.

## Staleness triggers

- João reabrir o hostname ou a topologia Certbot/EC2 direta.
- Mudança semântica nos arquivos TLS/env/runbook ou no item 32.
- Novo commit do `lotus-site` alterar `lotus-dns`, D-49/D-51/D-52 ou o procedimento de subdomínios.
- Surgir IPv6 próprio para a produção.
- Drive ou páginas Notion consultadas passarem a contradizer uma decisão registrada.

---
schema_version: 3
id: 33
slug: 33-infra-producao-email-ses
workflow_state: closed
next_owner: joao
next_action: none
resume_state: null
active_spec: docs/superpowers/blocos/33-infra-producao-email-ses/spec.md
active_plan: docs/superpowers/blocos/33-infra-producao-email-ses/plano.md
active_review: docs/superpowers/blocos/33-infra-producao-email-ses/revisao.md
active_acceptance: docs/superpowers/blocos/33-infra-producao-email-ses/aceitacao.md
context_packet: docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md
efeito_externo: sim
executor: claude
branch: docs/33-infra-producao-email-ses
worktree: ../lotus-33-infra-producao-email-ses
offset: 2
lane_base: e94f417b
commit: 88f9e3a5
blocker: null
updated_at: 2026-10-04T18:38:10-03:00
updated_by: jvbat@DESKTOP-U9PVHKH / sonnet
---

# Bloco 33 — estado

Aberto por lane.sh abrir. O contrato dos campos esta em docs/superpowers/state.md.

## Prova do efeito externo — item 1 da `## Verificação externa` (antes do merge)

Nova versão de `arquitetura-aws-lotus.md` no Drive, só com as duas linhas aprovadas trocadas (D12):
o João subiu o arquivo aprovado em 2026-10-04 e a sessão conferiu a versão no Drive — `fileSize`
**10600** (idêntico ao arquivo aprovado) e `modifiedTime` `2026-10-04T18:49:34.864Z`. Não há hash
byte a byte: o conector do Drive não expõe checksum e só devolve o conteúdo em base64 transcrito pelo
modelo, prova circular que a sessão descartou (`7cb647c1`, `rulings.md`). O `sha256sum` esperado
(`a4dd4fe9…af1d`) fica como verificação possível baixando a versão.

## Prova do efeito externo — itens 2 a 7 (aceitação, 2026-10-04)

Depois do merge e do espelho, a prova de cada item está no [`aceitacao.md`](./aceitacao.md), com as
leituras no [`audit.md`](./audit.md), seção `## Fase B' — aceitação`; o portão
(`aceitacao.sh conferir 33`) saiu `ACEITACAO OK: 7 item(ns)`.

- **2** · `lotus-ses` em `identity/*` com a `Condition` no remetente `lotus@lotusotec.cl`, e 1 access
  key em `lotus-infra`, nenhuma nova — `audit.md` B2.
- **3** · identidades `1 DOMAIN` e `1 EMAIL_ADDRESS`; a conta admin, a única ativa, passou ao Gmail do
  João, verificado. **Exceção do João em 2026-10-04: o redator externo não foi verificado**, e reset e
  convite para ele falham calados até ele virar identidade (P-98) — `audit.md` B3.
- **4** · espelho `26087133`, `MAIL_MAILER=ses`, run `37233116290` `success`, ledger `fim` `ok`, `/up` 200
  — `audit.md` B4.
- **5** · sonda positiva entregue com SPF (`ses.lotusotec.cl`), DKIM e DMARC `pass`; negativa com
  `Email address is not verified` e `Falha ao enviar e-mail` com `aws_erro` `MessageRejected` e sem
  `@` — `audit.md` B5. A sonda de uma linha do runbook §13.3 quebrava no `sudo -i`; o runbook foi
  emendado.
- **6** · alerta D7 real: 15 × `422`, `acesso.suspeito` 1, `Falha ao enviar alerta` 0, e a mensagem na
  caixa do admin com os três `pass` — `audit.md` B6.
- **7** · reset de senha completo pela UI (a senha antiga recusada, a nova loga) e a leitura final:
  conta em sandbox, `lotusotec.cl` `true`/`SUCCESS`/`SUCCESS`, MX só no Google — `audit.md` B7 e B8.

Reaberto em 2026-10-04 pelo lane.sh aceitar, na branch docs/33-infra-producao-email-ses; a branch do bloco era infra/33-infra-producao-email-ses.

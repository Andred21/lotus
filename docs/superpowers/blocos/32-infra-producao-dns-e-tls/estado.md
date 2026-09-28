---
schema_version: 3
id: 32
slug: 32-infra-producao-dns-e-tls
workflow_state: closed
next_owner: joao
next_action: none
resume_state: null
active_spec: docs/superpowers/specs/archive/2026-09-27-infra-producao-dns-e-tls-design.md
active_plan: docs/superpowers/plans/archive/2026-09-27-infra-producao-dns-e-tls.md
active_review: docs/superpowers/blocos/32-infra-producao-dns-e-tls/revisao.md
active_acceptance: null
context_packet: docs/superpowers/context-packets/2026-09-27-infra-producao-dns-e-tls.md
efeito_externo: sim
executor: claude
branch: infra/32-infra-producao-dns-e-tls
worktree: ../lotus-infra
offset: null
lane_base: 0c2c3d57
commit: ce344ef6
blocker: null
updated_at: 2026-09-27T23:52:50-03:00
updated_by: jvbat@DESKTOP-U9PVHKH / opus
---

# Bloco 32 — estado

Migrado à mão do `state.md` antigo (lane-b) no início da execução, por decisão do João em
2026-09-27: o bloco foi promovido, teve packet, spec e plano no fluxo antigo, sobre
`origin/main@5d1250c3`, e a `main` recebeu o item 30 (PR #116) antes da execução. A branch
`infra/producao-dns-e-tls` (`ccb521b2`) foi rebaseada em `origin/main@0c2c3d57` — o `state.md` de
cada commit cedeu ao contrato da `main` — e renomeada para `infra/32-infra-producao-dns-e-tls`, o
padrão do `lane.sh`. Spec, plano e packet ficam nos caminhos legados, porque nasceram antes da
pasta; o audit também, porque o plano o nomeia.

`offset: null`: a lane foi aberta antes do `lane.sh` (o `.env` da árvore está em +1, mas o bloco não
sobe stack). `efeito_externo: sim`: o DoD é a produção em `https://app.lotusotec.cl` e o registro no
Route 53 (spec §10). Fase B com escrita do João; Task 8 espera o merge do B2 no `lotus-site`.

Execução concluída em 2026-09-28 (Tasks 1 a 12; evidência em
`docs/superpowers/audits/2026-09-27-infra-producao-dns-e-tls.md`). Produção em
`https://app.lotusotec.cl` com HSTS, cookie `Secure` e renovação por webroot. O DoD 7 (QR decodificado
de um PDF de produção) não foi provado: não havia turma elegível e o João decidiu não criar dado de
teste em produção — fica na P-89. O `efeito_externo: sim` pede prova externa antes de `closed`; o
review decide se a P-89 basta. Os commits depois da PR #117 (audits, P-77/P-89, §7) ainda não
entraram na `main`.

Review de 2026-09-27 (`revisao.md`): quatro achados, todos aprovados e corrigidos. No DoD 7 o João
escolheu a saída (a): a P-89 basta, e a prova do efeito externo do QR é a leitura de
`CertificateValidationUrl::base()` no contêiner de produção, `https://app.lotusotec.cl`, registrada
no audit (Task 12).

Fechado em 2026-09-27 (`/fechar-sprint`). O DoD foi reprovado de fora às 2026-09-28T02:35:18Z:
`A` = `18.230.53.197` sem AAAA, 301 de http, `/up` 200 com HSTS de um ano, certificado `YE2` até
2026-12-27 e cookies `secure` com `domain=app.lotusotec.cl`. Com a leitura do `base()` no contêiner
(Q-1), é a prova do efeito externo que a invariante 11 pede. Gate: `vitest` 152 arquivos e 957
testes, lint 0, build verde, harness com 14 arquivos sem falha; `backend/` sem diff. A P-77 fechou;
nasceram a P-90 (corrida do gate `/up` do `deploy.sh`) e a P-91 (`/api` sem `Accept` dá 500); a
P-55, a P-87 e a P-88 saíram do rastro. Plano e spec foram para `archive/`; o packet fica onde está.
O bloco para em `closing`, e não em `closed`, porque os 15 commits depois da PR #117 ainda não
estão na `main`: falta a PR nova, o merge e o espelho. Depois do merge, o main tree tira a ficha 32
do `backlog.md` (invariante 10) e o bloco vai a `closed`.

Integrado em 2026-09-27: a PR #118 levou os 16 commits à `main` (`229994bb`), e o espelho publicou
`93dc2faa` no corporativo com `Source-Commit: 229994bb`. O bloco vai a `closed`. Pela invariante 10,
a ficha 32 sai do `backlog.md` pelo main tree.

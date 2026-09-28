---
schema_version: 3
id: 32
slug: 32-infra-producao-dns-e-tls
workflow_state: blocked
next_owner: joao
next_action: resolve_blocker aprovar os achados Q-1 a Q-4 do revisao.md e decidir a divergencia do DoD 7
resume_state: reviewing
active_spec: docs/superpowers/specs/2026-09-27-infra-producao-dns-e-tls-design.md
active_plan: docs/superpowers/plans/2026-09-27-infra-producao-dns-e-tls.md
active_review: docs/superpowers/blocos/32-infra-producao-dns-e-tls/revisao.md
active_acceptance: null
context_packet: docs/superpowers/context-packets/2026-09-27-infra-producao-dns-e-tls.md
efeito_externo: sim
executor: claude
branch: infra/32-infra-producao-dns-e-tls
worktree: ../lotus-infra
offset: null
lane_base: 0c2c3d57
commit: 569f902d
blocker: review do bloco 32 saiu com 4 achados (2 amarelos, 2 verdes) e divergencia Claude/Codex sobre o DoD 7 aguardando o Joao
updated_at: 2026-09-27T23:21:39-03:00
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

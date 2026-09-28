---
schema_version: 3
id: 32
slug: 32-infra-producao-dns-e-tls
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-09-27-infra-producao-dns-e-tls-design.md
active_plan: docs/superpowers/plans/2026-09-27-infra-producao-dns-e-tls.md
active_review: null
active_acceptance: null
context_packet: docs/superpowers/context-packets/2026-09-27-infra-producao-dns-e-tls.md
efeito_externo: sim
executor: claude
branch: infra/32-infra-producao-dns-e-tls
worktree: ../lotus-infra
offset: null
lane_base: 0c2c3d57
commit: eea98376
blocker: null
updated_at: 2026-09-27T20:45:58-03:00
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

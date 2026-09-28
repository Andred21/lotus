---
schema_version: 3
id: 23
slug: 23-frontend-tabelas-reserva-e-rolagem
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
resume_state: null
active_spec: docs/superpowers/specs/2026-09-27-frontend-tabelas-reserva-e-rolagem-design.md
active_plan: docs/superpowers/plans/2026-09-27-frontend-tabelas-reserva-e-rolagem.md
active_review: null
active_acceptance: null
context_packet: null
efeito_externo: nao
executor: claude
branch: refactor/23-frontend-tabelas-reserva-e-rolagem
worktree: ../fix-frontend
offset: 2
lane_base: 162cbaa7
commit: e2c27efb
blocker: null
updated_at: 2026-09-28T00:54:30-03:00
updated_by: jvbat@DESKTOP-U9PVHKH / opus
---

# Bloco 23 — estado

Semeado à mão em 2026-09-27, com o bloco já em execução. A lane nasceu no fluxo antigo, como
`lane-c` do `state.md`, na branch `refactor/frontend-tabelas-reserva-e-rolagem` aberta de
`origin/main@162cbaa7`. A Task 1 gravou `executing` lá, em `179ff608`. Depois disso a `main`
recebeu o item 30 (PR #116, `0c2c3d57`), que passou o estado para a pasta do bloco. Decisão do João
na mesma data: renomear a branch para `refactor/23-frontend-tabelas-reserva-e-rolagem` e semear
este arquivo **sem rebasear agora**.

- O `state.md` desta árvore continua no schema antigo, com a `lane-c` em `executing`, e não é mais
  fonte. O rebase sobre a `main` resolve o arquivo para o contrato novo, e fica para a integração.
- O diretório continua `../fix-frontend`, fora do molde `../lotus-<NN>-<slug>`, pelo mesmo motivo
  do `../lotus-harness` do item 30: renomear a pasta mudaria o projeto do compose e o volume do
  banco de dev. O `offset: 2` é o que o `.env` da raiz publica (`LOTUS_DEV_HTTP_PORT=8082`).
- Spec e plano ficam nos caminhos legados (`specs/` e `plans/`), porque nasceram antes da pasta do
  bloco.
- O `efeito_externo` é `nao`: o bloco é só frontend e não depende de ação fora do repositório.

## Handoff para review (2026-09-28)

As Tasks 1 a 10 do plano estão completas, e cada uma passou pela revisão de task. A evidência de
medição e os gates estão no audit `docs/superpowers/audits/2026-09-27-item23-medicoes.md` (§6 a §8).
O review do bloco não foi iniciado.

Notas para o João no fechamento:

- **Cursos e Usuarios arquivados** ficam abaixo do `col1` da ativa em 390 (209 contra 218 e 201
  contra 204). A varredura do §5 Step 4 prova que nenhum piso fecha as duas pernas da régua.
- **Seis visões de arquivados** pedem piso de 51 a 58rem abaixo de `sm` (§5).
- **Alumnos e Roles** ficam cerca de 11% acima da referência da spec (§5, Preocupações para o João).
- **O transbordo de conteúdo do Dashboard** persiste em 1024: 31 e 29px, contra 25 e 21px antes. A
  tabela cabe na moldura. A spec §1 manda abrir ficha nova, e ela ainda não foi aberta (§6, Observação 1).
- **O certificado `LOT-2026-1001`** do banco de dev foi emitido por navegador Windows às 23:58 (-03)
  de 27/09, não pelos scripts. Por isso o Historial mede 2 linhas (§6, Observação 2).

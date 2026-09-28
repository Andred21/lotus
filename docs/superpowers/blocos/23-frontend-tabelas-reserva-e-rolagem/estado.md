---
schema_version: 3
id: 23
slug: 23-frontend-tabelas-reserva-e-rolagem
workflow_state: closing
next_owner: joao
next_action: "answer_integration_menu PR da branch e remocao da ficha 23 e da D-65 pelo main tree"
resume_state: null
active_spec: docs/superpowers/specs/archive/2026-09-27-frontend-tabelas-reserva-e-rolagem-design.md
active_plan: docs/superpowers/plans/archive/2026-09-27-frontend-tabelas-reserva-e-rolagem.md
active_review: docs/superpowers/blocos/23-frontend-tabelas-reserva-e-rolagem/revisao.md
active_acceptance: null
context_packet: null
efeito_externo: nao
executor: claude
branch: refactor/23-frontend-tabelas-reserva-e-rolagem
worktree: ../fix-frontend
offset: 2
lane_base: 162cbaa7
commit: ed7baf3f
blocker: null
updated_at: 2026-09-28T01:35:42-03:00
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

## Review do bloco (2026-09-28)

Achados, correções aprovadas e gates depois delas: [`revisao.md`](./revisao.md).

## Fechamento (2026-09-28)

Fechado nesta árvore, sem rebase, com o `/fechar-sprint` antigo, por instrução do João. A regra de
transição do `state.md` da `main` foi seguida: onde o comando diz `state.md`, vale este arquivo. O
`state.md` desta árvore não foi tocado, e a `lane-c` segue nele em `executing` até o rebase
trocá-lo pelo contrato da `main`.

- **§0, critério de aceite.** O `medir.cjs` e o `umcontrole.cjs` rodaram de novo em `7f829137`
  (audit, seção 9). As 18 visões ativas com presa medem idênticas à seção 6 nos três viewports, e o
  `umcontrole` dá `tudo OK`. **O diálogo do Alumno reprova a régua de 1024 por 3px** (`frame 669 ·
  scroll 672`). O audit o tinha medido só vazio. O João decidiu fechar e registrar: o resíduo virou a
  **P-94**.
- **Gates.** Backend com **1221 passed / 5 skipped**. Front com lint 0, build verde e **158 arquivos /
  989 testes** verdes. `pint` e `typescript:transform` são N/A: `git diff 162cbaa7..HEAD --
  backend/ generated.ts` vazio.
- **Código morto e leis.** Nenhum `.gitkeep` novo, nenhuma sobra de `reducedFloorTablePt` ou
  `formatDateTime`. As exportações novas (`narrowFloorTablePt`, `Timestamp`) têm consumidor. O
  diff não importa `primereact` nem outra feature, e o §5 do `CLAUDE.md` não foi ferido.
- **Pendências.** Nasce a **P-94**. Nenhuma fecha. O rastro de `encerradas.md` não é da lane.
- **Arquivamento.** Plano e spec foram para `plans/archive/` e `specs/archive/`, e as referências do
  audit e do plano acompanharam.
- **Histórico.** A linha do item 23 entrou em `historico/progress.md`, e a de 2026-09-03 (item 25)
  desceu para o `progress-archive.md`. A narrativa do bloco é este arquivo, e o `state-archive.md`
  não recebe nada.
- **Backlog.** A ficha 23 e a `D-65` saem pelo main tree depois do merge (invariante 10), como no
  bloco 32. A `D-73` entrou nesta branch antes do fechamento, por decisão do João no review (Q-3).

O bloco fica em `closing`, e não em `closed`, porque nada dele está na `main`. A integração é do
João: rebase sobre a `main`, PR e merge. O rebase vai pedir resolução no `state.md`, nas pendências
e no `progress.md`, que a `main` também mexeu. A P-94 é o próximo número livre, e a P-93 é do bloco
33, ainda não mesclado.

## Integração (2026-09-28)

A `main@6be051de` entrou na branch por merge (`ed7baf3f`), e não por rebase, para preservar os SHAs
citados no audit, neste arquivo e no `progress.md`. Os três conflitos eram de doc. O `state.md`
ficou o da `main`, que é o contrato do schema 3. O `pendencias/README.md` somou as duas partes e
fechou em 35 abertas. O `progress.md` manteve os itens 32 e 23, e a linha do item 27 desceu para o
arquivo. Gates no resultado: harness com 14 arquivos sem falha, lint 0, build verde e vitest com 160
arquivos e 1007 testes. A `main` não tocou `backend/`.

Com o contrato novo na árvore, o `SessionStart` passou a reconhecer a lane e acusou `active_review`
vazio. O review, que estava neste arquivo, foi movido verbatim para `revisao.md`.

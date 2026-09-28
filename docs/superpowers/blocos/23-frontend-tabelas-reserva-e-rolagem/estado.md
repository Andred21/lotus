---
schema_version: 3
id: 23
slug: 23-frontend-tabelas-reserva-e-rolagem
workflow_state: closing
next_owner: joao
next_action: "answer_integration_menu rebase sobre a main, PR e remocao da ficha 23 e da D-65 pelo main tree"
resume_state: null
active_spec: docs/superpowers/specs/archive/2026-09-27-frontend-tabelas-reserva-e-rolagem-design.md
active_plan: docs/superpowers/plans/archive/2026-09-27-frontend-tabelas-reserva-e-rolagem.md
active_review: null
active_acceptance: null
context_packet: null
efeito_externo: nao
executor: claude
branch: refactor/23-frontend-tabelas-reserva-e-rolagem
worktree: ../fix-frontend
offset: 2
lane_base: 162cbaa7
commit: 7f829137
blocker: null
updated_at: 2026-09-28T01:28:13-03:00
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

Risco baixo: só frontend visual, sem regra de negócio, executor claude. A revisão foi só do Claude,
sem Codex. Intervalo `162cbaa7..fa7dc6cc`. Gates rodados de novo: `pnpm lint` ok, `pnpm build` ok,
`pnpm test` com 158 arquivos e 987 testes verdes. A catraca `ACAO_SEM_COLAPSO` foi sondada por
`--stdin`: reprova a largura literal e aceita `.width`. Nenhuma lei do §5 foi ferida e não há órfão:
`reducedFloorTablePt` e `formatDateTime` saíram sem sobra de referência.

Achados aguardando o João:

- **Q-1 🟡 P — o "Emitir" apagado da Emisión perde a dica.** `RowActions.tsx` passa `tooltip` sem
  `tooltipOptions.showOnDisabled`, e o `Button` do PrimeReact não mostra dica em botão desabilitado
  (`showTooltip = !disabled || showOnDisabled`). Com a turma bloqueada, o que se vê é um ícone
  cinza sem rótulo e sem hover, onde antes aparecia o texto "Emitir". Correção: `showOnDisabled`
  quando `acao.disabled`.
- **Q-2 🟡 P — `collapsed?: boolean` opcional nos seis adaptadores `*RowActions`** (Course, Client,
  Budget, Turma, e User e Redator da fatia 3). É o buraco que o próprio comentário da
  `ACAO_SEM_COLAPSO` nomeia e empurra para os testes de 390. Os três adaptadores novos já exigem a
  prop. Tornar obrigatória faz o `tsc` pegar o esquecimento.
- **Q-3 🟡 P — a ficha do transbordo do Dashboard não foi aberta.** A spec §1 diz que o transbordo
  que persistir vira ficha nova. Ele persiste (31 e 29px em 1024). A lane não acrescenta item ao
  `backlog.md`, então o destino (pendência ou item de fila) é decisão do João.

### Correções aprovadas (2026-09-28)

O João aprovou os três achados e acrescentou um: a dica do "Revocar" no Historial abria à direita,
passava da moldura e criava rolagem horizontal na página. Mandou pôr as dicas dos botões das
tabelas à esquerda do ícone. No caminho apareceu o Q-4, que o review tinha deixado passar.

- **Achado do João + Q-1** (`167fb7ac`): a dica do `RowActions` abre à esquerda (`position: 'left'`).
  No botão desabilitado, o alvo da dica é um `span` do próprio React, porque o `showOnDisabled` do
  Prime embrulha o botão num `div` fora da reconciliação. Dois testes novos. No navegador, em
  1024x768, com o mouse sobre "Revoke" no Historial: a dica sai com `p-tooltip-left`, de 848 a
  935px, com o botão começando em 935px, e a página não rola (`scrollWidth` 1024 = `clientWidth`
  1024). O "Emitir" desabilitado não foi visto no navegador: o banco de dev não tem turma concluída
  dentro da janela da Emisión. Ele fica provado só pelo teste unitário.
- **Q-2** (`4634f76c`): `collapsed` passa a ser obrigatório nos seis `*RowActions` de feature. O
  `tsc` apontou os três testes que montavam sem a prop.
- **Q-4** (`4e32b66d`): a `ACAO_SEM_COLAPSO` passa a medir os mesmos cinco arrays da
  `ACAO_SEM_ANCORA`, `src/app/**` incluído, como pede a regra do `frontend-estilizacao.md`. Uma sonda
  em `src/app/pages` é reprovada.
- **Q-3** (`861d28dc`): o transbordo virou a ficha `D-73`, em `# Débitos técnicos` do `backlog.md`,
  sem hospedeiro.

Gates depois das correções: `pnpm lint` ok, `pnpm build` ok, `pnpm test` com 158 arquivos e 989
testes verdes. Review limpo.

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

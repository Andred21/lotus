# Bloco 23 — revisão de sprint

> Movida verbatim do `estado.md` em 2026-09-28, depois do fechamento. O bloco nasceu no fluxo
> antigo e registrou o review dentro do estado. Com a `main` mesclada, o contrato do schema 3 exige
> `active_review` a partir de `ready_for_closure` (invariante 4), e o `SessionStart` acusou o campo vazio.

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

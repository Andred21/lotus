# Bloco 54 — rulings da execução

Decisões tomadas durante o `/executar-bloco 54` (SDD, Tasks 1 a 7 e revisão final da branch). As duas
primeiras são do João. As outras são do controlador ou dos implementadores. Cada linha diz quanto
custa se a decisão estiver errada. As decisões que mudam a leitura da spec estão também na §8 dela.

## Do João

- **Task 7, D-73: o culpado é o cabeçalho, não uma célula.** A medição (`medicoes-d73.md` §1)
  mostrou o ícone de ordenação do último cabeçalho ordenável passando da borda do invólucro. A
  correção tem quatro partes: o ícone quebra para baixo do título (`wrappingHeaderTablePt`, opt-in
  em `shared/ui`), os pesos do `panelColumns.ts` saem do mínimo medido, os rótulos ficam
  "Presentes"/"Faltan" (pt-BR "Faltam", en "On file"/"Missing") e o Cumplimiento ganha piso de 45rem
  abaixo de `sm`. **Se estiver errado:** o opt-in está só nos dois painéis do Dashboard, e reverter
  é tirar um `pt` de cada um e voltar seis chaves de locale. As outras tabelas não mudaram.
- **Task 7, critério 8 em 390x844: "nada passa da tabela".** O `scrollWidth` do invólucro é igual à
  largura da tabela, e a rolagem do piso fica. **Se estiver errado:** zerar a rolagem a 390 pede
  outra forma para a tabela no telefone (lista ou cartões), o que é trabalho de bloco novo e não um
  ajuste destes painéis.

## Do controlador e dos implementadores

- **Pipeline de profundidade 1 entre as Tasks 1 e 2 (grupo G1).** O revisor da Task 1 trabalhou numa
  worktree destacada enquanto a Task 2 corria na lane. É o desvio declarado do `/executar-bloco` 5.1.
  **Se estiver errado:** uma correção da Task 1 cairia sobre a árvore que já tinha a Task 2. Os
  arquivos eram disjuntos, então o custo era baixo, e não houve correção.
- **Task 2: a aresta órfã `Certification\Enums\CertificateStatus` sai do `DomainDependencyTest` na
  rodada da Task 2, fora da lista Files.** O constraint "grep `CertificateStatus::Emitido` vazio"
  obriga a remoção, e a catraca "toda aresta declarada tem consumidor" reprova sem ela. **Se estiver
  errado:** é um commit de uma linha a reverter.
- **A partir da Task 4, todo implementador roda a suíte inteira do backend antes de commitar.** A
  Task 2 fechou verde no filtro e quebrou a catraca do `DomainDependencyTest`. **Se estiver
  errado:** cerca de 2 minutos a mais por task.
- **Escolhas que a spec deixou ao builder (§6).** A chave do balde das futuras no payload continua
  `starting_soon`, e o enum interno chama o balde de `upcoming`. O `kpis()` devolve `em_andamento`
  (total) e `iniciadas` (só as já começadas). O objeto de visibilidade é o
  `DashboardVisibilityData`, com `forUser()`. **Se estiver errado:** renomear a chave do payload
  muda o DTO, o `generated.ts` e o front. O enum `AgendaBucket` sai no `generated.ts` (o
  `EnumTransformer` coleta todo enum de `app/`) sem consumidor, e o nome `upcoming` pode confundir
  quem ler o contrato.
- **Task 5: os locales do front do tipo novo de pendência entram no escopo.** O brief listava só o
  `lang/` do backend, e a Global Constraint de três locales cobria o front. A rodada acrescentou uma
  catraca que exige `dashboard.pending.type.<tipo>` para cada tipo do `Record` de navegação. **Se
  estiver errado:** um tipo futuro sem rótulo próprio teria de ganhar um mesmo assim.
- **Task 6: o estado "sem acesso" do `useDashboard` passa a decidir pela visibilidade.** O D8 listava
  só `AdminView`, `kpiCards`, `SeriesPanel` e `RankingsPanel`, mas o critério 5 proíbe decidir
  exibição farejando `null`. **Se estiver errado:** um admin só com `identity.user.view` vê o
  dashboard quase vazio, só com os alertas de documento de relator, em vez de "sem acesso".
- **Task 6: o `useDashboard.test.tsx` foi tocado fora da lista.** A fixture precisava do campo
  `visibility` para o build passar. **Se estiver errado:** nenhum custo, a fixture só acompanha o
  tipo.
- **Task 7: a implementação foi feita pelo controlador, na sessão principal.** A task começava pela
  medição no navegador da lane e parou no meio para a decisão do João. O revisor de task e o
  re-revisor revisaram como em qualquer task. **Se estiver errado:** a Task 7 não teve implementador
  independente, e a revisão foi a única segunda leitura.
- **Task 7: os pesos do Cumplimiento são o mínimo medido mais uma parte igual da folga
  (134/126/109/109/127/111).** A primeira versão, em proporção arredondada, deixava "Relatores" com
  folga zero. **Se estiver errado:** os pesos dependem dos rótulos e da fonte de hoje, e mudar um
  rótulo de coluna em qualquer locale pede nova medição (o docblock do `panelColumns.ts` diz como).
- **Revisão final: a spec ganha a §8 "Emendas de execução".** A spec dizia o contrário da entrega na
  causa do D-73, no critério 8 em 390 e no estado "sem acesso". O `/finalizar-bloco` confere o DoD
  contra a spec. **Se estiver errado:** é uma seção a mover. O texto original dos itens ficou, com
  um ponteiro para a §8.
- **Revisão final: a pendência "turma sem relator" passa a ler o requisito do VO de habilitação,
  como a de local.** Hoje dá o mesmo resultado (`TurmaHabilitacaoService` usa a mesma expressão).
  **Se estiver errado:** se a regra de redator do VO mudar, a pendência muda junto, que é o
  comportamento desejado.
- **Revisão final: os minors abaixo ficam, pela triagem do revisor da branch.**
  - Classificador avalia `upcoming` antes de `overdue`. Só difere com `start > end`, e o `TurmaData`
    impede isso.
  - O reflow do docblock do `DashboardWindows`.
  - A ordem de entrada não é provada no `AgendaClassifierTest`. O `groupBy` preserva a ordem da
    query.
  - O par `DataSql::literal` aparece três vezes no `AnalyticsQuery`.
  - O teste de `conclusoes_por_confirmar` não distingue SQL de PHP. A paridade é provada no
    `TurmaStatusParityTest`.
  - O `CarbonImmutable::today()` no `RedatorScopeQueryTest`.
  - O `resumo()` e o `agenda()` do redator classificam duas vezes.
  - O `createTurma` encadeado longo.
  - As duas leituras da flag comercial. O docblock do `secoes.ts` foi ajustado.
  - O `kpiCards` recalcula as seções.
  - O `AdminView` esconde a seção se a flag vier `true` e o dado `null`. Seria quebra de contrato do
    backend, e esconder é o lado seguro.
  - O helper `folha()` está copiado em três testes.
  - O comentário histórico em `brand-theme.css:291`.
  - Da rodada final: o `CompliancePanel.test.tsx` fixa o índice das células, e o teste do intervalo
    prova a classe `whitespace-nowrap`, não o layout. O layout está medido em `medicoes-d73.md`.

  **Se estiver errado:** são legibilidade e custo desprezível. Nenhum muda o comportamento.

- **Revisão final: no `AdminView`, a guarda `data.compliance_turmas !== null` fica sem mutação que a
  reprove.** A seção é decidida por `secoes.compliance`, que a guarda externa também aplica, e o
  teste de gate fechado com linhas no payload prova que quem decide é o campo, não o dado. O `null`
  com gate aberto não existe no contrato do backend. **Se estiver errado:** um backend que quebre o
  contrato faria a seção sumir calada, que é o lado seguro.

## Provas que só o ledger guardava

O ledger da SDD (`.superpowers/sdd/`) é ignorado pelo git e é apagado no fim do bloco. As provas que
só ele guardava estão registradas aqui.

- **Critério 7 (D10), vermelho antes do fix.** O implementador da Task 2 rodou o teste novo do
  `AnalyticsQueryTest` contra o código antigo, antes de implementar. O teste falhou em
  `AnalyticsQueryTest.php:393`: a série `turmas_iniciadas` veio vazia, porque
  `'2026-08-31 00:00:00' <= '2026-08-31'` é falso no sqlite. Ele falhou pela razão prevista.
- **Critério 3, `conclusoes_por_confirmar`.** O teste já passava antes da troca para
  `whereDisplayStatus(Habilitada)`, porque o valor antigo coincidia com o da SQL. É teste de
  paridade, não de regressão, e o relatório da Task 3 diz isso.

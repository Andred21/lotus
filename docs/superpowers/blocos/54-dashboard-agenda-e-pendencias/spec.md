# Bloco 54 — `dashboard-agenda-e-pendencias` — spec

**Data:** 2026-11-03 · **Branch:** `fix/54-dashboard-agenda-e-pendencias` · **Classificação:**
bounded · **Contexto:** não (sem packet) · **Ficha:** `backlog.md` §54 · **Depende:** 48 (mesclado,
PR #163) · **Fonte:** card 8 do review de 2026-11-02
(`audits/2026-11-02-arquitetura-backend.html`), `D-72`, `D-73`, `D-34`, `P-85`, `P-102`.

## 1. Intenção

O Dashboard é onde a operação da Lotus olha primeiro, e hoje ele se contradiz em quatro pontos:

- **Agenda × KPI (D-72, card 8).** O redator vê "Próximas clases: 1" e a agenda vazia quando a
  turma começa em 10 dias: o KPI (`RedatorScopeQuery::resumo()`) não tem teto, a agenda corta em 7
  dias (`DashboardWindows::TURMA_WINDOW_DAYS`). Além disso "Terminan pronto" é subconjunto de "En
  curso" — a turma que termina em 3 dias aparece nas duas colunas, e o contador "Agenda · N" do
  `AgendaPanel` a soma duas vezes. As fronteiras estão escritas três vezes: KPI do admin em SQL
  (`OperationMetricsQuery::kpis()`), agenda do admin e agenda do redator em PHP.
- **Habilitação sem motivo (P-102).** Desde o item 41 a conclusão bloqueia por redator ausente e por
  presencial sem `local_aplicacao`, mas o painel "Cumplimiento" mostra "Habilitada: No" com "Faltan:
  —", e o "Pendientes" não avisa da presencial sem local.
- **Permissão adivinhada (D-34).** O backend calcula quatro gates e manda ausência de dado; o front
  reconstrói a permissão farejando nulo (`RankingsPanel.tsx:25`, `SeriesPanel.tsx:54`,
  `AdminView.tsx`, `kpiCards.ts`).
- **Borda e cópia (P-85, ranking de clientes).** No sqlite da suíte a turma que começa no último
  dia do período some dos três filtros de `start_date` do `AnalyticsQuery`; e o ranking de clientes
  conta "emitido" com uma cópia crua (`AnalyticsQuery.php:185`) em vez do critério do bloco 48.

Mais um defeito de tela: os dois painéis de tabela transbordam por conteúdo de célula (D-73).

## 2. Objetivos

1. **Agenda (card 8, D-72).** Um classificador único põe cada turma em exatamente um balde; KPIs e
   agendas (admin e redator) contam e listam a partir dele.
2. **Próximas sem teto.** O balde das futuras lista toda turma que ainda vai começar, para redator e
   admin, e chama-se "Próximas clases" — o mesmo nome do KPI que o conta.
3. **Habilitada por SQL.** "Conclusiones por confirmar" filtra por
   `TurmaQueryBuilder::whereDisplayStatus(TurmaDisplayStatus::Habilitada)`, que já existe com teste
   de paridade, em vez de carregar todas as turmas e testar em PHP.
4. **P-102.** O painel "Cumplimiento" diz o que falta, requisitos incluídos; "Pendientes" sinaliza a
   presencial sem local.
5. **D-34.** A visibilidade RBAC vira campo explícito do payload do admin, e nenhum componente
   decide mostrar ou esconder a partir de nulo.
6. **Emitido, uma definição.** O ranking de clientes conta certificado emitido pelo
   `EmissionStateResolver`, como a série e o ranking de cursos já fazem.
7. **P-85.** Os três filtros de `start_date` do `AnalyticsQuery` passam por `DataSql::literal`, com
   teste da borda do último dia.
8. **D-73.** Os painéis "Cumplimiento" e "Carga de relatores" sem transbordo horizontal.

## 3. Não-objetivos (Fora)

- Mudar o horizonte de 7 dias de "Terminan pronto" ou os 30 dias de validade de documento.
- Paginar ou cortar a agenda do admin: decisão do João, a agenda é curta hoje (§4, D2).
- Redesenho do Dashboard ou de qualquer painel além do que os objetivos nomeiam.
- O funil (`PipelineQuery`) e as pendências de certificação: já acompanham o estado de emissão desde
  o 48.
- O painel "Carga de relatores" contar diferente: a coluna "Próximas clases" dele já conta toda
  futura sem teto (`RedatorLoadQuery::turmasEmAndamentoPorRedator()`), coerente com o D2.
- Coluna nova na tabela de compliance.

## 4. Decisões

**D1 — Baldes disjuntos (João, 2026-11-03).** Para turma `em_andamento`, com `hoje =
FusoDoNegocio::hoje()` e `horizonte = DashboardWindows::turmaHorizon()`, cada turma cai em
exatamente um balde, avaliados nesta ordem:

| Balde | Condição | Rótulo es-CL |
|---|---|---|
| `overdue` | `end_date < hoje` | Atrasadas |
| `upcoming` | `start_date > hoje` | Próximas clases |
| `ending_soon` | `start_date ≤ hoje ≤ end_date ≤ horizonte` | Terminan pronto |
| `in_progress` | `start_date ≤ hoje` e `end_date > horizonte` | En curso |

`ending_soon` deixa de ser subconjunto de `in_progress`. A soma dos quatro é o total de turmas
`em_andamento` visíveis ao chamador, e é o "Agenda · N".

**D2 — Próximas sem teto, para os dois papéis (João, 2026-11-03).** O balde das futuras não corta
no horizonte. O admin também vê a lista completa, porque a agenda dele é curta hoje.

**D3 — O rótulo (João, 2026-11-03).** A coluna das futuras chama-se "Próximas clases", igual ao KPI.
As chaves `dashboard.agenda.*` dos três locales do front acompanham (nome nos outros dois idiomas
segue o KPI do respectivo locale).

**D4 — KPIs derivam dos baldes.**
- Redator: `proximas_turmas` = |`upcoming`|; `turmas_em_andamento` = |`overdue`| + |`ending_soon`|
  + |`in_progress`| — a mesma conta de hoje ("já começou, atrasada incluída"), agora derivada.
- Admin: `turmas_encerrando_em_breve` = |`ending_soon`|; `turmas_atrasadas` = |`overdue`|;
  `turmas_em_andamento` = |`overdue`| + |`ending_soon`| + |`in_progress`|, igual ao redator
  (João, 2026-11-03): hoje ele conta também as futuras. O admin **não** ganha KPI "Próximas
  clases" (minha decisão: a coluna da agenda já mostra, e KPI novo é redesenho).
- **O funil não muda:** `PipelineQuery` continua recebendo o total `em_andamento` (futuras
  incluídas) para o estágio `TurmaInProgress`. O `kpis()` passa a expor os dois números
  separadamente — o total para o funil, o "já começou" para o card.
- `conclusoes_por_confirmar` = contagem SQL por `whereDisplayStatus(Habilitada)`.
- Um teste de paridade por KPI prova contagem igual ao tamanho do balde.

**D5 — Onde o classificador mora (minha decisão).** Em `Domains/Dashboard/Services/`, ao lado do
`DashboardWindows`: só o Dashboard pergunta por "agenda". Recebe as turmas já escopadas (o
`RedatorScopeQuery` continua sendo a porta única do escopo do redator — o classificador nunca
consulta) e devolve os quatro baldes. Os KPIs de agenda deixam de ser SQL próprio e passam a contar
o resultado, porque a coleção `em_andamento` já é carregada pelas agendas (~10 usuários, dezenas de
turmas: proporcional). Com o gate de operação fechado nada disso carrega — o assembler já pula as
chamadas por `canOperation`, e continua pulando.

**D6 — Requisitos na linha de compliance (João, 2026-11-03).** `TurmaComplianceData` ganha
`missing_requirements: TurmaRequirement[]`, de `HabilitacaoStatus::missingRequirements()`. A coluna
"Faltan" junta documentos e requisitos numa lista traduzida só (documentos primeiro). Nenhuma linha
fica "Habilitada: No" com "Faltan: —".

**D7 — Pendência da presencial sem local (João, 2026-11-03).** `OperationMetricsQuery::pendencias()`
emite um item novo, `PendingItemType` próprio, para turma presencial sem `local_aplicacao`, com a
data de início (como "turma sem relator") e navegação para a turma; frase em `lang/` nos três
locales do backend. **Só no dashboard do admin** (minha decisão): quem preenche
`local_aplicacao` é o admin, e o `pendenciasDocumentais` do redator segue só com documentos.

**D8 — Visibilidade explícita (D-34).** Um objeto de visibilidade (operação, comercial, certificação,
identidade) é montado **uma vez** a partir do `User` e substitui os quatro booleanos soltos do
`AdminDashboardAssembler`; vai no `AdminDashboardData` como campo próprio, com DTO
`#[TypeScript]`. O dado proibido continua `null` (não vaza). No front, `AdminView`, `kpiCards`,
`SeriesPanel` e `RankingsPanel` decidem mostrar/esconder pelo campo de visibilidade; a checagem de
`null` que sobrar é só estreitamento de tipo, nunca a decisão. Regenera `generated.ts`.

Um booleano por módulo basta, porque cada série/métrica pertence a um módulo só (mapeamento de hoje,
em `AdminDashboardAssembler`):

| Flag | Origem | Governa |
|---|---|---|
| operação | `operation.turma.view` | KPIs de turma, agenda, compliance, pendências de operação, séries de turma/matrícula |
| comercial | `commercial.quote.view` **e** `commercial.budget.view` | KPI de cotações, pendências comerciais, série `uf_aprovada`, métrica `uf_aprovada` dos rankings |
| certificação | `certification.certificate.view` | KPI de certificados a emitir, pendências e alertas de certificação, série `certificados_emitidos` |
| identidade | `identity.user.view` | alertas de documento de redator |

Seções que pedem dois gates seguem pedindo (`AdminDashboardAssembler.php:90`, `:102`, `:200`):
funil e rankings = operação **e** certificação; carga de relatores = identidade **e** operação. O
front combina as flags do mesmo jeito; quem combina é um lugar só, não cada painel.

Se a leitura do assembler mostrar mapeamento diferente desta tabela, vale o código de hoje: o bloco
torna o gate explícito, não o redesenha.

**D9 — Ranking de clientes por `EmissionStateResolver::whereVigente`** (que já qualifica a coluna
pela tabela), apagando o comentário "unificá-la fica para o bloco 54".

**D10 — P-85** como a ficha diz: `DataSql::literal` nos três `whereBetween` de `start_date`
(`AnalyticsQuery.php:50`, `:100`, `:148`), teste com turma no último dia do período presente na série
`turmas_iniciadas` e nos dois rankings. O teste é visto reprovar sem o fix.

**D11 — D-73.** Achar a célula que força a largura em `CompliancePanel` e `RedatorLoadPanel` e
deixá-la quebrar ou truncar com `title`. O piso das colunas (`panelColumns.ts`) não é o culpado
(medido no item 23).

## 5. Restrições

- Leis do §5 do `CLAUDE.md`: `generated.ts` só por `typescript:transform`; nada de PrimeReact fora de
  `shared/ui`; nenhuma feature importa outra.
- Mensagem ao usuário de `lang/`, paridade nos três locales (`LocaleParityTest`,
  `MensagemLiteralTest`).
- Data de calendário de `FusoDoNegocio`; nada de `today()`/`now()` projetado em data.
- Escopo do redator antes de qualquer agregação (`RedatorScopeQuery`): nenhum dado de outro redator
  nem de cliente no payload do redator.
- `ListQueryBudgetTest`/`preventLazyLoading`: o eager-load acompanha qualquer relação nova lida
  (`modalidade`/`local_aplicacao` são colunas da turma; `redatores` já é carregado).
- Teste de regressão visto reprovar contra o código antigo.

## 6. Deixado ao builder

- Nome da classe do classificador e do objeto de visibilidade; forma do retorno (DTO ou array
  tipado).
- Se a chave do balde das futuras no payload continua `starting_soon` ou vira `upcoming`. Os pares
  `AgendaData`/`RedatorAgendaData` seguem separados (o redator não vê cliente).
- Nome das chaves que o `kpis()` devolve para o total e para o "já começou".
- Valor do enum novo de `PendingItemType` e a rota de navegação dele (a mesma da turma).
- Como a coluna "Faltan" monta a lista traduzida dos requisitos: os rótulos já existem no front
  (`operation.*.requirement` nos três locales); se o mapa vive numa feature, sobe para `shared/lib`,
  como o `turmaDocumentTypeList`.
- A célula culpada do D-73 e a técnica (quebra ou truncamento).

## 7. Critérios de aceite (DoD)

1. A turma que começa em 10 dias aparece no KPI "Próximas clases" **e** na coluna "Próximas clases"
   da agenda, para redator e admin. Teste de backend.
2. Nenhuma turma aparece em dois baldes; "Agenda · N" = número de turmas `em_andamento` visíveis.
   Teste de backend dos quatro baldes nas bordas (`hoje`, `horizonte`, `horizonte + 1`).
3. Cada KPI de agenda é igual ao tamanho do balde (ou da soma de baldes) do D4, no admin e no
   redator; `conclusoes_por_confirmar` igual à contagem por `whereDisplayStatus(Habilitada)`; o
   estágio `TurmaInProgress` do funil continua contando as futuras. Teste de paridade.
4. Linha de compliance de turma presencial sem local e sem relator lista os dois requisitos em
   "Faltan"; "Pendientes" traz o item da presencial sem local. Testes de backend e de componente.
5. `RankingsPanel`, `SeriesPanel`, `kpiCards` e `AdminView` decidem visibilidade pelo campo
   explícito; teste de componente com gate fechado e dado ausente, e com gate aberto e coleção vazia
   (vazio "sem dados", nunca escondido).
6. Ranking de clientes conta só certificado vigente (revogado fora). Teste.
7. Borda do último dia provada no sqlite (D10), vista reprovar antes do fix.
8. `scrollWidth == clientWidth` no invólucro dos dois painéis em 1024x768 e 390x844, medido no
   navegador com o stack da lane.
9. Suíte backend, `pnpm build`, `pnpm lint` e `pnpm test` verdes; `generated.ts` regenerado sem
   diff pendente.

## Verificação externa

Nenhuma. O bloco cobre backend, frontend e testes do Dashboard, sem ação fora do repositório.
`efeito_externo: nao`.

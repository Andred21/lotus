# Spec — `dashboard-frontend-central-controle` (Sprint 5 · Dashboard, bloco B1)

> **Data:** 2026-08-15 · **Estado de origem:** `ready_for_planning` → `planning`
> **Context Packet:** `docs/superpowers/context-packets/2026-08-15-dashboard-frontend-central-controle.md`
> **Fonte canônica:** Drive `dashboard-escopo-funcional-analitico.md` (ID `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa`)
> **Contrato consumido:** `specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md` §4.2 + `generated.ts`
> **Baseline:** `main@36faf44` (PR #54, Meu Perfil mergeado) · medido nesta branch em 2026-08-15:
> `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **36 arquivos / 186 testes**

## 1. O que o bloco entrega

A tela do Dashboard administrativo, read-only, substituindo o placeholder de 22 linhas: **KPIs,
pendências, alertas, agenda e pipeline**, consumindo `GET /api/dashboard/metricas` — entregue e
fechado no bloco A. Sem mutação, sem regra de domínio no React, sem tipo escrito à mão.

**O bloco B foi fatiado em dois por decisão do João (D1).** Este é o B1. O B2
(`dashboard-frontend-analitico-e-redator`) leva séries, rankings, compliance documental, carga de
redatores e a view do Redator inteira, e nasce no `backlog.md` no fechamento deste.

## 2. Decisões

D1–D7 e D11–D12 foram escolhidas pelo João entre alternativas com o custo declarado; D8–D10 e
D13–D15 são derivadas e declaradas como tais.

- **D1 — O bloco B vira B1 (operacional) + B2 (analítico e Redator).** As 14 seções do contrato num
  plano só levariam o gate visual cansado ao fim. O corte é por pergunta respondida: o B1 responde
  *"o que tenho para fazer agora"*; o B2 responde *"como a operação evoluiu"*. Alternativas
  recusadas: bloco único; corte por papel (admin agora, Redator depois) — este último cortaria pela
  linha do contrato, mas a view do Redator é a metade menor e hoje **ninguém consegue autenticar
  como redator** para vê-la.
- **D2 — O slug do B1 continua `dashboard-frontend-central-controle`.** A branch
  `feat/dashboard-frontend-central-controle` já existia quando o corte foi decidido, criada antes de
  qualquer documento por instrução explícita do João. Renomear custaria reescrever dois commits de
  estado por ganho de precisão marginal — "central de controle" descreve o recorte operacional.
- **D3 — O corte do B1 são as 5 seções sem gráfico:** `kpis`, `pendencias`, `alertas`, `agenda`,
  `pipeline`. Nenhuma delas precisa de biblioteca de gráficos, e é isso que torna a fatia viável
  sem decidir chart lib. `compliance_turmas` ficou de fora por ser a seção mais densa do payload
  (docs presentes/ausentes, habilitação, redatores, datas), o que puxaria uma tabela grande para
  dentro do B1.
- **D4 — Composição em `app/pages/Dashboard/`, sem `features/dashboard`.** O Drive proíbe a feature,
  e o repositório manda no mesmo sentido por outro caminho: `estrutura-monolito.md:100` reserva
  `app/pages/` para "página que NÃO é de domínio: DashboardPage, ModulePlaceholder", e a lei §5.6
  proíbe feature importar feature — um Dashboard que lê de Commercial, Operation e Certification
  como *feature* violaria a lei. Página, hook e componentes de seção vivem juntos na pasta.
  Alternativas recusadas: átomos genéricos (`AppStatCard`, `AppSeverityTag`) promovidos a
  `shared/ui` — especulação sem segundo consumidor medido (lição 3); e hook em `shared/api` +
  `shared/hooks` pela letra do ADR-18, que fala de **cliente REST CRUD**, não de um GET agregado
  de tela única.
- **D5 — O hook nasce com o parâmetro de período, a UI do filtro não.** As 5 seções do B1
  **ignoram o período por definição** (D3 da spec do bloco A: só séries e rankings o obedecem),
  então o B1 não tem o que filtrar. O hook aceita filtro opcional e a query key já varia por ele —
  fronteira pronta, uso quando chegar (lição 3) — e o B2 liga a UI sem mexer no cache.
- **D6 — Seção ou KPI `null` por gate não renderiza.** Nada de zero no lugar do que não pode ser
  lido, que é a lei do bloco A; e nada de rótulo "sem acesso", que polui a tela de quem nunca terá
  o módulo. É o padrão que o Sidebar já aplica ao filtrar item por permissão. **Consequência
  declarada:** dois usuários veem telas diferentes sem explicação na tela — aceito, porque a
  alternativa anuncia módulos que o operador não pode usar.
- **D7 — CTA de "cotação aprovada sem turma" leva ao orçamento**
  (`/comercial/presupuestos/:budget_id`), não ao formulário de criar turma. O Drive fixa que o
  Dashboard não executa mutações e CTAs apenas direcionam ao módulo dono; levar direto à tela de
  criação chega colado no botão que resolve. O `navigation` do backend traz `budget_id` **e**
  `quote_id`; o B1 usa o primeiro.
- **D8 (derivada) — Alertas de certificado e de documento de relator levam à listagem do módulo,
  sem seleção.** `/certificados` e `/personas` não têm rota de detalhe: os dois módulos são
  listagem com diálogo. Ancorar na entidade é o **FUT-2** do backlog ("link de dado compartilhado
  leva à página do módulo dono com a entidade selecionada"), explicitamente dependente de decisão
  do João — resolvê-lo aqui decidiria um futuro dentro de um bloco que não é dele.
- **D9 (derivada) — A política de estado vive em `useDashboard`, sem irmão genérico em
  `shared/hooks`.** `useLoadState` não serve: a assinatura é `UseQueryResult<T[]>`, de **lista**, e
  o dashboard é objeto único com seções anuláveis. A tese da rule é preservada verbatim — o que
  ramifica a tela é o **dado** que falta, não o `status` da query. Extrair um `useResourceState`
  agora seria abstrair contra um consumidor só; o segundo (Meu Perfil frontend, Sprint 6 bloco 2)
  é quem paga a extração, se o formato se repetir.
- **D10 (derivada) — O pipeline é barra CSS, não gráfico.** Seis etapas com contagem, largura
  proporcional ao maior valor, cor por variável de tema (ADR-16). É layout Tailwind. **A decisão de
  biblioteca de gráficos não é deste bloco** e nasce no B2, com as 5 séries mensais — hoje o
  projeto não tem `chart.js` nem qualquer alternativa instalada (medido em `package.json`), e o
  `Chart` do PrimeReact exige o peer.
- **D11 — A catraca `COR_HARDCODED` passa a rodar em `src/app/**` dentro deste bloco.** Medido: a
  regra roda em `src/features/*/components/**`, `src/features/**` e `src/shared/**`, e **`src/app/**`
  é a única camada sem ela** — é a **P-34**, agrupada no BD-11. O bloco escreve 8 arquivos novos
  justamente em `app/`, que nasceriam sem guarda de cor. Entram os 3 sítios que hoje impedem a
  regra: `SidebarItem.tsx:24`, `Sidebar.tsx:60` e `Sidebar.tsx:71` (`text-slate-300`/`text-slate-400`).
  **Consequência: a P-34 fecha no `/fechar-sprint` deste bloco e o BD-11 fica só com a D-03.**
- **D12 — O B1 não trata `view === 'redator'`.** O hook devolve o union discriminado; a página
  renderiza apenas o ramo `admin`. Sem placeholder, sem tela de transição: a view do Redator é do
  B2, e hoje nenhum redator autentica (`CreateRedatorAction` cria com `is_active=false` e o fluxo de
  ativação não existe — item 4 de "Próximos blocos").
- **D13 (derivada) — `formatUf` sobe para `shared/lib/uf.ts`.** O KPI `cotacoes.pending_value_uf`
  chega como string decimal e precisa da mesma formatação que o Comercial usa; o arquivo vive hoje
  em `features/commercial/lib/uf.ts` com **5 sítios de import** (medido em 2026-08-15 no
  planejamento: `BudgetStatCard.tsx`, `BudgetsTable.tsx`, `QuoteRow.tsx`, `useQuoteForm.ts` e
  `DataStep.tsx` — este último consome `parseUfInput` e faltava na primeira contagem desta spec).
  `app/` importando de uma feature é permitido pela direção da dependência, mas acopla a página ao
  módulo comercial por um utilitário puro. O argumento é o do ADR-18 (`adrs.md:222`): recurso
  referenciado por mais de uma camada é **promovido**, em vez de decidido caso a caso. O arquivo
  inteiro se move (`formatUf` e `parseUfInput` são ambos utilitário puro) e os 5 imports são
  reapontados no mesmo commit.
- **D14 (derivada) — Vocabulário e i18n.** Três locales com chaves idênticas, `es-CL` como
  referência de rótulo. Entram os 6 `PendingItemType`, os 5 `DashboardAlertType` e as 6 etapas do
  `PipelineStage`, além dos rótulos de KPI, agenda e estados vazios. Datas por `formatDate`
  (`shared/lib/datetime.ts`), que já resolve o locale ativo.
- **D15 (derivada) — Severidade por `AppTag`.** `DashboardSeverity` (`high | medium | normal`) mapeia
  para a severidade do wrapper existente. Sem componente novo em `shared/ui`.
- **D16 — Layout "torre".** Fileira de KPIs; abaixo, **pendências e alertas lado a lado** — as duas
  listas que respondem *"o que faço agora"*, na primeira tela; abaixo, agenda; abaixo, pipeline, que
  são leitura de contexto. Alternativas recusadas: coluna única na ordem de prioridade (mesma leitura
  em toda viewport, mas nada além dos KPIs cabe na primeira tela) e duas colunas assimétricas (a
  coluna estreita vira rodapé comprido no mobile).
- **D17 (derivada, medida) — A linha do item é rótulo traduzido; a `description` do backend é
  detalhe secundário e fica em es-CL.** Medido em `CommercialMetricsQuery.php:48`,
  `OperationMetricsQuery.php:128`, `CertificationMetricsQuery.php:38` e
  `IdentityMetricsQuery.php:46`: o backend já manda `description` como **string fixa em espanhol**
  ("Cotización pendiente de aprobación.", "Clase sin relator designado."). A D14 manda traduzir os
  11 tipos, então o rótulo do tipo é a linha principal e sai traduzido nas 3 locales. A
  `description` não some porque em `turma_docs_incomplete` ela carrega informação que o front não
  tem como derivar — a lista de documentos faltantes —, e descartá-la perderia dado; entra como
  linha secundária. **Consequência declarada:** numa UI em pt-BR ou en, o detalhe do item aparece
  em espanhol. Aceito para o cliente chileno, cuja locale de referência é `es-CL`; traduzir o texto
  do servidor é trabalho do backend (chave i18n ou dado estruturado no lugar da frase pronta) e
  nasce no `backlog.md` no fechamento, não neste bloco.

## 3. Arquitetura

```
frontend/src/app/pages/Dashboard/
├── DashboardPage.tsx      compõe as seções; sem query, sem derivação
├── useDashboard.ts        useQuery + política de estado (D9)
├── KpiRow.tsx             AdminKpisData → cards, campo nulo não renderiza
├── PendingList.tsx        PendingItemData[]
├── AlertList.tsx          AlertData[]
├── AgendaPanel.tsx        AgendaData: 4 listas
├── PipelineFunnel.tsx     PipelineStageCountData[] → barras CSS (D10)
├── navigation.ts          tipo + navigation → rota (tabela §5)
└── index.ts

frontend/src/shared/lib/uf.ts   movido de features/commercial/lib/ (D13)
```

`DashboardPage.tsx` é declarativo: consome `useDashboard()` e distribui. Query, derivação e
política de estado ficam no hook — o mesmo contrato que o lint impõe a `features/*/components/**`
e que aqui vale por disciplina, já que o seletor não alcança `app/`.

**Layout (D16, "torre"):** fileira de KPIs; abaixo, duas colunas com **pendências** e **alertas**
lado a lado; abaixo, agenda; abaixo, pipeline. Em telas estreitas as duas colunas empilham. Grid
por Tailwind; cor só por variável de tema.

## 4. Estados

| Situação | O que a tela mostra |
|---|---|
| Carregando, sem cache | skeleton das seções (`AppSkeleton`) |
| Falhou, sem cache | `AppErrorState` substitui a tela, com retry |
| Falhou, **com** cache | a tela permanece + `InlineLoadState` no topo |
| Seção ou KPI `null` (gate) | não renderiza (D6) |
| Lista vazia de verdade | `AppEmptyState` próprio da seção, distinto de falha |
| **Todas** as seções `null` | uma mensagem de página inteira: a sessão não tem permissão de módulo nenhum |

A distinção "falhou sem cache" × "falhou com cache" é a lição do BD-6, aplicada a objeto único: um
refetch falho mantém `data` populado enquanto `status` vira `error`, e substituir a tela nesse caso
apaga informação utilizável.

**A última linha é o caso-limite que a D6 sozinha não cobre.** Esconder cada seção nula, uma a uma,
levaria a uma página em branco para quem não tem permissão de módulo algum — indistinguível de
falha silenciosa. `pendencias` e `alertas` são listas não-anuláveis (chegam vazias, não `null`), e
os 6 campos de `kpis` podem estar todos nulos; a condição é **nenhum KPI com valor, todas as seções
anuláveis nulas e as duas listas vazias**. A tela então diz isso explicitamente, em vez de não dizer
nada.

> **Emenda do review de 2026-08-16 (segunda lente).** Esta seção dizia "nenhum KPI com valor e todas
> as seções anuláveis nulas", deixando as duas listas fora da conta com o argumento de que `[]` não
> distingue "sem permissão" de "sem pendência". O argumento vale para a lista **vazia** e se inverte
> na lista **cheia**: `AdminDashboardAssembler.php:157` alimenta os alertas de documento de relator
> por `identity.user.view`, e essa permissão não liga KPI, pipeline nem agenda. Um papel só com ela
> caía em "nenhum módulo visível" com alerta autorizado na mão — dado de RN-09 escondido em
> silêncio. O predicado passa a exigir também as duas listas vazias.

## 5. Navegação

Mapa de `navigation.ts`, construído sobre as chaves que o backend **já produz** (medidas em
`app/Domains/Dashboard/Services/`, não supostas):

| Origem | Chave lida | Destino |
|---|---|---|
| `turma_without_redator`, `turma_docs_incomplete`, `turma_awaiting_conclusion`, `enrollment_awaiting_certificate`, alerta `turma_overdue` | `turma_id` | `/operacion/turmas/:id` |
| `quote_awaiting_approval`, `quote_approved_without_turma` | `budget_id` | `/comercial/presupuestos/:id` (D7) |
| `certificate_expiring_soon`, `certificate_expired` | — | `/certificados` (D8) |
| `redator_document_expired`, `redator_document_expiring_soon` | — | `/personas` (D8) |

Chave ausente no `navigation` = item sem link, nunca rota quebrada.

## 6. Testes

O corte do runner cobre hooks (`renderHook` + `QueryClientProvider`); componente PrimeReact no
jsdom segue **fora**. Cada teste com o vermelho visto antes do verde (lição 10):

1. **`useDashboard` — sucesso:** devolve o payload admin tipado e a política de estado coerente.
2. **`useDashboard` — falha sem cache:** o flag que autoriza substituir a tela liga.
3. **`useDashboard` — falha com cache:** o flag **não** liga e os dados anteriores permanecem.
4. **`useDashboard` — query key varia por período** (D5), provando que o B2 não precisará mexer no
   cache.
5. **`useDashboard` — nenhuma seção legível:** o caso-limite da última linha do §4 (todos os KPIs
   nulos, `pipeline` e `agenda` nulos) tem estado próprio, distinto de vazio e de falha. É o único
   dos seis estados do §4 que cai dentro do corte do runner, e sem ele a página em branco de quem
   não tem módulo nenhum não teria guarda de regressão em lugar algum.
6. **`navigation.ts`:** cada `PendingItemType` e `DashboardAlertType` resolve a rota da tabela §5, e
   chave ausente devolve "sem link" — teste de função pura, dentro do corte do runner.
7. **`useDashboard` — alerta na lista impede "sem acesso"** (acrescentado no review de 2026-08-16):
   payload com todo KPI nulo, `pipeline`/`agenda` nulos e **um** alerta devolve `ready`, não
   `unauthorized`. É a guarda de regressão da emenda do §4; o vermelho foi visto contra o predicado
   antigo antes do verde.

**O que NÃO terá teste automatizado, declarado:** as 5 seções renderizadas, o layout em duas
colunas, o colapso responsivo, a ocultação por gate `null` e os estados vazios. A prova é
`/lotus-ui-review`, que tem `disable-model-invocation: true` — é passo do João, e entra no plano
como lista fechada do que provar em cada viewport.

## 7. Definition of Done

- As 5 seções renderizadas contra a **API real** com dado real, nas 3 locales e nos 2 temas.
- **Gate `null` provado com papel-sonda**, não deduzido: um papel sem `commercial.*` não mostra o
  card de cotações nem as etapas comerciais do pipeline; um papel sem `operation.turma.view` não
  mostra os 4 KPIs de turma nem a agenda. É o mesmo mecanismo de prova que o fechamento do bloco A
  usou (`POST /api/roles` + `POST /api/users`, sondas removidas ao fim).
- **Catraca de cor provada nos dois sentidos** (D11): a regra entra em `src/app/**` sem bloco
  `ignores`, e uma sonda reintroduzindo `text-slate-400` faz `pnpm lint` reprovar nomeando arquivo
  e linha.
- **A promoção de `uf.ts` provada onde ela pode quebrar** (D13): os 5 sítios do Comercial seguem
  exibindo e aceitando UF na tela — `BudgetsTable`, `BudgetStatCard`, `QuoteRow`, o preenchimento
  de `useQuoteForm` e o campo de valor do `DataStep` (que usa `parseUfInput`: é o caminho de
  ESCRITA, onde um erro grava valor errado em silêncio) —, conferidos na revisão visual, não só por
  `tsc` verde. É dinheiro na tela.
- `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` verde com os 6 testes novos — contra o
  baseline medido de **36 arquivos / 186 testes**.
- **Zero mutação:** o bloco não escreve em tabela nenhuma; contagem de tabelas antes e depois de uma
  rodada da tela, com as sondas de RBAC restauradas aos números do snapshot inicial.
- Backend, Pint e `typescript:transform`: **N/A por escopo, medido** — `git diff main...HEAD --
  backend/` e `-- generated.ts` vazios ao fim.

## 8. Fora de escopo (guarda contra deriva)

Séries, rankings, `compliance_turmas`, `redatores` e a view do Redator inteira (B2); biblioteca de
gráficos (B2); UI de filtro de período (B2, D5); ancoragem de CTA na entidade selecionada (FUT-2,
D8); qualquer mutação; guard de rota por permissão; redesign dos módulos de destino; ativação de
acesso do redator; Notifications; a D-03 do BD-11 (rótulo do menu recolhido no toque).

## 9. Risco de review

**BAIXO pelo gate binário:** o bloco não toca schema, não regenera `generated.ts`, não toca Sanctum,
auditoria nem emissão de documento legal, e não decide autorização — o payload já chega filtrado
pelo backend, e `can()` não é usado.

**Divergência declarada por alcance:** oito arquivos novos, a promoção de `uf.ts` tocando quatro
arquivos que exibem **dinheiro** (UF), e uma catraca de lint nova numa camada inteira. Nenhum desses
é gatilho binário, mas os três juntos justificam olhar o diff com atenção. Se o João preferir duas
lentes, é decisão dele no `/revisar-sprint`.

## 10. Limitações declaradas

- **Nenhum redator verá o Dashboard, nem depois do B2**, enquanto o fluxo de ativação não existir
  (item 4 de "Próximos blocos"). Não é regressão deste bloco.
- **Os dois alertas sem rota de detalhe** (certificado, documento de relator) navegam para a
  listagem sem selecionar a entidade (D8) — resolver isso é o FUT-2.
- **A D-16 do backlog** (turma concluída com zero matrículas cai em `fully_issued`) fica esperando
  o consumidor dizer se a distinção paga. O consumidor é o pipeline, que este bloco renderiza; se a
  leitura do rótulo incomodar na revisão visual, a decisão volta ao João — este bloco **não** a
  decide sozinho.
- **A ocultação por gate `null` não terá guarda automatizada** (componente PrimeReact fora do corte
  do runner): vale pela prova com papel-sonda do DoD, não por teste que reprove numa regressão
  futura.
- **O detalhe de cada pendência e alerta fica em espanhol nas outras duas locales** (D17): a frase
  vem pronta do backend. O rótulo do tipo, que é a linha que o olho lê primeiro, traduz.

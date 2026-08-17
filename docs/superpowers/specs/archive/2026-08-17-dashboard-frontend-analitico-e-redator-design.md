# Spec — Dashboard frontend analítico e view do Redator (B2)

> Bloco **B2** da Sprint 5 · Dashboard. Work item: `dashboard-frontend-analitico-e-redator`.
> Context Packet: `docs/superpowers/context-packets/2026-08-17-dashboard-frontend-analitico-e-redator.md`.
> Branch `feat/dashboard-frontend-analitico-e-redator`, nascida de `main@c2ac9d4`. Main tree.

## 1. Objetivo

Entregar a metade analítica do Dashboard e a view do Redator inteira, consumindo o contrato que o
bloco A já expõe. O bloco é **read-only**: nenhuma mutação, nenhuma regra de domínio no React,
nenhum tipo escrito à mão.

**Entra:** as 5 séries mensais, os 2 rankings, `compliance_turmas`, a carga de redatores, o seletor
de período e as 5 seções da view do Redator.

**Não entra:** reabrir as 5 seções operacionais do B1; ativação de acesso do Redator (item 4 de
"Próximos blocos"); a D-16; limpeza dos usuários de sonda da P-44; Notifications; qualquer filtro
além de período; tradução do `description` que o backend manda em espanhol (D-18).

## 2. Contexto medido na abertura

Tudo abaixo foi medido sobre `c2ac9d4`/`e48b4ae`, não herdado do B1.

1. **Não existe biblioteca de gráficos.** `package.json` não tem `chart.js` — peer obrigatório do
   `Chart` do PrimeReact `^10.9.8` — nem `recharts`, `apexcharts`, `echarts`, `d3`, `victory`,
   `nivo` ou `visx`; nenhum dos 39 wrappers de `shared/ui` é de gráfico.
2. **O hook já nasceu com o parâmetro de período.** `useDashboard(period?: DashboardPeriod)`
   (`useDashboard.ts:77`), `queryKey` incluindo start/end (`:17-18`), `params` na chamada (`:83`).
   A página o chama **sem período** (`DashboardPage.tsx:71`). A D5 do B1 se paga aqui.
3. **Os 4 datasets que faltam são exatamente os 4 anuláveis que o B1 não consumiu:**
   `compliance_turmas`, `redatores`, `series`, `rankings` (`generated.ts:8-11`). Dentro de
   `SeriesData`, **cada uma das 5 séries também é anulável** (`:454-460`), e
   `RankingRowData.uf_aprovada` é `string | null`.
4. **`RedatorDashboardData` tem 6 chaves e nenhuma anulável** (`:376-383`).
5. **O ramo do Redator existe e está vazio:** `kind: 'unsupported'` renderiza só o cabeçalho
   (`DashboardPage.tsx:103`) e `kind: 'ready'` é tipado `data: AdminDashboardData`.
6. **`DEFAULT_MONTHS = 12`** (`DashboardFilterData.php:24`); janela invertida sobe 422 RFC 7807 com
   `errors.period_end` e a frase literal `'La fecha de término no puede ser anterior a la de
   inicio.'`, em espanhol fixo do servidor. O payload devolve `period_start`/`period_end`
   **resolvidos**.
7. **`COR_HARDCODED` casa só `className` com classe Tailwind de cor** (`eslint.config.js:110-115`).
   Hex dentro de objeto de configuração passa em silêncio — é a **P-36**.
8. **`max-lines: 150` roda só em `src/features/*/components/**`** (`eslint.config.js:248-251`).
   `src/app/**` é a camada sem a régua, e **2 dos 24 arquivos dela já a excedem**:
   `useDashboard.test.tsx` (180) e `DashboardPage.tsx` (159), os dois criados pelo B1.
9. **O tema troca em runtime trocando o `href` de um `<link>`** (`primeTheme.ts:15`), sem re-render
   React: quem lê cor em JS fica com valor velho até alguém forçar redraw.
10. **Existem 5 tokens de tom e eles são semânticos** (`--tone-info-ink`, `success`, `warning`,
    `danger`, `neutral` — `brand-theme.css:76-79,126-130`), mais `--brand-ink`. O tema gerado traz
    11 hues com escala completa.
11. **`AppDatePicker.value` é `string | null`** — data única, não intervalo
    (`AppDatePicker.tsx:6`).
12. **Baseline do gate nesta branch:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
    **39 arquivos / 223 testes**.

## 3. Decisões

### Escolhidas pelo João

- **D1 — Recharts, SVG.** As séries e os rankings são desenhados com Recharts. O argumento decisivo
  é o ponto 4 do ADR-16 combinado com a medição 9: SVG aceita `stroke="var(--chart-1)"` nativo e
  acompanha a troca de tema **sem JS nenhum**, enquanto canvas exige `getComputedStyle` mais redraw
  forçado a cada troca — mecanismo novo, e a P-36 garante que um hex esquecido no dataset passaria
  no lint. A compatibilidade com React 19.2 é **step de verificação do plano**, não premissa.
  *Rejeitadas:* `chart.js` + `Chart` do PrimeReact (canvas, pelo motivo acima) e SVG próprio (eixo,
  tick, tooltip, resize e vazio-vs-zero seriam nossos — é justamente o caro).
- **D2 — `--chart-1..5`, categóricos, sem semântica.** Cinco tokens novos em `brand-theme.css`,
  cada um apontando para um hue que o tema gerado já tem, com valor próprio no claro e no escuro.
  **Zero hex novo** — a técnica do `--brand-gradient`, que se compôs de tokens existentes. Critério:
  3:1 contra a superfície (é elemento gráfico, não texto — a tese do passe de 2026-08-17) e
  distinguíveis entre si. *Rejeitadas:* reusar os 5 tokens de tom (carregam sinal — `certificados_emitidos`
  em `--tone-danger-ink` diria "perigo" na mesma tela onde alerta e série convivem) e escala
  monocromática da marca (5 degraus de um hue em traço de 2px não se distinguem).
- **D3 — dois `kind` de pronto, e `unsupported` morre.** `ready-admin` e `ready-redator`, cada um
  carregando o DTO já estreitado. O hook discrimina uma vez; a página nunca re-estreita. É a tese do
  próprio docblock do hook — `kind` é o ramo de render — e cabe a medição 4: as políticas são
  **diferentes**, porque `nenhumaSecaoLegivel` só existe no admin. Com as duas views renderizadas,
  `unsupported` não dispara mais, e ramo que não dispara é órfão — o review do B1 já matou três.
- **D4 — subpasta por view.** `admin/` e `redator/`; na raiz ficam `DashboardPage`, `useDashboard`,
  `navigation` e o que as duas views usam de verdade. A fronteira de pasta passa a espelhar a
  fronteira de `kind` da D3. *Rejeitadas:* tudo plano na raiz (~22 arquivos, separação só por
  convenção de nome — contrato por prosa, que a lição 14 manda virar mecanismo) e subpasta só do
  Redator (assimetria sem razão de domínio).
- **D5 — presets mais personalizado.** Dropdown com "Últimos 12 meses" (default, idêntico ao
  `DEFAULT_MONTHS` do servidor), "Últimos 6 meses", "Ano corrente" e "Personalizado"; o último
  revela **dois `AppDatePicker`**, não um range — a medição 11 diz que o wrapper é de data única, e
  dois campos espelham o contrato do backend 1:1, que trata os limites como independentes.
  *Rejeitadas:* só presets (o parâmetro ficaria parcialmente inacessível pela interface) e só dois
  campos (nenhum atalho para o caso mais frequente).
- **D6 — `keepPreviousData` e erro junto do seletor.** O `useQuery` ganha
  `placeholderData: keepPreviousData`. **O buraco que isto fecha foi medido:** a query key varia
  pelo período (`useDashboard.ts:17-18`), então trocar a janela cria key nova, `query.data` volta
  `undefined` e o hook cai em `kind: 'error'` — a tela inteira viraria `AppErrorState` por um erro
  de digitação no filtro, e o `staleError` não alcança porque o cache é da key antiga. Com a
  decisão, o dado anterior fica na tela e a falha vira aviso ao lado do seletor. Ganho medido de
  brinde: some o flash de tela em branco na troca **normal** de período. **A regra de janela
  invertida fica só no backend** — validar no cliente a duplicaria.
  *Rejeitadas:* validação no cliente e a combinação das duas.
- **D7 — ausência se esconde.** Seção nula some inteira; série nula some do gráfico e da legenda.
  Mesmo molde da D6 do B1 — uma tela, uma gramática de ausência — e satisfaz o sinal de aceite do
  Drive, porque esconder não é converter em zero. **Custo declarado:** quem tem permissão parcial
  não descobre pela tela que existe mais dado atrás do gate. *Rejeitadas:* nomear a ausência
  (divergiria do B1 na mesma página e só fecharia coerente reabrindo a D6 dele) e rodapé de alcance.
- **D8 — a régua `max-lines` passa a valer em `src/app/**`.** `files: ['src/app/**/*.tsx']`,
  `ignores: ['**/*.test.tsx']`, `max: 150`. **O glob é `.tsx` e não `{ts,tsx}` de propósito**, e é o
  mesmo recorte da regra das features, que vale só para `components/`: hook e módulo de derivação
  longos são legítimos, componente inchado não. Em `app/pages/Dashboard/`, os `.ts` são exatamente
  isso — `useDashboard`, `navigation`, `kpiCards`, `resumoCards`. Teste longo cai na mesma isenção
  pelo mesmo motivo. **Custo medido: um arquivo**, `DashboardPage.tsx` (159),
  e a D4 já o encolhe ao mover as seções. Mesmo formato da D11 do B1, que fechou a P-34 ligando a
  catraca de cor nesta mesma camada descoberta. *Rejeitadas:* incluir teste (quebrar um arquivo de
  teste coeso é pagar preço pela regra, não pelo defeito) e deixar como débito.
- **D9 — `AppDataTable` sem busca** para compliance e carga. O dado é tabular de verdade: 8 campos
  e 6 campos. O wrapper resolve vazio, loading, `footerCount` e ordenação, e a rule proíbe reescrever
  esse rodapé à mão — reescrevê-lo rendeu, em 6 cópias, paginador duplicado e vazio falso. Sem
  `SearchableTableFrame`: dashboard é visão, busca é do módulo dono. *Rejeitada:* lista própria no
  molde do B1 (8 campos não cabem em linha compacta sem truncar).
- **D10 — a P-44 se declara, não se apaga.** A carga de redatores vai mostrar dois nomes de sonda no
  banco de dev; isso entra como limitação escrita do DoD. Base: o gatilho da ficha
  (`pendencias/abertas.md:369-371`) fecha "quando um bloco puder **reseedar** o banco de dev", e este
  não pode — apagar usuário que pode estar ligado a turma é mutação de dado alheia a um bloco
  read-only. *Rejeitada:* limpar as sondas no fechamento.

### Derivadas, e declaradas como tais

- **D11 — o wrapper de Recharts vive em `shared/ui`.** `AppLineChart` (séries) e `AppBarChart`
  (rankings, barra horizontal). Deriva do ADR-16 ponto 3 e da prática medida: o review do B1
  verificou **zero import de `primereact`** em `app/pages/Dashboard/`. `app/` compõe, não importa
  biblioteca direto. **Consequência para a D2:** o wrapper é o único sítio que nomeia token de cor,
  e o call-site passa índice de série — a cor vira mecanismo num lugar só, que é o que compensa a
  cegueira da P-36.
- **D12 — o período mora em `useState` da página.** Não cruza fronteira de componente além do par
  página/seletor, e a rule proíbe promover a Zustand o que não cruza fronteira. Dado de servidor
  segue no TanStack Query (ADR-05).
- **D13 — o reuso entre as views é medido, não presumido.** Três sítios, três formatos diferentes:
  - `AlertList` consome `AlertData[]`, e `alertas_documentos` do Redator é **o mesmo tipo**. Reuso
    sem tocar no arquivo.
  - `AgendaData` e `RedatorAgendaData` têm as **mesmas 4 janelas**; a linha difere em **exatamente
    um campo**, `client_name`, que o Redator não pode ver. `AgendaPanel` fica genérico sobre a linha
    e renderiza o cliente só quando ele existe — **o ownership vira consequência do tipo**, não
    condicional de tela.
  - `KpiRow` já é genérico sobre `Kpi[]`; só a derivação `cards(k: AdminKpisData)` é admin. Ela sai
    para `admin/kpiCards.ts` e o Redator escreve a dele. É extração de costura que já existia no
    arquivo, e o segundo consumidor chegou — não é abstração especulativa (lição 3).

## 4. Estrutura de arquivos

```
frontend/src/app/pages/Dashboard/
  DashboardPage.tsx        # escolhe o ramo por kind; encolhe sob a régua da D8
  useDashboard.ts          # D3 + D6
  navigation.ts
  DashboardItemRow.tsx     # já usado pelas duas listas
  AlertList.tsx            # D13: as duas views
  AgendaPanel.tsx          # D13: genérico sobre a linha
  KpiRow.tsx               # D13: render genérico sobre Kpi[]
  admin/
    kpiCards.ts            # derivação que sai do KpiRow
    PendingList.tsx        # git mv
    PipelineFunnel.tsx     # git mv
    SeriesPanel.tsx        # novo
    RankingsPanel.tsx      # novo
    CompliancePanel.tsx    # novo
    RedatorLoadPanel.tsx   # novo
    PeriodFilter.tsx       # novo
  redator/
    RedatorView.tsx        # novo, compõe as 5 seções
    resumoCards.ts         # novo, derivação
    PendenciasList.tsx     # novo
frontend/src/shared/ui/
  AppLineChart/            # novo (D11)
  AppBarChart/             # novo (D11)
frontend/src/shared/styles/brand-theme.css   # --chart-1..5 (D2)
frontend/eslint.config.js                    # régua em src/app/** (D8)
```

`git mv` preserva histórico nos dois arquivos movidos; imports reapontados no mesmo commit.

**As 5 seções do Redator, e quem renderiza cada uma.** A D13 dispensou os componentes `ResumoRow` e
`HistoricoRow` que o desenho apresentado previa: com o render de `KpiRow` já genérico sobre `Kpi[]`,
os dois viram **derivação**, não componente. O mapeamento fica explícito para o plano não escolher:

| Seção do contrato | Quem renderiza | Origem |
|---|---|---|
| `resumo` (4 contadores) | `KpiRow` | derivação em `redator/resumoCards.ts` |
| `historico` (2 contadores) | `KpiRow`, segunda instância | derivação em `redator/resumoCards.ts` |
| `agenda` (4 janelas) | `AgendaPanel`, genérico sobre a linha | D13 |
| `pendencias_documentais` | `redator/PendenciasList.tsx` | novo |
| `alertas_documentos` | `AlertList` | reuso direto, mesmo tipo |

Duas instâncias de `KpiRow` e não uma de seis cards: resumo e histórico respondem perguntas
diferentes — "o que tenho agora" e "o que já fiz" — e o Drive as separa. Cada uma leva seu título.

## 5. Contrato de estado

```ts
export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ProblemDetails; retry: () => void }
  | { kind: 'unauthorized' }
  | { kind: 'ready-admin';   data: AdminDashboardData;   staleError: string | null; retry: () => void }
  | { kind: 'ready-redator'; data: RedatorDashboardData; staleError: string | null; retry: () => void }
```

`nenhumaSecaoLegivel` continua medindo **só** o ramo admin e continua com a emenda do review de
2026-08-16: as listas entram pelo lado positivo, porque item na lista prova permissão. O Redator não
tem `unauthorized` — nenhuma chave dele é anulável, então não existe payload dele "fechado".

## 6. Cenários de teste

O corte do runner não muda: hooks e módulos puros entram, componente PrimeReact em jsdom fica fora.

1. `ready-redator` — payload `view: 'redator'` discrimina para o kind próprio, com o DTO estreitado.
2. `ready-admin` não regride — os **6 casos** que `useDashboard.test.tsx` tem hoje seguem verdes
   (medido; o "7º cenário" que o `state.md` do B1 registra era contagem de **cenário da spec**, e o
   próprio fechamento dele anotou que o vitest conta **casos**).
3. `keepPreviousData` — trocar a janela mantém o dado anterior enquanto a nova chega.
4. Falha na troca de janela — o dado anterior **fica** e `staleError` é populado; a tela não vira
   `error`. Vermelho antes de verde: contra o hook atual este caso falha.
5. `kpiCards` — campo `null` não vira card; os 6 KPIs se medem por `Object.values`.
6. `resumoCards` — os 4 contadores do resumo e os 2 do histórico, todos não-anuláveis.

## 7. i18n

~45 chaves novas, **idênticas nas 3 locales**, com `es-CL` de referência: nome das 5 séries, rótulo
das colunas de ranking, compliance e carga, os 4 presets de período, os rótulos das 5 seções do
Redator e o vazio de cada seção nova.

O 422 de janela invertida chega **em espanhol do servidor** nas 3 locales — é a D-18, já registrada,
e não se resolve aqui.

## 8. Definition of done

Comportamento provado, não pacote instalado (lei §5.8):

1. As 6 seções analíticas do admin renderizam com dado do seed, com o período default de 12 meses.
2. Trocar o período muda **séries e rankings** e não muda KPI, pendências, alertas, agenda,
   pipeline, compliance nem carga — a D3 do bloco A provada na tela.
3. Janela invertida devolve 422 e a tela **permanece** com o dado anterior, com a mensagem junto do
   seletor.
4. Gate `null` por papel-sonda criado e removido por API: seção fechada some, série fechada some da
   legenda, e nada vira zero.
5. A view do Redator renderiza as 5 seções a partir de payload `view: 'redator'`, sem cliente,
   sem UF e sem turma alheia.
6. 3 locales × 2 temas: nenhuma chave crua, nenhuma série ilegível no tema oposto, e as 5 cores da
   D2 medidas em 3:1 contra a superfície nos dois temas.
7. Régua da D8 provada nos dois sentidos: verde no HEAD e reprovando com sonda de 30 linhas.
8. Zero mutação: contagem de tabelas idêntica antes e depois.
9. `git diff main...HEAD -- backend/` e `-- generated.ts` vazios; Pint e `typescript:transform` N/A
   por escopo **medido**.
10. `/lotus-ui-review` — **passo do João** (`disable-model-invocation: true`). O bloco não fecha sem
    ele, e o aceite da EAP 8.4.0 exige validar admin e Redator **separadamente**, coisa que o B1 não
    podia satisfazer.

**Alvo do gate:** baseline **39 arquivos / 223 testes** mais os 6 cenários do §6. A contagem exata
de **casos** é do plano, não desta spec — o B1 provou que cenário e caso divergem quando um `it.each`
entra (os 6 cenários dele renderam 13 casos em `navigation.test.ts`), e projetar aqui um número que
o vitest não vai confirmar é a projeção que o fechamento do B1 teve de declarar como divergência.

## 9. Limitações declaradas

1. **A view do Redator não roda com sessão de redator.** `CreateRedatorAction.php:20` cria com
   `is_active=false` "até o fluxo de ativação" e `AuthController.php:52` recusa inativo. A prova é
   por payload e render; a ativação é o item 4 de "Próximos blocos" e não é escopo.
2. **A carga de redatores mostra dois nomes de sonda** (P-44, D10). Residência de gates anteriores,
   não defeito da tela.
3. **Permissão parcial não se anuncia** (D7). Consequência aceita do molde do B1.
4. **O detalhe de item do servidor segue em espanhol** nas outras duas locales (D-18).

## 10. Risco de review

**BAIXO pelo gate binário e medido:** não toca schema, não regenera `generated.ts`, não toca
Sanctum, auditoria, RBAC nem documento legal; o payload já chega filtrado da API.

**Divergência por alcance, declarada:** dependência de runtime nova (Recharts), 2 wrappers novos em
`shared/ui`, 5 tokens de cor novos, régua nova numa camada inteira e uma superfície de tela sem
consumidor autenticável. A segunda lente é decisão do João no `/revisar-sprint`.

## 11. Emendas

### Emenda 1 — a D8 obriga três arquivos que a §4 não listava (Task 4)

A §4 dava ao `DashboardPage.tsx` dois papéis — roteador de `kind` E compositor das seções do
admin — e a D8 põe uma régua de 150 linhas sobre ele. Ele tinha **159 linhas ANTES** das 4 seções
novas; as duas exigências não se satisfazem juntas.

Resolvido sem reabrir a D4, pelo próprio critério dela: o que a §4 já fazia para o Redator
(`RedatorView.tsx`) passa a valer para o admin, e o que as duas views usam mora na raiz. Três
arquivos a mais: `admin/AdminView.tsx`, `SectionLabel.tsx` e `DashboardSkeleton.tsx`.

### Emenda 2 — a D6 troca de mecanismo, não de objetivo (Task 3)

A D6 nomeava `placeholderData: keepPreviousData`. Medido no observador da versão instalada
(`@tanstack/query-core@5.101.1`, `src/queryObserver.ts:486-491`), o placeholder só entra com
`status === 'pending'`:

```ts
if (options.placeholderData !== undefined && data === undefined && status === 'pending') {
```

Quando o fetch da janela nova **falha**, `status` vira `'error'` e `data` volta `undefined` — o
placeholder não entra e a tela vira `AppErrorState`, que é exatamente o que a D6 foi escrita para
impedir. Ele cobre a troca normal (o "ganho de brinde") e **não cobre a troca falhada**, que era o
objetivo declarado.

Substituído por um piso único no hook: o último payload que chegou bom, usado quando `query.data`
está `undefined`. Cobre as duas metades com um mecanismo só; manter os dois seria a segunda fonte
da mesma verdade. O objetivo da D6 e o cenário 4 do §6 não mudaram.

### Emenda 3 — a chave i18n do KPI passa a ser completa (Task 4)

`KpiRow` montava `dashboard.kpi.${key}` dentro do render. Com o Redator como segundo consumidor, as
chaves dele vivem em `dashboard.redator.kpi.*` e o prefixo implícito quebra; a alternativa, uma prop
de prefixo, põe metade da chave no call-site e metade no render. O `Kpi.key` passa a carregar a
chave i18n inteira, e cada módulo de derivação a escreve. É a mesma correção que o Q-1 do review de
2026-08-16 já fez neste arquivo: derivação não escapa do módulo puro para dentro do JSX.

# Revisão de UI — Dashboard admin (`/`)

**Data:** 2026-08-22 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/app/pages/Dashboard/` (view `ready-admin`) · **Base:** `refactor/frontend-revisao-ui` @ `8c2f33c1`
**Evidência bruta:** `.artifacts/ui-review/20260822-040408-dashboard/` (34 arquivos, coberta por `.gitignore`)

> Terceira passada de `lotus-ui-review` sobre o Dashboard. As duas anteriores estão em
> `2026-08-17-lotus-ui-review-dashboard.md` (view admin, seções operacionais) e
> `2026-08-17-lotus-ui-review-dashboard-analitico-redator.md` (view redator + analítico).
> Esta cobre a view admin **depois** da entrada do bloco analítico — séries, rankings,
> compliance e carga de relator, que não existiam nas passadas anteriores — e por isso os
> achados novos se concentram nos wrappers de gráfico e no filtro de janela.
>
> A §2 é o `report.txt` verbatim, artefato da skill. A §3 é o que foi feito com ele e **não**
> faz parte do relatório.

## 1. Escopo e limites da run

- Papel: **admin**. Uma view por run — a view `ready-redator` fica declarada como estado não testado.
- Read-only: nenhuma mutação além do login; `git status --short` vazio antes e depois.
- Estados não capturados por exigirem mock, falha de rede ou banco vazio: `error`,
  `failedWithoutData`, `unauthorized`, vazios de cada seção, 422 de janela invertida.
- Falsos positivos descartados na verificação, registrados para não voltarem em revisão futura:
  1. **Funil desproporcional** — medido 66,5% do trilho para 2/3; `PipelineFunnel` normaliza pelo
     maior valor. Correto.
  2. **Tooltip presa após hover** — ao mover o ponteiro de fato, `.recharts-tooltip-wrapper` fica
     `visibility: hidden`. Artefato de captura, não defeito.
  3. **Números alinhados à esquerda nas tabelas** — nenhuma feature usa `text-right`; é o padrão
     vigente do repositório, não divergência desta tela.
  4. **Usuários "E2E Gate Redator" no seed** — já registrado como pendência P-44.
  5. **Paleta dos gráficos** — `chartInks` = `--chart-1..5` por tema, com régua de contraste medida
     em `frontend/tests/chart-tokens.test.ts`. Deliberada.

## 2. Relatório da skill — verbatim

```
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Dashboard — view `ready-admin` na rota `/` (jornada read-only: carga inicial, troca de preset de janela, revelação do intervalo personalizado, troca de métrica de ranking, troca de tema e de idioma).
Local URL: http://localhost:5173/
Branch/commit: refactor/frontend-revisao-ui @ 8c2f33c1
Date/time: 2026-08-22 04:04–04:27 -03
Agent: Claude Code (Opus 5), sessão Playwright `ui-review-dashboard-040408`
Playwright CLI: 0.1.18, chromium headed (canal `chrome` ausente; `--browser chromium`)
Chrome DevTools: complementary_unavailable
Git working tree before/after: limpo / limpo (`git status --short` vazio nos dois momentos)

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Carga inicial da view admin (KPIs, pendências, alertas, agenda, funil, séries, rankings, compliance, carga de relator) | 1440x900 | 1024x768 | 390x844 | snap-01-admin-1440.txt; shot-01-admin-1440-full.png; shot-01-admin-1440-scroll1..4.png; shot-06-admin-1024-top.png; shot-06-admin-1024-s1..s4.png; shot-07-admin-390-top.png; shot-07-admin-390-s1..s6.png |
| Abrir seletor de janela e escolher "Custom" (revela os dois campos de data) | 1440x900 | 1024x768 (mesmo bloco em shot-06-admin-1024-s2.png) | 390x844 (shot-07-admin-390-s3.png) | shot-02-admin-1440-period-open.png; shot-03-admin-1440-period-custom.png |
| Trocar preset para "Last 6 months" (dispara GET com a janela nova) | 1440x900 | — | — | shot-14-period-6m.png; `requests` #941 |
| Trocar métrica de ranking (Classes → Approved UF) | 1440x900 | 1024x768 (shot-06-admin-1024-s3/s4.png) | 390x844 (shot-07-admin-390-s5.png) | shot-05-admin-1440-metric-uf.png |
| Hover em barra de ranking (tooltip) | 1440x900 | — | — | shot-04-admin-1440-after-mousemove.png; shot-16-bar-tooltip-value.png |
| Alternar tema claro→escuro→claro | 1440x900 | — | — | shot-08-admin-1440-dark-top.png; shot-08-admin-1440-dark-s2.png; shot-08-admin-1440-dark-s3.png |
| Alternar idioma EN→ES→EN→PT→EN, com calendário aberto em PT | 1440x900 | — | — | shot-09-admin-1440-es-top.png; shot-11-pt-after-lang.png; shot-12-pt-calendar-es.png |
| Navegação por teclado (Tab a partir do topo; abertura de dropdown por Enter) | 1440x900 | — | — | sequência `press Tab` + `activeElement` registrada nos passos 6.x desta run |

## Technical signals
Console: 3 mensagens no total, 0 erros e 0 warnings após a limpeza pós-login (reload em 07:05:46Z). A única entrada de nível `info` é o aviso do React DevTools do Vite dev server.
Network: `GET /api/dashboard/metricas?period_start&period_end` → 200, uma requisição por carga de tela e uma por janela nova (#941 com `period_start=2026-02-22` ao escolher "Last 6 months"). Troca de métrica de ranking não emite requisição — as 4 grandezas vêm no mesmo payload. Nenhum 4xx/5xx na jornada; o `GET /api/me` 401 é anterior ao login e foi descartado com a limpeza.
Performance: não medida. Nenhuma alegação de desempenho é feita neste relatório.
Untested states: `loading` isolado (não capturado como quadro próprio — a carga local resolve em menos de um ciclo de captura); `error`/`failedWithoutData` (exige falha de rede ou mock, proibido); `unauthorized` (exige papel sem módulo legível); vazio de pendências/alertas/agenda/rankings/compliance (exigiria banco sem dado); 422 de janela invertida e o `InlineLoadState` do `PeriodFilter` (exigiria digitar datas no filtro); view `ready-redator` (exige login de outro papel — uma view por run); estados `disabled`/`read-only` não existem nesta superfície.

## Findings
### UI-01 — o tooltip dos rankings imprime a chave técnica `value` como nome da série
Classification: C
Surface/journey: Dashboard admin, seção "Period analysis", cards "Most requested courses" e "Most active clients".
Viewport: 1440x900
Reproduction: rolar até a seção de análise; posicionar o ponteiro sobre qualquer barra (ex.: 1100,630 sobre "Subestación Norte S.A."); ler o tooltip.
Evidence: shot-16-bar-tooltip-value.png; shot-04-admin-1440-after-mousemove.png; leitura textual do DOM: `"Subestación Norte S.A.\n\nvalue : 2"` (`.recharts-tooltip-wrapper`).
Observed fact: o tooltip mostra `value : 2`. O termo `value` aparece com a interface em inglês, em espanhol e em português — é o `dataKey` do `<Bar>`, não um rótulo traduzido.
Inference: `AppBarChart` (`frontend/src/shared/ui/AppBarChart/AppBarChart.tsx:57`) declara `<Bar dataKey="value" …>` sem a prop `name`; o Recharts cai no `dataKey` para nomear a série no tooltip. O irmão de linha não tem o defeito porque `AppLineChart` passa `name={serie.label}` (`AppLineChart.tsx:97`).
Impact: numa tela de peso operacional o usuário lê o nome interno de um campo do gráfico em vez da métrica que está vendo; é o mesmo tipo de vazamento que a UI-04 da revisão de 2026-08-17 fechou no eixo X do gráfico de linha, agora no tooltip do gráfico de barra.
Recommendation: dar nome à série no wrapper — adicionar uma prop obrigatória (ex.: `valueLabel: string`) a `AppBarChartProps` e repassá-la como `name` ao `<Bar>`; em `RankingsPanel` o valor natural é `t('dashboard.rankings.metric.' + metrica)`, que já existe e é o mesmo rótulo do seletor. Corrigir no wrapper alcança todo consumidor futuro; não corrigir no call-site.
Rule/reference: `.claude/rules/frontend-fsliced.md` (i18n com chaves idênticas nos 3 locales; wrapper `shared/ui` é o dono da customização); rubrica eixo 8 (idioma inesperado renderizado).

### UI-02 — o filtro de datas fala espanhol e usa outro formato de data que o resto da mesma tela
Classification: C
Surface/journey: Dashboard admin, "Period analysis" → preset "Custom" (dois campos de data + calendário).
Viewport: 1440x900 (reproduz em 1024x768 e 390x844)
Reproduction: com a interface em inglês (ou português), escolher "Custom" no seletor de janela; comparar a data dos campos com a data das linhas de pendência/alerta; clicar no ícone de calendário e ler cabeçalho, dias da semana e o nome acessível do botão.
Evidence: shot-03-admin-1440-period-custom.png (campos `22/08/2025` e `22/08/2026` na mesma tela em que as pendências mostram `7/6/2026`, `8/10/2026`); shot-12-pt-calendar-es.png (interface em português, calendário com "agosto" e cabeçalhos `L M X J V S D`); snapshot de acessibilidade em português com `button "Elegir fecha"`.
Observed fact: os campos do filtro renderizam `dd/mm/yyyy` e o overlay do calendário renderiza em espanhol, independentemente do idioma ativo; o restante da tela formata data pelo idioma ativo (`8/22/2026` em EN, `22-08-2026` em ES, `22/08/2026` em PT).
Inference: `frontend/src/shared/ui/AppDatePicker/AppDatePicker.tsx:64-65` fixa `dateFormat="dd/mm/yy"` e `locale="es"`; `registerPrimeLocales` (`frontend/src/shared/config/primeLocale.ts:12`) registra apenas o locale `es` do PrimeReact. O formatador do projeto (`shared/lib/datetime.ts:11`) resolve o locale pelo idioma ativo e o próprio docblock registra que fixar locale já causou "a tela em pt-BR ou en exibir mês em espanhol".
Impact: duas gramáticas de data convivem na mesma tela e no mesmo controle de leitura — `22/08/2025` pode ser lido como 8 de fevereiro por quem acabou de ler `7/6/2026` acima. Em módulo com peso legal, data ambígua é o pior tipo de ambiguidade. Vale para todo `AppDatePicker` da aplicação, não só para este filtro.
Recommendation: derivar `dateFormat` e `locale` do idioma ativo dentro do wrapper (mapa `pt-BR|es-CL|en` → formato + chave de locale Prime) e registrar os três locales em `primeLocale.ts`, mantendo o `es` atual como default. A conversão ISO in/out do wrapper não muda.
Rule/reference: `frontend/src/shared/lib/datetime.ts:3-13` (locale = idioma ativo, política já escrita); `.claude/rules/frontend-fsliced.md` (i18n, wrappers `shared/ui`); rubrica eixo 8.

### UI-03 — o valor anunciado dos dropdowns fica no idioma anterior depois de trocar de idioma
Classification: B
Surface/journey: Dashboard admin, seletor de métrica de ranking e seletor de janela.
Viewport: 1440x900
Reproduction: com a interface em inglês, escolher "Certificates" no seletor de métrica; trocar o idioma para PT no cabeçalho; ler a árvore de acessibilidade do mesmo controle.
Evidence: snapshot em português — `textbox "Métrica": Certificates` e `generic: Certificados` no mesmo nó (`find "Certificados"`); shot-11-pt-after-lang.png mostra a tela pintada em português.
Observed fact: depois da troca de idioma, o texto pintado é o do novo idioma ("Certificados", "Últimos 12 meses") mas o valor exposto no `input` acessível continua o do idioma anterior ("Certificates", "Last 12 months"). O `aria-label` do controle ("Métrica") acompanha a troca; o valor não.
Inference: o `<input>` oculto que o Dropdown do PrimeReact mantém para leitores de tela recebe o rótulo apenas na mudança de valor, não na mudança das opções — mesma família da falha de célula memoizada do BD-17/BD-12 (`D-55`), em que a troca de idioma repintava o cabeçalho e congelava o conteúdo.
Impact: quem navega por leitor de tela ouve a seleção no idioma que abandonou. Não bloqueia a jornada — o texto visível está correto —, mas contradiz a tela para o usuário que depende do nome acessível.
Recommendation: confirmar o mecanismo no `dropdown.cjs.js` antes de escolher a correção; a saída mais barata compatível com o repositório é remontar o controle quando `i18n.language` mudar (chave no `AppDropdown`), o que aqui não custa estado — a página não guarda ordenação/página/filtro no dropdown, ao contrário da tabela que recusou o rekey no BD-17. Medir antes de generalizar para os 14 sítios de `AppDropdown`.
Rule/reference: `.claude/rules/frontend-fsliced.md` (nota do D-55 sobre troca de idioma e memoização); rubrica eixo 6 (nome acessível coerente).

### UI-04 — em 390px os rankings viram rótulo com barra sobrando e eixo ilegível
Classification: B
Surface/journey: Dashboard admin, cards "Most requested courses" e "Most active clients".
Viewport: 390x844
Reproduction: em 390x844, rolar até a seção de análise e observar a faixa de categoria e os ticks do eixo X.
Evidence: shot-07-admin-390-s5.png (rótulos ocupam ~160px dos ~300px úteis; ticks `0 130 260` e `0 170 340` colados uns nos outros).
Observed fact: o eixo de categoria tem largura fixa e consome cerca de metade da largura útil; a área de barra fica com ~60–100px e os rótulos numéricos do eixo X se tocam.
Inference: `AppBarChart` fixa `<YAxis type="category" width={160}>` (`AppBarChart.tsx:41`), valor dimensionado para 1440/1024 e não reduzido em telas estreitas.
Impact: a comparação que o ranking existe para permitir fica prejudicada no telefone — as barras curtas quase não se distinguem entre si e a régua numérica não é legível.
Recommendation: tornar a largura do eixo de categoria proporcional/responsiva no wrapper (prop com default 160 e valor menor abaixo de `sm`, ou medição por container) e reduzir a densidade de ticks do eixo X nessa faixa. A decisão é do wrapper, não do `RankingsPanel`.
Rule/reference: rubrica eixo 4 (responsividade); `.claude/rules/frontend-fsliced.md` (customização de gráfico mora em `shared/ui`).

### UI-05 — os cards de ranking não dizem qual métrica estão mostrando
Classification: B
Surface/journey: Dashboard admin, seletor de métrica + os dois cards de ranking.
Viewport: 1440x900 (igual nas três)
Reproduction: trocar a métrica de "Classes" para "Approved UF" e comparar os títulos dos cards e os eixos antes e depois.
Evidence: shot-14-period-6m.png (eixo 0–4, métrica "Classes") e shot-05-admin-1440-metric-uf.png (eixo 0–340, métrica "Approved UF"); em ambos os títulos permanecem "Most requested courses" e "Most active clients".
Observed fact: os números do eixo mudam de ordem de grandeza e de unidade, e nada no card registra a mudança — a única indicação é o dropdown acima, que fica fora do campo de visão assim que a página rola.
Inference: `RankingsPanel` passa apenas o título fixo ao `AppCardHeader` (`RankingsPanel.tsx:113-114`) e a unidade só entra no `formatValue` do eixo, quando a métrica é UF.
Impact: um print, um scroll ou uma volta à tela deixam o leitor sem saber se "8" são turmas, matrículas, certificados ou UF — e UF tem leitura contratual.
Recommendation: compor a métrica no cabeçalho do card (por exemplo `t('dashboard.rankings.courses')` + rótulo da métrica como subtítulo/sufixo) ou rotular o eixo X com a unidade. Manter o seletor onde está.
Rule/reference: rubrica eixos 1 e 2 (o controle comunica sua função; o dado comunica o que é).

### UI-06 — a descrição que decide a ação é truncada e, no telefone, não há como recuperá-la
Classification: B
Surface/journey: Dashboard admin, listas "Pending" e "Alerts".
Viewport: 390x844 (também trunca em 1024x768 e na faixa 1024–1279 do desktop)
Reproduction: em 390x844, rolar até a lista de pendências e ler as linhas de "Incomplete documentation".
Evidence: shot-07-admin-390-s1.png (`Documentación obligatoria incompleta…`); shot-01-admin-1440-full.png (mesma linha truncada em `EVALUACION_…` em 1440); shot-06-admin-1024-top.png.
Observed fact: título e descrição são truncados em uma linha cada (`truncate`); o texto completo existe só no atributo `title`, que depende de hover.
Inference: `DashboardItemRow` aplica `block truncate` às duas linhas e confia no `title` para a recuperação (`DashboardItemRow.tsx:57-64`) — solução válida em desktop, inexistente em toque.
Impact: exatamente a parte que diz QUAL documento falta some no telefone; a linha continua clicável, mas a triagem que a lista promete ("o que faço agora") passa a exigir abrir cada item.
Recommendation: permitir duas linhas na descrição abaixo de `sm` (`line-clamp-2`) ou trocar o truncamento do detalhe por quebra em telas estreitas, mantendo o `truncate` do título. É mudança de uma classe no mesmo componente, sem alterar a estrutura.
Rule/reference: rubrica eixos 3 e 4; `.claude/rules/frontend-fsliced.md` (Tailwind para layout).

### UI-07 — a lista de documentos faltantes imprime o código do enum, e o projeto já tem os rótulos traduzidos
Classification: B
Surface/journey: Dashboard admin, tabela "Class document compliance", coluna "Missing documents" (e, por vir do backend, também nas descrições das pendências).
Viewport: 1440x900
Reproduction: rolar até "Compliance and workload" e ler a coluna de documentos faltantes.
Evidence: shot-01-admin-1440-scroll3.png (`EVALUACION_REDATOR`, `PRUEBAS, EVALUACION_REDATOR`, `MANUAL, PRUEBAS, EVALUACION_REDATOR`); snap-01-admin-1440.txt (mesmas células).
Observed fact: os tipos aparecem como constantes em caixa alta com sublinhado, em qualquer idioma.
Inference: `CompliancePanel` faz `r.missing_types.join(', ')` (`admin/CompliancePanel.tsx:70`), sem passar pelo dicionário. O repositório já traduz esses mesmos três códigos em `operation.documents.type.*` (`shared/config/locales/es-CL.json:779-783`), e as telas de documento de redator usam o padrão equivalente (`documentType.${type}`).
Impact: o operador lê identificador de banco onde o resto da tela fala a língua dele; o mesmo dado aparece traduzido no módulo de Operação e cru no Dashboard.
Recommendation: mapear `missing_types` por `t('operation.documents.type.' + tipo)` antes do `join`. Como a descrição da pendência vem pronta do backend (decisão D17), a correção aqui cobre a coluna; a frase do backend segue como está.
Rule/reference: `.claude/rules/frontend-fsliced.md` (i18n com as mesmas chaves nos 3 locales); rubrica eixo 8.

### UI-08 — o card de alertas estica com a lista de pendências e deixa um vazio grande em 1440
Classification: B
Surface/journey: Dashboard admin, seção "Needs action".
Viewport: 1440x900
Reproduction: carregar a tela com 8 pendências e 3 alertas e comparar as duas colunas.
Evidence: shot-01-admin-1440-full.png e shot-01-admin-1440-scroll1.png (o card de alertas termina no terceiro item e a moldura branca segue ~340px vazia até a altura do card vizinho).
Observed fact: as duas colunas da grade têm a mesma altura; a coluna com menos itens fica com área branca proporcional à diferença.
Inference: a grade `xl:grid-cols-2` (`admin/AdminView.tsx:78`) estica os itens por padrão (`items-stretch`), e os cards não têm conteúdo para preencher.
Impact: leitura menos densa no primeiro dobra — a seção de contexto é empurrada para baixo por espaço que não carrega informação. Não impede nenhuma ação.
Recommendation: `items-start` na grade da seção (ou `self-start` no card de alertas), preservando o empilhamento abaixo de `xl`. Verificar antes se o vazio não estava servindo de reserva visual para listas maiores — nesse caso, manter e registrar a intenção.
Rule/reference: rubrica eixo 3 (densidade e ritmo).

## Summary
A: (1) a discriminação de estados de `useDashboard` chega à tela com uma gramática por caso — `loading` com esqueleto, erro só quando não há dado em mão, "sem acesso" distinto de "vazio" — e a jornada observada bateu com o `kind` esperado em todas as trocas de janela; (2) hierarquia legível nos três viewports: `h1` de boas-vindas, faixas `h2` de seção e cabeçalhos de card, com a fileira de KPIs reflowando 6→3→1 sem órfão; (3) o funil desenha proporção correta ao maior valor (2/3 medido em 66,5% do trilho) e o zero não ganha preenchimento; (4) foco de teclado visível (outline 2px sólido) em skip link, navegação e controles, com dropdown abrindo por Enter; (5) as duas tabelas rolam dentro do próprio card (`overflow-x-auto`) sem vazar a página em nenhum viewport; (6) console limpo e uma requisição por carga, com a troca de métrica resolvida no cliente.
B: UI-03, UI-04, UI-05, UI-06, UI-07, UI-08
C: UI-01, UI-02
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

Branch `refactor/frontend-revisao-ui`. Cada item foi RE-MEDIDO no navegador depois da correção,
com o dev server da própria worktree em `localhost:5174` (o `5173` serve o main tree — as duas
árvores compartilham backend, `SANCTUM_STATEFUL_DOMAINS` e `FRONTEND_URL` já listam as duas portas).
Suíte: `pnpm lint` limpo, `pnpm build` verde, `pnpm test` 481/481.

### 3.1 A lente `frontend-design`

A skill `frontend-design:frontend-design` foi passada sobre a mesma superfície DEPOIS do relatório.
Ela pede identidade visual própria — paleta, par tipográfico e um elemento-assinatura escolhidos
para o brief. Aqui ela não manda: a tela já tem tema em runtime com cor por variável CSS (ADR-16),
par tipográfico decidido (display próprio + corpo), régua de contraste medida em
`frontend/tests/chart-tokens.test.ts` e três revisões documentadas. **A rule do projeto ganha, e o
conflito fica registrado**, como o wrapper de `/lotus-ui-review` determina.

O que a lente entregou de aproveitável, e onde foi parar:

| Leitura da lente | Destino |
|---|---|
| "O rótulo do dado não pode ser o nome do campo" | UI-01 e UI-07 — as duas eram identificador interno vazando para a tela |
| "Uma grandeza que muda tem de se anunciar onde é lida" | UI-05 — a métrica desceu do seletor para o cabeçalho do card |
| "Espaço vazio é peso, não respiro, quando não carrega informação" | UI-08 |
| "Vazio e erro são momentos de direção" | nada a fazer: `useDashboard` já discrimina os estados e o `InlineLoadState` já mora junto do controle que causou a falha |

Recusado, com motivo:

- **Rótulo visível nos dois seletores da seção de análise.** A lente pediu que o controle
  anunciasse sua função na pintura, não só no nome acessível. O seletor de métrica e o de janela
  são irmãos na mesma seção e nenhum dos dois tem rótulo visível — rotular um só quebraria a
  simetria, e rotular os dois muda o layout de um bloco que a revisão não apontou. Com o
  qualificador no cabeçalho do card (UI-05), a informação que faltava já chega ao ponto onde é
  lida.
- **Valor impresso na ponta de cada barra (`LabelList`).** Tornaria o tooltip supérfluo e ajudaria
  no telefone, mas soma um segundo canal numérico ao lado de um eixo que já ficou legível, e o
  número longo de UF (`1.234,5678`) transborda a área de plotagem em 390px.
- **Qualquer mexida em paleta, tipografia ou forma dos cards.** Território do ADR-16 e da catraca
  de contraste; a revisão não achou defeito ali.

### 3.2 As correções, com a medida

| Achado | Correção | Prova depois |
|---|---|---|
| UI-01 (C) | `AppBarChart` ganha `valueLabel` obrigatória e a repassa como `name` do `<Bar>`; `RankingsPanel` passa o mesmo rótulo do seletor | tooltip lê `Trabajos en líneas energizadas 220kV / Clases : 2` (era `value : 2`) |
| UI-02 (C) | `AppDatePicker` deriva `dateFormat` e `locale` do idioma ativo (mapa `es-CL`/`pt-BR`/`en`); `registerPrimeLocales` passa a registrar também o `pt` — o `en` é o embutido do Prime | campos: `8/22/2025` em EN, `22/08/2025` em PT, `22-08-2025` em ES; calendário: `August/Su Mo Tu`, `agosto/D S T Q Q S S`, `agosto/L M X J V S D`; botão: `Choose Date`, `Escolher data`, `Elegir fecha` |
| UI-03 (B) | `AppDropdown` remonta com `key={i18n.language}` | com a tela em PT: `textbox "Métrica": Turmas` (era `Certificates`) |
| UI-04 (B) | faixa de categoria e densidade de ticks caem abaixo de `sm` (160→96px, 5→3 ticks), via `useIsNarrowViewport` | em 390x844 o eixo lê `0 1 2` sem colisão e a barra recupera ~64px de curso |
| UI-05 (B) | `AppCardHeader` ganha `subtitle`; `RankingsPanel` põe ali o rótulo da métrica (e o compõe no `ariaLabel` do gráfico) | cabeçalho lê `Cursos más demandados 4 Clases`; em 390px o qualificador desce de linha em vez de truncar |
| UI-06 (B) | descrição em `line-clamp-2` abaixo de `sm`, `truncate` de `sm` para cima | em 390px a linha lê `Documentación obligatoria incompleta: EVALUACION_REDATOR.` inteira |
| UI-07 (B) | `missing_types` passa por `t('operation.documents.type.*')` antes do `join` | coluna lê `Manual, Pruebas / evaluaciones, Evaluación del redactor` |
| UI-08 (B) | `items-start` na grade de "o que faço agora" | os dois cards medem 538px e 233px (mediam 538 e 538) |

Regressões verificadas junto: `docOverflow` e `mainOverflow` falsos em 1024x768; console com 0 erros
e 0 warnings; tema escuro repintando os dois rankings e o qualificador novo.

### 3.3 Resíduo — o que a correção NÃO cobre

1. **A descrição da pendência continua imprimindo o código do enum** (`Documentación obligatoria
   incompleta: EVALUACION_REDATOR.`). A frase vem pronta do backend (D17) e o UI-07 só alcança a
   coluna montada no cliente. Corrigir exige decidir quem traduz a frase — e a decisão D17 diz que é
   o backend. Fica para o bloco que tocar o assembler.
2. **Dezesseis testes mockam `react-i18next` devolvendo só `t`.** Um deles renderiza `AppDropdown` e
   quebrou com o `key` novo (`Cannot read properties of undefined (reading 'language')`); foi
   corrigido no lugar. Os outros quinze quebram do mesmo jeito no dia em que renderizarem um
   dropdown — o mock é que não tem a forma da API real.
3. **A view `ready-redator` não foi revista nem corrigida.** Ela consome `AppCardHeader`,
   `AppDropdown` e `DashboardItemRow`, então herda as correções, mas nenhuma foi medida ali.

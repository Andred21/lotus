# Revisão de UI — Dashboard, views admin e Redator (`/`)

**Data:** 2026-08-17 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/app/pages/Dashboard/` nos dois papéis · **Base:** `feat/dashboard-frontend-analitico-e-redator` @ `70e0129`
**Passe de correção:** commit `a71e11d`, na mesma branch

> Este arquivo não é registro fora de bloco: a revisão é o **Step 9 da Task 11** do plano do B2,
> reservado ao João por `disable-model-invocation: true`, e o bloco não fecha sem ela. O relatório
> da §2 é o artefato bruto da skill, verbatim; a §3 é o que foi feito com ele, e não faz parte do
> relatório.

## 1. Por que esta revisão é obrigatória neste bloco

O corpo de UI review da EAP 8.4.0 exige validar **separadamente perfil administrativo e Redator** e,
para o Redator, "ownership visual, ausência de dados comerciais/terceiros". **O B1 não podia
satisfazer isso** — a view do Redator não existia. O aceite da 8.4.0 só fecha inteiro aqui, e é por
isso que o plano reservou um step só para ele.

A revisão percorreu as duas sessões de verdade, não uma simulação: o João ativou um redator
(`juan.morales@lotus.cl`) para a jornada, o que a limitação 1 da spec §9 declarava impossível com o
usuário criado pelo fluxo normal (`is_active=false`).

## 2. Relatório da skill — verbatim

Evidência (32 capturas + snapshots) em
`.artifacts/ui-review/2026-08-17T15-33-dashboard-analitico-redator/`, coberta por
`.gitignore:24-25`. O relatório abaixo é o `report.txt` daquela pasta.

```
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Dashboard (`/`) — jornada read-only nos dois perfis: sessão admin (view `admin`, com as 4 seções analíticas do bloco B2) e sessão redator (view `redator`, as 5 seções). Uma tela, dois papéis, como o aceite da EAP 8.4.0 exige.
Local URL: http://localhost:5173/ (API http://localhost:8080)
Branch/commit: feat/dashboard-frontend-analitico-e-redator @ 70e0129
Date/time: 2026-08-17 15:33 → 15:59 -03:00
Agent: Claude (Claude Code), skill `lotus-ui-review`
Playwright CLI: playwright-cli 0.1.18, sessão `lotus-b2-ui`, `--browser=chromium` (o default `chrome` não existe no host: "Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome")
Chrome DevTools: complementary_unavailable
Git working tree before/after: idêntico — antes ` M backend/config/cors.php` @ 70e0129; depois ` M backend/config/cors.php` @ 70e0129. Zero arquivo novo rastreado, zero arquivo alterado pela revisão.

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Login manual + troca de locale para `es-CL` | 1440x900 | — | — | requisições 407/408 (`/sanctum/csrf-cookie` 204, `/api/login` 200) |
| Admin — carga inicial, 9 seções | 1440x900 | 1024x768 | 390x844 | admin-1440-y0.png, admin-1024-y0.png, admin-390-y1700.png |
| Admin — seção "Análisis del período" (séries) | 1440x900 | 1024x768 | 390x844 | admin-1440-series.png, admin-1024-y1700.png, admin-390-y2100.png |
| Admin — troca de métrica dos rankings (Clases → UF aprobada) | 1440x900 | 1024x768 | 390x844 | admin-1440-rankings-uf.png, admin-1024-y2500.png, admin-390-y3400.png |
| Admin — preset "Personalizado" + janela invertida (422) e "Reintentar" | 1440x900 | — | — | admin-1440-periodo-personalizado.png, admin-1440-janela-invertida.png, admin-1440-erro-inline.png, requisições 819 e 820 |
| Admin — recuperação por preset ("Últimos 6 meses") | 1440x900 | — | — | requisição 821 (200) |
| Admin — tema escuro nas 4 seções analíticas | 1440x900 | — | — | admin-1440-escuro-series.png |
| Admin — teclado no gráfico de séries (Tab + ArrowRight) | 1440x900 | — | — | admin-1440-foco-periodo.png, admin-1440-foco-grafico.png, admin-1440-tooltip-ago.png |
| Admin — tabelas de cumplimiento e carga | — | 1024x768 | 390x844 | admin-1024-tabelas.png, admin-390-tabela.png, admin-390-tabela-scroll.png |
| Redator — logout, login, 5 seções | 1440x900 | 1024x768 | 390x844 | redator-1440-y0.png, redator-1024-y0.png, redator-390-y0.png |
| Redator — "Requiere mi acción" e agenda | 1440x900 | 1024x768 | 390x844 | redator-1440-y400.png, redator-1024-y600.png, redator-390-y700.png |
| Redator — teclado no CTA "Ir a Mi Perfil" | 1440x900 | — | 390x844 | redator-390-cta-cortado.png |

## Technical signals
Console: 6 mensagens no total da sessão; 3 erros, 0 warnings. Os 3 erros são todos provocados pela própria revisão e esperados — dois `422 Unprocessable Content` em `/api/dashboard/metricas?period_start=2025-08-17&period_end=2024-08-17` (a janela invertida do passo de erro, mais o clique em "Reintentar") e um `401 Unauthorized` em `/api/me` logo após o logout deliberado. A leitura foi zerada depois do login do admin: entre o login e o primeiro passo da jornada o console ficou em 0 erros / 0 warnings. Nenhum warning de React, de key, de prop ou de Recharts.
Network: a jornada inteira do admin gasta 4 chamadas a `/api/dashboard/metricas` — 1 na carga, 1 no `Personalizado` com janela invertida, 1 no "Reintentar" e 1 na volta ao preset de 6 meses. Trocar o preset dispara exatamente **uma** requisição; não há tempestade de refetch nem chamada duplicada por render. Trocar a métrica dos rankings (Clases → UF aprobada) **não** dispara requisição nenhuma: a re-agregação é do cliente, sobre o payload que já estava em mão. O Redator, que não tem seletor de janela, ainda assim manda `period_start`/`period_end` na única chamada dele (`833`) — inofensivo, porque o backend ignora a janela nas 6 chaves do redator, mas fica registrado.
Performance: nenhuma medição de performance foi tomada. Isso é limitação da revisão, não afirmação sobre a tela.
Untested states: (a) **skeleton de carga** — a resposta local volta rápido demais para capturá-lo e a skill proíbe fabricar latência; (b) **`unauthorized`** (admin sem nenhum módulo legível, a tela de cadeado) — exige um papel sem permissão, o que é mutação de RBAC; (c) **admin parcialmente gateado** (`rankings`, `redatores` e `series.uf_aprovada` nulos) — mesmo motivo; foi provado fora do navegador, na Task 11 do plano, com papel-sonda criado e removido por API; (d) **`error` cobrindo a tela inteira** (falha sem nenhum dado em mão) — exige derrubar a API ou interceptar rota, ambos proibidos; (e) **aviso `InlineLoadState` da view do Redator** (falha com dado em mão) — mesmo motivo; (f) **empty state dos rankings** com o gate comercial fechado — o superadmin tem a permissão, então a métrica UF traz dados de verdade. Um artefato de biblioteca fica registrado sem virar achado: o Recharts deixa um `<span id="recharts_measurement_span">` fora do `#root`, a −20000px, sem `aria-hidden`, e o snapshot de acessibilidade o expõe como um texto solto ("65", "Subestación Norte S.A." conforme a última medida) — é interno do Recharts, não do código do bloco.

## Findings
### UI-01 — "Evolución mensual" desenha uma série de quatro e a escala do eixo é ditada justamente pela que não aparece
Classification: C
Surface/journey: Dashboard admin, seção "Análisis del período", card "Evolución mensual"
Viewport: 1440x900 (reproduzido igual em 1024x768 e 390x844)
Reproduction: entrar como admin em `/`, rolar até "Análisis del período" com qualquer preset (medido em "Últimos 12 meses" e "Últimos 6 meses"), ler o card "Evolución mensual". Depois dar Tab até o gráfico e pressionar ArrowRight duas vezes para pousar em ago 2026.
Evidence: admin-1440-series.png (estado de repouso), admin-1440-tooltip-ago.png e admin-1024-y1700.png (tooltip aberto), leitura direta do SVG e do payload.
Observed fact: o payload de `/api/dashboard/metricas` traz, para ago 2026, `matriculas: 55`, `certificados_emitidos: 4`, `turmas_concluidas: 2` e `turmas_iniciadas: 1`; jun e jul só têm `turmas_iniciadas`. No SVG em repouso existem quatro `path.recharts-line-curve` e três deles são degenerados: `M526,207.405Z`, `M526,25.19Z` e `M526,200.529Z` — um `moveto` seguido de `closepath`, que não pinta pixel nenhum. Só `chart-1` tem traço real (`M52,210.843C131,…C368,203.967,447,207.405,526,210.843`). O gráfico não tem nenhum `circle` em repouso. O eixo Y vai a 60 porque o maior valor da série é 55, e esse 55 é exatamente o que não é desenhado. Com o teclado em ago 2026 o tooltip lista "Certificados emitidos : 4 / Clases concluidas : 2 / Clases iniciadas : 1 / Matrículas : 55", e os dots ativos aparecem nas posições corretas.
Inference: `AppLineChart.tsx:85-88` fixa `dot={false}` com `connectNulls={false}`. Série que tem UM mês dentro de um gráfico de vários meses não gera segmento (não há dois pontos consecutivos) e, sem dot, não gera marca alguma. O caso da direita escapa por acidente: "UF aprobada por mes" tem uma única categoria no eixo, e aí o Recharts desenha o ponto isolado mesmo com `dot={false}` — é por isso que aquele gráfico mostra o dado e este não.
Impact: a legenda promete quatro séries e o eixo é dimensionado por um valor que o leitor nunca vê. Quem olhar o card conclui que houve ~1 matrícula em agosto quando houve 55, e que nenhum certificado foi emitido quando foram 4. O dado só aparece a quem passar o mouse ou o teclado por cima do mês certo. Numa tela cujo propósito declarado é "como a operação evoluiu", é a leitura errada do número, não um incômodo estético.
Recommendation: parar de suprimir a marca do ponto no `AppLineChart` — por exemplo `dot={{ r: 2 }}` (ou `dot` condicional a ponto isolado, mantendo a linha limpa quando a série é contínua). A correção é de `shared/ui`, num arquivo só, e não muda call-site nenhum. Não aplicada: a skill reporta e espera.
Rule/reference: `frontend/src/shared/ui/AppLineChart/AppLineChart.tsx:85-88`; rubrica Eixo 5 ("estado mente") e Eixo 2 (condição C).

### UI-02 — em 390px o CTA "Ir a Mi Perfil" sai do card e da viewport, e não há rolagem que o alcance
Classification: C
Surface/journey: Dashboard redator, seção "Requiere mi acción", card "Documentación pendiente"
Viewport: 390x844
Reproduction: entrar como redator (`juan.morales@lotus.cl`) em `/`, redimensionar para 390x844, ler o cabeçalho do card "Documentación pendiente".
Evidence: redator-390-y0.png, redator-390-cta-cortado.png
Observed fact: medido no DOM, o card do cabeçalho vai de x=97 a x=373 e o botão vai de x=279 a **x=413**; o rótulo termina em x=392, com a viewport em 390. O texto renderiza "Ir a Mi Per" e o resto fica fora da tela. O `<main>` tem `overflow-x: auto`, mas `scrollWidth` e `clientWidth` são ambos 310 e `scrollLeft` fixa em 0 — não existe rolagem horizontal que traga o pedaço cortado. O `documentElement.scrollWidth` também é 390, então a página não ganha barra horizontal.
Inference: o cabeçalho é `flex items-center justify-between gap-3 px-4` com três filhos (título, contagem, ação) e nenhum deles encolhe; o título "Documentación pendiente" quebra em duas linhas e empurra a ação para fora. Nas outras duas viewports sobra espaço e o defeito não aparece.
Impact: o único caminho da tela do Redator para "Mi Perfil" — que é onde ele resolve a pendência documental que o card acabou de listar — aparece truncado no meio da palavra em telefone. A área visível continua clicável e o nome acessível está completo, então a ação não some; o que quebra é a leitura, e é no perfil que a tela mais espera ser lida.
Recommendation: deixar o cabeçalho quebrar em 390 (ex.: `flex-wrap` com a ação indo para a linha de baixo) ou permitir que o título encolha (`min-w-0` + `truncate`) em vez de empurrar a ação. Não aplicada.
Rule/reference: `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx:24-33` e o `AppCardHeader` que ele consome; rubrica Eixo 4 (condição C: controle cortado / overflow indevido).

### UI-03 — os dois seletores da seção analítica não partem da mesma margem
Classification: B
Surface/journey: Dashboard admin, seção "Análisis del período" — seletor de período e seletor de métrica dos rankings
Viewport: 1440x900
Reproduction: entrar como admin, rolar até "Análisis del período" e comparar a borda esquerda do dropdown "Últimos 12 meses" com a do dropdown "Clases", logo abaixo dos gráficos.
Evidence: admin-1440-series.png (os dois na mesma captura), medição de `getBoundingClientRect`
Observed fact: o dropdown de período começa em x=280 e o de métrica em x=296 — 16px de diferença. As `section` da página e todos os cards da seção começam em x=280.
Inference: o seletor de métrica está dentro de um contêiner que carrega o `px-4` do padrão de toolbar de card; o de período não. Um deles está na grade da página, o outro na grade do card.
Impact: dois controles irmãos, empilhados verticalmente na mesma seção, com origens diferentes. Não impede nada; cria um degrau visível a cada rolagem pela seção mais densa da tela.
Recommendation: escolher uma das duas margens e aplicar às duas — se o padrão da tela é o card, o de período recebe o mesmo recuo; se é a grade da página, o de métrica perde o `px-4`.
Rule/reference: rubrica Eixo 3 (condição B).

### UI-04 — o tooltip do gráfico mostra a chave crua do mês, o eixo mostra o mês formatado
Classification: B
Surface/journey: Dashboard admin, "Evolución mensual" e "UF aprobada por mes"
Viewport: 1440x900
Reproduction: Tab até o gráfico "Evolución mensual", ArrowRight até qualquer mês e ler o título do tooltip; comparar com o rótulo do mesmo mês no eixo X.
Evidence: admin-1440-foco-grafico.png, admin-1440-tooltip-ago.png; `document.querySelector('.recharts-tooltip-wrapper').textContent` devolve `"2026-08Certificados emitidos : 4…"`
Observed fact: o eixo X escreve "ago 2026"; o tooltip do mesmo ponto escreve "2026-08". Os valores dentro do tooltip, esses sim, passam pelo formatador.
Inference: `AppLineChart.tsx:62-75` passa `formatter` ao `Tooltip` (que formata o valor) mas não `labelFormatter` (que formataria o rótulo); o `formatX` só chega ao `XAxis`.
Impact: a mesma informação aparece em dois formatos na mesma interação, e o formato do tooltip é o do banco, não o do idioma da tela.
Recommendation: passar `labelFormatter={formatX}` ao `Tooltip` do `AppLineChart`, para o rótulo seguir a mesma função que o eixo já usa.
Rule/reference: `frontend/src/shared/ui/AppLineChart/AppLineChart.tsx:62-75`; rubrica Eixo 8 (condição B).

### UI-05 — "Reintentar" repete uma requisição que não pode dar certo
Classification: B
Surface/journey: Dashboard admin, "Análisis del período", preset "Personalizado" com janela invertida
Viewport: 1440x900
Reproduction: escolher "Personalizado", pôr "Hasta" = 17/08/2024 com "Desde" = 17/08/2025, ler a mensagem, clicar em "Reintentar".
Evidence: admin-1440-erro-inline.png; requisições 819 e 820, ambas `GET /api/dashboard/metricas?period_start=2025-08-17&period_end=2024-08-17 => [422]`
Observed fact: a tela mostra, ao lado dos controles, "La fecha de término no puede ser anterior a la de inicio." e mantém os gráficos anteriores. O botão "Reintentar" fica na mesma linha da mensagem, mas na ponta oposta: mensagem em x=280, botão em x≈1355 numa viewport de 1440. Clicado, ele reemite a **mesma** URL e recebe o mesmo 422.
Inference: o aviso ao lado do dado (padrão BD-6) foi feito para falha de transporte, onde repetir resolve. Numa recusa de validação, a recuperação é corrigir a data, e é o que a mensagem já diz — o controle oferecido é o único que não leva a lugar nenhum.
Impact: quem clicar no que parece a ação de recuperação recebe o mesmo erro sem nenhuma informação nova. A distância de ~1075px entre a mensagem e o botão ainda separa o problema da (falsa) solução.
Recommendation: no 422 de validação, omitir o "Reintentar" (a mensagem basta e a correção está nos dois campos ao lado) ou aproximá-lo da mensagem e trocá-lo por um atalho que devolva o preset anterior. Manter o "Reintentar" para as falhas em que repetir de fato resolve.
Rule/reference: rubrica Eixo 1 (condição B — o controle não conclui a recuperação que anuncia).

### UI-06 — a faixa de KPIs do Redator herda a grade de 6 colunas do admin
Classification: B
Surface/journey: Dashboard redator, seção "Mi situación"
Viewport: 1440x900 e 1024x768
Reproduction: entrar como redator e ler a faixa de 4 cards logo abaixo do título; repetir em 1024x768.
Evidence: redator-1440-y0.png, redator-1024-y0.png; medição de `getBoundingClientRect` na grade
Observed fact: a grade é `grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` e recebe 4 itens. Em 1440 os cards ocupam de x=280 a x=1032 numa faixa de 1136 — sobram 384px (34%) vazios à direita. Em 1024 a linha vira 3 + 1, com o quarto card sozinho e duas colunas vazias ao lado. E os valores não se alinham: os números de "Clases en curso", "Próximas clases" e "Mis documentos por vencer" ficam em y=122, enquanto o de "Clases con documentación pendiente" — cujo rótulo ocupa três linhas — cai para y=138.
Inference: `KpiRow` foi dimensionado para os 6 KPIs do admin e é reusado com os 4 do Redator; o valor fica empilhado logo abaixo do rótulo, então o número desce junto quando o rótulo cresce.
Impact: a seção de abertura da tela do Redator abre desequilibrada, e a linha de números — que é o que se varre — tem um degrau. Nada fica ilegível.
Recommendation: fazer a grade acompanhar a quantidade de itens (ou fixar 4 colunas no caminho do Redator) e ancorar o valor na base do card, para os números partilharem a linha independentemente de quantas linhas o rótulo ocupe.
Rule/reference: `frontend/src/app/pages/Dashboard/KpiRow.tsx`; rubrica Eixo 3 (condição B).

### UI-07 — o vazio de "Alertas" fala de módulos ao Redator, que não tem módulos a ver
Classification: B
Surface/journey: Dashboard redator, seção "Requiere mi acción", card "Alertas"
Viewport: 1440x900
Reproduction: entrar como redator; o card "Alertas" chega com 0 itens e mostra o empty state.
Evidence: redator-1440-y0.png (texto legível na captura)
Observed fact: o card diz "Sin alertas" e, abaixo, "Nada vencido ni por vencer en los módulos que puedes ver."
Inference: o `AlertList` é reuso medido entre as duas views — `alertas_documentos` do Redator é o mesmo `AlertData[]` do admin — e a frase de apoio veio junto. No admin ela é verdadeira: o payload é filtrado por permissão de módulo e o vazio pode significar "não há" ou "você não vê". As 6 chaves do Redator não são anuláveis e o recorte dele é por posse das turmas, não por módulo.
Impact: a frase sugere ao Redator que existe alerta escondido atrás de uma permissão que ele não tem. Para ele, o vazio é vazio.
Recommendation: dar ao `AlertList` uma segunda mensagem de vazio (prop com a chave i18n), com o texto do admin preservado e um texto do Redator que fale de documentos dele, não de módulos.
Rule/reference: `frontend/src/app/pages/Dashboard/AlertList.tsx` e as chaves de vazio nas 3 locales; rubrica Eixo 8 (condição B).

### UI-08 — o CTA do card de pendências é um `<button>` dentro de um `<a>`
Classification: B
Surface/journey: Dashboard redator, card "Documentación pendiente", ação "Ir a Mi Perfil"
Viewport: 1440x900
Reproduction: focar o link do cabeçalho por teclado e pressionar Tab uma vez.
Evidence: snapshot de acessibilidade (`link [ref=f1e1271]` sem nome, contendo `button "Ir a Mi Perfil"`); `outerHTML` medido: `<a class="no-underline" href="/perfil" data-discover="true"><button aria-label="Ir a Mi Perfil" class="p-button …">`
Observed fact: o `<a href="/perfil">` embrulha um `<button>`. Os dois são focáveis: o primeiro Tab pousa no `A` (sem nome acessível — o nome está no botão), o segundo no `BUTTON`. Uma ação, dois pontos de parada, e o primeiro é um link anônimo.
Inference: `PendenciasList.tsx:30-32` usa `<Link to="/perfil"><AppButton …/></Link>` para ganhar a navegação do router com a aparência de botão. Conteúdo interativo dentro de `<a>` é aninhamento inválido, e o resultado é o que a árvore de acessibilidade mostra.
Impact: quem navega por teclado passa por uma parada morta antes do controle real; quem usa leitor de tela ouve "link" sem nome e depois o botão. O clique de mouse funciona normalmente.
Recommendation: um controle só — ou `<Link>` estilizado como botão (o `AppButton` com `asChild`/`as`, ou uma classe de link-botão em `shared/ui`), ou `AppButton` com `onClick={() => navigate('/perfil')}`. Este é o único sítio do Dashboard com o padrão; o `PipelineFunnel` não o usa.
Rule/reference: `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx:30-32`; rubrica Eixo 6 (condição B).

### UI-09 — os dois campos de data expõem um nome acessível em inglês numa tela `es-CL`
Classification: B
Surface/journey: Dashboard admin, "Análisis del período", preset "Personalizado" (campos "Desde" e "Hasta")
Viewport: 1440x900
Reproduction: escolher "Personalizado" e capturar o snapshot de acessibilidade dos dois campos de data.
Evidence: snapshot com `button "Choose Date" [ref=f1e793]` e `button "Choose Date" [ref=f1e798]`, ao lado de `combobox "Desde"` e `combobox "Hasta"`, com a tela inteira em espanhol; admin-1440-periodo-personalizado.png
Observed fact: o botão de calendário de cada campo tem nome acessível "Choose Date". Todo o resto do widget está traduzido — o painel aberto mostra "agosto 2024" e "L M X J V S D".
Inference: `frontend/src/shared/config/primeLocale.ts` registra a locale `es` com `dayNames`, `dayNamesShort`, `dayNamesMin`, `monthNames`, `monthNamesShort`, `today` e `clear` — sete chaves. `chooseDate` não está lá, então o PrimeReact cai no default em inglês. O mecanismo é compartilhado: vale para qualquer `Calendar` da aplicação, e a seção deste bloco é onde ele aparece nesta tela.
Impact: nada muda visualmente; um leitor de tela em espanhol anuncia o controle em inglês. É o cliente chileno ouvindo a interface trocar de idioma no meio de um filtro.
Recommendation: acrescentar `chooseDate` (e as demais chaves de rótulo que o `Calendar` usa) ao `addLocale('es', …)` em `primeLocale.ts`.
Rule/reference: `frontend/src/shared/config/primeLocale.ts:6-14`; rubrica Eixo 8 / Eixo 6 (condição B).

### UI-10 — as duas tabelas de "Cumplimiento y carga" rolam na horizontal sem dizer que rolam
Classification: B
Surface/journey: Dashboard admin, seção "Cumplimiento y carga" — "Cumplimiento documental de clases" e "Carga de relatores"
Viewport: 1024x768 e 390x844
Reproduction: em 1024x768, rolar até a tabela de cumplimiento e ler o cabeçalho da última coluna; repetir em 390x844 e arrastar a tabela para a esquerda.
Evidence: admin-1024-tabelas.png, admin-390-tabela.png, admin-390-tabela-scroll.png; medição: tabela 768px em contêiner de 718px (1024) e de 276px (390), `overflow-x: auto` nos dois casos
Observed fact: em 1024 a coluna "HABILITADA" aparece cortada no cabeçalho e a coluna "PERÍODO" quebra uma data só em quatro linhas ("06-07- / 2026 — / 31-07- / 2026"). Em 390 só duas colunas e meia cabem. O contêiner rola de fato — forçando `scrollLeft=500` as colunas restantes aparecem inteiras, com "HABILITADA" e os selos "Sí"/"No" legíveis —, mas em repouso não há barra, sombra, gradiente ou qualquer marca de que exista conteúdo à direita.
Inference: o recorte é intencional (`overflow-x: auto` no invólucro da tabela, que é o padrão compartilhado do `AppDataTable`, não algo introduzido só aqui); o que falta é a affordance. O corte no meio da data é efeito de comprimir a coluna antes de deixar rolar.
Impact: nas duas viewports menores a pessoa vê uma tabela aparentemente completa e perde "Documentos faltantes" e "Habilitada" — que são exatamente as colunas pelas quais a seção existe. O conteúdo é alcançável, mas por um gesto que a tela não sugere.
Recommendation: marcar a rolagem (sombra/gradiente na borda direita enquanto houver conteúdo, ou barra sempre visível) e impedir a quebra da data no meio (`whitespace-nowrap` na coluna de período), deixando o intervalo empurrar a rolagem em vez de se despedaçar. Como o invólucro é compartilhado, a decisão vale além desta tela e é do João.
Rule/reference: `frontend/src/shared/ui/AppDataTable/`; rubrica Eixo 4 (condição B — funciona, exige rolagem não sinalizada).

## Summary
A: as duas views entregam a jornada read-only inteira nas três viewports. O corte por papel se sustenta na tela: a sessão do Redator não mostra nome de cliente em nenhuma linha da agenda (a mesma turma que no admin aparece com "CGE" e "Subestación Norte S.A." aparece para ele só com curso e datas), não mostra UF, não mostra ranking, não mostra carga de relatores, e a barra lateral fica com Dashboard e Operación apenas. As 5 seções do contrato `redator` renderizam e batem com o payload; as 4 seções analíticas do admin renderizam nos dois temas — a troca para o escuro repinta traço, barra e legenda sem recarregar, que era o motivo declarado de escolher SVG. A janela de período alcança só séries e rankings: com os KPIs em 4/0/3/1/1(250 UF)/9 antes e depois da troca de preset, nada fora da seção analítica se mexeu. A janela invertida devolve 422 e a tela mantém os dados anteriores com o aviso ao lado, em vez de virar uma tela de erro. A troca de métrica dos rankings reescala os dois gráficos sem ir à rede. O gráfico de séries é operável por teclado, com foco visível e tooltip que acompanha as setas. Nenhuma chave i18n crua apareceu em nenhuma das telas percorridas. Nenhum warning de console em toda a jornada.
B: 8 (UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10)
C: 2 (UI-01, UI-02)
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção — commit `a71e11d`

O João leu o relatório e mandou resolver os dez para o bloco seguir à revisão de código. Cada
correção foi **provada no navegador** contra a API real, não inferida do código; a sessão de prova
rodou logada como `juan.morales@lotus.cl` para os itens do Redator, porque o João **ativou um
redator** para a revisão.

### 3.1 Os dez achados, medidos depois

| Achado | Antes | Depois |
|---|---|---|
| UI-01 | 3 de 4 curvas degeneradas (`M526,207.405Z`), zero `circle` em repouso | `dot={{ r: 2, fill: tinta }}`; dots `[3,1,1,1]`, todos `r=2` com `fill=var(--chart-N)` |
| UI-02 | botão de x=279 a x=413 numa viewport de 390 | `flex-wrap` no `AppCardHeader`; CTA de x=113 a x=247 dentro de card de 373px |
| UI-03 | período em x=280, métrica em x=296 | `AppCardToolbar` fora; os dois em x=280, w=224 |
| UI-04 | tooltip escrevia `2026-08` | `labelFormatter`; escreve "ago 2026", igual ao eixo |
| UI-05 | 422 oferecia "Reintentar", que reemitia a mesma URL | `onRetry` opcional + `podeRepetir`; 422 avisa com `botoes: 0` e mantém o dado, 5xx mantém o botão |
| UI-06 | 4 cards em grade de 6; valores em y=122 e y=138 | colunas por quantidade; 6 valores do admin em y=289, 4 do Redator em y=317, grade ocupando os 1136px |
| UI-07 | Redator lia "…en los módulos que puedes ver" | `emptyHint` obrigatório; "Ninguno de tus documentos está vencido ni por vencer." |
| UI-08 | `<a>` anônimo embrulhando `<button>`; dois pontos de parada | `useNavigate`; 1 focável, 0 âncoras, navega a `/perfil` |
| UI-09 | `button "Choose Date"` em tela `es-CL` | 10 chaves novas no `addLocale('es')`; `["Elegir fecha","Elegir fecha"]` |
| UI-10 | tabela de 768px em 718px sem marca de rolagem; data em 4 linhas | sombras de borda + `whitespace-nowrap`; `scrollW 877 / clientW 718`, datas em uma linha, sombra direita em repouso e esquerda no fim da rolagem |

### 3.2 Três mecanismos tiveram de ser trocados no meio, e por medição

1. **`mt-auto` no `KpiRow` é letra morta.** O `[&_p]:m-0` que o `AppCard` aplica na variante `stat`
   compila para `.classe p` (0,1,1) e vence `sm:mt-auto` (0,1,0), que casa por classe. Medido: com
   `mt-auto`, o degrau de 16px persistia (`valorTop` -962/-946). A âncora passou a ser
   `justify-between` numa coluna de dois filhos, com o afastamento vindo de `pt` — propriedade que
   aquela regra não toca.
2. **A sombra do UI-10 nasceu invisível.** As quatro camadas de fundo estavam no invólucro, mas o
   Lara pinta `.p-datatable .p-datatable-tbody > tr` em branco **opaco** por cima
   (`getComputedStyle(tr).backgroundColor === "rgb(255, 255, 255)"`). Contraparte obrigatória na
   `brand-theme.css`: linha do corpo transparente, empatando em especificidade (0,2,1) e vencendo
   por ordem de fonte, com a regra de hover do Lara (0,4,1) intacta.
3. **A barra de rolagem sempre visível foi tentada e descartada.** Com `scrollbar-width: thin` mais
   `::-webkit-scrollbar`, e depois só com `::-webkit-scrollbar`, `offsetHeight - clientHeight`
   ficou **0** nas duas tentativas. O CSS havia carregado (4 regras casando, `scrollbar-width`
   computado como `thin`): este Chromium força barra em overlay, que não ocupa layout. Daí a
   affordance por sombra, que não depende do modo de barra do agente.

### 3.3 Uma escolha de API que o relatório não pedia

O UI-07 recomendava "uma segunda mensagem de vazio (prop com a chave i18n)". `emptyHint` entrou
**obrigatória**, sem default: com default, um call-site futuro esquecido volta a herdar a frase do
admin em silêncio — que é exatamente o defeito. Sem default, ele não compila.

### 3.4 Gate

`pnpm build` verde (`index.js` 1.672,59 kB, gzip 464,97 kB), `pnpm lint` exit 0, `pnpm test`
**44 arquivos / 262 testes** — os 260 do DoD mais os 2 casos novos de `staleRetry` (422 sem botão,
500 com). A catraca da D11 segue estrita: nenhum literal `--chart-` novo fora de `brand-theme.css`
e `tokens.ts`. `backend/config/cors.php` (WIP do João) ficou fora do `git add`.

### 3.5 O que continua não provado

Os seis estados que a §"Untested states" do relatório lista seguem inalcançáveis pelo navegador sem
mutação ou interceptação de rota. O gate `null` do admin continua provado fora do navegador, na
Task 11 do plano, com papel-sonda criado e removido por API.

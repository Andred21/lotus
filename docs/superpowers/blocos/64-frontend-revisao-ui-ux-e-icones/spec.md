# Bloco 64 — `frontend-revisao-ui-ux-e-icones` — design

- **Data:** 2026-11-26 · **Base:** `main@c576bc35` · **Classificação:** architectural
- **Fonte:** `docs/superpowers/audits/2026-11-26-ui-ux-pro-max.md` (46 achados, IDs `A-*`, `B-*`,
  `C-*`, `D-*`, cada um com `arquivo:linha`) e a ficha 64 do `backlog.md`.
- **Decisões:** João, 2026-11-26, nesta conversa de brainstorming. O que está marcado
  *call do Claude* foi decisão minha, sem objeção dele, e pode ser corrigido na leitura.

## 1. Intenção

A análise de interface com a skill ui-ux-pro-max achou 46 problemas no frontend que está em
produção. Alguns são graves: sessão expirada vira "Revisa tu conexión" em loop, rascunho de
formulário some sem aviso, o painel congela numa aba aberta, e os controles do tema escuro têm
borda a 1,41:1. O João quer a análise inteira virando execução, num bloco só. Junto, ele quer
trocar os ícones PrimeIcons (fonte global) por uma biblioteca SVG moderna, coerente com "O
Voltímetro" do DESIGN.md: **Phosphor** (`@phosphor-icons/react`).

Público: os ~10 usuários internos da Lotus, em desktop denso. O celular não é contexto novo. Os
dois achados de 390px (B-6, B-9) só deixam de quebrar.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos**
- Os 46 achados fechados, cada um com teste, captura no navegador ou veredito escrito do João.
- PrimeIcons fora do repositório: nenhum `pi pi-` nem `primeicons` em `frontend/`.
- DESIGN.md atualizado onde as decisões D1–D8 o mudam.

**Não-objetivos**
- Redesenho de tela. Administración é do bloco 9.
- Tom de voz e textos novos além dos que os achados pedem.
- Uso autenticado no celular como contexto novo.
- Resgate dos commits da branch `docs/impeccable-product`. Ela foi abandonada. Pode ser lida como
  referência (`git show <sha>`), mas nada se cherry-picka dela.
- Cor de acento nova para CTA (D7).

**Anti-objetivos** (falha mesmo que "funcione")
- Uma feature importar `@phosphor-icons/react` ou `primereact` direto (lei 6).
- Guarda de rascunho que dispara sem mudança nenhuma, ou que pede confirmação depois de salvar.
- Mês zerado desenhado fora da janela pedida, ou série de módulo sem permissão voltando ao gráfico
  (a D7 do dashboard, de 2026-08-17, continua valendo para série e seção).
- Celeste mais frequente no fim do bloco do que no começo.
- Regressão de contraste: todo par de cor tocado medido ≥ 4,5:1 (texto) ou ≥ 3:1 (traço e
  controle), nos dois temas.

## 3. Como funciona hoje (o que o bloco toca)

- **Roteador:** `AppRouter.tsx` usa `<BrowserRouter><Routes>` com dois grupos sob
  `SessionBootstrap` (login/recuperação e área protegida com `AppLayout`), mais
  `/definir-clave/:token` público e `*` → `/`. Oito arquivos de teste usam `MemoryRouter`.
- **Interceptor HTTP** (`shared/api/axios.ts`): normaliza todo erro para `ProblemDetails`, sem
  ramo por status. 401 e 419 chegam à tela como erro genérico.
- **Ícones:** os componentes de `shared/ui` recebem `icon?: string` com a classe da fonte
  (`"pi pi-check"`). São 62 nomes distintos em ~95 arquivos. A fonte é importada em `main.tsx:5`.
- **Tema:** `pnpm brand-theme` (`scripts/generate-brand-theme.mjs`) gera `lara-light-lotus.css`,
  `lara-dark-lotus.css` e as rampas, re-ancorando `--blue-*` no celeste. Por isso
  `--tone-info-ink` é hoje o mesmo hex da marca.
- **Painel:** `AnalyticsQuery.php` projeta só os meses com registro (`monthlyCounts` e
  `monthlyAmounts`). `pivot.ts` não preenche buracos, e o comentário dele estende a D7 para
  dentro da linha.

## 4. Abordagens consideradas

**4.1 Guarda de rascunho (C-2).**
- **(a) Migrar para data router** (`createBrowserRouter` + `RouterProvider`) e usar `useBlocker`.
  **Escolhida pelo João.** Um mecanismo cobre o voltar do navegador, os links do sidebar, o
  "Volver" e o fechamento de diálogo. A propriedade `lazy` das rotas resolve o code splitting do
  D-6 no mesmo movimento.
- (b) Manter `BrowserRouter` e proteger só Esc, X e Cancelar dos diálogos, mais
  `beforeunload`. Mais barato, mas deixa descobertos o voltar do navegador e o `TurmaCreatePage`.
  O C-2 ficaria pela metade.

**4.2 Ícones (T10).**
- **(a) Registro de nomes em `shared/ui`.** **Escolhida pelo João.** `AppIcon name="…"`, tipo
  `IconName` (união fechada) e um mapa nome → componente Phosphor. Os wrappers trocam
  `icon?: string` por `icon?: IconName`. Peso e tamanho se decidem num lugar só, e erro de nome é
  pego pelo `tsc`.
- (b) `shared/ui` reexporta componentes Phosphor e a feature passa `icon={Check}`. É mais
  flexível, mas cada feature escolhe do catálogo inteiro e o peso escapa do controle central.

**4.3 Fatiamento.** Um bloco, uma branch e uma PR, com fases por tema (decisão do João). Dividir
em blocos foi descartado por ele.

## 5. Decisões

| # | Decisão | Quem |
|---|---|---|
| D1 | **A-1:** o 3:1 de traço de controle vale nos dois temas. O gerador deixa de excluir o escuro; a borda de input, dropdown, checkbox e radio usa a mesma `CINZA_BORDA` `#64748b` (3,07:1 sobre o cartão, 3,93:1 sobre o poço). DESIGN:306 sem "no claro". | João |
| D2 | **C-9:** campo obrigatório leva asterisco visível no rótulo, mais `aria-required`. O `FormField` ganha `required` e `hint` (texto de ajuda abaixo, ligado por `aria-describedby`). Botão desabilitado por regra diz o motivo em texto visível perto dele, nunca só no `title`. DESIGN §Inputs/Fields ganha as duas peças. | João |
| D3 | **B-4:** o rótulo do rail colapsado sobe de 10px para 12px, com rótulos curtos novos em `nav.short.*` (es, pt, en) que cabem sem truncar. DESIGN:317 atualizado. | João |
| D4 | **B-5:** os controles do header (idioma, tema) ganham uma variante própria do shell, sem `dark:`, idêntica nos dois temas: a Fixed Dial Rule vence. DESIGN registra a variante e tira a contradição com o botão de marca. | João |
| D5 | **B-8:** a tag e o `RecordCode` caem de 700 para 600. Nenhuma face nova carregada. DESIGN §Chips/Tags passa a 12px/600. | João |
| D6 | **D-2:** o backend devolve todos os meses da janela pedida, com zero onde não há registro, nas séries mensais (contagens e UF). Só dentro da janela. Série de módulo sem permissão segue `null` e some (D7 de 2026-08-17 intacta). O comentário de `pivot.ts:17-20` é reescrito. O `pivot` continua sem preencher nada. | João |
| D7 | **Celeste e acento:** o B-2 se corrige dentro da regra "celeste raro", sem cor nova de CTA. Avatar de iniciais neutro (`--surface-200` + `--text-color` 600). `RowActions` comuns em `plain`; a destrutiva segue `danger`. `ArchiveSwitch` neutro (selecionado `secondary outlined`). `--tone-info-ink` sai do celeste para **índigo** (700 no claro, 300 no escuro) e `AppTag`/`AppCard` compõem o fundo `info` com `--indigo-500`. *Call do Claude:* a regra alcança também a severidade `info` dos componentes Prime (Message, Toast, Badge), que o gerador pinta pela rampa `--blue-*` re-ancorada no celeste. O ajuste vai no gerador, e cada par novo é medido nos dois temas. Índigo coincide com `--chart-5`, o que é aceito porque a cor de série só vive dentro de gráfico. | João (regra) · Claude (índigo e alcance) |
| D8 | **DESIGN:240:** a seção de diálogos passa a descrever os tetos `sm`/`md`/`lg` que o código usa. | João |
| D9 | **Roteador:** abordagem 4.1(a). | João |
| D10 | **Ícones:** abordagem 4.2(a). Peso `regular` no repouso e `fill` no item ativo da navegação. | João |
| D11 | **Ordem de execução:** fases 1–9 da §6, nessa ordem. | João |
| D12 | **Três blocos, um plano de até 10 tasks cada**, em série, cada um com lane, revisão, PR e passada visual próprias. Esta spec é a dos três. **64** `frontend-revisao-ui-ux-e-icones`: fase 1 e a parte da fase 2 que é roteador (data router + `lazy` + bandeiras, título, foco, 404/403, hook da guarda) — fecha T10, D-6, C-12, C-10. **65** `frontend-navegacao-sessao-e-formularios`: C-3, C-11, fases 3 e 4 e o gerador de tema — fecha C-1, D-1, D-9, C-2, C-7, C-8, A-10, C-9, C-5, C-4, C-6, A-2, C-3, C-11, A-1, B-8. **66** `frontend-identidade-graficos-e-acessibilidade`: o resto das fases 5–8 e o quadro final dos 46 IDs. Os planos de 65 e 66 nascem como rascunho na pasta do 64 e são validados no `/planejar-bloco` de cada um. | João (2026-11-26) |

## 6. Design por fase

Cada linha cita o ID da auditoria. O "como" detalhado de cada achado está no relatório. Aqui fica
o comportamento que precisa resultar e as escolhas que não são óbvias.

### Fase 1 — T10 Ícones (Phosphor)
- `pnpm add @phosphor-icons/react`. `AppIcon` em `shared/ui`: props `name: IconName`,
  `weight?: 'regular' | 'fill'` (default `regular`), `size?` em degraus nomeados, `aria-hidden`
  por padrão e `label?` que o torna `role="img"`.
- `IconName` é união fechada. O mapa importa componente por componente (tree-shaking). O nome é
  semântico do Lotus (`archive`, `certificate`, `close`), não o nome Phosphor. *Call do Claude:*
  a tabela PrimeIcons → nome Lotus → componente Phosphor sai no plano, conferida ícone a ícone.
- Todo `icon?: string` de `shared/ui` vira `icon?: IconName`. Wrappers do PrimeReact que aceitam
  `icon` como nó (Button, Menu, Toast etc.) recebem o `<AppIcon>` renderizado pelo wrapper.
- Ícones internos do PrimeReact (chevron, fechar, paginador, check, sort) trocados pelos props
  de ícone de cada componente Prime, dentro dos wrappers de `shared/ui`.
- Nav: item ativo em `fill`, demais em `regular`.
- `primeicons` sai do `package.json` e do `main.tsx`. Um teste de catraca (molde dos testes de
  arquitetura do frontend em `frontend/tests/`) falha se `pi pi-`, `pi-` como classe ou
  `primeicons` reaparecer em `frontend/src`, e se algum arquivo fora de `shared/ui` importar
  `@phosphor-icons/react`.
- DESIGN §Navigation ("ícone PrimeIcons") e §Components atualizados.

### Fase 2 — Roteador e navegação (D9; C-2 rota, T5, D-6)
- `AppRouter` vira `createBrowserRouter` com a mesma árvore. Os comentários de cada grupo são
  preservados. Rotas de página usam `lazy` (D-6). As bandeiras deixam de vir do CSS inteiro do
  `flag-icons`: só as usadas (es-CL, pt-BR, en), por SVG individual.
- *Call do Claude:* `SessionBootstrap` continua componente, como `element` das duas rotas-layout
  de hoje. Não vira `loader`: o comportamento atual se preserva, e o 401 do `/api/me` segue fora
  do C-1.
- Helper de teste em `shared/testing` monta componente num `createMemoryRouter`. Só migram para
  ele os testes que passam a montar algo com `useBlocker`. Os demais `MemoryRouter` ficam.
- **C-2 (parte da rota):** hook `useUnsavedChangesGuard(dirty)` em `shared/hooks`, com
  `useBlocker` + `beforeunload`. A confirmação é o `ConfirmDialog` existente ("¿Descartar
  cambios?"). Não dispara quando `dirty` é falso, nem na navegação que o próprio salvar dispara.
- **C-3:** busca, filtro, página e sort das listagens vão para a URL (`useSearchParams`) por um
  hook de `shared/` usado pelo `useServerTable`. Escopo: toda listagem que usa `useServerTable`
  (turmas, alunos, Historial) e a de arquivados (`useArchivedPage`). *Call do Claude:* a tabela
  principal da página usa parâmetros sem prefixo (`q`, `page`, `sort`, mais os filtros dela). Uma
  segunda tabela visível ao mesmo tempo recebe prefixo próprio. Tabela em aba inativa não escreve
  na URL. Nenhum parâmetro colide com `tab`. "Volver" volta no histórico quando a página
  anterior é a listagem de origem, e só faz push quando se chegou por link direto. `onSaved` da
  criação usa `replace`.
- **C-11:** abas na URL (`?tab=`) no molde `useTurmaDetail` + `turmaTabs.ts`, nas quatro páginas
  citadas.
- **C-12:** `<title>` por rota (`handle` da rota + hook no layout, formato `<Página> · Lotus`).
  Na troca de rota, o foco vai ao `<main tabIndex={-1}>`, mas não no primeiro carregamento.
- **C-10:** rota desconhecida mostra página 404 dentro do layout. Guard de rota por módulo usa o
  mesmo filtro de permissão do sidebar e mostra 403 sem "Reintentar". A API continua sendo a
  fronteira autoritativa (comentário de `AppRouter.tsx:53-55` atualizado).

### Fase 3 — T1 Sessão e dado fresco
- **C-1:** *call do Claude:* 419 primeiro busca um CSRF novo (`GET /sanctum/csrf-cookie`) e
  repete a requisição **uma vez**. Se a repetição devolver 419 ou 401, conta como expirada. Assim
  um token CSRF vencido não derruba sessão válida. 401 em requisição autenticada marca a sessão como
  expirada no `sessionStore` por um marcador idempotente: várias requisições em voo dão um
  redirecionamento e uma mensagem só. O 401 do logout explícito não conta. O `ProtectedRoute` leva
  ao login guardando `pathname + search`. O login devolve a esse
  destino. Exceções que não redirecionam: o `GET /api/me` do bootstrap e as rotas de
  autenticação (login, recuperação, definir senha), onde 401/422 é resposta esperada. Na tela de
  login, uma mensagem diz que a sessão expirou. O docblock de `screenDetail.ts:32-34` passa a
  descrever o que existe.
- **D-1:** as queries do painel ligam `refetchOnWindowFocus`.
- **D-9:** trocar o período mostra o gráfico anterior esmaecido, com `aria-busy`, até o dado
  novo chegar.

### Fase 4 — T2 Formulários e T3 Feedback
- **C-2 (parte do diálogo):** `CrudDialog`, `QuoteWizard` e `TurmaCreatePage` ligam o
  `useUnsavedChangesGuard` com o `dirty` do formulário, que é a comparação do valor atual com o
  inicial. No `CrudDialog` ele sai do `useEntityForm`. O `QuoteWizard` usa `useFormField`, não o
  `useEntityForm`, e o `TurmaCreatePage` tem estado próprio. Cada um ganha um `dirty` derivado do
  próprio estado, numa task do plano, com teste de "sem mudança, sem aviso". Esc, X, Cancelar e Volver pedem confirmação quando há mudança.
- **A-10:** o corpo do `CrudDialog` é um `<form>`, e Enter envia. Enter dentro de textarea não
  envia.
- **C-7:** `NestedField` entra no `FieldContext` (`aria-invalid`, foco no primeiro erro);
  `FormErrorSummary` ganha `role="alert"` e `tabIndex={-1}`.
- **C-8:** editar o campo limpa o erro 422 daquele campo.
- **C-9:** conforme D2, nos formulários de cadastro e nos diálogos citados.
- **C-5:** toast de sucesso em criar, editar, eliminar, aprovar e rejeitar cotização, e revogar
  certificado, pelo mesmo caminho que arquivar e concluir já usam.
- **C-4:** a confirmação nomeia o objeto (folio, nome ou código). "Eliminar presupuesto", que
  arquiva, vira a ação de arquivar com a severidade e o texto do arquivamento.
- **C-6:** o erro do gate de arquivamento aparece no slot de erro do `ConfirmDialog`, e o diálogo
  continua aberto.
- **A-2:** o motivo do ZIP desabilitado fica visível (D2). O nome truncado fica acessível por
  teclado e leitor de tela, não só pelo `title`.

### Fase 5 — T4 Contraste e identificadores, T8 Identidade
- **A-1:** D1, regerando com `pnpm brand-theme`. O CSS gerado não se edita à mão.
- **B-1:** o folio no Historial não transborda em 1024: peso da coluna e `nowrap`.
- **B-11:** barra de progresso de documentos ≥ 3:1 nos dois temas.
- **B-7:** `✓` vira `AppIcon`, e o folio não quebra no hífen.
- **B-8:** D5.
- **B-2:** D7.
- **B-5:** D4.
- **B-3/A-11:** regra global `prefers-reduced-motion` que desliga animação e transição. O sidebar
  anima propriedades nomeadas, não `transition-all`. O skeleton para de pulsar sob redução.
- **B-4:** D3.

### Fase 6 — T6 Gráficos do painel
- **D-2:** D6. *Call do Claude:* "mês da janela" é todo mês que a janela toca, inclusive os
  parciais das pontas (15/mar–10/jun dá mar, abr, mai, jun), calculado no fuso de negócio como o
  resto da `AnalyticsQuery`. `monthlyCounts`/`monthlyAmounts` passam a receber início e fim. Teste
  PHP cobre mês vazio no meio e nas pontas, janela que começa e termina no meio do mês, e série sem
  permissão (segue `null`).
- **D-3:** o ranking mostra os 10 primeiros **da métrica escolhida no seletor**. O corte fica no
  frontend, em `barras()` do `RankingsPanel`, depois da ordenação por métrica que já existe.
  O backend ordena por turmas → matrículas → certificados e não sabe qual métrica está na tela;
  cortar lá cortaria pela métrica errada. O DTO não muda e o `generated.ts` não se regenera.
  *Call do Claude:* sem "otros" agregado. A caixa do gráfico cresce com o número de barras, até 10.
- **D-4:** *call do Claude:* as quatro contagens viram dois gráficos — "Clases" (iniciadas,
  concluídas) e "Alumnos" (matrículas, certificados) —, mais o de UF que já existe. Cada linha
  ganha padrão de traço próprio além da cor.
- **D-5:** UF formatada por `Intl.NumberFormat` do idioma ativo (milhar e decimal), sem passar
  por `Number` no valor exibido.
- **D-7:** KPI com valor 0 não pinta trilho de severidade.
- **D-8:** sai o `role="img"`, para a camada de teclado do Recharts funcionar. Cada gráfico ganha
  tabela `sr-only` com os mesmos dados.

### Fase 7 — T7 Teclado e leitor de tela
- **A-3:** depois de mover um módulo, o foco acompanha o item movido.
- **A-4:** `aria-pressed`, `aria-expanded` ou `aria-checked` conforme o controle. "Idioma" mostra
  o idioma atual no rótulo visível.
- **A-5:** busca com rótulo acessível. A contagem de resultados é anunciada (`aria-live="polite"`).
- **A-6:** o wrapper de rolagem horizontal ganha `tabIndex={0}`, `role="region"` e `aria-label`.
- **A-7:** `AppCardHeader` recebe o nível de título por prop, com default que não pule nível.
- **A-9:** bloco `aria` no `primeLocale` (es, pt, en) e rótulo de fechar do `AppToast` traduzido.
- **A-12:** item ativo do `AppSubNav` com indicador ≥ 3:1.
- **A-8:** links do Dashboard com aparência de link. *Call do Claude:* o destino do link do
  relator só muda se a listagem que mostra relatores aceitar a busca na URL (C-3): aí ele leva o
  nome em `?q=`. Sem rota de detalhe nova e sem backend novo. Ancorar na entidade continua sendo
  o FUT-2, que espera decisão do João (`RedatorLoadPanel.tsx:59-65`).

### Fase 8 — T9 Carga e polimento
- **D-6:** medir o `dist` do HEAD antes e depois da fase 2. O número entra no relatório do bloco.
- **D-10:** logo com `width`/`height`; `hero.png`, `Logo.png`, `react.svg` e `vite.svg` sem uso
  removidos; `type` do favicon correto.
- **B-6:** busca da toolbar sem corte em 390.
- **B-9:** `h-dvh` no lugar de `h-screen`.
- **B-10:** botão só-ícone com o raio de 4px.
- **B-12:** `h1` e descrição do `PageHeader` alinhados; rótulo de KPI sem quebra feia.

### Fase 9 — Passada visual
Stack da lane de pé (offset +1). Skill `lotus-ui-review` nas telas tocadas, em 1440×900,
1024×768 e 390×844, claro e escuro. As capturas e o veredito por achado ficam em
`docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/visual/`. Achado visual sem captura não
fecha.

*Call do Claude:* versiona-se **uma captura por achado**, a da viewport e do tema que provam o
veredito, em PNG (molde do bloco 40). A varredura completa (3 × 2 por tela) fica fora do
repositório. Os vereditos que dependem do João (o que nem teste nem captura fecha) vão numa rodada
só, no fim desta fase, numa tabela por ID. Exceção: uma fase que esbarre em decisão nova para e
pergunta na hora.

## 7. Critério de aceite

Cada bloco (D12) prova os itens que lhe cabem: o 64, os itens 2, 3 e 4 (seção de ícones e diálogos);
o 65, os itens 3, 5 e 6; o 66, os itens 1, 3 e 4. O quadro do item 1 é montado pelo 66 a partir dos
`fechamento.md` dos três.

1. Cada um dos 46 IDs tem, no relatório de fechamento, uma linha: teste (arquivo e nome),
   captura (caminho) ou veredito escrito do João.
2. `grep -rE "pi pi-|primeicons" frontend/` vazio, e catraca de ícones verde.
3. Gate verde: `pnpm lint`, `pnpm test`, `pnpm build` e `php artisan test`.
4. DESIGN.md com D1–D5, D7, D8 e a seção de ícones.
5. Sessão expirada (cookie apagado) numa tela com `?tab=` volta ao login e, depois do login, à
   mesma URL.
6. Rascunho alterado num `CrudDialog`, com Esc, X, Cancelar e voltar do navegador, pede
   confirmação. Sem alteração, não pede.

## 8. Deixado ao executor

- A tabela PrimeIcons → `IconName` → Phosphor, conferida ícone a ícone no plano.
- Os textos novos (es, pt, en): confirmação de descarte, sessão expirada, 404, 403, rótulos curtos
  do rail e motivos de botão desabilitado, seguindo o vocabulário dos locales existentes.
- Divisão de cada fase em tasks e os grupos paralelos.
- Se um achado se mostrar já resolvido na `main` durante a execução, registrar o veredito com a
  prova, em vez de mexer.

## Verificação externa

Nenhuma. O bloco cobre frontend, um ajuste de query no backend (D-2) e o DESIGN.md, tudo
dentro do repositório e entregue pelo deploy normal da `main`. `efeito_externo: nao`.

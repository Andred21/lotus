---
name: Lotus
description: Sistema de registro de uma OTEC chilena — precisão instrumental para documentos com peso legal
colors:
  celeste-lotus: "#25a5e4"
  celeste-tinta: "#186b94"
  azul-poste: "#0f2b3d"
  humo: "#f1f5f9"
  grafite: "#334155"
  cinza-apoio: "#475569"
  cinza-traco: "#64748b"
  linha-clara: "#dfe7ef"
  cartao-claro: "#ffffff"
  noche: "#0b1220"
  cartao-noche: "#1e293b"
  tinta-noche: "rgba(255, 255, 255, 0.87)"
  apoio-noche: "rgba(255, 255, 255, 0.6)"
  linha-noche: "rgba(255, 255, 255, 0.1)"
  tinta-painel: "oklch(86.9% 0.022 252.894)"
  tinta-painel-apagada: "oklch(70.4% 0.04 256.788)"
  info-claro: "#186b94"
  info-escuro: "#62beec"
  exito-claro: "#136c34"
  exito-escuro: "#4cd07d"
  aviso-claro: "#816204"
  aviso-escuro: "#eec137"
  perigo-claro: "#b32b23"
  perigo-escuro: "#ff6259"
typography:
  display:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1
  headline:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    fontFeature: "\"cv02\", \"cv03\", \"cv04\", \"cv11\""
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.05em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    fontVariation: "tabular-nums"
rounded:
  control: "4px"
  surface: "8px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  rail: "80px"
  sidebar: "256px"
  header: "80px"
components:
  button-filled:
    backgroundColor: "{colors.celeste-lotus}"
    textColor: "{colors.azul-poste}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-brand-light:
    backgroundColor: "{colors.cartao-claro}"
    textColor: "{colors.celeste-tinta}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-brand-dark:
    backgroundColor: "{colors.celeste-lotus}"
    textColor: "{colors.azul-poste}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.cartao-claro}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.control}"
    padding: "12px 12px"
  card:
    backgroundColor: "{colors.cartao-claro}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.surface}"
    padding: "0"
  card-stat:
    backgroundColor: "{colors.cartao-claro}"
    textColor: "{colors.grafite}"
    rounded: "{rounded.surface}"
    padding: "14px 16px"
  tag:
    textColor: "{colors.info-claro}"
    rounded: "{rounded.control}"
    padding: "4px 6.4px"
    typography: "{typography.label}"
  nav-item:
    textColor: "{colors.tinta-painel}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  nav-item-active:
    textColor: "{colors.celeste-lotus}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: Lotus

## Overview

**Creative North Star: "O Voltímetro"**

O Lotus é um instrumento de medição, não um painel de marketing. O mostrador é fixo e escuro — a
sidebar e a barra superior são azul-poste nos dois temas, como a carcaça de um aparelho que não
muda de cor conforme a luz da sala. Dentro do mostrador, a leitura é o que importa: números em
mono tabular que alinham em coluna, um único acento celeste onde o ponteiro marca (o item ativo da
navegação, o traço de foco, o botão de marca), e cor de severidade que aparece como trilho ou
tinta, nunca como campo preenchido que grita.

A densidade é a de uma ferramenta de escritório usada o dia inteiro: cartões com hairline, tabelas
de 14px, rótulos em caixa alta de 12px que encabeçam grupos sem pedir atenção. A superfície clara
(humo) e a escura (noche) trocam por folha de tema em tempo de execução; o que não troca é a
assinatura. Cada decisão de cor foi medida contra WCAG antes de entrar — o sistema é contido porque
a régua é contraste, não gosto.

Rejeitado de forma explícita: o template de admin genérico (azul Lara stock, gray misturado com
slate, todo título em `text-2xl bold`), o editorial cream + serif, e o painel dark + neon.

**Key Characteristics:**
- Shell navy fixo nos dois temas; só o conteúdo acompanha o tema.
- Um acento (celeste) e uma tinta derivada dele para primeiro plano sobre claro.
- Cor de severidade em trilho e tinta, texto sempre em contraste cheio.
- Três famílias tipográficas com papéis estritos: Archivo (display), Inter (corpo), IBM Plex Mono (dado técnico).
- Dois raios, por papel: 4px no controle, 8px na superfície.
- Plano: hierarquia por hairline e tom de superfície, não por sombra.

## Colors

Uma paleta de instrumento: um celeste vivo como acento único, navy como carcaça, slate como a
única família de neutros, e severidade que troca de degrau por tema para manter 4,5:1.

### Primary
- **Celeste Lotus** (`celeste-lotus`): a marca. É FUNDO (botão preenchido, tag base, highlight) e
  é primeiro plano só sobre superfície escura — item ativo da sidebar, traço de foco sobre navy,
  botão de marca no tema escuro. Texto sobre ele é sempre azul-poste (5,29:1), nunca branco (2,77:1).
- **Celeste Tinta** (`celeste-tinta`, degrau 700): o celeste quando vira TEXTO ou borda sobre
  superfície clara. Rótulo e contorno do botão de marca no claro, botões `text`/`outlined`, links.
  Existe porque o celeste puro mede 2,77:1 sobre branco e reprova.
- **Azul-poste** (`azul-poste`): o navy do wordmark. Carcaça do shell (sidebar e header nos dois
  temas), texto sobre a primária, traço de foco no tema claro (13,37:1 sobre humo).

### Neutral
- **Humo** (`humo`): fundo da aplicação no tema claro. O cartão pousa branco sobre ele.
- **Cartão claro** (`cartao-claro`) / **Linha clara** (`linha-clara`): superfície de cartão, diálogo
  e overlay; a hairline que separa.
- **Grafite** (`grafite`): texto de corpo no claro. **Cinza de apoio** (`cinza-apoio`, slate-600):
  texto secundário, rótulo de campo, descrição — 6,92:1 sobre humo. **Cinza de traço**
  (`cinza-traco`, slate-500): a borda do input no claro, onde o traço é o único indicador (3:1).
- **Noche** (`noche`): fundo da aplicação no escuro. **Cartão noche** (`cartao-noche`): cartão,
  diálogo e overlay. **Tinta noche** / **Apoio noche** / **Linha noche**: branco a 87%, 60% e 10%.
- **Tinta do painel** (`tinta-painel`) / **apagada** (`tinta-painel-apagada`): o texto sobre o
  navy fixo do shell. Não sai de `--text-color` porque o shell não acompanha o tema.

### Severity (tertiary, por tema)
- **Info / Êxito / Aviso / Perigo**: cada tom tem dois degraus, um por tema (`*-claro` 700–800,
  `*-escuro` 400). Pintam texto, trilho do cartão `stat`, tinta da tag e botão `text` de perigo.
  O fundo pareado é sempre `color-mix(hue 8–15%, surface-card)`, nunca o hue puro.
- **Acento sem severidade** (roxo, `--tone-accent-ink`): só a modalidade "Online" da tag.
- **Série de gráfico** (`--chart-1..5`: teal, laranja, roxo, rosa, índigo): categórica, nunca os
  hues de severidade, piso 3:1.

### Named Rules
**The Fixed Dial Rule.** Sidebar e header são azul-poste nos dois temas. Nenhum `dark:` ali; quem
pousa sobre o navy redeclara `--focus-stroke`, `--divider-stroke` e usa `--shell-ink`.

**The Ink, Not Fill Rule.** Cor de severidade entra como trilho de 3px ou como tinta de texto. Texto
branco sobre hue saturado está banido: a tag `Vigente` media 2,28:1 assim.

**The 700 Rule.** Celeste nunca é primeiro plano sobre superfície clara. Lá ele vira `celeste-tinta`
(degrau 700, 5,88:1). Azul-poste no lugar dele apagaria a marca dos botões.

## Typography

**Display Font:** Archivo 600/700 (fallback Inter)
**Body Font:** Inter 400/500/600, com `cv02 cv03 cv04 cv11`
**Label/Mono Font:** IBM Plex Mono 400/500, sempre com `tabular-nums`

**Character:** registro técnico-industrial. Archivo dá peso aos títulos e aos números de KPI sem
virar manchete; Inter faz o corpo desaparecer; Plex Mono é o mostrador — folio, RUT, data, versão.
Todas self-hosted via `@fontsource`, só os pesos listados.

### Hierarchy
- **Display** (Archivo 600, 30px, line-height 1, `tabular-nums`): o KPI que é o assunto da dobra
  (`StatValue size="page"`) e o veredito da validação pública (`validationVerdictClass`).
- **Headline** (Archivo 600, 24px, tracking −0.025em): o `h1` de página — dono único, no
  `PageHeader` e no `DetailHeader`. O header do shell não tem título.
- **Stat em cartão** (Archivo 600, 24px, `tabular-nums`): número dentro de um cartão que já tem assunto.
- **Title** (Inter 600, 16px): título de cartão (`cardTitleClass`), caixa mista.
- **Body** (Inter 400, 16px nos controles Prime; 14px em tabela, descrição e rótulo de campo de formulário).
- **Label** (Inter 600, 12px, caixa alta, tracking 0.05em): faixa de seção (`SectionLabel`), com
  hairline à direita. **Rótulo de campo** (Inter 400, 12px, caixa alta, tracking 0.025em): o `dt`
  e o cabeçalho de tabela — não encabeça grupo, não carrega peso.
- **Mono** (Plex Mono 400, `tabular-nums`, `whitespace-nowrap` quando é identificador): folio
  (30px, tracking 0.15em na página; 20px, 0.1em no diálogo), RUT, código, data, versão.

### Named Rules
**The Tabular Rule.** Todo dígito que alinha em coluna — célula de tabela, KPI, folio, data — leva
`tabular-nums`. `font-mono` sem ele é erro de lint (`MONO_LITERAL`).

**The Two Registers Rule.** Faixa de seção (12px, caixa alta, tracking) e título de cartão (16px,
caixa mista) são registros diferentes, não degraus da mesma escala. Não os unifique.

## Layout

Shell de duas colunas em `h-screen`: sidebar fixa à esquerda (256px expandida, rail de 80px
colapsada; colapso imposto abaixo de 1024px sem tocar a preferência salva), header de 80px fixo
no topo, `<main>` com rolagem própria e padding de 16px (24px a partir de `sm`). Skip-link
"ir ao conteúdo" é o primeiro focável.

Página = `PageHeader` (título + descrição, tags à direita, `mb-6`) seguido de cartões. A ação
primária do módulo mora na toolbar do cartão, nunca no cabeçalho de página. Cartões de KPI em
fileira; seções abaixo abrem com `SectionLabel` + hairline.

Tabelas rolam DENTRO do cartão, nunca a página: piso de 42rem (672px) com sombra de rolagem
desenhada por gradientes presos à moldura, e a coluna de ações presa à direita
(`stickyActionsColumn`). Abaixo de `sm` cada tabela declara o próprio piso. Colapsar coluna é
proibido em tela com peso de auditoria.

Diálogos: 95vw → 85vw (`sm`) → 70vw (`lg`), maximizáveis, não arrastáveis. Espaçamento interno
padrão: cabeçalho e toolbar de cartão `16px × 12px`, célula `16px × 12px`, cabeçalho de célula
`16px × 10px`, cartão `stat` `16px × 14px`.

Breakpoints Tailwind padrão; o único breakpoint de comportamento é 1024px (viewport compacta).
Viewports de referência das revisões: 1440×900, 1024×768, 390×844.

## Elevation & Depth

Plano por decisão. A profundidade vem do TOM da superfície e de hairlines, não de sombra: cartão
branco sobre humo (ou `cartao-noche` sobre noche), borda de 1px em `--surface-border`, cabeçalho de
tabela em `--surface-section`, cartão `sunken` em `--surface-ground` com borda da cor do fundo.
`AppCard` não usa o `.p-card` do Lara justamente para não herdar a sombra Material dele.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 1px 3px rgba(0,0,0,0.3)` + máscara `rgba(0,0,0,0.4)`): só o diálogo
  e os popups do Prime, que precisam se separar da página.
- **Sombra de rolagem** (`color-mix(--text-color 22%, transparent)`, 1rem): anuncia que a tabela
  continua. É gradiente de fundo, não `box-shadow`, e aparece só quando há conteúdo fora da vista.

### Named Rules
**The Flat-By-Default Rule.** Superfície em repouso não tem sombra. Sombra só em overlay e em
anúncio de rolagem. Hover é mudança de tom (`--surface-hover`, branco a 3% no escuro), não elevação.

## Shapes

Dois raios, por papel, e cada um tem um dono. **Controle** (botão, input, tag, item de nav,
diálogo, faixa de erro) usa `rounded-control` = `--border-radius` do tema (4px). **Superfície**
(cartão) usa `rounded-surface` (8px). Raio literal em classe é erro de lint (`RAIO_LITERAL`).
O badge de contagem é a única pílula. Bordas são hairline de 1px; o botão de marca é o único com
2px, e o cartão `stat` carrega um trilho de 3px na borda de início. Item de nav tem borda
esquerda de 2px que acende em celeste quando ativo. Nada é clipado, nada tem silhueta além da caixa.

## Components

Contidos e precisos. Nada se infla no hover; o estado muda por tom e por traço.

### Buttons
- **Shape:** cantos de controle (4px), padding `12px 20px`, 16px, transição 0.2s.
- **Preenchido (Prime base):** celeste com rótulo azul-poste; hover `#1a74a1` com rótulo branco;
  active `#166287`. Severidades: `warning` é amarelo (`--yellow-500`, tinta `--yellow-900`) e
  CLAREIA no hover; `danger` preenchido é vermelho com branco, mas `text`/`outlined` de perigo
  usam `--tone-danger-ink`.
- **Marca (`variant="primary"`, `iconToggle`, `compact`):** no claro, cartão branco com contorno
  2px e rótulo em `celeste-tinta`, hover leva o rótulo a `--text-color`; no escuro, preenchido
  celeste com borda branca e rótulo azul-poste. É o botão que abre módulo, salva e confirma emissão.
- **Focus:** anel do tema (`0 0 0 0.2rem #b2dff5` / celeste a 20%) SOMADO a `outline: 2px solid
  var(--focus-stroke)` com offset 2px, só em `:focus-visible`. Nunca zerar o anel.
- **`noSurface`:** sem fundo nem padding; só área de clique e anel. O gatilho do menu do usuário.

### Chips / Tags
- **Style:** 12px/700, padding `4px 6.4px`, 4px. Fundo `color-mix(hue 15%, --surface-card)`,
  tinta `--tone-*-ink`. `secondary` é neutro: `--surface-200` com `--text-color`. `tone="accent"`
  é o roxo da modalidade Online.
- **State:** não há tag interativa. Uma tag diz estado (Vigente, Revocado, Pendiente) ou módulo.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** `--surface-card`; `tone` em `default` tinge fundo a 8% e borda a 35%; `sunken`
  pousa em `--surface-ground`.
- **Shadow Strategy:** nenhuma (ver Elevation).
- **Border:** 1px `--surface-border`; `stat` troca a borda de início por trilho de 3px na tinta do tom.
- **Internal Padding:** cabeçalho/toolbar/rodapé `16px × 12px` com hairline; `stat` `16px × 14px`.
  Cabeçalho: título 16px/600, badge de contagem em pílula mono, qualificador em apoio, ações à direita.

### Inputs / Fields
- **Style:** 1px `cinza-traco` no claro (3:1, único indicador), fundo do cartão, 4px, padding 12px,
  16px. Rótulo acima em 14px e `--text-color-secondary`, irmão do controle (`htmlFor`), nunca mãe.
- **Focus:** borda celeste + anel do tema + outline de `--focus-stroke`. Hover: borda celeste.
- **Error / Disabled:** `.p-invalid` borda `#e24c4c`; mensagem de 422 abaixo em `--tone-danger-ink`;
  resumo de erros órfãos em caixa `dangerSurface` (vermelho a 10%). Disabled a 60% de opacidade.
  Leitura (`readOnly`) vira texto em `--text-color`; vazio vira travessão.

### Navigation
- **Sidebar:** azul-poste fixo, borda direita branca a 10%, wordmark claro (glifo no rail), rótulo
  do papel em caixa alta apagada, versão em mono no rodapé. Item: ícone PrimeIcons + rótulo 500,
  `10px × 12px`, 4px, borda esquerda 2px; repouso em `tinta-painel`, hover branco a 10%, ativo
  celeste sobre branco a 5% com a borda acesa. Colapsado, o item EMPILHA ícone e rótulo de 10px —
  o rail é o único menu do celular.
- **Header:** barra utilitária sem título — controles de idioma e tema (botões de marca), divisor
  branco a 20%, relógio mono, avatar + nome (branco, 14px/600) + papel (branco a 75%) num gatilho só.

### Tables
`text-sm`, sem zebra. Cabeçalho em `fieldLabelClass` sobre `--surface-section`, `16px × 10px`,
tinta secundária. Linha transparente (a sombra de rolagem precisa aparecer), hover em `--surface-hover`.
Paginador É o rodapé: contagem à esquerda, controles à direita, hairline acima. Larguras declaradas
em razão com `table-fixed`.

### Signature: o Folio
`CertificateFolio` trata o número `LOT-ano-seq` como artefato: legenda em rótulo de campo (`dt`),
código em Plex Mono tabular, 30px com tracking 0.15em na validação pública (20px/0.1em no diálogo
de emissão), centrado, em `--text-color`. É a única assinatura do sistema; QR e selo são o motivo
visual do domínio.

## Do's and Don'ts

### Do:
- **Do** pintar com as CSS vars do tema (`--surface-card`, `--surface-border`, `--text-color`,
  `--tone-*-ink`) por `style` ou via wrapper; a folha troca sozinha.
- **Do** customizar componente Prime no wrapper de `shared/ui`, por `className` na raiz ou `pt`.
- **Do** usar `rounded-control` / `rounded-surface` e as constantes de `typography.ts`
  (`pageTitleClass`, `sectionLabelClass`, `technicalDataClass`…) em vez de literais.
- **Do** medir contraste antes de escolher degrau: 4,5:1 texto, 3:1 traço e gráfico, nos dois temas.
- **Do** manter o celeste raro: item ativo, foco, botão de marca. A raridade é o ponteiro.
- **Do** deixar o shell redeclarar `--focus-stroke: var(--brand)` ao pousar sobre o navy.

### Don't:
- **Don't** escrever `dark:` sobre componente Prime nem pares `bg-white dark:bg-slate-800`.
- **Don't** pôr celeste como texto ou borda sobre superfície clara; use `--brand-ink`.
- **Don't** pôr branco sobre celeste ou sobre hue de severidade saturado.
- **Don't** editar `themes/lara-*-lotus.css` à mão — regere com `pnpm brand-theme`.
- **Don't** importar PrimeReact direto numa feature, nem escrever hex fora de `brand-theme.css`/`tokens.ts`.
- **Don't** usar zebra em tabela, sombra em cartão, ou título de página fora do `PageHeader`.
- **Don't** usar gray do Tailwind; a família de neutros é slate.

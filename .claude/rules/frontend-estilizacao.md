---
paths:
  - "frontend/src/**"
---

# Frontend — estilização de componentes (ADR-16)

Tailwind é **layout**. Cor, superfície e geometria de controle vêm do tema PrimeReact via
`shared/ui`. Esta rule diz qual grafia sai para cada PAPEL — e nomeia o mecanismo que a
sustenta, porque regra sem catraca é recomendação solta.

## Botão — o variant nomeia papel, não aparência

| Variant | Papel | Geometria |
|---|---|---|
| `primary` | ação primária: abre módulo, salva diálogo, confirma emissão | herda o `.p-button` do tema |
| `compact` | marca apertada, onde a do tema não cabe (seletor de idioma, ação dentro de linha) | `px-3 py-2.5 text-sm` |
| `iconToggle` | só-ícone: toggle de tema, colapso da sidebar | herda o `.p-button` do tema |
| `noSurface` | gatilho que embrulha um bloco (avatar + identidade no header) | fundo, padding e hover zerados |

- **Ação destrutiva não veste marca:** passa `severity`, e o preenchido de severidade é o sinal.
- **Navegação de volta é terciária:** botão `text`, nunca variant de marca. Ela ANTECEDE a ação
  primária da página; vestir a mesma marca diz que sair e agir pesam igual.
- `primary` **não declara padding nem tamanho de fonte**. Declarar encolhe os 17 call sites de
  uma vez. Mecanismo: `src/shared/ui/AppButton/AppButton.test.tsx`.
- **Todo `AppButton` de tela declara papel** — `variant`, `text`, `outlined`, `link` ou `severity`.
  Sem papel ele cai no `.p-button` preenchido do Lara, que não é papel deste produto: foi assim que
  os seis diálogos de certificação, o alvo do `AppSelectableCard` e o `ArchiveSwitch` escaparam do
  item 18 (triagem de 2026-08-29). Secundária de diálogo (Cancelar/Cerrar) é `text`, como o
  `CrudDialog`. Mecanismo: `BOTAO_SEM_PAPEL` em `frontend/eslint.config.js`, nas duas camadas.

## Tipografia — a grafia mora em `shared/ui`, nunca no sítio

| Papel | Peça | Onde |
|---|---|---|
| Título de página (`h1`) | `pageTitleClass` | `PageHeader`, `DetailHeader`, as 5 telas de auth |
| Faixa que encabeça grupo | `<SectionLabel>` | `h2` na página, `h3` em card/diálogo |
| Rótulo de campo (`dt`) | `fieldLabelClass` | listas de definição |
| Número de estatística | `<StatValue>` | KPI (`size="page"`), cartão (`size="card"`) |
| Folio de certificado | `<CertificateFolio>` | validação pública, diálogo de emissão |
| Rótulo de campo de formulário | `<FormField>` | todo formulário, inclusive login, recuperação e senha |

- O `h1` tem **dono único** por tela: `PageHeader` no módulo, `DetailHeader` no detalhe. Tela sem
  nenhum dos dois titula o próprio estado, mesmo que escondido (`sr-only`).
- **Rótulo de seção e rótulo de campo são peças diferentes.** Um `<dt>` não encabeça grupo; promovê-lo
  a heading inventa hierarquia.
- Escrever a grafia literal no sítio é o defeito, não o atalho: era como o título de auth virou 5
  cópias. Mecanismo: `GRAFIA_LITERAL` em `frontend/eslint.config.js`, que mede a ASSINATURA da
  grafia em `className` — literal, template e chave de objeto `pt`. Ele reprova também a cópia que
  já DIVERGIU (o rótulo da Sidebar tinha perdido o `uppercase` no caminho), porque bastam duas
  classes adjacentes para nomear a voz.
  `src/shared/ui/typography.test.ts` **não é este mecanismo** e citá-lo aqui foi o furo (Q-3 do
  review de 2026-08-29): ele congela o VALOR das quatro constantes e é cego a quem as recopia —
  passava verde com 4 cópias vivas. `shared/ui` fica fora do lint de propósito: é onde a grafia é
  DEFINIDA.

## Dado técnico é mono

Folio, RUT, código, versão e contagem que alinha em coluna saem em `font-mono` **com**
`tabular-nums`. Sem o tabular o dígito muda de largura entre renders e o número dança na coluna.

| Papel | Constante (`shared/ui/typography.ts`) |
|---|---|
| Dado técnico — contagem, data, versão | `technicalDataClass` |
| Identificador — RUT, folio, código (token único, não quebra no hífen) | `identifierClass` |

`font-mono` literal no sítio é o defeito: a fase 2 do audit de 2026-08-28 mediu sete sítios com a
metade do par, e a fase 1 um RUT partido em "76.123.456-" / "0". Mecanismo: `MONO_LITERAL` em
`frontend/eslint.config.js`, nas duas camadas; `shared/ui` fica de fora porque é onde a grafia é
definida.

Prosa não é dado técnico: o travessão que marca ausência legítima fica em texto normal.

**Faixa de seção e título de card são dois REGISTROS, não dois degraus de uma escala** (D-63,
2026-08-31). A faixa (`sectionLabelClass`, 12px) codifica profundidade por CAIXA e posição; o
título (`cardTitleClass`, 16px) por CORPO. Comparar os dois por tamanho e "monotonizar" apagaria o
registro eyebrow em toda tela que o usa. O próximo audit que estranhar os 12px contra os 16px lê
esta linha em vez de reabrir a ficha.

## Escala de raio

O degrau segue a ESCALA do bloco, não o aninhamento nem o nome do componente: o que tem padding de
superfície (`p-3`, `p-4`, `p-6`) é superfície mesmo dentro de um diálogo; o que tem padding de
controle (`px-3 py-2`) fica no degrau do controle, entre os quais ele pousa. O `AppSelectableCard`
se chama card e mede `px-3 py-2` — a medição manda, e ele é controle.

| Papel | Raio |
|---|---|
| Superfície — card, diálogo, bloco de destaque com padding de card | `rounded-surface` |
| Controle, item de navegação e faixa fina de aviso (`px-3 py-2`) | `rounded-control` |
| Cápsula — pill, tag, contador, barra de progresso | `rounded-full` |

Os dois primeiros são tokens do `@theme` em `frontend/src/index.css` (D-66, 2026-08-31), e não
utilities de fábrica do Tailwind. `--radius-surface` é fixo em `0.5rem`; **`--radius-control`
REFERENCIA `--border-radius`**, o token que o tema PrimeReact declara em `:root` — hoje 4px, posto
ali pela D7 do item 18. Mudar o raio da marca é uma linha em `scripts/generate-brand-theme.mjs`, e
as duas camadas seguem juntas.

Até 2026-08-31 esta tabela dizia `rounded-lg`/`rounded-md`, e o `rounded-md` (6px) contradizia o
tema (4px) em TODO controle do produto. Os 10 sítios da P-67 que escreviam `rounded` solto estavam
certos contra o tema e errados contra a rule; não havia sítio a consertar, havia régua a corrigir.
Os banners de erro do `FormField` seguem no degrau do controle — a divergência que o review de
2026-08-29 (Q-5) resolveu a favor do código continua resolvida a favor do código, agora com o
degrau nomeado. O bloco do folio no `IssuedDialog` é o contra-caso que fecha a régua: aninhado, com
`p-6`, e superfície.

`rounded` solto é raio sem degrau declarado. Mecanismo: `RAIO_LITERAL` em
`frontend/eslint.config.js`, nas quatro camadas de `features/` e `app/**` — a catraca de cor
(`CATRACA_COR`, três arquivos) leva o array também, porque `CourseStep.tsx` é um dos 15 sítios que
esta decisão migrou; `shared/ui` fica de fora porque é onde a grafia é definida. `rounded-full`
fica livre: cápsula não escolhe degrau.

## Padding por papel

| Papel | Padding |
|---|---|
| Faixa de card (cabeçalho, rodapé) | `px-4 py-3` |
| Corpo de card | `p-4` |
| Página autenticada | `p-4 sm:p-6` |
| Hero público (validação por QR) | `p-6` |

## Cor

Cor vem de variável do tema, escrita por `style={{ color: 'var(--…)' }}`. Utility de paleta
Tailwind (`bg-slate-50`, `text-red-600`) é o defeito, nos dois temas.

Superfície escura FIXA do shell — sidebar navy, painel de marca do login — lê `--shell-ink` e
`--shell-ink-muted`, não a rampa de marca: tinta de marca ali está no papel de texto de apoio.
O wordmark segue com a marca — ele **é** a marca.

Mecanismo: `COR_HARDCODED` e `COR_LITERAL_EM_STYLE` em `frontend/eslint.config.js`, que medem
`className` e `style`. A lista de exceções `CATRACA_COR` só **encolhe** — nunca reintroduza
arquivo nela para calar o lint.

## Nome acessível de controle sem label visível

`AppDropdown` dentro de `FormField` recebe o `inputId` por contexto — é a grafia certa. Fora dele
(filtro de tabela, controle em slot de ação), passa `inputId` ligado a uma label ou `aria-label`.
O `id` do Dropdown cai no nó raiz e não alcança o input focável.

Mecanismo: `DROPDOWN_SEM_NOME` em `frontend/eslint.config.js`.

## Catraca nova mede as DUAS camadas: `src/features/**` e `src/app/**`

Regra nova entra nos quatro arrays de `no-restricted-syntax` que casam código de tela — os três de
`src/features/**` e o de `src/app/**` — e a última não é opcional. `app/` é shell: Dashboard,
sidebar e layouts, onde a grafia de tela também mora.

Padrão reincidente, medido no review de 2026-08-29 (Q-2/Q-3): `DROPDOWN_SEM_NOME` nasceu medindo só
`features/`, e apagar o `aria-label` do `PeriodFilter` do Dashboard deixava o lint VERDE; as 4
cópias de grafia tipográfica estavam TODAS em `src/app/**`. É a mesma família do
`frontend-fsliced.md` — catraca que enumera em vez de medir nasce com a exceção embutida e ninguém
a vê, porque ela fica verde. Ficar de fora exige razão escrita no bloco (é o caso dos bans de
query: compor rota é o trabalho de `app/`).

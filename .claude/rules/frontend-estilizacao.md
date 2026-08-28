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

## Tipografia — a grafia mora em `shared/ui`, nunca no sítio

| Papel | Peça | Onde |
|---|---|---|
| Título de página (`h1`) | `pageTitleClass` | `PageHeader`, `DetailHeader`, as 5 telas de auth |
| Faixa que encabeça grupo | `<SectionLabel>` | `h2` na página, `h3` em card/diálogo |
| Rótulo de campo (`dt`) | `fieldLabelClass` | listas de definição |
| Número de estatística | `<StatValue>` | KPI (`size="page"`), cartão (`size="card"`) |
| Folio de certificado | `<CertificateFolio>` | validação pública, diálogo de emissão |

- O `h1` tem **dono único** por tela: `PageHeader` no módulo, `DetailHeader` no detalhe. Tela sem
  nenhum dos dois titula o próprio estado, mesmo que escondido (`sr-only`).
- **Rótulo de seção e rótulo de campo são peças diferentes.** Um `<dt>` não encabeça grupo; promovê-lo
  a heading inventa hierarquia.
- Escrever a grafia literal no sítio é o defeito, não o atalho: era como o título de auth virou 5
  cópias. Mecanismo: `src/shared/ui/typography.test.ts`.

## Dado técnico é mono

Folio, RUT, código, versão e contagem que alinha em coluna saem em `font-mono` **com**
`tabular-nums`. Sem o tabular o dígito muda de largura entre renders e o número dança na coluna.

Prosa não é dado técnico: o travessão que marca ausência legítima fica em texto normal.

## Escala de raio

| Papel | Raio |
|---|---|
| Superfície — card, diálogo, faixa de destaque | `rounded-lg` |
| Controle e item de navegação | `rounded-md` |
| Pill — tag, badge, contador | `rounded-full` |

`rounded` solto não existe: é raio sem degrau declarado, e foi assim que os banners de erro
ficaram fora da escala.

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

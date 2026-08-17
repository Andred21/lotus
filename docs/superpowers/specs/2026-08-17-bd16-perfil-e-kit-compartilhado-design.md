# Spec — `bd16-perfil-e-kit-compartilhado` (BD-16 · `/perfil` + kit compartilhado)

> **Data:** 2026-08-17 · **Estado de origem:** `ready_for_planning` → `planning`
> **Context Packet:** nenhum — não há fonte externa. Todo item deste bloco é medição local.
> **Fonte canônica:** `docs/superpowers/audits/2026-08-17-perfil-ui-review-e-design.md`
> (`/lotus-ui-review`: 1 achado C + 8 B · `frontend-design`: DS-01…DS-07)
> **Registro canônico dos itens:** `docs/superpowers/backlog.md` §Débitos técnicos (D-01, D-18…D-30)
> e `docs/superpowers/pendencias/abertas.md` (P-36, P-37)
> **Baseline:** `main@135e468`

## 1. O que o bloco entrega

Três frentes sobre a mesma dobra de código: a tela `/perfil` e os wrappers de `shared/ui` que ela
consome junto com o resto do produto.

- **A · contraste e contenção** — D-19 (o único **C**), D-01 (a metade da *quebra*), D-18, D-20,
  D-21, D-22, D-30 e a **P-36**.
- **B · semântica e teclado** — D-23, D-24 e a **P-37**, mais D-25.
- **C · conteúdo e densidade** — D-26, **D-28 antes de D-27**, D-29.

Absorve o **BD-10 inteiro** (P-37, P-36, D-01, D-18): os quatro moram nos mesmos dois arquivos que
esta revisão manda tocar, e planejar separado significaria reescrever `FormSection.tsx:19` duas
vezes.

**Não entrega:** nada de backend, nenhuma regeneração de `generated.ts`, nenhuma rota nova, nenhum
componente novo de feature. **DS-05** (trocar o `scale-200` do avatar por tamanho real) e **DS-07**
(mural de credenciais) ficam fora por decisão registrada na promoção — o primeiro porque a previsão
de recorte é aritmética e precisa de medição no navegador antes de virar task; o segundo porque
inverte a ordem da spec D1 e é bloco próprio com brainstorming.

## 2. Decisões

D1–D8 foram escolhidas pelo João entre alternativas apresentadas no brainstorming. D9–D15 são
derivadas e declaradas como tais.

- **D1 — O título de `FormSection` vai a `--text-color`, marcado por peso, caixa e tracking; a tinta
  de marca preenchida fica exclusiva da ação primária do cartão.** A P-36 registra 2,77:1 no
  celeste sobre humo, mas o contraste é sintoma: a mesma tinta pinta sete papéis na mesma dobra —
  título, ação primária, ação **destrutiva**, secundária, upload, tag e ícone —, e uma cor que
  significa sete coisas não significa nenhuma. Subir o celeste até 4,5:1 conservaria a ambiguidade.
  Hierarquia de título é trabalho de peso e espaçamento, não de cor; a marca passa a marcar uma
  coisa só. Custo aceito: a tela perde o único acento cromático da coluna, o que a **D4** e a
  **D-30** repõem com marcas que carregam significado.
- **D2 — `AppTag` de tom sai FILLED e passa a fundo suave + tinta `--tone-*-ink`.** `Vigente` mede
  branco sobre `rgb(34,197,94)` a 12px/700 — **2,28:1** —, e as tags de curso, branco sobre
  `rgb(14,165,233)` — **2,77:1**. 12px bold não é texto grande para a WCAG (o corte é 18,66px),
  então a régua é 4,5:1 e as duas reprovam. A mecânica não é invenção: o `ACCENT` do **mesmo
  arquivo** já compõe `color-mix(in srgb, <hue> 15%, var(--surface-card))` no fundo com a tinta do
  tom no texto, e o `AppCard` com `tone` na variante `default` faz o mesmo a 8%. É a tese que o
  passe de 2026-08-17 fixou no Dashboard — cor de sinal em fundo e traço, texto em contraste cheio —
  aplicada onde ela não tinha alcançado.
- **D3 — `AppFileRow` ganha `flex-wrap`: o grupo de ações cai para a própria linha quando não cabe,
  dirigido pelo CONTÊINER, não por breakpoint de viewport.** O D-19 mede o cartão do CV com
  `clientWidth` 227 contra `scrollWidth` 311; `Reemplazar` de x=286 a x=425 com o cartão terminando
  em 342, rótulo cortado em "Reem"; o nome do arquivo com largura 0. O contra-exemplo isola a causa:
  o REUF, **sem** botão de upload, mede `scrollWidth` = `clientWidth`. O componente serve quatro
  larguras de contêiner diferentes (comercial, turma, redator, perfil) na mesma viewport — um
  breakpoint de viewport acertaria uma delas e erraria as outras três. `Reemplazar` continua sendo
  **texto**, não ícone: substituir apaga o documento anterior de forma irreversível e o rótulo é o
  único aviso disso na tela (spec do bloco anterior, §6).
- **D4 — A coluna de leitura RECUA para `--surface-ground` sem borda elevada; o self-service
  permanece cartão elevado sobre `--surface-card`.** O D-28 mede que a única ideia estrutural da
  tela — à esquerda o que o usuário não controla, à direita o que é seu — é expressa **apenas** por
  posição horizontal, que só existe a partir de 1280px; abaixo disso vira ordem vertical, e ordem
  sem marca não lê como regra. Recuar a superfície faz a coluna de leitura dissolver-se no fundo da
  aplicação (`AppLayout` já é `bg-(--surface-ground)`) e sobrar cartão só onde há o que fazer. A
  mecânica tem precedente no produto: o `PipelineFunnel` usa `--surface-ground` como sulco dentro de
  um cartão. `AppCard` ganha variante para isso — o fundo dele é decidido no componente, não por
  classe do chamador.
- **D5 — `FormField` gera o id e publica id/`invalid`/`describedBy` por contexto; os wrappers de
  controle de `shared/ui` consomem e se auto-associam.** A P-37 é o `<label>` que envolve o controle
  **e** o texto do rótulo: o nome acessível do input soma os dois, e com erro presente soma também a
  mensagem. O `LoginForm.tsx:35-90` já tem o molde certo (`htmlFor`/`id` + `aria-invalid` +
  `aria-describedby` condicional + `<small id=…-error>`) — mas replicá-lo à mão custaria editar 55
  call sites com controle, em 23 arquivos, e o próximo campo escrito voltaria a errar. Com o
  contexto, **zero call sites mudam** e o acerto passa a ser o default. Cada wrapper já sabe qual é
  a própria porta: `id` no `AppInputText` e no `AppTextarea`, `inputId` no `AppPassword`, no
  `AppDropdown` e no `AppDatePicker` — medido em `password.cjs.js:713`, `dropdown.cjs.js:1577` e
  `calendar.cjs.js:3900`. Prop do chamador sempre vence a do contexto.
- **D6 — O olho da senha passa a responder a Espaço, e NÃO recebe `aria-pressed`.** A WAI-ARIA exige
  Enter e Espaço para `role="button"`, e hoje só Enter alterna. Mas o `aria-pressed` que o D-24 pede
  colide com uma decisão medida: `AppPassword.tsx:50-57` registra que o Prime cravava
  `role="switch"` + `aria-checked` fixo por ícone, o que anunciava "Mostrar contraseña, ativado" com
  o campo mascarado (UI-04 de 2026-08-13), e a correção foi trocar o papel porque **um controle cujo
  nome muda a cada clique é botão**. Pendurar `aria-pressed` num botão cujo nome já alterna anuncia
  o estado duas vezes, em duas gramáticas. O D-24 fecha pela metade do teclado; a metade do
  `aria-pressed` é **recusada com motivo**, não esquecida.
- **D7 — A catraca `COR_HARDCODED` ganha uma régua de VALOR para cor em `style`, e `BRAND_COLOR`
  deixa de existir.** A P-36 registra que a guarda mede `className` e é cega a `style={{ color:
  '#25A5E4' }}` — e que o desenho sempre adiou porque cor por `style` é a grafia **certa** quando o
  valor é `var(--…)`. A saída é medir o valor, não o atributo: literal em propriedade de cor que não
  comece por `var(` ou `color-mix(` é defeito. A medição decide o resto — há **zero** literais de cor
  crua em propriedade de cor em todo `src/`, então a guarda nasce **sem nenhum `ignores`**, que era
  exatamente o medo registrado na ficha ("nasceria verde com a exceção embutida"). E como o seletor
  não alcança Identifier, `BRAND_COLOR` seria a porta de fuga: some junto, porque depois de pagos os
  dois consumidores (`FormSection.tsx:19` e `CoursesTable.tsx:43`) ela fica com zero.
- **D8 — Abaixo de `xl` o self-service vem primeiro E o cartão de identidade vira faixa
  horizontal.** O D-27 mede em 1024×768: Admin com `Datos personales` em y=829 e 1476px de total;
  Redator com `Documentación profesional` em y=1809 e 2544px — 3,7 dobras, com a primeira contendo
  só o cartão de identidade. Reordenar sozinho troca qual metade fica por último; compactar sozinho
  deixa o editável atrás de uma dobra menor. Os dois juntos pagam a densidade e a ordem. A ordem em
  `xl` fica intocada — a **D4** é que passa a carregar a regra quando a posição horizontal não
  existe.

### Derivadas

- **D9 (derivada) — `severity="secondary"` não é tocada.** Ela mede 8,4:1, é a única que já passa, e
  foi a correção de 2026-08-16 (UI-03) que resolveu o `.p-tag-secondary` ausente no Lara. Só as
  quatro severidades de tom mudam.
- **D10 (derivada) — D-21: status e validade na MESMA linha, e o caso nulo some.** A validade sai de
  última linha `text-xs` secundária (`ProfileDocumentSlot.tsx:119-127`) e sobe para junto do status
  que o backend deriva **a partir dela**, em tinta de corpo. O ruído que causou o rebaixamento é
  real: três dos quatro slots têm `valid_until: null` e imprimiam `Sin fecha de vencimiento` — uma
  linha que só diz que não há informação, e que é ela quem rebaixou a que importa. `noValidity`
  deixa de ser renderizado; a chave i18n permanece nos três locales, sem consumidor.
- **D11 (derivada) — D-23: `role="button"` no `AppFileUpload`, e o nome acessível recebe o tipo
  documental por prop do chamador.** O `FileUpload` do Prime no modo básico expõe
  `<span class="p-button p-fileupload-choose" tabindex="0">` com `role` e `aria-label` nulos,
  recebendo foco na sequência natural — e é o controle que substitui documento de peso legal de
  forma irreversível. O papel é invariante do wrapper (como o `customUpload`); o NOME não pode ser,
  porque três slots repetem "Reemplazar" e só o chamador sabe de qual documento se trata.
- **D12 (derivada) — D-25: o diálogo devolve foco ao próprio contêiner na montagem, e o limite
  residual é declarado.** Com `activeElement` = `IFRAME` o Escape não chega ao handler do documento
  hospedeiro: o visor nativo do Chrome consome a tecla **dentro** do iframe, e nada no documento
  pai a recebe. Focar o contêiner na montagem faz Escape funcionar em todo o caminho até o primeiro
  clique dentro do visor. Depois disso o navegador é dono da tecla e o `X` é a saída garantida —
  isso vira docblock no componente, não promessa de correção total.
- **D13 (derivada) — D-29: `font-mono` em RUT, telefone, datas e tamanho de arquivo, incluindo a
  linha de metadados do `AppFileRow`.** O RUT já sai `font-mono` em `StudentsTable.tsx:46`,
  `RedatoresTable.tsx:47` e `RedatorCard.tsx:41` — mas não no `ProfileIdentityCard`, que é o RUT do
  próprio dono. O alcance do `AppFileRow` leva o token a comercial, turma e redator, que é
  consistência, não expansão de escopo. O telefone é o único que pousa num controle **editável**
  (`ProfilePersonalSection.tsx:57-63`), não num valor de leitura — cai no `className` do
  `AppInputText`, e é o caso que a auditoria cita explicitamente ("vale também para telefone"). **`font-display` NÃO entra no `FormSection`**: os três
  sítios vivos dele são título de página e número de KPI, e um `text-sm uppercase` em display seria
  uso novo do token, não aplicação dele — e a **D1** já resolveu a hierarquia do título por peso.
- **D14 (derivada) — D-22 fecha por REORDENAÇÃO, sem faixa reservada.** O grupo de ações é
  justificado à direita e desliza quando falta o upload: `Ver` em x=1132 nos slots com três ações e
  x=1275 no que tem duas — 143px entre linhas equivalentes separadas por 16px. Reservar largura
  falharia com o idioma, porque o rótulo do upload é texto traduzido e muda de tamanho. Com o
  upload **antes** do par `Ver`/`Descargar`, o par de ícones — largura constante em qualquer locale
  — passa a ser o final do grupo e ancora na mesma borda direita nos quatro slots. De quebra, o
  botão que carrega o aviso de irreversibilidade ganha a posição adjacente ao nome do arquivo sobre
  o qual age. `AppFileActions` não muda: o slot deixa de usar o slot `children` e renderiza o upload
  como irmão anterior.
- **D15 (derivada) — executor `claude`, worktree `fix-frontend`, branch
  `feat/bd16-perfil-e-kit-compartilhado` a partir de `main@135e468`.** O bloco é julgamento de
  acessibilidade e de cor sobre `shared/ui`, toca a lei §5.6 (customização de Prime mora no wrapper)
  e o ADR-16, e o gate final é medição no navegador — critérios que o `/planejar-bloco` mapeia para
  `claude`, não para paths fechados com verificação executável. Frontend puro: a pendência P-03
  (toque de backend exige main tree) não dispara.

## 3. Arquivos

| Path | Estado | Papel |
|---|---|---|
| `frontend/src/shared/ui/FormSection/FormSection.tsx` | editado | D1, P-36 sítio 1 |
| `frontend/src/shared/ui/FormField/FormField.tsx` | editado | D5: `useId`, `htmlFor`, provider |
| `frontend/src/shared/ui/FormField/fieldContext.ts` | novo | D5: contexto do campo |
| `frontend/src/shared/ui/AppInputText/AppInputText.tsx` | editado | D5: consome contexto (`id`) |
| `frontend/src/shared/ui/AppTextarea/AppTextarea.tsx` | editado | D5: consome contexto (`id`) |
| `frontend/src/shared/ui/AppPassword/AppPassword.tsx` | editado | D5 (`inputId`) + D6 (Espaço) |
| `frontend/src/shared/ui/AppDropdown/AppDropdown.tsx` | editado | D5: consome contexto (`inputId`) |
| `frontend/src/shared/ui/AppDatePicker/AppDatePicker.tsx` | editado | D5: consome contexto (`inputId`) |
| `frontend/src/shared/ui/AppTag/AppTag.tsx` | editado | D2 |
| `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx` | editado | D3 + D-18 + D13 |
| `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx` | editado | D11 |
| `frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx` | editado | D12 |
| `frontend/src/shared/ui/AppCard/AppCard.tsx` | editado | D4: variante nova |
| `frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx` | editado | D-30 |
| `frontend/src/shared/config/brand.ts` | editado | D7: `BRAND_COLOR` some, `APP_VERSION` fica |
| `frontend/src/shared/styles/brand-theme.css` | editado | D7: comentário da `--brand` deixa de citar a fonte JS |
| `frontend/src/features/catalog/components/Course/CoursesTable.tsx` | editado | P-36 sítio 2 |
| `frontend/src/features/identity/components/Profile/ProfilePage.tsx` | editado | D8 (ordem) + D-26 |
| `.../Profile/ProfileIdentityCard.tsx` | editado | D4 + D8 (faixa) + D13 |
| `.../Profile/ProfileSummaryCard.tsx` | editado | D4 |
| `.../Profile/ProfileDocumentSlot.tsx` | editado | D10 + D11 + D14 |
| `.../Profile/ProfilePersonalSection.tsx` | editado | D13 (telefone) |
| `frontend/eslint.config.js` | editado | D7: régua de valor |
| `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` | editados | D-26 (subtítulo ramificado), D11 (nome do upload) |

Testes: `frontend/src/shared/ui/FormField/FormField.test.tsx` e
`frontend/src/shared/ui/AppFileRow/AppFileRow.test.tsx` **já existem** e são editados;
`frontend/src/shared/ui/AppTag/AppTag.test.tsx` é **novo**. Detalhe no §8.

## 4. Frente A — contraste e contenção

### 4.1 `FormSection` (D1, P-36 sítio 1)

O `import { BRAND_COLOR }` sai; o título passa a `--text-color` e a hierarquia vem de peso, caixa
alta e tracking. O docblock atual explica por que o componente existe (13 cópias com cinza Tailwind
fixo) — ganha o segundo parágrafo, dizendo por que a cor de marca saiu e o que a substituiu, para
que ninguém a devolva por parecer "sem graça".

### 4.2 `CoursesTable` (P-36 sítio 2)

`<i className="pi pi-book" style={{ color: BRAND_COLOR, … }} />` — ícone, régua 3:1 de elemento
gráfico, medido em 2,53:1 sobre humo. Vai para variável de tema. É o segundo e último consumidor de
`BRAND_COLOR`.

### 4.3 `AppTag` (D2, D9)

As quatro severidades de tom — `success`, `info`, `warning`, `danger` — passam a compor fundo e
tinta no wrapper, como o `ACCENT` já faz. A
tinta vem de `--tone-*-ink`, que **já existe** e já é exportada por `shared/styles/tokens.ts`
(`successText`, `infoText`, `warningText`, `dangerText`) e já troca o degrau da rampa por tema. Sem
hex novo, sem escala nova. `secondary` fica intocada (D9). O docblock do arquivo cresce com a
medição que motivou a mudança, no mesmo formato do parágrafo do `secondary`.

**Risco de mecânica declarado:** o Prime aplica as classes `.p-tag-success` etc. com a folha do
tema; o `style` inline do wrapper vence por especificidade — é como o `ACCENT` e o `NEUTRO` já
funcionam hoje. Se algum sítio passar `style` próprio, o spread atual (`{ ...toneStyle, ...style }`)
mantém a precedência do chamador; isso não muda.

### 4.4 `AppFileRow` (D3, D-01, D-18, D13)

- `flex-wrap` no contêiner, com o bloco de nome/metadados mantendo `min-w-0 flex-1` para que o
  truncamento continue funcionando **antes** da quebra e o `title` (já existente desde 2026-08-16)
  continue sendo a leitura completa.
- `new Date(createdAt).toLocaleDateString()` vira `formatDate(new Date(createdAt))` — o
  `shared/lib/datetime.ts` resolve pelo idioma da interface, não do navegador. `created_at` é
  data-hora completa, então **não** carrega o problema de fuso que o `valid_until` só-data carrega;
  a correção aqui é de idioma, e o `T00:00:00` do `ProfileDocumentSlot` continua sendo o mecanismo
  certo lá.
- `font-mono` na linha de metadados (data e tamanho), por D13.

### 4.5 `ProfileDocumentSlot` (D10, D14)

Status e validade numa linha só, em tinta de corpo; o caso `valid_until: null` deixa de imprimir. O
upload sai do slot `children` do `AppFileActions` e vira irmão **anterior** ao par de ícones (D14).
O comentário longo sobre `T00:00:00` e `formatDate` continua válido e permanece.

### 4.6 `AppPhotoField` (D-30)

`Eliminar foto` — que apaga sem desfazer — recebe `severity="danger"`. Hoje é texto celeste
imediatamente abaixo do `Reemplazar` celeste preenchido: das duas, a destrutiva é a de **menor**
peso visual. A tinta vem da folha do Prime, não de token inline: é botão, e botão recebe severidade.

## 5. Frente B — semântica e teclado

### 5.1 O contexto do campo (D5, P-37)

`FormField` deixa de ser um `<label>` envolvente e passa a `<div>` com `<label htmlFor>` irmão do
controle. O id vem de `useId()`; a mensagem de erro ganha `id={`${id}-error`}`. O que o contexto
publica:

```ts
export type FieldContextValue = {
  id: string
  invalid: boolean
  describedBy?: string
}
```

O provider envolve **apenas** o ramo com controle — em `readOnly` não há nada a associar. Cada
wrapper lê o contexto e aplica na própria porta, **com a prop do chamador vencendo sempre**:

| Wrapper | Porta do id | Notas |
|---|---|---|
| `AppInputText` | `id` | `InputText` do Prime é input nativo |
| `AppTextarea` | `id` | idem |
| `AppPassword` | `inputId` | `id` cai na `<span>` raiz (`password.cjs.js:704`); só `inputId` chega ao input |
| `AppDropdown` | `inputId` | `dropdown.cjs.js:1577` |
| `AppDatePicker` | `inputId` | `calendar.cjs.js:3900` |

`aria-invalid` e `aria-describedby` seguem o mesmo caminho: passados como props, chegam ao input
pelo spread de props restantes de cada componente do Prime — o que o **DoD mede no navegador**, não
deduz do código.

**`NestedField` fica fora, e é decisão, não esquecimento.** Ele não tem label própria — é a razão de
existir dele —, então não participa do defeito que a P-37 registra (nome acessível somando o
rótulo). Associar o erro dele por `aria-describedby` é melhoria legítima e vira débito próprio, não
carona neste bloco.

### 5.2 `AppPassword` — Espaço (D6)

O olho já é `role="button"` com `aria-label` que alterna (`common.showPassword`/`common.hidePassword`).
Falta a segunda tecla: Enter alterna, Espaço não. Ganha handler de tecla no mesmo `pt` que hoje
crava papel e rótulo, com `preventDefault` para Espaço não rolar a página. **Sem `aria-pressed`**
(D6) — e o docblock existente ganha a frase que explica a recusa, ao lado da que explica a troca de
`switch` por `button`, para que a próxima revisão não reabra o mesmo item.

### 5.3 `AppFileUpload` — papel e nome (D11)

`role="button"` vira invariante do wrapper, pinado como o `customUpload` já é. O nome acessível vem
de prop nova do wrapper, preenchida pelo chamador; nos slots documentais ela carrega o tipo
(`Reemplazar currículum`, não `Reemplazar`). Os oito sítios do `AppFileUpload` recebem o papel de
graça; o nome específico é preenchido onde há ambiguidade de repetição — os quatro slots do perfil e
os do redator.

### 5.4 `AppFilePreviewDialog` — Escape (D12)

Foco ao contêiner do diálogo na montagem, e docblock declarando o limite que o navegador é dono.

## 6. Frente C — conteúdo e densidade

### 6.1 Subtítulo (D-26)

`ProfilePage.tsx:28` e `:40` passam `t('profile.subtitle')` sem ramificar, enquanto o corpo ramifica
em `profile.redator` (linhas 56 e 61). O subtítulo passa a usar **o mesmo predicado do corpo** —
`profile.redator !== null`, não uma checagem de role — com duas chaves i18n nos três locales. É o
item mais barato da fila e já enganou uma medição de fechamento em 2026-08-17.

### 6.2 A marca do corte (D4)

`AppCard` ganha `variant="sunken"`: fundo `--surface-ground` e borda da mesma cor, para o recuo não
mexer no box model. A variante decide a superfície, o `tone` continua decidindo o acento — mesma
ortogonalidade que o `stat` já estabelece (ele também força `--surface-card` independentemente do
tom). `--app-card-tone-text` continua publicado.

`ProfileIdentityCard` e `ProfileSummaryCard` passam a `sunken`. As seções de self-service ficam
como estão.

**Custo aceito e declarado (aprovado pelo João):** a foto É self-service e mora no cartão que recua
— a spec do bloco anterior a pôs ali de propósito (`ProfileIdentityCard.tsx:11-13`: "mora ao lado do
nome porque é assim que o usuário a reconhece como sua"). A superfície marca a natureza **dominante**
do bloco; o botão de foto carrega a própria afordância por ser botão com rótulo. O CTA do
`ProfileSummaryCard` é navegação, não mutação, e não abre exceção nenhuma.

### 6.3 Ordem e faixa (D8, D13)

Abaixo de `xl`, os dois filhos do grid trocam de ordem por `order-*`, com a ordem de `xl`
preservada. `ProfileIdentityCard` vira faixa horizontal na mesma faixa de largura: avatar, nome e
papel em linha, e os campos de `Identidad` em duas colunas de leitura. **O papel deixa de existir
como `FormField`** (`ProfileIdentityCard.tsx:38-42`) e fica só na faixa — hoje `Juan Morales`
aparece três vezes simultaneamente na tela e `Redactor` também três. RUT, telefone e datas recebem
`font-mono` (D13).

## 7. A catraca (D7, P-36)

O seletor mede a **forma** do defeito, como o `DISABLED_READONLY` aprendeu a fazer: literal em
propriedade de cor cujo valor não é referência de tema.

- Propriedades cobertas: `color`, `background`, `backgroundColor`, as variantes de `border*Color`
  (incluindo `borderInlineStartColor`, que o `AppCard` usa), `outlineColor`, `fill`, `stroke`,
  `caretColor`, `accentColor`, `textDecorationColor`, `columnRuleColor`.
- Valores aceitos: os que começam por `var(` ou `color-mix(`, mais as palavras-chave que não são cor
  (`transparent`, `inherit`, `currentColor`, `none`, `unset`, `initial`).
- Duas grafias de chave: `Property` com `key.name` (identificador) e com `key.value` (chave em
  string). A segunda existe porque `{ 'background': '#fff' }` é o mesmo defeito com outra sintaxe.
- Template literal na mesma propriedade entra pela mesma régua, olhando o **primeiro quasi**: é a
  grafia do `AppFileRow` e do `AppCard` (`` `color-mix(in srgb, ${hue} 12%, var(--surface-card))` ``),
  e ela passa; um `` `#25A5E4` `` não passaria.

**O que o seletor deliberadamente NÃO alcança: Identifier.** `style={{ color: ALGUMA_CONST }}` é
inalcançável por seletor sintático sem resolver o binding — e é exatamente por isso que a **D7**
mata `BRAND_COLOR` em vez de só adicionar a regra. Depois deste bloco não sobra nenhuma constante de
cor crua exportada em `src/`; se alguma nascer, ela nasce visível numa revisão de código, não
escondida atrás de uma guarda que dá verde.

**Onde a regra entra, e por quê não em bloco novo.** O `no-restricted-syntax` sofre merge **raso**
entre blocos que casam o mesmo glob: quem vem depois apaga o array de quem vem antes por inteiro, em
silêncio — Q-2 de 2026-08-04, e a Task 7 do BD-3 já tropeçou nisso. Os seletores novos entram **nos
arrays existentes**, não em blocos próprios:

| Bloco | Glob | Já carrega `COR_HARDCODED`? |
|---|---|---|
| componentes de feature | `src/features/*/components/**/*.{ts,tsx}` (menos `CATRACA_COR`) | sim |
| catraca de cor | os 4 arquivos de `CATRACA_COR` | **não** |
| resto de features | `src/features/**/*.{ts,tsx}` (menos `components/**` e `useRedatorForm.ts`) | sim |
| shared | `src/shared/**/*.tsx` | sim |
| app | `src/app/**/*.tsx` | sim |

Os cinco recebem a régua nova — **inclusive o bloco `CATRACA_COR`**. A exceção que aqueles quatro
arquivos carregam é sobre classe de paleta Tailwind, não sobre literal em `style`, e a medição
mostra que eles não têm nenhum. Uma guarda que nasce com exceção herdada de outro defeito é a
armadilha que a ficha da P-36 descreve.

**A prova é nos dois sentidos.** Rodar `pnpm lint` verde não prova nada sozinho — prova que a regra
não quebrou nada. A prova de que ela **pega** é reintroduzir `style={{ color: '#25A5E4' }}` num
arquivo coberto, ver o lint nomear o arquivo e a regra, e desfazer.

## 8. Testes e verificação

Entram no runner (`pnpm test`, vitest/jsdom):

- **`FormField`** — o campo com controle publica id e o rótulo o referencia; `readOnly` não monta
  provider; `error` gera o id da mensagem e o publica em `describedBy`; prop de id do chamador
  vence a do contexto.
- **`AppFileRow`** — o teste existente cobre `title` e truncamento; ganha a asserção de que a data
  sai pelo `formatDate` (idioma da interface), no molde do que o arquivo já faz.
- **`AppTag`** — o tom aplica fundo e tinta compostos e `secondary` continua no caminho `NEUTRO`.

Teste de componente com PrimeReact no jsdom está **dentro** do corte do runner — a P-38 registra
que a rule `frontend-fsliced.md` diz o contrário e que vale a medição, não o texto.

Gate: `pnpm build` + `pnpm lint` + `pnpm test`, todos verdes.

### DoD — as três provas que o bloco não pode entregar sem

1. **A P-36 fecha nos dois sítios e a guarda é provada nos dois sentidos.** `FormSection.tsx:19`
   (texto, 4,5:1) e `CoursesTable.tsx:43` (ícone, 3:1) medidos no navegador nos dois temas; a régua
   nova pegando um literal reintroduzido e nomeando o arquivo.
2. **A P-37 é medida, não conferida.** `accessibleName` no navegador nos dois sítios do molde e numa
   amostra dos wrappers de controle — não o atributo lido no DOM. Junto: `aria-invalid` e
   `aria-describedby` chegando ao input de cada um dos cinco wrappers.
3. **O alcance fora de `/perfil` é provado no navegador.** `FormSection` em **16** arquivos,
   `AppTag` em **31**, `FormField` em 86 chamadas (31 `readOnly`, 55 com controle, 23 arquivos),
   `AppFileRow` em 4 sítios de feature, `AppPassword` em 5 sítios, `AppFileUpload` em 8. O plano
   declara os sítios representativos; o DoD mostra que nenhum regrediu — inspeção visual, não
   dedução.

Mais o de sempre: `/lotus-ui-review` sobre `/perfil` nos dois papéis, nos três locales, nos dois
temas e em 390px / 1024px / 1440px, com as medições do D-19, D-20, D-21, D-22 e D-27 refeitas contra
os números que a auditoria registrou.

## 9. Riscos e débitos

- **A faixa horizontal da D8 esbarra no `scale-200` que a DS-05 deixou fora.** `AppPhotoField`
  renderiza o avatar dentro de `transform scale-200` com `pt-10` compensando embaixo — geometria que
  foi desenhada para coluna, não para faixa. Se a faixa recortar ou desalinhar no navegador, a DS-05
  volta como bloqueio da D8 e a decisão é do João: ou ela entra neste bloco, ou a faixa fica só para
  a parte de baixo do cartão. **Medir antes de escrever o layout**, não depois.
- **`--brand` no CSS e `CELESTE` no gerador continuam sendo duas grafias do mesmo hex.** Morrer o
  `BRAND_COLOR` fecha o lado TS; `scripts/generate-brand-theme.mjs` carrega o próprio `'#25a5e4'` e
  não importa `brand.ts`, e `scripts/` está fora dos globs do lint. Isso é pré-existente e **não** é
  o que este bloco corrige — mas o comentário de `brand-theme.css:10` ("brand.ts é a fonte JS") fica
  **falso** no instante em que a constante some, e é corrigido no mesmo commit. Unificar gerador e
  folha é débito próprio.
- **Colisão de ID no backlog, não resolvida aqui.** Existem dois `D-18`: o do `AppFileRow` (coberto
  por este bloco) e o do `description` das pendências do Dashboard em espanhol fixo no backend, em
  `## Travados em decisão`. Renumerar é decisão do João — mexer no ID sem ele quebra as referências
  cruzadas já escritas dos dois lados. Este bloco cobre **o do `AppFileRow`** e deixa o registro
  como está.
- **A ficha da P-36 carrega uma contagem vencida.** Ela mediu 11 consumidores de `FormSection` em
  2026-08-13; a medição de hoje dá **16** — os cinco arquivos de `Profile/` nasceram depois. O DoD
  do BD-16 no `backlog.md` herdou o número velho. A correção do número é registro, e sai no
  fechamento junto com o encerramento das duas pendências.
- **`profile.documents.noValidity` fica órfã nos três locales.** A D10 deixa de renderizá-la.
  Remover chave i18n é varredura de outro tipo (nenhuma guarda protege paridade nem uso — só a
  sincronia de `<html lang>` é testada); a chave fica, declarada como órfã, e sai com a próxima
  limpeza de dicionário.
- **O `flex-wrap` da D3 alcança quatro contêineres de largura diferente.** A quebra é a resposta
  certa para os quatro, mas a largura em que cada um quebra é diferente, e o comportamento no
  comercial e na turma precisa ser **visto**, não inferido do perfil. Está no DoD, e é a parte dele
  com mais chance de revelar surpresa.

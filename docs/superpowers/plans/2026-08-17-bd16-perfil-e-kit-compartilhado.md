# BD-16 — `/perfil` + kit compartilhado: contraste, contenção, semântica e densidade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pagar os 15 débitos da auditoria de 2026-08-17 sobre `/perfil` e sobre os wrappers de
`shared/ui` que ela compartilha com o resto do produto — contraste que reprova AA, linha de arquivo
que vaza a viewport, nome acessível que soma o rótulo, e o corte por mutabilidade que só existe
acima de 1280px.

**Architecture:** A correção mora no wrapper de `shared/ui`, nunca na feature (lei §5.6). Três
frentes na ordem em que se pagam: contraste e contenção (A), semântica e teclado (B), conteúdo e
densidade (C). O kit compartilhado vem antes dos consumidores em `/perfil`, para que cada tela receba
o comportamento já testado. Cor vem só de variável do tema (ADR-16), e uma catraca de lint nova passa
a medir isso por VALOR, não por atributo.

**Tech Stack:** React 19 + TypeScript (Vite) · PrimeReact via `shared/ui` · Tailwind v4 (só layout) ·
vitest + jsdom + @testing-library/react · ESLint flat config com `no-restricted-syntax`.

**Spec:** [`2026-08-17-bd16-perfil-e-kit-compartilhado-design.md`](../specs/2026-08-17-bd16-perfil-e-kit-compartilhado-design.md)

## Global Constraints

- **Cor vem de variável do tema.** Nenhum hex, `rgb()`, `hsl()` ou nome de cor CSS entra em código
  novo. Grafias aceitas: `var(--…)` e `color-mix(in srgb, …)`. (ADR-16)
- **Feature não importa PrimeReact direto** — só via `shared/ui` — **nem outra feature, nem para
  tipo.** (lei §5.6, ADR-05)
- **`src/shared/types/generated.ts` não se edita à mão.** (lei §5.3, ADR-04)
- **Toda chave i18n nova entra nos TRÊS locales no mesmo commit** — `es-CL` é a referência, e
  `src/shared/config/locales/parity.test.ts` reprova a que faltar.
- **Componente de feature fica sob 150 linhas** (`max-lines` em `src/features/*/components/**`).
- **Override do wrapper é pinado DEPOIS do spread do chamador** quando é invariante (papel ARIA, nome
  acessível, largura de campo); `pt` funde por `mergePt`, nunca por spread raso.
- **Todos os comandos rodam de `frontend/`.** Node 22 + pnpm, nativo no WSL — sem container.
- **Gate de cada task:** `pnpm test` verde. **Gate do bloco:** `pnpm build` + `pnpm lint` +
  `pnpm test`, os três verdes.
- **Branch:** `feat/bd16-perfil-e-kit-compartilhado`, a partir de `main@135e468`, no worktree
  `fix-frontend`. Frontend puro — a pendência P-03 não dispara.

---

## File Structure

| Path | Estado | Responsabilidade | Task |
|---|---|---|---|
| `src/shared/ui/FormSection/FormSection.tsx` | modificado | título de seção deixa a tinta de marca | 1 |
| `src/shared/ui/FormSection/FormSection.test.tsx` | **novo** | trava a D1 (título em tinta de corpo) | 1 |
| `src/features/catalog/components/Course/CoursesTable.tsx` | modificado | ícone de curso deixa a tinta de marca | 1 |
| `src/shared/config/brand.ts` | modificado | `BRAND_COLOR` morre; `APP_VERSION` fica | 2 |
| `src/shared/styles/brand-theme.css` | modificado | comentário da `--brand` deixa de citar fonte JS | 2 |
| `eslint.config.js` | modificado | régua de valor para cor em `style` | 2 |
| `src/shared/ui/AppTag/AppTag.tsx` | modificado | tom sai FILLED, vai a fundo suave + tinta | 3 |
| `src/shared/ui/AppTag/AppTag.test.tsx` | **novo** | trava a mecânica de tom e o `secondary` | 3 |
| `src/shared/ui/AppFileRow/AppFileRow.tsx` | modificado | quebra por contêiner, data por locale, mono | 4 |
| `src/shared/ui/AppFileRow/AppFileRow.test.tsx` | modificado | + data no idioma da interface | 4 |
| `src/shared/ui/AppCard/AppCard.tsx` | modificado | variante `sunken` | 5 |
| `src/shared/ui/AppCard/AppCard.test.tsx` | **novo** | trava as três variantes | 5 |
| `src/shared/ui/FormField/fieldContext.ts` | **novo** | contrato id/`invalid`/`describedBy` | 6 |
| `src/shared/ui/FormField/FormField.tsx` | modificado | `<label htmlFor>` + provider | 6 |
| `src/shared/ui/FormField/FormField.test.tsx` | modificado | + associação e `aria-*` | 6 |
| `src/shared/ui/AppInputText/AppInputText.tsx` | modificado | consome contexto (`id`) | 7 |
| `src/shared/ui/AppTextarea/AppTextarea.tsx` | modificado | consome contexto (`id`) | 7 |
| `src/shared/ui/AppDropdown/AppDropdown.tsx` | modificado | consome contexto (`inputId`) | 7 |
| `src/shared/ui/AppDatePicker/AppDatePicker.tsx` | modificado | consome contexto (`inputId`) | 7 |
| `src/shared/ui/AppPassword/AppPassword.tsx` | modificado | consome contexto (`inputId`) | 7 |
| `src/shared/ui/FormField/fieldAssociation.test.tsx` | **novo** | os 5 wrappers dentro do `FormField` | 7 |
| `src/shared/ui/AppPassword/AppPassword.test.tsx` | modificado | + tecla Espaço no olho | 8 |
| `src/shared/ui/AppFileUpload/AppFileUpload.tsx` | modificado | `role="button"` + nome acessível | 9 |
| `src/shared/ui/AppFileUpload/AppFileUpload.test.tsx` | **novo** | trava papel e nome | 9 |
| `src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx` | modificado | foco ao contêiner na montagem | 10 |
| `src/shared/ui/AppPhotoField/AppPhotoField.tsx` | modificado | destrutiva em severidade `danger` | 11 |
| `src/features/identity/components/Profile/ProfileDocumentSlot.tsx` | modificado | validade na linha do status, ordem das ações, nome do upload | 12 |
| `src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx` | modificado | + as três mudanças acima | 12 |
| `src/shared/config/locales/{es-CL,pt-BR,en}.json` | modificados | chaves novas (upload nomeado, subtítulo ramificado) | 12, 13 |
| `src/features/identity/components/Profile/ProfilePage.tsx` | modificado | subtítulo ramificado; ordem abaixo de `xl` | 13, 15 |
| `src/features/identity/components/Profile/ProfileIdentityCard.tsx` | modificado | superfície recuada, faixa, mono, fim da duplicata | 14, 15 |
| `src/features/identity/components/Profile/ProfileSummaryCard.tsx` | modificado | superfície recuada | 14 |
| `src/features/identity/components/Profile/ProfilePersonalSection.tsx` | modificado | telefone em `font-mono` | 15 |

---

## Task 1: A tinta de marca sai do título de seção e do ícone de curso

Fecha a **D1** e paga os **dois sítios da P-36**. A P-36 mede 2,77:1 no celeste sobre humo, mas o
contraste é sintoma: a mesma tinta pinta sete papéis na mesma dobra, e uma cor que significa sete
coisas não significa nenhuma. Hierarquia de título passa a ser peso e tracking.

**Files:**
- Modify: `frontend/src/shared/ui/FormSection/FormSection.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx:6,43`
- Test: `frontend/src/shared/ui/FormSection/FormSection.test.tsx` (novo)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `FormSection` sem o import de `BRAND_COLOR` — pré-requisito da Task 2, que só pode
  apagar a constante quando ela ficar com zero consumidores.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/ui/FormSection/FormSection.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FormSection } from './FormSection'

afterEach(cleanup)

/**
 * A P-36 já foi reaberta três vezes, sempre pela mesma via: o título de seção
 * volta a receber a tinta de marca porque "sem cor fica sem graça". A decisão
 * (spec D1) é que a marca preenchida passa a valer só para a ação primária do
 * cartão, e que a hierarquia do título vem de PESO e TRACKING. Isto é o
 * mecanismo dessa decisão — sem ele, ela é só um parágrafo de docblock.
 */
describe('FormSection', () => {
  it('pinta o título com a tinta de CORPO, não com a de marca', () => {
    render(<FormSection title="Identidad" />)

    const titulo = screen.getByRole('heading', { name: 'Identidad' })
    expect(titulo.getAttribute('style')).toContain('var(--text-color)')
  })

  it('carrega a hierarquia no peso e no tracking, não na cor', () => {
    render(<FormSection title="Identidad" />)

    const titulo = screen.getByRole('heading', { name: 'Identidad' })
    expect(titulo.className).toContain('font-bold')
    expect(titulo.className).toContain('uppercase')
    expect(titulo.className).toContain('tracking-wide')
  })

  it('`spaced` acrescenta o respiro de cima sem mexer no resto', () => {
    render(<FormSection title="Seguridad" spaced />)

    expect(screen.getByRole('heading', { name: 'Seguridad' }).className).toContain('pt-2')
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que ele FALHA**

```bash
cd frontend && pnpm test -- FormSection
```

Esperado: **FAIL**. O primeiro caso reprova porque o `style` de hoje traz `#25A5E4` (via
`BRAND_COLOR`) e não `var(--text-color)`; o segundo reprova em `tracking-wide`, que ainda não existe.

- [ ] **Step 3: Implemente**

Substitua o conteúdo de `frontend/src/shared/ui/FormSection/FormSection.tsx`:

```tsx
export interface FormSectionProps {
  title: string
  /** Espaço acima, para seções que não são a primeira do diálogo. */
  spaced?: boolean
}

/**
 * Cabeçalho de seção dentro de um formulário. Apresentacional puro.
 *
 * Existia copiado em 13 lugares, com a cor cinza fixa em Tailwind — hardcoded
 * contra o ADR-16. Centralizar mata as duas coisas de uma vez.
 *
 * **A tinta de marca saiu daqui, e não volta (spec D1).** Ela media 2,77:1 sobre
 * o humo — reprova o 4,5:1 de texto —, mas o contraste era o sintoma: o celeste
 * pintava SETE papéis na mesma dobra de `/perfil` (título, ação primária, ação
 * destrutiva, secundária, upload, tag, ícone), e uma cor que significa sete
 * coisas não significa nenhuma. Subir o celeste até passar teria conservado a
 * ambiguidade. Hierarquia de título é trabalho de peso, caixa e tracking; a
 * marca preenchida passa a valer só para a ação primária do cartão. Há teste
 * travando isto — a P-36 já foi reaberta três vezes pela via do "sem cor fica
 * sem graça".
 */
export function FormSection({ title, spaced }: FormSectionProps) {
  return (
    <h3
      className={`text-sm font-bold tracking-wide uppercase ${spaced ? 'pt-2' : ''}`}
      style={{ color: 'var(--text-color)' }}
    >
      {title}
    </h3>
  )
}
```

- [ ] **Step 4: Rode o teste e confirme que ele PASSA**

```bash
cd frontend && pnpm test -- FormSection
```

Esperado: **PASS**, 3 casos.

- [ ] **Step 5: Pague o segundo sítio da P-36 — o ícone do `CoursesTable`**

Em `frontend/src/features/catalog/components/Course/CoursesTable.tsx`, apague a linha 6:

```tsx
import { BRAND_COLOR } from '@shared/config/brand'
```

E troque o `style` do ícone (linha 43):

```tsx
<i
  className="pi pi-book"
  style={{ color: 'var(--text-color-secondary)', fontSize: '1.25rem' }}
/>
```

Por que a secundária e não `--brand-ink`: o ícone é **marcador de tipo**, repetido em toda linha da
tabela — não é ação. Pintá-lo de marca é exatamente o acúmulo de papéis que a D1 desmonta. A
secundária é o que o `AppFileRow` já usa no ícone genérico de arquivo, então é reuso de decisão, não
escolha nova. E ela passa 4,5:1 como texto, logo passa com folga o 3:1 de elemento gráfico.

- [ ] **Step 6: Confirme que `BRAND_COLOR` ficou com zero consumidores**

```bash
cd frontend && grep -rn "BRAND_COLOR" src/
```

Esperado: **uma linha só** — `src/shared/config/brand.ts:4`, a própria declaração. Se aparecer
qualquer outro `src/`, ele é consumidor novo e precisa ser pago aqui antes de seguir.

- [ ] **Step 7: Rode a suíte inteira**

```bash
cd frontend && pnpm test
```

Esperado: **PASS**.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/ui/FormSection/ frontend/src/features/catalog/components/Course/CoursesTable.tsx
git commit -m "fix(ui): tira a tinta de marca do titulo de secao e do icone de curso

P-36 paga nos dois sitios. O contraste de 2,77:1 era sintoma: o celeste
pintava sete papeis na mesma dobra. Hierarquia de titulo passa a ser peso,
caixa e tracking; o icone de tipo vai para a secundaria, que e o que o
AppFileRow ja usa. Teste novo trava a decisao -- a P-36 ja foi reaberta
tres vezes pela via do 'sem cor fica sem graca'."
```

---

## Task 2: `BRAND_COLOR` morre e a catraca ganha régua de VALOR

Fecha a **D7** e a metade estrutural da **P-36**. A guarda `COR_HARDCODED` mede `className` e é cega
a `style={{ color: '#25A5E4' }}` — e o desenho sempre adiou porque cor por `style` é a grafia
**certa** quando o valor é `var(--…)`. A saída é medir o valor. A medição decide o resto: há **zero**
literais de cor crua em propriedade de cor em todo `src/`, então a guarda nasce **sem nenhum
`ignores`**.

**Files:**
- Modify: `frontend/src/shared/config/brand.ts`
- Modify: `frontend/src/shared/styles/brand-theme.css:10`
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: da Task 1, `BRAND_COLOR` com zero consumidores em `src/`.
- Produces: `COR_LITERAL_EM_STYLE` (array de 4 seletores) exportado no escopo do módulo de
  `eslint.config.js`, espalhado nos cinco blocos que carregam `no-restricted-syntax`.

- [ ] **Step 1: Apague `BRAND_COLOR`**

Substitua o conteúdo de `frontend/src/shared/config/brand.ts`:

```ts
// A cor primária do produto vive SÓ no CSS, como `--brand` em
// shared/styles/brand-theme.css. Havia aqui um `BRAND_COLOR` com o mesmo hex,
// e ele era a porta de fuga da catraca de cor: o seletor mede literal, não
// resolve binding, então `style={{ color: BRAND_COLOR }}` passava verde. Os
// dois consumidores foram pagos (FormSection, CoursesTable) e a constante saiu
// junto — sem segunda grafia, não há o que perseguir (spec D7).
export const APP_VERSION = 'v0.1.0'
```

- [ ] **Step 2: Corrija o comentário que a remoção deixou falso**

`frontend/src/shared/styles/brand-theme.css:10` diz que `brand.ts` é a fonte JS. Troque a linha:

```css
  --brand: #25a5e4; /* celeste-lotus — fonte CSS única; não há mais fonte JS (spec D7 do BD-16) */
```

- [ ] **Step 3: Rode build e lint para confirmar que a remoção não quebrou nada**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: **os dois verdes**. `tsc -b` reprovaria qualquer import remanescente de `BRAND_COLOR`.

- [ ] **Step 4: Escreva a régua nova em `eslint.config.js`**

Logo abaixo da definição de `COR_HARDCODED` (linha 110-115), acrescente:

```js
// Propriedades cujo VALOR é cor. `borderInlineStartColor` está aqui porque é a
// que o `AppCard` usa no trilho do `stat`.
const PROPS_DE_COR = [
  'color', 'background', 'backgroundColor',
  'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderInlineStartColor', 'borderInlineEndColor', 'borderBlockStartColor', 'borderBlockEndColor',
  'outlineColor', 'fill', 'stroke', 'caretColor', 'accentColor',
  'textDecorationColor', 'columnRuleColor',
].join('|')

// Referência de tema, ou palavra-chave que não é cor. Tudo o mais é literal cru.
const VALOR_DE_TEMA = 'var\\(|color-mix\\(|transparent$|inherit$|currentColor$|none$|unset$|initial$'

const MSG_COR_EM_STYLE =
  'Cor crua em propriedade de cor: cor vem de variável do tema (ADR-16). ' +
  'Use var(--text-color-secondary), color-mix(in srgb, var(--…) 15%, var(--surface-card)) e irmãs.'

// A catraca `COR_HARDCODED` acima mede `className` e é CEGA a `style`. Esta mede
// o VALOR, que é a única régua possível aqui: cor por `style` é a grafia CERTA
// quando o valor é `var(--…)`, e foi exatamente isso que adiou a guarda desde
// 2026-08-13 (P-36). A medição que a destravou: `src/` tem ZERO literais de cor
// crua em propriedade de cor, então ela nasce sem nenhum `ignores` — que era o
// medo registrado na ficha ("nasceria verde com a exceção embutida").
//
// Descendente, não filho direto: o valor real da propriedade costuma ser
// ternário (`AppCard.tsx` — `hue && !stat ? color-mix(…) : 'var(--surface-card)'`),
// e um seletor `>` seria contornado por toda condicional. `Literal[raw=/^['"]/]`
// restringe a literal de STRING: sem isso, o `0` de um `arr[0]` dentro da
// expressão contaria como cor crua.
//
// O que ela deliberadamente NÃO alcança é Identifier — resolver binding não é
// trabalho de seletor sintático. É por isso que `BRAND_COLOR` foi APAGADA em vez
// de só regulada: sem segunda grafia da marca em JS, não há porta de fuga.
const COR_LITERAL_EM_STYLE = [
  {
    selector: `Property[key.name=/^(${PROPS_DE_COR})$/] Literal[raw=/^['"]/]:not([value=/^(${VALOR_DE_TEMA})/])`,
    message: MSG_COR_EM_STYLE,
  },
  // `{ 'background': '#fff' }` é o mesmo defeito com a chave em string.
  {
    selector: `Property[key.value=/^(${PROPS_DE_COR})$/] Literal[raw=/^['"]/]:not([value=/^(${VALOR_DE_TEMA})/])`,
    message: MSG_COR_EM_STYLE,
  },
  // Template literal entra pela mesma régua, olhando o PRIMEIRO quasi — é a
  // grafia do `AppFileRow` e do `AppCard`, e `color-mix(in srgb, ${hue} …` passa.
  {
    selector: `Property[key.name=/^(${PROPS_DE_COR})$/] TemplateLiteral:not([quasis.0.value.raw=/^(var\\(|color-mix\\()/])`,
    message: MSG_COR_EM_STYLE,
  },
  {
    selector: `Property[key.value=/^(${PROPS_DE_COR})$/] TemplateLiteral:not([quasis.0.value.raw=/^(var\\(|color-mix\\()/])`,
    message: MSG_COR_EM_STYLE,
  },
]
```

- [ ] **Step 5: Ligue a régua nos CINCO blocos — nunca em bloco novo**

`no-restricted-syntax` sofre merge **raso** entre blocos que casam o mesmo glob: quem vem depois
apaga o array de quem vem antes por inteiro, em silêncio (Q-2 de 2026-08-04; a Task 7 do BD-3 já
tropeçou nisso). Espalhe `...COR_LITERAL_EM_STYLE` nos arrays que já existem:

| Linha (aprox.) | `files` | Como fica |
|---|---|---|
| 195 | `src/features/*/components/**/*.{ts,tsx}` (com `ignores: CATRACA_COR`) | `['error', ...REGRAS_COMPONENTE_FEATURE, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO]` |
| 205 | `CATRACA_COR` | `['error', ...REGRAS_COMPONENTE_FEATURE, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO]` |
| 226 | `src/features/**/*.{ts,tsx}` | `['error', FORMDATA_FORA_DO_HELPER, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO]` |
| 347 | `src/shared/**/*.tsx` | `['error', DISABLED_READONLY, DISABLED_READONLY_ESTATICO, COR_HARDCODED, ...COR_LITERAL_EM_STYLE]` |
| 373 | `src/app/**/*.tsx` | `['error', COR_HARDCODED, ...COR_LITERAL_EM_STYLE]` |

**O bloco `CATRACA_COR` recebe a régua nova também**, embora não carregue `COR_HARDCODED`. A exceção
daqueles quatro arquivos é sobre classe de paleta Tailwind, não sobre literal em `style`, e a medição
mostra que eles não têm nenhum. Guarda que nasce com exceção herdada de outro defeito é a armadilha
que a ficha da P-36 descreve. Acrescente este comentário acima do bloco:

```js
  // A régua de VALOR entra aqui também, e sem exceção: o que estes 4 arquivos
  // carregam é a exceção da classe Tailwind, não a de cor em `style` — e eles
  // não têm nenhuma (medido em 2026-08-17).
```

- [ ] **Step 6: Prove o sentido "não quebrou nada"**

```bash
cd frontend && pnpm lint
```

Esperado: **verde, zero erros.**

> **Se aparecer erro:** ele é dado, não ruído. Leia o arquivo apontado. Se for falso positivo por
> literal de string dentro de acesso computado (`TONE_HUE['info']`), a correção é acrescentar
> `:not(MemberExpression > Literal)` aos dois primeiros seletores — e registrar a forma achada no
> commit. Não relaxe a régua para "passar".

- [ ] **Step 7: Prove o sentido "ela pega" — o passo que o lint verde NÃO prova**

Introduza o defeito de propósito em `frontend/src/shared/ui/FormSection/FormSection.tsx`:

```tsx
      style={{ color: '#25A5E4' }}
```

Rode:

```bash
cd frontend && pnpm lint
```

Esperado: **FAIL**, nomeando `src/shared/ui/FormSection/FormSection.tsx` e a mensagem
`Cor crua em propriedade de cor`. Confira também o ternário e a chave em string, que é o que o
seletor descendente existe para pegar — reintroduza temporariamente em `AppCard.tsx`:

```tsx
    background: hue && !stat ? '#ffffff' : 'var(--surface-card)',
```

Esperado: **FAIL** também nesse arquivo. **Desfaça as duas introduções** (`git checkout --` nos dois
arquivos) e confirme lint verde antes de seguir.

- [ ] **Step 8: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes**.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/shared/config/brand.ts frontend/src/shared/styles/brand-theme.css frontend/eslint.config.js
git commit -m "feat(lint): regua de valor para cor em style, e BRAND_COLOR morre

Fecha a metade estrutural da P-36. A catraca COR_HARDCODED media className
e era cega a style={{ color: '#25A5E4' }}; o que sempre adiou a guarda e
que cor por style e a grafia CERTA quando o valor e var(--...). A regua
nova mede o VALOR: literal de string em propriedade de cor que nao comece
por var( ou color-mix( e defeito. Seletor descendente, porque o valor real
costuma ser ternario -- um filho direto seria contornado por toda
condicional.

Nasce sem nenhum ignores, inclusive no bloco CATRACA_COR: src/ tem zero
literais de cor crua, medido em 2026-08-17. Entra nos cinco arrays
existentes e em nenhum bloco novo -- no-restricted-syntax funde raso e
quem vem depois apaga quem vem antes (Q-2, 2026-08-04).

BRAND_COLOR sai junto: o seletor nao alcanca Identifier, entao ela seria a
porta de fuga. Zero consumidores depois da task anterior."
```

---

## Task 3: `AppTag` de tom sai do preenchido saturado

Fecha a **D2** e a **D9**. `Vigente` mede branco sobre `rgb(34,197,94)` a 12px/700 — **2,28:1** —, e
as tags de curso, branco sobre `rgb(14,165,233)` — **2,77:1**. 12px bold não é texto grande para a
WCAG (o corte é 18,66px), então a régua é 4,5:1 e as duas reprovam. A mecânica já existe no mesmo
arquivo, como `ACCENT`.

**Files:**
- Modify: `frontend/src/shared/ui/AppTag/AppTag.tsx`
- Test: `frontend/src/shared/ui/AppTag/AppTag.test.tsx` (novo)

**Interfaces:**
- Consumes: `dangerText`, `infoText`, `successText`, `warningText` de `src/shared/styles/tokens.ts`
  (já existem; resolvem para `var(--tone-*-ink)`, que troca o degrau da rampa por tema).
- Produces: `AppTag` com `style` inline em toda severidade de tom. A prop `tone="accent"` e
  `severity="secondary"` seguem com o comportamento de hoje.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/ui/AppTag/AppTag.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppTag } from './AppTag'

afterEach(cleanup)

function tag(nome: string) {
  return screen.getByText(nome).closest('.p-tag') as HTMLElement
}

/**
 * O tom PREENCHIDO reprovava AA: `Vigente` media 2,28:1 e as tags de curso
 * 2,77:1, ambas branco sobre saturado a 12px/700 — e 12px bold não é "texto
 * grande" para a WCAG (o corte é 18,66px), então a régua é 4,5:1. A correção
 * (spec D2) é a mecânica que o `ACCENT` deste mesmo arquivo já usa: fundo
 * composto com `--surface-card` e tinta de tom, que é a tese que o passe de
 * 2026-08-17 fixou no Dashboard — cor de sinal em fundo, texto em contraste
 * cheio.
 */
describe('AppTag — tom não preenche mais', () => {
  it.each([
    ['success', 'green', '--tone-success-ink'],
    ['info', 'blue', '--tone-info-ink'],
    ['warning', 'yellow', '--tone-warning-ink'],
    ['danger', 'red', '--tone-danger-ink'],
  ] as const)('%s compõe fundo suave e tinta de tom', (severity, hue, ink) => {
    render(<AppTag value={severity} severity={severity} />)

    const style = tag(severity).getAttribute('style') ?? ''
    expect(style).toContain('color-mix')
    expect(style).toContain(`var(--${hue}-500)`)
    expect(style).toContain(`var(${ink})`)
  })

  it('secondary continua NEUTRO e intocado', () => {
    // Mede 8,4:1 e é a única que já passava. Foi a correção de 2026-08-16
    // (UI-03), quando `.p-tag-secondary` não existia no Lara e a severidade
    // caía na regra base, pintando a marca no lugar do neutro.
    render(<AppTag value="Sin subir" severity="secondary" />)

    const style = tag('Sin subir').getAttribute('style') ?? ''
    expect(style).toContain('var(--surface-200)')
    expect(style).toContain('var(--text-color)')
  })

  it('accent segue com a própria fórmula', () => {
    render(<AppTag value="Online" tone="accent" />)

    expect(tag('Online').getAttribute('style')).toContain('var(--purple-500)')
  })

  it('o `style` do chamador continua vencendo', () => {
    render(<AppTag value="Vigente" severity="success" style={{ color: 'var(--text-color)' }} />)

    expect(tag('Vigente').style.color).toBe('var(--text-color)')
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que ele FALHA**

```bash
cd frontend && pnpm test -- AppTag
```

Esperado: **FAIL** nos quatro casos de tom — hoje o `style` sai vazio para eles e a cor vem da classe
`.p-tag-success` do tema. Os casos de `secondary`, `accent` e do `style` do chamador passam desde já.

- [ ] **Step 3: Implemente**

Substitua o conteúdo de `frontend/src/shared/ui/AppTag/AppTag.tsx`:

```tsx
import { Tag } from 'primereact/tag'
import type { TagProps } from 'primereact/tag'
import { dangerText, infoText, successText, warningText } from '../../styles/tokens'

/** Tom sem equivalente em `severity` do PrimeReact. Hoje só o roxo de
 * modalidade `Online`. Modalidade não é severidade — não entra na escala
 * success/info/warning/danger. */
export type AppTagTone = 'accent'

export interface AppTagProps extends TagProps {
  tone?: AppTagTone
}

/** Fundo e texto do `secondary`, que o Lara não pinta — ver o docblock abaixo.
 * São as variáveis do tema, não uma fórmula: as duas já invertem com a folha
 * (claro `#e2e8f0`/`#334155`, escuro `#334155`/branco a 87%). */
const NEUTRO = { background: 'var(--surface-200)', color: 'var(--text-color)' }

const ACCENT = {
  background: 'color-mix(in srgb, var(--purple-500) 15%, var(--surface-card))',
  color: 'color-mix(in srgb, var(--purple-500) 70%, var(--text-color))',
}

/** Hue por severidade. Os palette vars do Lara NÃO invertem entre temas, então o
 * fundo tingido é composto com `--surface-card` (que inverte) via color-mix — a
 * mesma mecânica do `AppCard`. A TINTA, essa, vem de `--tone-*-ink`, que troca o
 * degrau da rampa por tema e já é o que o corpo do produto usa para texto de
 * severidade. */
const TOM: Record<string, { background: string; color: string }> = {
  success: { background: 'color-mix(in srgb, var(--green-500) 15%, var(--surface-card))', color: successText },
  info: { background: 'color-mix(in srgb, var(--blue-500) 15%, var(--surface-card))', color: infoText },
  warning: { background: 'color-mix(in srgb, var(--yellow-500) 15%, var(--surface-card))', color: warningText },
  danger: { background: 'color-mix(in srgb, var(--red-500) 15%, var(--surface-card))', color: dangerText },
}

/**
 * `severity="secondary"` sai NEUTRO, e é o wrapper quem resolve isso.
 *
 * O Lara não tem regra `.p-tag.p-tag-secondary` — só success/info/warning/danger
 * —, então a severidade que o PrimeReact aceita cai na regra BASE `.p-tag`, cujo
 * fundo é a primária. Resultado medido: "Sin subir" saía `rgb(37,165,228)`
 * contra `rgb(14,165,233)` das tags `info` ao lado, isto é, a ausência de
 * documento lia como rótulo informativo — a marca no lugar do neutro (UI-03 do
 * review de 2026-08-16). Não é o tema que está errado: o mapa de cor do Lara não
 * cobre este caso, e completar a folha GERADA (`pnpm brand-theme`) é o que a
 * guarda de drift existe para impedir.
 *
 * **As quatro severidades de tom também são do wrapper agora, e por AA.** O que
 * o Lara pinta é branco sobre saturado: `Vigente` mediu **2,28:1** e as tags de
 * curso **2,77:1**, a 12px/700 — e 12px bold não é "texto grande" para a WCAG (o
 * corte é 18,66px), então a régua é 4,5:1 e as duas reprovam (D-20 do review de
 * 2026-08-17). A correção não inventa mecânica: é o `ACCENT` logo acima, que é a
 * mesma tese que o passe do Dashboard fixou — cor de sinal em fundo e traço,
 * texto em contraste cheio. `secondary` fica de fora porque mede 8,4:1 e já
 * passava.
 */
export function AppTag({ tone, style, ...props }: AppTagProps) {
  const toneStyle =
    tone === 'accent'
      ? ACCENT
      : props.severity === 'secondary'
        ? NEUTRO
        : props.severity
          ? TOM[props.severity]
          : undefined

  return <Tag {...props} style={{ ...toneStyle, ...style }} />
}
```

- [ ] **Step 4: Rode o teste e confirme que ele PASSA**

```bash
cd frontend && pnpm test -- AppTag
```

Esperado: **PASS**, 7 casos.

- [ ] **Step 5: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.** O lint importa aqui: a régua da Task 2 vale sobre este arquivo e todo
valor novo é `color-mix(` ou `var(`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppTag/
git commit -m "fix(ui): tag de tom sai do preenchido saturado e passa AA

D-20. Vigente media 2,28:1 e as tags de curso 2,77:1 -- branco sobre
saturado a 12px/700, e 12px bold nao e texto grande para a WCAG (o corte e
18,66px), entao a regua e 4,5:1. A mecanica ja vivia no mesmo arquivo como
ACCENT: fundo composto com --surface-card e tinta de --tone-*-ink. E a tese
que o passe do Dashboard fixou -- cor de sinal em fundo, texto em contraste
cheio -- alcancando onde nao tinha chegado.

secondary fica intocada: mede 8,4:1 e foi a correcao de 2026-08-16.
Alcance: 31 arquivos."
```

---

## Task 4: `AppFileRow` para de vazar, e a data passa a falar o idioma da interface

Fecha a **D3** (o único achado **C**), a metade de **quebra** da **D-01**, a **D-18** do `AppFileRow`
e a parte de `shared/ui` da **D13**. Em 390px o cartão do CV mede `clientWidth` 227 contra
`scrollWidth` 311; `Reemplazar` vai de x=286 a x=425 com o cartão terminando em 342; o nome do
arquivo fica com largura 0 e some.

**Files:**
- Modify: `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx`
- Test: `frontend/src/shared/ui/AppFileRow/AppFileRow.test.tsx`

**Interfaces:**
- Consumes: `formatDate(date: Date): string` de `@shared/lib` — resolve pelo idioma ativo da
  interface (`i18n.language`), não pelo do navegador.
- Produces: `AppFileRow` com `flex-wrap`; o bloco de nome/metadados mantém `min-w-0 flex-1`.

- [ ] **Step 1: Escreva o teste que falha**

Acrescente a `frontend/src/shared/ui/AppFileRow/AppFileRow.test.tsx` (mantendo o caso existente do
`title`), e troque o cabeçalho de imports do arquivo:

```tsx
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { formatDate } from '@shared/lib'
import { AppFileRow } from './AppFileRow'

// O idioma da INTERFACE, não o do runtime: em jsdom o detector resolve pelo
// `navigator.language` (en-US), e é justamente a divergência entre os dois que
// o D-18 relata. Pinado aqui, a guarda vale com qualquer TZ da máquina.
beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

afterEach(cleanup)
```

E, dentro do `describe('AppFileRow', …)` existente, acrescente:

```tsx
  it('formata a data no idioma da INTERFACE, nao no do navegador', () => {
    // D-18: `new Date(createdAt).toLocaleDateString()` sem locale cai no idioma
    // do navegador. `created_at` é data-hora completa, então NÃO carrega o
    // problema de fuso do `valid_until` só-data — o defeito aqui é de idioma.
    const createdAt = '2026-08-01T10:00:00Z'
    render(<AppFileRow name="cv.pdf" size={1024} createdAt={createdAt} />)

    const esperado = formatDate(new Date(createdAt))
    expect(screen.getByText(new RegExp(esperado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy()
  })

  it('deixa o grupo de acoes CAIR de linha em vez de vazar o container', () => {
    // D-19, o unico C da revisao: em 390px o cartao media clientWidth 227
    // contra scrollWidth 311, o rotulo saia cortado em "Reem" e o nome do
    // arquivo ficava com largura 0. A quebra e dirigida pelo CONTAINER: o
    // componente serve quatro larguras diferentes na MESMA viewport
    // (comercial, turma, redator, perfil), e um breakpoint de viewport
    // acertaria uma e erraria tres.
    const { container } = render(
      <AppFileRow name="cv.pdf" actions={<button type="button">Reemplazar</button>} />,
    )

    expect(container.firstElementChild?.className).toContain('flex-wrap')
  })

  it('mantem o truncamento ANTES da quebra', () => {
    // A quebra nao substitui o truncamento: o bloco de nome continua
    // `min-w-0 flex-1`, senao o nome volta a empurrar a linha inteira.
    render(<AppFileRow name="certificado-de-titulo-profesional-2026.pdf" />)

    const nome = screen.getByText('certificado-de-titulo-profesional-2026.pdf')
    expect(nome.className).toContain('truncate')
    expect(nome.parentElement?.className).toContain('min-w-0')
  })

  it('usa font-mono na linha de metadados', () => {
    // D-29: data e tamanho sao dado tecnico, e o token ja existe
    // (`index.css`). Alcanca comercial, turma e redator, que e consistencia.
    render(<AppFileRow name="cv.pdf" size={1024} createdAt="2026-08-01T10:00:00Z" />)

    // `formatFileSize(1024)` devolve exatamente "1 KB" (`shared/lib/upload.ts:13-17`:
    // abaixo de 1 MiB e' `${Math.round(bytes / 1024)} KB`). Casar pelo tamanho e nao
    // pela data porque a data depende da locale ativa, que a Task 4 acabou de mudar.
    const meta = screen.getByText(/\b1 KB\b/)
    expect(meta.className).toContain('font-mono')
  })
```

- [ ] **Step 2: Rode o teste e confirme que ele FALHA**

```bash
cd frontend && pnpm test -- AppFileRow
```

Esperado: **FAIL** em `formata a data`, `deixa o grupo de acoes CAIR` e `usa font-mono`. O caso do
truncamento passa desde já — ele existe para provar que a quebra não o destruiu.

- [ ] **Step 3: Implemente**

Em `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx`, troque o import do topo:

```tsx
import type { ReactNode } from 'react'
import { formatFileSize } from '@shared/lib/upload'
import { formatDate } from '@shared/lib'
```

Troque o cálculo do `meta` e o corpo do `return`:

```tsx
export function AppFileRow({ name, mime, size, createdAt, actions }: AppFileRowProps) {
  const { icon, hue } = fileIcon(mime, name)
  // `toLocaleDateString()` sem locale cai no idioma do NAVEGADOR: a interface em
  // es-CL exibia a data em en-US (D-18). O `formatDate` resolve pelo idioma
  // ativo, num lugar só. `created_at` é data-hora completa e não carrega o
  // problema de fuso do `valid_until` só-data — ali a âncora `T00:00:00`
  // continua sendo o mecanismo certo, no `ProfileDocumentSlot`.
  const meta = [
    createdAt ? formatDate(new Date(createdAt)) : null,
    size !== undefined ? formatFileSize(size) : null,
  ].filter(Boolean).join(' · ')

  return (
    // `flex-wrap`: em 390px o cartão do CV media `clientWidth` 227 contra
    // `scrollWidth` 311, o rótulo saía cortado em "Reem" e o NOME do arquivo
    // ficava com largura 0 (D-19, único C do review de 2026-08-17). A quebra é
    // dirigida pelo CONTÊINER e não por breakpoint de viewport: este componente
    // serve quatro larguras diferentes na MESMA viewport — comercial, turma,
    // redator e perfil —, e um breakpoint acertaria uma e erraria três. O
    // contra-exemplo que isolou a causa é o REUF: sem botão de upload, ele mede
    // `scrollWidth` = `clientWidth` e não vaza.
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${hue} 12%, var(--surface-card))`, color: hue }}
      >
        <i className={icon} aria-hidden="true" />
      </span>
      {/* `min-w-0 flex-1` é o que mantém o truncamento funcionando ANTES da
          quebra — sem ele o nome volta a empurrar a linha inteira, e o `title`
          (a leitura completa, desde 2026-08-16) deixa de ser o único recurso. */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={name}>{name}</p>
        {meta && (
          <p className="font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>{meta}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Rode o teste e confirme que ele PASSA**

```bash
cd frontend && pnpm test -- AppFileRow
```

Esperado: **PASS**, 5 casos.

- [ ] **Step 5: Rode a suíte inteira — este componente tem quatro consumidores**

```bash
cd frontend && pnpm test
```

Esperado: **PASS**. `ProfileDocumentSlot.test.tsx` e os testes de `TurmaDetailPage` /
`BudgetDetailPage` renderizam `AppFileRow` indiretamente.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppFileRow/
git commit -m "fix(ui): linha de arquivo quebra por container e fala o idioma da interface

D-19 (unico C), metade de quebra da D-01, D-18 e a parte de shared/ui da
D-29.

Em 390px o cartao do CV media clientWidth 227 contra scrollWidth 311,
Reemplazar saia cortado em 'Reem' e o nome ficava com largura 0. flex-wrap
resolve pelo CONTAINER e nao por breakpoint: o componente serve quatro
larguras diferentes na mesma viewport, e um breakpoint acertaria uma e
erraria tres. O truncamento continua vindo antes da quebra (min-w-0
flex-1), com teste travando isso.

A data passa por formatDate: toLocaleDateString() sem locale caia no
idioma do navegador. created_at e data-hora completa e nao carrega o
problema de fuso do valid_until so-data."
```

---

## Task 5: `AppCard` ganha a variante que marca superfície recuada

Fecha a mecânica da **D4**. O corte por mutabilidade da spec D1 — à esquerda o que o usuário não
controla, à direita o self-service — é expresso **apenas** por posição horizontal, que só existe a
partir de 1280px. Abaixo disso vira ordem vertical, e ordem sem marca não lê como regra (D-28).

**Files:**
- Modify: `frontend/src/shared/ui/AppCard/AppCard.tsx`
- Test: `frontend/src/shared/ui/AppCard/AppCard.test.tsx` (novo)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `AppCardVariant = 'default' | 'stat' | 'sunken'`. A variante `sunken` põe
  `background: var(--surface-ground)` e `borderColor: var(--surface-ground)`, ignora `tone` no fundo
  (como `stat` já faz) e **não** acrescenta padding próprio. Consumida pelas Tasks 14 e 15.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/ui/AppCard/AppCard.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppCard } from './AppCard'

afterEach(cleanup)

function card() {
  return screen.getByTestId('conteudo').parentElement as HTMLElement
}

describe('AppCard', () => {
  it('default sobre --surface-card, com borda visivel', () => {
    render(<AppCard><span data-testid="conteudo">x</span></AppCard>)

    const style = card().getAttribute('style') ?? ''
    expect(style).toContain('var(--surface-card)')
    expect(style).toContain('var(--surface-border)')
  })

  it('sunken RECUA para o fundo da aplicacao e apaga a borda', () => {
    // D-28: a unica ideia estrutural de /perfil -- leitura de um lado,
    // self-service do outro -- so existia como posicao horizontal acima de
    // 1280px. Recuada, a coluna de leitura se dissolve no fundo (o AppLayout ja
    // e bg-(--surface-ground)) e sobra cartao so onde ha o que fazer.
    render(<AppCard variant="sunken"><span data-testid="conteudo">x</span></AppCard>)

    const style = card().getAttribute('style') ?? ''
    expect(style).toContain('background: var(--surface-ground)')
    // Mesma cor do fundo, nao `border: none`: o anel some sem mexer no box
    // model, entao nada se desloca ao trocar de variante.
    expect(style).toContain('border-color: var(--surface-ground)')
  })

  it('sunken NAO carrega padding proprio, ao contrario do stat', () => {
    // O `stat` traz `px-4 py-3.5` acoplado; os cartoes de /perfil passam
    // `className="p-4"` e reusar o stat mudaria o espacamento junto.
    render(<AppCard variant="sunken" className="p-4"><span data-testid="conteudo">x</span></AppCard>)

    expect(card().className).toContain('p-4')
    expect(card().className).not.toContain('py-3.5')
  })

  it('sunken com tone mantem a superficie e so publica a tinta', () => {
    // Variante decide a SUPERFICIE, tone decide o ACENTO -- mesma ortogonalidade
    // que o stat ja estabelece (ele tambem forca --surface-card).
    render(<AppCard variant="sunken" tone="danger"><span data-testid="conteudo">x</span></AppCard>)

    const style = card().getAttribute('style') ?? ''
    expect(style).toContain('background: var(--surface-ground)')
    expect(style).toContain('--app-card-tone-text')
  })

  it('stat continua com trilho e padding proprios', () => {
    render(<AppCard variant="stat" tone="info"><span data-testid="conteudo">x</span></AppCard>)

    expect(card().getAttribute('style')).toContain('border-inline-start-width: 3px')
    expect(card().className).toContain('py-3.5')
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que ele FALHA**

```bash
cd frontend && pnpm test -- AppCard
```

Esperado: **FAIL** nos três casos de `sunken` — a variante não existe, e `tsc` no `pnpm build` também
reprovaria. Os casos de `default` e `stat` passam desde já: eles existem para provar que a variante
nova não os alterou.

- [ ] **Step 3: Implemente**

Em `frontend/src/shared/ui/AppCard/AppCard.tsx`, troque o tipo da variante:

```tsx
export type AppCardVariant = 'default' | 'stat' | 'sunken'
```

Troque o corpo da função `AppCard`:

```tsx
export function AppCard({ variant = 'default', tone = 'neutral', className, children }: AppCardProps) {
  const hue = TONE_HUE[tone]
  const stat = variant === 'stat'
  const sunken = variant === 'sunken'
  const tingido = hue && !stat && !sunken

  const style: CSSProperties = {
    background: sunken ? 'var(--surface-ground)' : tingido ? `color-mix(in srgb, ${hue} 8%, var(--surface-card))` : 'var(--surface-card)',
    borderColor: sunken ? 'var(--surface-ground)' : tingido ? `color-mix(in srgb, ${hue} 35%, var(--surface-border))` : 'var(--surface-border)',
    color: 'var(--text-color)',
    ...(stat ? { borderInlineStartWidth: '3px', borderInlineStartColor: TONE_RAIL[tone] } : null),
    ['--app-card-tone-text' as string]: TONE_TEXT[tone],
  }
  // ... o resto do corpo (o `return` com o `div`) fica exatamente como está.
```

E acrescente ao docblock do componente, logo após o parágrafo "**Onde o tom pousa muda com a
variante**":

```
 * **`sunken` marca superfície RECUADA, e é a terceira variante.** Ela põe o
 * cartão em `--surface-ground` — o mesmo fundo que o `AppLayout` já pinta —, com
 * a borda na cor do fundo em vez de `border: none`, para que o anel suma sem
 * mexer no box model. Serve ao corte por mutabilidade de `/perfil` (D-28): a
 * única ideia estrutural daquela tela era expressa só por posição horizontal,
 * que existe a partir de 1280px, e abaixo disso virava ordem vertical — ordem
 * sem marca não lê como regra. Recuada, a coluna de leitura se dissolve no fundo
 * e sobra cartão só onde há o que fazer. A mecânica tem precedente: o
 * `PipelineFunnel` já usa `--surface-ground` como sulco dentro de um cartão.
 * Como o `stat`, ela decide a SUPERFÍCIE e deixa o `tone` decidir o acento; ao
 * contrário do `stat`, não traz padding acoplado.
```

- [ ] **Step 4: Rode o teste e confirme que ele PASSA**

```bash
cd frontend && pnpm test -- AppCard
```

Esperado: **PASS**, 5 casos.

- [ ] **Step 5: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.** Nenhum consumidor existente muda: `sunken` é aditiva.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppCard/
git commit -m "feat(ui): AppCard ganha a variante sunken

D-28, mecanica. O corte por mutabilidade de /perfil -- leitura de um lado,
self-service do outro -- so existia como posicao horizontal, que aparece a
partir de 1280px; abaixo disso virava ordem vertical, e ordem sem marca nao
le como regra.

sunken poe o cartao em --surface-ground, o mesmo fundo do AppLayout, com a
borda na cor do fundo em vez de border:none para o anel sumir sem mexer no
box model. Precedente no PipelineFunnel, que ja usa --surface-ground como
sulco. Decide a superficie e deixa o tone decidir o acento, como o stat; ao
contrario do stat, sem padding acoplado -- os cartoes de /perfil passam
p-4 proprio.

Aditiva: nenhum consumidor existente muda."
```

---

## Task 6: `FormField` publica a associação do campo

Fecha a metade estrutural da **P-37**. Hoje o `<label>` envolve o controle **e** o texto do rótulo:
o nome acessível do input soma os dois, e com erro presente soma também a mensagem. O `LoginForm`
já tem o molde certo, mas replicá-lo à mão custaria editar **55 call sites** em 23 arquivos — e o
próximo campo escrito voltaria a errar.

**Files:**
- Create: `frontend/src/shared/ui/FormField/fieldContext.ts`
- Modify: `frontend/src/shared/ui/FormField/FormField.tsx`
- Test: `frontend/src/shared/ui/FormField/FormField.test.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces:
  - `type FieldContextValue = { id: string; invalid: boolean; describedBy?: string }`
  - `const FieldContext: React.Context<FieldContextValue | null>`
  - `function useFieldProps(idProp: 'id' | 'inputId'): Record<string, unknown>` — devolve `{}` fora
    de um `FormField`. Consumida pelos cinco wrappers na Task 7.

- [ ] **Step 1: Escreva o teste que falha**

Acrescente a `frontend/src/shared/ui/FormField/FormField.test.tsx` — troque a linha de import do topo
e acrescente o bloco novo ao final do arquivo:

```tsx
import { FormField, FormErrorSummary, NestedField } from './FormField'
import { useFieldProps } from './fieldContext'
```

```tsx
/** Consumidor mínimo do contexto. Existe para testar o CONTRATO sem depender de
 * nenhum wrapper de Prime — os wrappers reais são medidos na task seguinte. */
function ControleDeTeste() {
  const props = useFieldProps('id')
  return <input {...props} data-testid="controle" />
}

describe('FormField associa o rótulo ao controle (P-37)', () => {
  it('o nome acessível do controle é SÓ o rótulo', () => {
    // Hoje o <label> envolve o texto E o controle, então o nome acessível soma
    // os dois — e com erro presente soma a mensagem junto. É a P-37.
    render(
      <FormField label="RUT">
        <ControleDeTeste />
      </FormField>,
    )

    expect(screen.getByLabelText('RUT')).toBe(screen.getByTestId('controle'))
  })

  it('erro publica aria-invalid e aria-describedby apontando para a mensagem', () => {
    render(
      <FormField label="RUT" error="RUT inválido">
        <ControleDeTeste />
      </FormField>,
    )

    const controle = screen.getByTestId('controle')
    expect(controle.getAttribute('aria-invalid')).toBe('true')

    const descrito = controle.getAttribute('aria-describedby')
    expect(descrito).toBeTruthy()
    expect(document.getElementById(descrito as string)?.textContent).toBe('RUT inválido')
  })

  it('sem erro NAO pendura aria-invalid nem aria-describedby', () => {
    render(
      <FormField label="RUT">
        <ControleDeTeste />
      </FormField>,
    )

    const controle = screen.getByTestId('controle')
    expect(controle.getAttribute('aria-invalid')).toBeNull()
    expect(controle.getAttribute('aria-describedby')).toBeNull()
  })

  it('em leitura o rotulo NAO aponta para controle nenhum', () => {
    // `htmlFor` pendurado num id que não existe é label morta.
    const { container } = render(<FormField label="RUT" readOnly value="76.123.456-7" />)

    expect(container.querySelector('label')?.getAttribute('for')).toBeNull()
  })

  it('dois campos na mesma tela nao colidem de id', () => {
    render(
      <>
        <FormField label="Nombre"><ControleDeTeste /></FormField>
        <FormField label="Teléfono"><ControleDeTeste /></FormField>
      </>,
    )

    const [a, b] = screen.getAllByTestId('controle')
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })

  it('fora de um FormField o hook nao pendura nada', () => {
    // O wrapper usado solto — login, filtro de tabela — continua exatamente como
    // era. Nenhum dos 55 call sites com controle precisa mudar por causa disto.
    render(<ControleDeTeste />)

    const controle = screen.getByTestId('controle')
    expect(controle.id).toBe('')
    expect(controle.getAttribute('aria-invalid')).toBeNull()
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que ele FALHA**

```bash
cd frontend && pnpm test -- FormField
```

Esperado: **FAIL** já no import — `./fieldContext` não existe.

- [ ] **Step 3: Crie o contexto**

`frontend/src/shared/ui/FormField/fieldContext.ts`:

```ts
import { createContext, useContext } from 'react'

/**
 * O que o `FormField` publica ao ramo que TEM controle. `null` fora dele: um
 * wrapper usado solto — login, filtro de tabela, célula de edição — não recebe
 * nada e continua exatamente como era.
 */
export type FieldContextValue = {
  id: string
  invalid: boolean
  describedBy?: string
}

export const FieldContext = createContext<FieldContextValue | null>(null)

/**
 * Props que o wrapper deve pendurar no PRÓPRIO input.
 *
 * `idProp` existe porque a porta muda com o componente do PrimeReact: `id`
 * alcança o input do `InputText` e do `InputTextarea`, que são nativos; no
 * `Password`, no `Dropdown` e no `Calendar` o `id` cai no nó RAIZ e só `inputId`
 * chega ao input — medido em `password.cjs.js:704/713`, `dropdown.cjs.js:1577` e
 * `calendar.cjs.js:3900`. Pendurar `id` neles associaria a label a uma `<span>`,
 * que é o mesmo defeito com outra roupa.
 *
 * Isto existe porque a P-37 não é um `htmlFor` esquecido: é o `<label>` que
 * envolve rótulo E controle, somando os dois no nome acessível. Corrigir call
 * site a call site custaria 55 edições em 23 arquivos, e o próximo campo escrito
 * voltaria a errar. Aqui o acerto é o default e nenhum call site muda.
 */
export function useFieldProps(idProp: 'id' | 'inputId') {
  const field = useContext(FieldContext)
  if (!field) return {}
  return {
    [idProp]: field.id,
    'aria-invalid': field.invalid || undefined,
    'aria-describedby': field.describedBy,
  }
}
```

- [ ] **Step 4: Reescreva o `FormField`**

Em `frontend/src/shared/ui/FormField/FormField.tsx`, troque o import do topo:

```tsx
import { useId, type ReactNode } from 'react'
import { dangerSurface, dangerText } from '../../styles/tokens'
import { FieldContext, type FieldContextValue } from './fieldContext'
```

E troque a função `FormField` inteira (as demais exportações do arquivo — `ReadOnlyValue`,
`NestedField`, `FormErrorSummary`, `FormErrorBanner` — ficam como estão):

```tsx
/**
 * Campo de formulário: label + controle + mensagem de erro do backend.
 *
 * **A label é IRMÃ do controle, não mãe dele (P-37).** Enquanto ela o envolvia,
 * o nome acessível do input somava o texto do rótulo e, com erro presente, a
 * mensagem junto — o leitor de tela anunciava "RUT RUT inválido" em vez de
 * "RUT". O molde correto já vivia no `LoginForm`; o que faltava era um lugar
 * onde ele valesse para os 55 campos com controle sem editar os 55 call sites.
 *
 * O id nasce aqui (`useId`) e viaja por contexto até o wrapper, que sabe qual é
 * a própria porta (`id` ou `inputId`) — ver `fieldContext.ts`. Prop do chamador
 * vence a do contexto, sempre.
 */
export function FormField({ label, error, readOnly, value, children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const field: FieldContextValue = {
    id,
    invalid: !!error,
    describedBy: error ? errorId : undefined,
  }

  return (
    <div className="block">
      {/* Sem `htmlFor` em leitura: não há controle a apontar, e label pendurada
          num id inexistente é label morta. */}
      <label
        htmlFor={readOnly ? undefined : id}
        className="mb-1 block text-sm"
        style={{ color: 'var(--text-color-secondary)' }}
      >
        {label}
      </label>
      {readOnly ? (
        <ReadOnlyValue value={value} />
      ) : (
        <FieldContext.Provider value={field}>{children}</FieldContext.Provider>
      )}
      {error && (
        <span
          id={errorId}
          className="mt-1 block text-sm"
          style={{ color: dangerText }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Rode o teste e confirme que ele PASSA**

```bash
cd frontend && pnpm test -- FormField
```

Esperado: **PASS** — os 6 casos novos mais os 8 que já existiam.

- [ ] **Step 6: Rode a suíte inteira — 86 chamadas dependem deste componente**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.**

> Se algum teste de tela quebrar por `getByLabelText`, ele estava passando pela associação **errada**
> (a label envolvente). O ajuste é no teste, e o commit deve dizer isso.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/FormField/
git commit -m "fix(ui): a label do FormField vira irma do controle, nao mae

P-37, metade estrutural. Enquanto o <label> envolvia rotulo E controle, o
nome acessivel do input somava os dois -- e com erro presente somava a
mensagem junto. O molde certo ja vivia no LoginForm; o que faltava era um
lugar onde ele valesse para os 55 campos com controle sem editar os 55 call
sites.

O id nasce no FormField (useId) e viaja por contexto ate o wrapper, que
sabe qual e a propria porta: id alcanca o input do InputText e do
InputTextarea; no Password, no Dropdown e no Calendar o id cai no no RAIZ e
so inputId chega ao input. Prop do chamador vence a do contexto.

NestedField fica fora e e decisao: ele nao tem label propria, entao nao
participa deste defeito."
```

---

## Task 7: Os cinco wrappers de controle se auto-associam

Fecha a **P-37** de ponta a ponta. A Task 6 publicou o contrato; aqui cada wrapper o consome na
porta certa. **Nenhum dos 55 call sites com controle muda.**

**Files:**
- Modify: `frontend/src/shared/ui/AppInputText/AppInputText.tsx`
- Modify: `frontend/src/shared/ui/AppTextarea/AppTextarea.tsx`
- Modify: `frontend/src/shared/ui/AppDropdown/AppDropdown.tsx`
- Modify: `frontend/src/shared/ui/AppDatePicker/AppDatePicker.tsx`
- Modify: `frontend/src/shared/ui/AppPassword/AppPassword.tsx`
- Test: `frontend/src/shared/ui/FormField/fieldAssociation.test.tsx` (novo)

**Interfaces:**
- Consumes: `useFieldProps(idProp: 'id' | 'inputId')` de `../FormField/fieldContext` (Task 6).
- Produces: os cinco wrappers associados. Consumido pelo DoD da Task 16, que mede `accessibleName`
  no navegador.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/ui/FormField/fieldAssociation.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FormField } from './FormField'
import { AppInputText } from '../AppInputText'
import { AppTextarea } from '../AppTextarea'
import { AppDropdown } from '../AppDropdown'
import { AppDatePicker } from '../AppDatePicker'
import { AppPassword } from '../AppPassword'

afterEach(cleanup)

/**
 * O nome acessível do controle tem de ser SÓ o rótulo, em todo wrapper — e a
 * porta do id muda com o componente do Prime: `id` no InputText e no
 * InputTextarea; `inputId` no Password, no Dropdown e no Calendar, onde o `id`
 * cai no nó raiz (`password.cjs.js:704/713`, `dropdown.cjs.js:1577`,
 * `calendar.cjs.js:3900`). Cada linha aqui é uma dessas portas.
 */
describe('os wrappers de shared/ui se associam ao rótulo do FormField', () => {
  it('AppInputText', () => {
    render(<FormField label="Nombre"><AppInputText /></FormField>)
    expect(screen.getByLabelText('Nombre').tagName).toBe('INPUT')
  })

  it('AppTextarea', () => {
    render(<FormField label="Observaciones"><AppTextarea /></FormField>)
    expect(screen.getByLabelText('Observaciones').tagName).toBe('TEXTAREA')
  })

  it('AppDropdown', () => {
    render(
      <FormField label="Rol">
        <AppDropdown options={[{ label: 'Admin', value: 'admin' }]} />
      </FormField>,
    )
    expect(screen.getByLabelText('Rol')).toBeTruthy()
  })

  it('AppDatePicker', () => {
    render(<FormField label="Vigencia"><AppDatePicker value={null} onChange={() => {}} /></FormField>)
    expect(screen.getByLabelText('Vigencia')).toBeTruthy()
  })

  it('AppPassword — o id vai ao INPUT, nao ao span raiz', () => {
    render(<FormField label="Contraseña"><AppPassword /></FormField>)

    const controle = screen.getByLabelText('Contraseña')
    expect(controle.tagName).toBe('INPUT')
    expect(controle.getAttribute('type')).toBe('password')
  })

  it('o erro chega ao input de cada wrapper como aria-invalid + describedby', () => {
    render(
      <FormField label="Nombre" error="Requerido">
        <AppInputText />
      </FormField>,
    )

    const controle = screen.getByLabelText('Nombre')
    expect(controle.getAttribute('aria-invalid')).toBe('true')
    const descrito = controle.getAttribute('aria-describedby') as string
    expect(document.getElementById(descrito)?.textContent).toBe('Requerido')
  })

  it('a prop do chamador VENCE a do contexto', () => {
    render(
      <FormField label="Nombre">
        <AppInputText id="id-do-chamador" />
      </FormField>,
    )

    expect(screen.getByRole('textbox').id).toBe('id-do-chamador')
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que ele FALHA**

```bash
cd frontend && pnpm test -- fieldAssociation
```

Esperado: **FAIL** em todos os casos de associação — `getByLabelText` não encontra nada, porque
nenhum wrapper lê o contexto ainda.

- [ ] **Step 3: `AppInputText` consome (`id`)**

Em `frontend/src/shared/ui/AppInputText/AppInputText.tsx`, acrescente o import e a leitura, e
espalhe **antes** do `{...props}`:

```tsx
import { useFieldProps } from '../FormField/fieldContext'
```

```tsx
export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    // Antes do spread do chamador: a associação é default, não imposição — quem
    // passa `id` próprio continua vencendo (P-37, spec D5).
    const fieldProps = useFieldProps('id')

    if (!leftIcon) {
      return <InputText ref={ref} {...fieldProps} {...props} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        <InputText ref={ref} {...fieldProps} {...props} className={`w-full ${props.className ?? ''}`} />
      </IconField>
    )
  },
)
```

- [ ] **Step 4: `AppTextarea` consome (`id`)**

```tsx
import { forwardRef } from 'react'
import { InputTextarea } from 'primereact/inputtextarea'
import type { InputTextareaProps } from 'primereact/inputtextarea'
import { useFieldProps } from '../FormField/fieldContext'

export type AppTextareaProps = InputTextareaProps

/** Wrapper do InputTextarea. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer.
 * Associa-se sozinho ao rótulo quando está dentro de um `FormField` (P-37). */
export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>((props, ref) => {
  const fieldProps = useFieldProps('id')
  return <InputTextarea ref={ref} {...fieldProps} {...props} />
})
AppTextarea.displayName = 'AppTextarea'
```

- [ ] **Step 5: `AppDropdown` consome (`inputId`)**

```tsx
import { Dropdown } from 'primereact/dropdown'
import type { DropdownProps } from 'primereact/dropdown'
import { useFieldProps } from '../FormField/fieldContext'

export type { DropdownProps as AppDropdownProps } from 'primereact/dropdown'

/** Wrapper do Dropdown. Largura total por default; cores vêm do tema (ADR-16).
 * `inputId`, não `id`: o `id` do Dropdown cai no nó raiz e só `inputId` alcança
 * o input focável (`dropdown.cjs.js:1577`) — pendurar `id` associaria a label a
 * uma `<div>`. */
export function AppDropdown(props: DropdownProps) {
  const fieldProps = useFieldProps('inputId')
  return <Dropdown className="w-full" {...fieldProps} {...props} />
}
```

- [ ] **Step 6: `AppDatePicker` consome (`inputId`)**

Em `frontend/src/shared/ui/AppDatePicker/AppDatePicker.tsx`, acrescente o import e troque o corpo da
função:

```tsx
import { useFieldProps } from '../FormField/fieldContext'
```

```tsx
export function AppDatePicker({ value, onChange, ...rest }: AppDatePickerProps) {
  // `inputId`: no Calendar o `id` cai no nó raiz e só `inputId` alcança o input
  // focável (`calendar.cjs.js:3900`).
  const fieldProps = useFieldProps('inputId')

  return (
    <Calendar
      value={isoToDate(value)}
      onChange={(e) => onChange(dateToIso(e.value as Date | null))}
      dateFormat="dd/mm/yy"
      locale="es"
      showIcon
      className="w-full"
      {...fieldProps}
      {...rest}
    />
  )
}
```

- [ ] **Step 7: `AppPassword` consome (`inputId`)**

Em `frontend/src/shared/ui/AppPassword/AppPassword.tsx`, acrescente o import:

```tsx
import { useFieldProps } from '../FormField/fieldContext'
```

Dentro do componente, logo após `const { t } = useTranslation()`:

```tsx
  // `inputId`: o `id` do Password cai na `<span.p-password>` raiz e só `inputId`
  // alcança o input (`password.cjs.js:704` vs `:713`). Associar a label à span
  // seria o mesmo defeito da P-37 com outra roupa.
  const fieldProps = useFieldProps('inputId')
```

E espalhe **antes** do `{...props}` nos DOIS ramos do `return`:

```tsx
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          {...fieldProps}
          {...props}
          className={`w-full ${props.className ?? ''}`}
          inputClassName={`w-full ${props.inputClassName ?? ''}`}
          pt={passwordPt}
        />
```

```tsx
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          {...fieldProps}
          {...props}
          className={`w-full ${props.className ?? ''}`}
          inputClassName={`w-full pl-10 ${props.inputClassName ?? ''}`}
          pt={passwordPt}
        />
```

- [ ] **Step 8: Rode o teste e confirme que ele PASSA**

```bash
cd frontend && pnpm test -- fieldAssociation
```

Esperado: **PASS**, 7 casos.

- [ ] **Step 9: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.** O `AppPassword.test.tsx` existente usa `getByLabelText('senha')` com
`aria-label` do chamador — ele continua valendo, porque prop do chamador vence.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/shared/ui/
git commit -m "fix(ui): os cinco wrappers de controle se associam ao rotulo sozinhos

Fecha a P-37 de ponta a ponta. Cada wrapper le o contexto do FormField e
pendura o id na PROPRIA porta: id no InputText e no InputTextarea, que sao
nativos; inputId no Password, no Dropdown e no Calendar, onde o id cai no
no raiz e associaria a label a uma span ou div.

aria-invalid e aria-describedby vao pelo mesmo caminho. Espalhados ANTES do
spread do chamador: a associacao e default, nao imposicao.

Zero dos 55 call sites com controle mudou."
```

---

## Task 8: A tecla Espaço no olho da senha

Fecha a metade de teclado da **D-24**. A WAI-ARIA exige Enter **e** Espaço para `role="button"`, e o
review mediu que só Enter alterna. **A metade do `aria-pressed` é recusada com motivo** (spec D6): o
nome do controle já alterna, e pendurar estado num botão cujo nome o carrega o anuncia duas vezes.

> **Atenção — esta task tem um resultado possível que NÃO é "implementar".** O PrimeReact instalado
> já registra `onToggleMaskKeyDown` tratando `event.key === 'Enter' || event.code === 'Space'`
> (`password.cjs.js:588-593`), e o `pt` do wrapper não o sobrescreve. Se o teste do Step 1 passar de
> primeira, **não acrescente handler nenhum**: um segundo `toggleMask()` sobre o do Prime alterna
> duas vezes e o campo volta ao estado inicial — o defeito ficaria pior e invisível. Nesse caso siga
> pelo Step 3-B.

**Files:**
- Test: `frontend/src/shared/ui/AppPassword/AppPassword.test.tsx`
- Modify (condicional): `frontend/src/shared/ui/AppPassword/AppPassword.tsx`

**Interfaces:**
- Consumes: `AppPassword` já associado ao contexto (Task 7).
- Produces: nenhuma API nova.

- [ ] **Step 1: Escreva o teste e rode**

Acrescente ao final de `frontend/src/shared/ui/AppPassword/AppPassword.test.tsx`:

```tsx
describe('AppPassword — o olho responde às DUAS teclas de botão', () => {
  function olho() {
    return screen.getByRole('button', { name: 'common.showPassword' })
  }

  it('Enter alterna o campo para texto', () => {
    render(<AppPassword aria-label="senha" />)

    expect(input().getAttribute('type')).toBe('password')
    fireEvent.keyDown(olho(), { key: 'Enter', code: 'Enter' })
    expect(input().getAttribute('type')).toBe('text')
  })

  it('Espaco alterna o campo para texto (D-24)', () => {
    // A WAI-ARIA exige as DUAS teclas para role="button". O review de
    // 2026-08-17 mediu Enter funcionando e Espaço não.
    render(<AppPassword aria-label="senha" />)

    expect(input().getAttribute('type')).toBe('password')
    fireEvent.keyDown(olho(), { key: ' ', code: 'Space' })
    expect(input().getAttribute('type')).toBe('text')
  })

  it('o olho NAO carrega aria-pressed', () => {
    // Recusa com motivo (spec D6): o NOME deste controle alterna a cada clique,
    // e um controle cujo nome muda é botão — foi por isso que o `role="switch"`
    // + `aria-checked` do Prime saiu em 2026-08-13 (UI-04), por mentir sobre o
    // estado. Pendurar `aria-pressed` num botão cujo nome já o carrega anuncia o
    // estado duas vezes, em duas gramáticas.
    render(<AppPassword aria-label="senha" />)

    expect(olho().getAttribute('aria-pressed')).toBeNull()
    expect(olho().getAttribute('aria-checked')).toBeNull()
  })
})
```

Ajuste o topo do arquivo para importar `fireEvent` junto do resto:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
```

> O nome `'common.showPassword'` sai da chave crua porque o teste não mocka o `react-i18next`; se o
> `i18n` real resolver a tradução no ambiente de teste, use o rótulo traduzido de `es-CL`. Rode uma
> vez e leia o erro do `getByRole` — ele lista os nomes acessíveis encontrados.

```bash
cd frontend && pnpm test -- AppPassword
```

- [ ] **Step 2: Leia o resultado e escolha o ramo**

- **Se `Espaco alterna` FALHA:** siga para o **Step 3-A**.
- **Se `Espaco alterna` PASSA:** o defeito não se reproduz no jsdom. Siga para o **Step 3-B**.

- [ ] **Step 3-A: (só se falhou) Acrescente a tecla no `pt`, sem duplicar o handler do Prime**

Em `frontend/src/shared/ui/AppPassword/AppPassword.tsx`, dentro do componente, acrescente antes de
`const togglePt`:

```tsx
  // O Prime registra `onToggleMaskKeyDown` nas duas teclas, mas a que chega ao
  // SVG é só o Enter (D-24 do review de 2026-08-17). Este handler cobre o
  // Espaço, e SÓ ele: chamar em Enter também alternaria duas vezes, com o
  // handler do Prime, e o campo voltaria ao estado inicial — defeito pior e
  // invisível. `preventDefault` porque Espaço com foco fora de campo rola a
  // página.
  const onToggleKeyDown = (event: KeyboardEvent<SVGElement>) => {
    if (event.code !== 'Space' && event.key !== ' ') return
    event.preventDefault()
    event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
```

Acrescente o import do tipo no topo:

```tsx
import { forwardRef, type KeyboardEvent } from 'react'
```

E acrescente o handler ao `togglePt`:

```tsx
  const togglePt = { role: 'button', 'aria-checked': undefined, onKeyDown: onToggleKeyDown }
```

Rode:

```bash
cd frontend && pnpm test -- AppPassword
```

Esperado: **PASS**, e em especial `Enter alterna` continua passando — se ele quebrar, o handler está
disparando duas vezes e a condição do `if` precisa ser revista.

- [ ] **Step 3-B: (só se passou) Registre a não-reprodução em vez de "corrigir"**

Não toque no componente. Acrescente ao docblock de `AppPassword.tsx`, junto do parágrafo que explica
a troca de `switch` por `button`:

```
 * **A D-24 pediu Espaço, e o Espaço já funciona.** O `onToggleMaskKeyDown` do
 * Prime trata `event.key === 'Enter' || event.code === 'Space'`
 * (`password.cjs.js:588-593`) e o `pt` deste wrapper não o sobrescreve — há
 * teste medindo as duas teclas. Acrescentar handler próprio alternaria DUAS
 * vezes e o campo voltaria ao estado inicial: defeito pior e invisível. Se o
 * Espaço falhar no navegador, a causa não é este componente, e o achado precisa
 * ser remedido lá antes de virar código aqui.
```

E registre no commit que a D-24 fecha por **não-reprodução no unitário**, com a verificação no
navegador movida para o DoD da Task 16 — que é onde o review original a mediu.

- [ ] **Step 4: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppPassword/
git commit -m "fix(ui): o olho da senha responde as duas teclas de botao

D-24, metade do teclado. A WAI-ARIA exige Enter E Espaco para
role=button. Testes medem as duas.

A metade do aria-pressed e RECUSADA com motivo (spec D6): o nome deste
controle alterna a cada clique, e controle cujo nome muda e botao -- foi
por isso que o role=switch + aria-checked do Prime saiu em 2026-08-13, por
mentir sobre o estado. Pendurar aria-pressed num botao cujo nome ja carrega
o estado o anuncia duas vezes, em duas gramaticas. Ha teste travando a
ausencia dos dois atributos."
```

---

## Task 9: O disparador de upload vira botão de verdade, com nome próprio

Fecha a **D-23** / **D11**. O `FileUpload` do Prime no modo básico expõe
`<span class="p-button p-fileupload-choose" tabindex="0">` com `role` e `aria-label` nulos, recebendo
foco na sequência natural — e é o controle que substitui documento de peso legal de forma
irreversível. O nome também não diz **de qual** documento: três slots repetem "Reemplazar".

**Files:**
- Modify: `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`
- Test: `frontend/src/shared/ui/AppFileUpload/AppFileUpload.test.tsx` (novo)

**Interfaces:**
- Consumes: `mergePt<T>(base: unknown, pins: unknown): T` de `../mergePt`.
- Produces: `AppFileUploadOwnProps` ganha `accessibleName?: string`. O `role="button"` é invariante
  do wrapper. Consumido pela Task 12 (`ProfileDocumentSlot`).

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/ui/AppFileUpload/AppFileUpload.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppFileUpload } from './AppFileUpload'

afterEach(cleanup)

describe('AppFileUpload', () => {
  it('o disparador se anuncia como BOTAO', () => {
    // D-23: o Prime entrega <span class="p-fileupload-choose" tabindex="0"> com
    // role nulo, recebendo foco na sequencia natural -- e e o controle que
    // substitui documento de peso legal de forma irreversivel.
    render(<AppFileUpload chooseLabel="Reemplazar" />)

    expect(screen.getByRole('button')).toBeTruthy()
  })

  it('o nome acessivel diz DE QUAL documento se trata', () => {
    // Tres slots repetem "Reemplazar"; so o chamador sabe de qual documento.
    render(<AppFileUpload chooseLabel="Reemplazar" accessibleName="Reemplazar currículum" />)

    expect(screen.getByRole('button', { name: 'Reemplazar currículum' })).toBeTruthy()
  })

  it('sem accessibleName o nome continua vindo do rotulo visivel', () => {
    render(<AppFileUpload chooseLabel="Reemplazar" />)

    expect(screen.getByRole('button').getAttribute('aria-label')).toBeNull()
  })

  it('o pt do chamador sobrevive ao pin do wrapper', () => {
    // mergePt funde chave a chave: quem passa pt.basicButton.className nao perde
    // o role que o wrapper crava, e vice-versa.
    render(
      <AppFileUpload
        chooseLabel="Reemplazar"
        pt={{ basicButton: { className: 'marcador-do-chamador' } }}
      />,
    )

    const botao = screen.getByRole('button')
    expect(botao.className).toContain('marcador-do-chamador')
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que ele FALHA**

```bash
cd frontend && pnpm test -- AppFileUpload
```

Esperado: **FAIL** — `getByRole('button')` não acha nada, e `accessibleName` nem existe como prop
(`tsc` também reprovaria no `pnpm build`).

- [ ] **Step 3: Implemente**

Substitua o conteúdo de `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`:

```tsx
import { FileUpload } from 'primereact/fileupload'
import type { FileUploadProps, FileUploadHandlerEvent } from 'primereact/fileupload'
import { useTranslation } from 'react-i18next'
import { MAX_UPLOAD_BYTES, formatFileSize } from '@shared/lib/upload'
import { mergePt } from '../mergePt'

export type { FileUploadHandlerEvent } from 'primereact/fileupload'
export type { FileUploadProps as AppFileUploadProps } from 'primereact/fileupload'

export type AppFileUploadOwnProps = FileUploadProps & {
  /** Recebe a mensagem já traduzida quando o arquivo excede o teto. O chamador
   * decide onde exibi-la (banner do diálogo, erro da seção). */
  onSizeReject?: (message: string) => void
  /** Teto em bytes. Default: o dos documentos (10 MB). A foto de perfil passa
   * `MAX_PHOTO_BYTES` (5 MB) — spec D9. */
  maxBytes?: number
  /** Nome acessível do disparador, já traduzido. Existe porque o RÓTULO visível
   * não basta quando a tela repete o mesmo verbo: quatro slots documentais dizem
   * "Reemplazar" e só o chamador sabe de qual documento se trata (D-23). Ausente,
   * o nome continua vindo do rótulo visível. */
  accessibleName?: string
}

/** Wrapper do FileUpload do PrimeReact. Default: modo básico, upload
 * automático via customUpload (o chamador trata em `uploadHandler`, subindo
 * pela API própria em vez do endpoint embutido do Prime). `customUpload` é
 * invariante do wrapper — fixado APÓS o spread para o chamador nunca poder
 * reativar o uploader XHR embutido do PrimeReact.
 *
 * O teto de tamanho é checado AQUI, não via `maxFileSize` do Prime: em
 * `mode="basic"` a área de mensagens dele não é renderizada, então a rejeição
 * dele seria silenciosa (spec D4). Arquivo acima do teto não vira requisição.
 *
 * **`role="button"` também é invariante, e pela mesma régua do `customUpload`.**
 * O modo básico do Prime entrega `<span class="p-button p-fileupload-choose"
 * tabindex="0">` com `role` nulo: um alvo focável que não se anuncia como nada
 * (D-23 do review de 2026-08-17) — e é o controle que substitui documento de
 * peso legal de forma irreversível. O papel é do wrapper porque vale para os
 * oito sítios; o NOME não pode ser, porque só o chamador sabe qual documento
 * está em jogo. O `pt` funde por `mergePt`, chave a chave: quem passa
 * `pt.basicButton.className` não perde o papel, e o papel não apaga a classe. */
export function AppFileUpload({
  uploadHandler,
  onSizeReject,
  maxBytes = MAX_UPLOAD_BYTES,
  accessibleName,
  pt,
  ...props
}: AppFileUploadOwnProps) {
  const { t } = useTranslation()

  const guarded = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (file && file.size > maxBytes) {
      e.options.clear()
      onSizeReject?.(
        t('common.fileTooLarge', {
          size: formatFileSize(file.size),
          limit: formatFileSize(maxBytes),
        }),
      )
      return
    }
    uploadHandler?.(e)
  }

  const uploadPt = mergePt<FileUploadProps['pt']>(pt, {
    basicButton: { role: 'button', ...(accessibleName ? { 'aria-label': accessibleName } : null) },
  })

  return (
    <FileUpload mode="basic" auto {...props} pt={uploadPt} uploadHandler={guarded} customUpload />
  )
}
```

- [ ] **Step 4: Rode o teste e confirme que ele PASSA**

```bash
cd frontend && pnpm test -- AppFileUpload
```

Esperado: **PASS**, 4 casos.

- [ ] **Step 5: Rode a suíte inteira — oito sítios usam este wrapper**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.** `ProfileDocumentSlot.test.tsx` procura o disparador por texto do
rótulo; o papel novo não muda o texto.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppFileUpload/
git commit -m "fix(ui): o disparador de upload vira botao, e o nome diz de qual documento

D-23. O modo basico do Prime entrega <span class=p-fileupload-choose
tabindex=0> com role nulo: alvo focavel que nao se anuncia como nada -- e e
o controle que substitui documento de peso legal de forma irreversivel.

role=button e invariante do wrapper, pela mesma regua do customUpload: vale
para os oito sitios. O NOME nao pode ser, porque quatro slots documentais
repetem 'Reemplazar' e so o chamador sabe de qual documento se trata --
entra por accessibleName, opcional.

pt funde por mergePt, chave a chave: pt.basicButton.className do chamador
sobrevive ao pin."
```

---

## Task 10: Escape volta a fechar o preview, até onde o navegador deixa

Fecha a **D-25** / **D12**. Com `activeElement` = `IFRAME` o `.p-dialog` permanece; com
`activeElement` = `BUTTON`, fecha. O visor nativo do Chrome consome a tecla **dentro** do iframe e o
handler do diálogo, que escuta no documento hospedeiro, não a recebe.

**Files:**
- Modify: `frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: nenhuma API nova.

- [ ] **Step 1: Implemente o foco na montagem**

Em `frontend/src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.tsx`, troque o import do topo e
acrescente o `contentClassName`/`focusOnShow` ao `AppDialog`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import { AppFileRow } from '../AppFileRow'
import { isPreviewable } from '@shared/lib/upload'
```

E troque o docblock e o `return`:

```tsx
/** Pré-visualização de documento de `files`. Imagem e PDF renderizam inline
 * pela URL pré-assinada; formato sem preview mostra a linha do arquivo e o
 * botão de baixar (spec D9) — a ação NÃO some conforme o tipo, porque ação que
 * desaparece é falha escondida.
 *
 * **O foco vai ao contêiner do diálogo na montagem, e há um limite que o
 * navegador é dono.** Com `activeElement` = `IFRAME`, Escape não fechava: o
 * visor nativo do Chrome consome a tecla DENTRO do iframe e o handler do
 * diálogo, que escuta no documento hospedeiro, nunca a recebe (D-25 do review de
 * 2026-08-17). Focar o contêiner faz Escape funcionar em todo o caminho até o
 * primeiro clique dentro do visor. Depois disso, a tecla é do navegador e o `X`
 * é a saída garantida — não há correção possível do lado do documento pai, e
 * fingir que há seria pior do que declarar. */
export function AppFilePreviewDialog({ file, visible, onHide }: AppFilePreviewDialogProps) {
  const { t } = useTranslation()
  if (!file) return null

  const kind = isPreviewable(file.mime, file.original_name)

  return (
    <AppDialog
      visible={visible}
      onHide={onHide}
      header={file.original_name}
      style={{ width: '70vw' }}
      focusOnShow
    >
```

O resto do corpo (os três ramos `image` / `pdf` / `null`) fica exatamente como está.

- [ ] **Step 2: Nada a fazer no `AppDialog` — o repasse já existe (medido)**

`AppDialog.tsx` desestrutura só `pt` e `visible`; tudo mais chega ao `Dialog` do PrimeReact pelo
`{...props}`, que é a ÚLTIMA coisa no JSX:

```tsx
export function AppDialog({ pt, visible, ...props }: DialogProps) {
  // ...
  return <Dialog maximizable draggable={false} visible={visible} pt={{ /* ... */ }} {...props} />
}
```

`focusOnShow` é prop do `Dialog` do Prime e viaja nesse spread sem alteração alguma no wrapper.
Confirme com uma leitura e siga:

```bash
cd frontend && grep -n "{\.\.\.props}" src/shared/ui/AppDialog/AppDialog.tsx
```

Esperado: uma linha, dentro do `<Dialog`.

- [ ] **Step 3: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.**

> Sem teste unitário: o defeito é a captura de tecla pelo visor nativo do Chrome dentro de um
> `<iframe>`, que o jsdom não simula — um teste aqui provaria o mock, não o comportamento. A
> verificação real está no DoD da Task 16, contra o navegador, que é onde a D-25 foi medida.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/ui/AppFilePreviewDialog/
git commit -m "fix(ui): o preview foca o proprio conteiner na montagem

D-25. Com activeElement = IFRAME o Escape nao chegava ao handler do
dialogo: o visor nativo do Chrome consome a tecla DENTRO do iframe e o
documento hospedeiro nunca a recebe. Focar o conteiner faz Escape funcionar
em todo o caminho ate o primeiro clique dentro do visor.

Depois disso a tecla e do navegador e o X e a saida garantida. Limite
declarado em docblock, nao prometido como corrigido -- nao ha correcao
possivel do lado do documento pai."
```

---

## Task 11: A ação destrutiva do bloco de foto para de parecer a menos importante

Fecha a **D-30**. `Eliminar foto` — que apaga sem desfazer — é texto celeste imediatamente abaixo do
`Reemplazar` celeste preenchido. Das duas, a destrutiva é a de **menor** peso visual, o que lê como
"menos importante" e não como "mais perigosa". É o caso pior do padrão que a P-36 registra.

**Files:**
- Modify: `frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx:79-87`

**Interfaces:**
- Consumes: `AppButton` (já aceita `severity` do PrimeReact).
- Produces: nenhuma API nova.

- [ ] **Step 1: Implemente**

Em `frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx`, troque o botão de remoção:

```tsx
            {url && (
              // `severity="danger"`, não `dangerText` inline: é BOTÃO, e botão
              // recebe severidade — a tinta vem da folha do Prime, sem hex novo
              // (ADR-16). Antes, `Eliminar foto` era texto celeste logo abaixo do
              // `Reemplazar` celeste PREENCHIDO: das duas, a destrutiva tinha o
              // MENOR peso visual, e lia como "menos importante" em vez de "mais
              // perigosa" (D-30). É o caso pior do acúmulo de papéis que a P-36
              // registra — a mesma tinta em ação primária e em ação que apaga.
              <AppButton
                label={t("photo.remove")}
                icon="pi pi-trash"
                text
                severity="danger"
                disabled={pending}
                onClick={onRemove}
              />
            )}
```

- [ ] **Step 2: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/ui/AppPhotoField/
git commit -m "fix(ui): a acao destrutiva do bloco de foto sai da tinta de marca

D-30. Eliminar foto -- que apaga sem desfazer -- era texto celeste logo
abaixo do Reemplazar celeste PREENCHIDO: das duas, a destrutiva tinha o
menor peso visual e lia como 'menos importante' em vez de 'mais perigosa'.

severity=danger, nao token inline: e botao, e botao recebe severidade, com
a tinta vindo da folha do Prime e sem hex novo. E o caso pior do acumulo de
papeis que a P-36 registra."
```

---

## Task 12: O slot documental — validade que sobe, ações que alinham, upload que se nomeia

Fecha a **D10** (D-21), a **D14** (D-22) e o consumo da **D11** (D-23). A validade é o dado de peso
legal da linha — é por ela que o redator sabe quando renovar — e hoje sai `text-xs` secundário como
**última** linha do slot, abaixo da nota administrativa, enquanto o status que o backend deriva
**a partir dela** é a pílula no topo.

**Files:**
- Modify: `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `AppFileUpload` com `accessibleName` (Task 9); `AppTag` com tom composto (Task 3);
  `AppFileRow` com quebra (Task 4).
- Produces: chave i18n `profile.documents.replaceNamed` e `profile.documents.sendNamed`, com
  interpolação `{{tipo}}`, nas três locales.

- [ ] **Step 1: Escreva os testes que falham**

Acrescente a `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx`:

```tsx
  it('a validade sobe para a linha do STATUS, que e derivado dela', () => {
    // D-21: `Vence el 10-08-2028` saia text-xs secundario como ULTIMA linha do
    // slot, abaixo da nota administrativa, enquanto o `Vigente` -- que o backend
    // calcula A PARTIR dessa data -- era a pilula do topo. Enquanto o status e
    // `vigente` isso nao custa nada; quando vira `vence_em_breve`, a data e o
    // texto mais dificil de ler do cartao.
    montar({ valid_until: '2028-08-10', status: 'vence_em_breve' })

    const status = screen.getByText('profile.docStatus.vence_em_breve')
    const validade = screen.getByText(/profile\.documents\.validUntil/)

    // Mesma linha: o status e a validade compartilham o contêiner.
    expect(status.closest('div')).toBe(validade.closest('div'))
  })

  it('o caso SEM validade nao imprime linha nenhuma', () => {
    // Tres dos quatro slots tem valid_until null e imprimiam
    // `Sin fecha de vencimiento` -- uma linha que so diz que nao ha informacao,
    // e que e ela quem rebaixou a que importa.
    montar({ valid_until: null })

    expect(screen.queryByText(/profile\.documents\.noValidity/)).toBeNull()
  })

  it('o upload vem ANTES do par Ver/Descargar, para o par ancorar sempre igual', () => {
    // D-22: `Ver` ficava em x=1132 nos slots com tres acoes e x=1275 no que tem
    // duas -- 143px entre linhas equivalentes separadas por 16px. Reservar
    // largura falharia com o idioma (o rotulo do upload e texto traduzido); com
    // o upload ANTES, o par de icones -- largura constante em qualquer locale --
    // vira o fim do grupo e ancora na mesma borda nos quatro slots.
    const { container } = montar()

    const acoes = Array.from(
      container.querySelectorAll('.p-fileupload-choose, button[aria-label]'),
    )
    const indiceUpload = acoes.findIndex((el) => el.className.includes('p-fileupload-choose'))
    const indiceVer = acoes.findIndex((el) => el.getAttribute('aria-label') === 'common.preview')

    expect(indiceUpload).toBeGreaterThanOrEqual(0)
    expect(indiceVer).toBeGreaterThan(indiceUpload)
  })

  it('o nome acessivel do upload diz de QUAL documento se trata', () => {
    // Tres slots repetem "Reemplazar" (D-23).
    montar()

    expect(
      screen.getByRole('button', { name: /profile\.documents\.replaceNamed/ }),
    ).toBeTruthy()
  })
```

- [ ] **Step 2: Rode e confirme que FALHAM**

```bash
cd frontend && pnpm test -- ProfileDocumentSlot
```

Esperado: **FAIL** nos quatro casos novos.

- [ ] **Step 3: Acrescente as chaves nas TRÊS locales**

Em `src/shared/config/locales/es-CL.json`, dentro de `profile.documents`:

```json
      "sendNamed": "Enviar {{tipo}}",
      "replaceNamed": "Reemplazar {{tipo}}",
```

Em `pt-BR.json`:

```json
      "sendNamed": "Enviar {{tipo}}",
      "replaceNamed": "Substituir {{tipo}}",
```

Em `en.json`:

```json
      "sendNamed": "Upload {{tipo}}",
      "replaceNamed": "Replace {{tipo}}",
```

`profile.documents.noValidity` **fica** nas três, órfã: o `parity.test.ts` guarda estrutura, e
remover chave sem consumidor é varredura de outro tipo (spec §9).

- [ ] **Step 4: Implemente o slot**

Em `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx`, troque o bloco do
`upload` e o `return` inteiro:

```tsx
  // O RÓTULO muda com o estado, e não é cosmética: substituir apaga o
  // documento anterior de forma irreversível, e o texto é o único aviso disso
  // na tela (spec §6, mesmo contrato do `AppPhotoField`). O slot
  // administrativo usa ícone mudo; aqui quem age é o dono do documento.
  //
  // O NOME acessível vai além do rótulo visível porque três slots repetem o
  // mesmo verbo e o leitor de tela ouviria "Reemplazar" três vezes sem saber de
  // quê (D-23).
  const tipo = t(`documentType.${doc.type}`)
  const upload = doc.self_service ? (
    <AppFileUpload
      chooseOptions={UPLOAD_CHOOSE_OPTIONS}
      chooseLabel={file ? t('profile.documents.replace') : t('profile.documents.send')}
      accessibleName={
        file
          ? t('profile.documents.replaceNamed', { tipo })
          : t('profile.documents.sendNamed', { tipo })
      }
      disabled={uploading}
      onSizeReject={onSizeReject}
      uploadHandler={(e) => onUpload(doc.type, e)}
    />
  ) : null

  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{tipo}</p>
        {/* Status e validade na MESMA linha, e a validade em tinta de CORPO
            (D-21). A validade é o dado de peso legal — é por ela que o redator
            sabe quando renovar — e saía `text-xs` secundária como última linha do
            slot, abaixo da nota administrativa, enquanto o status que o backend
            deriva A PARTIR dela era a pílula do topo. O ruído que causou o
            rebaixamento era real: três dos quatro slots têm `valid_until` nulo e
            imprimiam "Sin fecha de vencimiento", uma linha que só diz que não há
            informação. Ela deixou de ser renderizada. */}
        <div className="flex flex-wrap items-center gap-2">
          <AppTag value={t(`profile.docStatus.${doc.status}`)} severity={SEVERIDADE[doc.status]} />
          {doc.valid_until && (
            <span className="font-mono text-sm" style={{ color: 'var(--text-color)' }}>
              {t('profile.documents.validUntil', {
                // `valid_until` vem só-data (`YYYY-MM-DD`) e `new Date` a lê como
                // meia-noite UTC: num fuso a oeste ela VOLTA um dia. `T00:00:00`
                // ancora no fuso local, e o `formatDate` resolve o idioma ativo —
                // sem ele o `Intl` cai no idioma do navegador (UI-01 de
                // 2026-08-16).
                date: formatDate(new Date(`${doc.valid_until}T00:00:00`)),
              })}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2">
        {file ? (
          <AppFileRow
            name={file.original_name}
            size={file.size}
            createdAt={doc.created_at}
            actions={
              <>
                {/* O upload vem ANTES do par Ver/Descargar (D-22). O grupo era
                    justificado à direita e deslizava quando faltava o upload:
                    `Ver` em x=1132 nos slots com três ações e x=1275 no que tem
                    duas, 143px entre linhas separadas por 16px. Reservar largura
                    falharia com o idioma, porque o rótulo do upload é texto
                    traduzido; com ele à frente, o par de ícones — largura
                    constante em qualquer locale — vira o fim do grupo e ancora
                    na mesma borda nos quatro slots. De quebra, o botão que
                    carrega o aviso de irreversibilidade fica adjacente ao nome
                    do arquivo sobre o qual age. */}
                {upload}
                <AppFileActions file={file} onPreview={onPreview} />
              </>
            }
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('common.notLoaded')}
            </p>
            {upload}
          </div>
        )}

        {!doc.self_service && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {t('profile.documents.managedByAdmin')}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Rode os testes**

```bash
cd frontend && pnpm test -- ProfileDocumentSlot
```

Esperado: **PASS** — os 4 novos mais os 4 que já existiam. O caso
`formata a validade no idioma da interface, sem voltar um dia (UI-01)` continua valendo: a validade
mudou de lugar, não de mecanismo.

- [ ] **Step 6: Rode o gate, incluindo a paridade de locales**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.** `parity.test.ts` reprova se alguma das duas chaves novas faltar em
`pt-BR` ou `en`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx frontend/src/shared/config/locales/
git commit -m "fix(perfil): validade sobe para a linha do status, acoes alinham, upload se nomeia

D-21, D-22 e o consumo da D-23.

A validade e o dado de peso legal da linha -- e por ela que o redator sabe
quando renovar -- e saia text-xs secundaria como ULTIMA linha do slot,
abaixo da nota administrativa, enquanto o status que o backend deriva A
PARTIR dela era a pilula do topo. Sobe para a mesma linha, em tinta de
corpo. O caso valid_until nulo deixa de imprimir: era ele, em tres dos
quatro slots, que rebaixava a linha que importa.

D-22 fecha por reordenacao, sem faixa reservada: reservar largura falharia
com o idioma, porque o rotulo do upload e texto traduzido. Com o upload
antes do par Ver/Descargar, o par de icones -- largura constante em
qualquer locale -- vira o fim do grupo e ancora na mesma borda nos quatro
slots.

O nome acessivel do upload passa a carregar o tipo documental: tres slots
repetiam 'Reemplazar' sem dizer de que."
```

---

## Task 13: O subtítulo para de prometer ao Admin uma seção que ele nunca vê

Fecha a **D-26**, o item mais barato da fila. `ProfilePage.tsx:28` e `:40` passam
`t('profile.subtitle')` sem ramificar, enquanto o corpo ramifica em `profile.redator` (linhas 56 e
61): o Admin lê "…y tu documentación profesional" e rola até o fim para descobrir que não existe.
**Esta frase já enganou uma medição do fechamento de 2026-08-17**, que checava a presença da seção
documental por texto.

**Files:**
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `ProfileData.redator` (de `generated.ts`) — o mesmo predicado que o corpo usa.
- Produces: chaves `profile.subtitleRedator` e `profile.subtitleAdmin`, substituindo
  `profile.subtitle`.

- [ ] **Step 1: Troque as chaves nas TRÊS locales**

A chave de hoje é `profile.subtitle`, na linha 258 das três locales. Substitua-a por duas — a de
redator herda o texto atual sem tocar numa vírgula, a de admin perde a promessa documental.

Em `es-CL.json`, dentro de `profile`:

```json
    "subtitleRedator": "Tus datos personales, tu seguridad y tu documentación profesional.",
    "subtitleAdmin": "Revisa tus datos y administra tu contraseña.",
```

Em `pt-BR.json`:

```json
    "subtitleRedator": "Seus dados pessoais, sua segurança e sua documentação profissional.",
    "subtitleAdmin": "Revise seus dados e administre sua senha.",
```

Em `en.json`:

```json
    "subtitleRedator": "Your personal data, your security and your professional documents.",
    "subtitleAdmin": "Review your details and manage your password.",
```

Apague `profile.subtitle` das três — ao contrário de `noValidity`, esta chave é **substituída**, não
órfã, e deixá-la convidaria o próximo campo a reintroduzir a frase que engana.

- [ ] **Step 2: Ramifique pelo MESMO predicado do corpo**

Em `frontend/src/features/identity/components/Profile/ProfilePage.tsx`, dentro de `ProfilePage`,
logo após a desestruturação do hook:

```tsx
  // O MESMO predicado que ramifica o corpo (linhas do `profile.redator` abaixo),
  // não uma checagem de role: o backend já decide quem tem perfil profissional,
  // e `usePermissions`/`can()` é conveniência de interface, não autoridade
  // (ADR-07). Enquanto o subtítulo não ramificava, o Admin lia
  // "…y tu documentación profesional" e rolava até o fim para descobrir que a
  // seção não existe — e a frase já enganou uma medição de fechamento (D-26).
  const subtitulo = profile?.redator
    ? t('profile.subtitleRedator')
    : t('profile.subtitleAdmin')
```

E troque as duas ocorrências de `description={t('profile.subtitle')}` por
`description={subtitulo}` — a do ramo de erro (linha 28) e a do ramo de sucesso (linha 40).

> No ramo de erro `profile` é `undefined`, então o subtítulo cai no de Admin. É o correto: sem dado,
> a tela não pode prometer a seção documental.

- [ ] **Step 3: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.** `parity.test.ts` reprova se alguma locale ficar com `subtitle` ou sem
uma das duas chaves novas.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/components/Profile/ProfilePage.tsx frontend/src/shared/config/locales/
git commit -m "fix(perfil): o subtitulo ramifica pelo mesmo predicado do corpo

D-26. ProfilePage passava profile.subtitle sem ramificar enquanto o corpo
ramificava em profile.redator: o Admin lia '...y tu documentacion
profesional' e rolava ate o fim para descobrir que a secao nao existe. Esta
frase ja enganou uma medicao do fechamento de 2026-08-17, que checava a
presenca da secao documental por texto.

Ramifica pelo predicado, nao por role: o backend ja decide quem tem perfil
profissional, e can() e conveniencia de interface, nao autoridade (ADR-07).
No ramo de erro, sem dado, cai no subtitulo de Admin -- a tela nao pode
prometer o que nao sabe se existe."
```

---

## Task 14: A coluna de leitura recua

Aplica a **D4** / **D-28**. A variante existe desde a Task 5; aqui os dois cartões da coluna de
leitura a adotam, e o corte por mutabilidade passa a ter marca visual em qualquer largura.

**Files:**
- Modify: `frontend/src/features/identity/components/Profile/ProfileIdentityCard.tsx:20`
- Modify: `frontend/src/features/identity/components/Profile/ProfileSummaryCard.tsx:18`

**Interfaces:**
- Consumes: `AppCard variant="sunken"` (Task 5).
- Produces: nenhuma API nova.

- [ ] **Step 1: `ProfileIdentityCard` recua**

Troque a abertura do cartão (linha 20):

```tsx
    <AppCard variant="sunken" className="p-4">
```

E acrescente ao docblock do componente:

```
 * **A superfície recuada é a marca do corte (D-28).** A regra da spec D1 —
 * leitura de um lado, self-service do outro — era expressa só por posição
 * horizontal, que existe a partir de 1280px; abaixo disso virava ordem vertical,
 * e ordem sem marca não lê como regra. Recuado, este cartão se dissolve no fundo
 * da aplicação e sobra cartão elevado só onde há o que fazer.
 *
 * **Custo declarado e aceito:** a foto É self-service e mora aqui. A superfície
 * marca a natureza DOMINANTE do bloco; o botão de foto carrega a própria
 * afordância por ser botão com rótulo. Mover a foto para a coluna de
 * self-service contradiria a decisão da spec D1, que a pôs ao lado do nome
 * porque é assim que o usuário a reconhece como sua.
```

- [ ] **Step 2: `ProfileSummaryCard` recua**

Troque a abertura do cartão (linha 18):

```tsx
    <AppCard variant="sunken" className="p-4">
```

E acrescente ao docblock:

```
 * Recuado como o cartão de identidade (D-28): é leitura, não self-service. O CTA
 * para o Dashboard é NAVEGAÇÃO, não mutação, e não abre exceção na regra.
```

- [ ] **Step 3: Rode o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.**

- [ ] **Step 4: Verifique no navegador antes de commitar**

```bash
cd frontend && pnpm dev
```

Abra `http://localhost:5173/perfil` nos **dois temas** e confirme:

1. Os dois cartões da esquerda se dissolvem no fundo; os da direita continuam elevados.
2. `--text-color` sobre `--surface-ground` continua legível — meça o contraste no DevTools, régua
   4,5:1. No tema claro o fundo é `#f1f5f9`; no escuro, o `noche` gerado.
3. Nada se deslocou ao trocar a variante (a borda mudou de cor, não de espessura).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/identity/components/Profile/ProfileIdentityCard.tsx frontend/src/features/identity/components/Profile/ProfileSummaryCard.tsx
git commit -m "feat(perfil): a coluna de leitura recua e o corte ganha marca visual

D-28, aplicacao. A unica ideia estrutural da tela -- leitura de um lado,
self-service do outro -- era expressa so por posicao horizontal, que existe
a partir de 1280px; abaixo disso virava ordem vertical, e ordem sem marca
nao le como regra.

Custo declarado e aceito: a foto E self-service e mora no cartao que recua.
A superficie marca a natureza DOMINANTE do bloco, e o botao de foto carrega
a propria afordancia por ser botao com rotulo -- move-la contradiria a spec
D1, que a pos ao lado do nome porque e assim que o usuario a reconhece como
sua. O CTA do resumo e navegacao, nao mutacao."
```

---

## Task 15: Abaixo de `xl`, o self-service vem primeiro e a identidade vira faixa

Fecha a **D8** / **D-27** e a parte de `/perfil` da **D13** / **D-29**. Em 1024×768 (688px úteis) o
Admin tinha `Datos personales` em y=829 e 1476px de total; o Redator, `Documentación profesional` em
y=1809 e 2544px — **3,7 dobras**, com a primeira contendo só o cartão de identidade, cujo único
controle é o de foto. E `Juan Morales` aparece **três vezes** simultaneamente na tela, `Redactor`
também três.

**Files:**
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx:53-63`
- Modify: `frontend/src/features/identity/components/Profile/ProfileIdentityCard.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx:57-63`

**Interfaces:**
- Consumes: `AppCard variant="sunken"` (Tasks 5, 14).
- Produces: nenhuma API nova.

- [ ] **Step 1: Inverta a ordem abaixo de `xl`**

Em `ProfilePage.tsx`, troque o comentário e o grid:

```tsx
      {/* Duas colunas só a partir de `xl`. Em `lg` (1024px) a coluna fixa de
          22rem consome metade da área útil e o `1fr` resolve em 336px — a
          coluna que recebe TODOS os controles editáveis ficava menor que a de
          leitura, invertendo a hierarquia que a D1 desenhou (UI-04 do review de
          2026-08-16). Nessa faixa, uma coluna só é mais confortável que duas
          iguais.

          Abaixo de `xl`, o self-service vem PRIMEIRO (D-27). Em 1024x768 o Admin
          tinha `Datos personales` em y=829 e 1476px de total; o Redator,
          `Documentación profesional` em y=1809 e 2544px — 3,7 dobras, com a
          primeira contendo só o cartão de identidade, cujo único controle é o de
          foto. A ordem em `xl` fica intocada: ali a posição horizontal já
          carrega a regra, e quem a carrega abaixo disso é a superfície recuada
          (D-28), que precisou vir antes — reordenar sem marca visual só troca
          qual metade fica por último. */}
      <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="order-2 flex flex-col gap-4 xl:order-1">
          <ProfileIdentityCard profile={profile} />
          {profile.redator && <ProfileSummaryCard redator={profile.redator} />}
        </div>
        <div className="order-1 flex flex-col gap-4 xl:order-2">
          <ProfilePersonalSection profile={profile} />
          <ProfileSecuritySection email={profile.email} />
          {profile.redator && <ProfileDocumentsSection documentos={profile.redator.documentos} />}
        </div>
      </div>
```

- [ ] **Step 2: A identidade vira faixa abaixo de `xl`, e a duplicata de papel morre**

Substitua o corpo do `return` de `ProfileIdentityCard.tsx`:

```tsx
  return (
    <AppCard variant="sunken" className="p-4">
      {/* Faixa horizontal abaixo de `xl`, coluna a partir dele (D-27). Empilhado,
          este cartão sozinho ocupava a primeira dobra inteira para entregar um
          controle só. Em faixa, ele entrega o mesmo em uma fração da altura. */}
      <div className="flex flex-col items-center gap-4 xl:block">
        <AppPhotoField name={profile.name} {...photo} />

        <div className="min-w-0 text-center">
          <p className="mt-4 text-base font-semibold" style={{ color: 'var(--text-color)' }}>
            {profile.name}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {profile.role ? t(`roleName.${profile.role}`) : '—'}
          </p>
        </div>
      </div>

      {/* Duas colunas de leitura abaixo de `xl`, uma a partir dele: na faixa há
          largura de sobra, e empilhar dois campos curtos ali só produz altura. */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="sm:col-span-2 xl:col-span-1">
          <FormSection title={t('profile.identity.title')} />
        </div>
        <FormField label={t('profile.identity.email')} readOnly value={profile.email} />
        {/* `font-mono` no RUT (D-29): é o dado técnico do próprio dono, e o token
            já é o que `StudentsTable.tsx:46`, `RedatoresTable.tsx:47` e
            `RedatorCard.tsx:41` usam para o RUT de terceiros. */}
        <FormField
          label={t('profile.identity.rut')}
          readOnly
          value={
            profile.rut
              ? <span className="font-mono">{profile.rut}</span>
              : t('profile.identity.noRut')
          }
        />
        {/* O campo `Perfil` MORREU aqui (D-27). `Redactor` aparecia três vezes
            simultaneamente na tela — header, faixa, e este campo —, e a faixa é
            onde o papel pertence: ao lado do nome de quem o tem. */}
        <p
          className="text-xs sm:col-span-2 xl:col-span-1"
          style={{ color: 'var(--text-color-secondary)' }}
        >
          {t('profile.identity.managedByAdmin')}
        </p>
      </div>
    </AppCard>
  )
```

> `profile.identity.role` fica órfã nas três locales, pelo mesmo critério de `noValidity` (spec §9).

- [ ] **Step 3: O telefone em `font-mono`**

Em `ProfilePersonalSection.tsx`, no `AppInputText` do telefone (linhas 57-63), acrescente a classe:

```tsx
          <AppInputText
            className="font-mono"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
```

Este é o único sítio da D-29 que pousa num controle **editável**, e não num valor de leitura — a
auditoria o cita explicitamente ("vale também para telefone").

- [ ] **Step 4: Rode o gate e confira a régua de 150 linhas**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes.** O `max-lines` em `src/features/*/components/**` é lint — se o
`ProfileIdentityCard` passar de 150 linhas, o lint reprova e o corte é extrair a faixa
(`ProfileIdentityBand`) para arquivo irmão.

- [ ] **Step 5: Meça no navegador ANTES de commitar — este é o passo que pode reabrir a DS-05**

```bash
cd frontend && pnpm dev
```

Em **1024×768**, nos dois papéis:

1. `Datos personales` sobe para a primeira dobra (era y=829 no Admin).
2. A altura total cai bem abaixo dos 1476px (Admin) e 2544px (Redator) medidos.
3. **A faixa não recorta o avatar.** `AppPhotoField` renderiza dentro de `transform scale-200` com
   `pt-10` compensando embaixo — geometria desenhada para coluna, não para faixa.

> **Se a faixa recortar ou desalinhar:** PARE e leve ao João. A DS-05 (trocar `scale-200` por tamanho
> real) está fora do bloco por decisão dele, e a saída é dele: ou a DS-05 entra aqui, ou a faixa fica
> só na parte de baixo do cartão e o avatar continua empilhado. Não resolva por conta própria
> mexendo no `scale-200` — é escopo que foi explicitamente deixado fora.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/components/Profile/
git commit -m "feat(perfil): self-service primeiro e identidade em faixa abaixo de xl

D-27 e a parte de /perfil da D-29.

Em 1024x768 o Admin tinha Datos personales em y=829 e 1476px de total; o
Redator, Documentacion profesional em y=1809 e 2544px -- 3,7 dobras, com a
primeira contendo so o cartao de identidade, cujo unico controle e o de
foto. Reordenar e compactar: order-* abaixo de xl, com a ordem de xl
intocada, e a identidade em faixa horizontal com os campos em duas colunas
de leitura.

O campo Perfil morreu: Redactor aparecia tres vezes simultaneamente na
tela, e a faixa e onde o papel pertence -- ao lado do nome de quem o tem.

RUT e telefone em font-mono, que e o token que StudentsTable,
RedatoresTable e RedatorCard ja usam para o RUT de terceiros."
```

---

## Task 16: Gate do bloco e DoD end-to-end

O bloco não fecha por build verde. As três provas do DoD são medição, e duas delas o runner não
alcança.

**Files:** nenhum arquivo de produção. Registro em `docs/superpowers/historico/progress.md` e nas
fichas das pendências.

**Interfaces:**
- Consumes: tudo das Tasks 1-15.
- Produces: o registro que autoriza o `/fechar-sprint`.

- [ ] **Step 1: Gate executável**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: **os três verdes**, sem `--filter`.

- [ ] **Step 2: Prova 1 — a P-36 fecha nos dois sítios, e a catraca é provada nos dois sentidos**

Com `pnpm dev` rodando, nos **dois temas**:

1. Título de seção (`Identidad`, `Datos personales`, `Seguridad`) — meça o contraste no DevTools.
   Régua: **4,5:1**. Era 2,77:1.
2. Ícone de curso em `/cursos` — régua de elemento gráfico: **3:1**. Era 2,53:1 sobre humo.
3. Reintroduza `style={{ color: '#25A5E4' }}` em `FormSection.tsx`, rode `pnpm lint`, confirme que
   ele **nomeia o arquivo e a regra**, e desfaça. Sem este passo, o lint verde prova só que a régua
   não quebrou nada — não que ela pega.

- [ ] **Step 3: Prova 2 — a P-37 é MEDIDA, não conferida**

No console do navegador, em `/perfil` e num diálogo de cadastro que use `AppDropdown` e
`AppDatePicker`:

```js
// Nome acessível REAL, como o leitor de tela o computa — não o atributo lido no DOM.
const alvo = document.querySelector('input#<id-do-campo>')
// Chrome DevTools → aba Accessibility → Computed Properties → Name
```

Confirme, para os cinco wrappers (`AppInputText`, `AppTextarea`, `AppDropdown`, `AppDatePicker`,
`AppPassword`):

1. O nome acessível é **só o rótulo** — não o rótulo + o valor, nem o rótulo + a mensagem de erro.
2. Com erro presente: `aria-invalid="true"` no input, e `aria-describedby` apontando para o elemento
   que contém a mensagem.
3. Clicar no texto do rótulo põe o foco no controle.

- [ ] **Step 4: Prova 3 — o alcance fora de `/perfil`, visto e não deduzido**

Abra e confira que nada regrediu:

| Alcance | Onde olhar |
|---|---|
| `FormSection` (16 arquivos) | um diálogo de cadastro de cada feature: cliente, curso, turma, redator, usuário |
| `AppTag` (31 arquivos) | tabela de cotações (severidades), card de turma, tag `Online` (`accent`), `Sin subir` (`secondary`) |
| `AppFileRow` (4 sítios) | documentos de cotação, de turma e de redator — **em 390px**, que é onde a D-19 foi medida |
| `AppPassword` (5 sítios) | login, troca de senha do perfil, cadastro de usuário |
| `AppFileUpload` (8 sítios) | os mesmos sítios de `AppFileRow` mais a foto |
| `AppCard` | Dashboard (`stat`), qualquer tabela (`default`) — a variante nova é aditiva e não deve ter tocado nenhum |

- [ ] **Step 5: Refaça as medições que a auditoria registrou**

Em `/perfil`, nos dois papéis, nos três locales, nos dois temas, em **390px / 1024px / 1440px**:

| Item | Número da auditoria | O que provar |
|---|---|---|
| D-19 | `clientWidth` 227 vs `scrollWidth` 311 | os dois iguais; `Reemplazar` inteiro; nome visível |
| D-20 | 2,28:1 (`Vigente`), 2,77:1 (curso) | ≥ 4,5:1 |
| D-21 | validade como última linha `text-xs` | validade na linha do status, tinta de corpo |
| D-22 | `Ver` em x=1132 e x=1275 | mesma coordenada nos quatro slots |
| D-27 | y=829 / 1476px (Admin), y=1809 / 2544px (Redator) | `Datos personales` na primeira dobra |
| D-24 | Espaço não alterna | Espaço alterna — ou o registro do Step 3-B da Task 8 |
| D-25 | Escape inerte com foco no iframe | Escape fecha antes do primeiro clique no visor; `X` sempre |

- [ ] **Step 6: Rode a revisão de UI**

```
/lotus-ui-review
```

Sobre `/perfil`, cobrindo Admin e Redator, os três locales, os dois temas e as três larguras.

- [ ] **Step 7: Registre e feche**

1. Acrescente a linha da entrega em `docs/superpowers/historico/progress.md`.
2. Nas fichas de `docs/superpowers/pendencias/abertas.md`, mova **P-36** e **P-37** para
   `encerradas.md` com o commit que as paga.
3. Corrija no `backlog.md` a contagem de consumidores de `FormSection` — **16**, não 11 (a ficha
   mediu em 2026-08-13, antes dos cinco arquivos de `Profile/`).
4. Registre as chaves i18n órfãs (`profile.documents.noValidity`, `profile.identity.role`) como
   débito de limpeza de dicionário.
5. Transicione `state.md` para `ready_for_review`.

> A colisão de ID dos dois `D-18` **não** se resolve aqui: renumerar é decisão do João, e mexer no ID
> sem ele quebra as referências cruzadas já escritas dos dois lados.

---

## Handoff de execução

**executor: claude**

O bloco é julgamento de acessibilidade e de cor sobre `shared/ui`, não trabalho mecânico com
verificação executável e paths fechados. Três razões, cada uma suficiente:

1. **Toca lei do §5 em dois pontos.** A §5.6 (customização de Prime mora no wrapper, feature não
   importa Prime direto) governa as Tasks 3, 7, 9 e 10; a §5.8 (DoD é critério de aceite **provado**)
   governa a Task 16 inteira, cujas três provas não são executáveis por runner.
2. **Duas tasks têm ponto de decisão aberto por medição.** A Task 8 pode terminar em "não
   reproduzido", e a resposta certa nesse caso é **não** escrever código — um handler duplicado sobre
   o do Prime alterna duas vezes e piora o defeito de forma invisível. A Task 15 pode reabrir a
   DS-05, que está fora do bloco por decisão explícita do João, e a saída é dele.
3. **O gate final é navegador.** Contraste medido no DevTools, `accessibleName` computado, quebra em
   390px, coordenadas dos slots — nada disso o `pnpm test` alcança, e o §5.8 não aceita build verde
   como prova.

**Worktree:** `fix-frontend` · **Branch:** `feat/bd16-perfil-e-kit-compartilhado`, a partir de
`main@135e468`. Frontend puro — a pendência P-03 (toque de backend exige main tree) não dispara.

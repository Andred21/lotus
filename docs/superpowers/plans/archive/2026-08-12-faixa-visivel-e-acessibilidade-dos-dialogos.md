# Faixa visível e acessibilidade dos diálogos — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pagar os seis itens do BD-3 pela fronteira `shared/ui`, de modo que os 9 diálogos devolvam
o foco e nomeiem o controle de maximizar, o modo leitura mostre o valor inteiro, o estado vazio caiba
na faixa visível em `390x844`, o CTA de cadastro exista num lugar só, o carregamento pare de mentir e
a cor dos diálogos venha do tema.

**Architecture:** Cinco dos seis itens são mudança de wrapper — `AppDialog`, `FormField`/`NestedField`,
`AppDataTable`, `SearchableTableFrame`, `AppErrorState` —, e é isso que faz um arquivo alcançar todas
as telas. Só o item 2 (adoção do modo leitura) e o item 6 (cor) tocam arquivos de feature. O bloco
deixa **mecanismo**: duas regras `no-restricted-syntax` que impedem a reintrodução de
`disabled={readOnly}` e de cor Tailwind hardcoded.

**Tech Stack:** React 19 + TS, PrimeReact via `shared/ui`, Tailwind v4 (layout), i18next (3 locales),
vitest + jsdom, `playwright-cli` para o DoD.

**Spec:** `docs/superpowers/specs/2026-08-12-faixa-visivel-e-acessibilidade-dos-dialogos-design.md`
(aprovada pelo João em 2026-08-12, remedida contra `main`@`18cf90a`).

## Global Constraints

- **Base:** branch `feat/dialogos-faixa-visivel-acessibilidade`, criada de `main`@`18cf90a`, na
  worktree `/home/jvbat/projetos/fix-frontend`. Todos os comandos rodam de `frontend/`.
- **Zero backend.** `git diff main...HEAD -- backend/` deve terminar vazio. Sem schema, sem DTO, sem
  `generated.ts`, sem contrato HTTP.
- **Features não importam PrimeReact direto nem outra feature** (CLAUDE.md §5.6) — a cor e os campos
  entram por `shared/ui` e por variável de tema.
- **i18n:** 3 locales com chaves **idênticas** (`pt-BR`, `es-CL`, `en`); `es-CL` é a referência de
  rótulo. `parity.test.ts` reprova divergência.
- **Cor:** Tailwind é layout; cor vem de variável do tema (ADR-16). As três fórmulas já em uso no
  repo, copiadas verbatim: `var(--text-color-secondary)` para texto de apoio, `var(--surface-border)`
  para borda, e `color-mix(in srgb, var(--red-500) 70%, var(--text-color))` para vermelho de erro.
- **Teste de componente com PrimeReact no jsdom está fora do corte do runner**
  (`frontend-fsliced.md`, §Comandos). Componente sem PrimeReact **entra** — é o precedente de
  `PageHeader.test.tsx` e `DetailHeader.test.tsx`. Por isso só as Tasks 2 e 5 ganham teste
  automatizado; o resto prova no navegador (Task 8).
- **Baseline medido em `18cf90a`, não herdado:** `pnpm test` = **27 arquivos / 131 testes**;
  `pnpm lint` limpo; `pnpm build` verde.
- **Sem sonda no commit final:** zero `console.log`, `dd(`, `debugger` no diff.

---

### Task 1: `AppDialog` devolve o foco e nomeia o maximizar

**Files:**
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `AppDialog` com restauração de foco e `aria-label` dinâmico no botão de maximizar. As
  chaves i18n novas são `common.maximizeDialog` e `common.restoreDialog`. Nenhuma task posterior
  depende delas.

**Por que o wrapper e não as 9 páginas (spec D1, §3.1):** o mecanismo do PrimeReact existe
(`dialog.cjs.js:687` chama `DomHandler.focus(focusElementOnHide.current)` no `onExited`) mas está
**inerte** nesta forma de montagem: a captura em `dialog.cjs.js:791` vive dentro de um
`useUpdateEffect`, que **pula a primeira execução** (`hooks.cjs.js:1264`). Os 9 diálogos do repo
montam condicionalmente já com `visible` — `CommercialPage.tsx:55` e `:65`, `CatalogPage.tsx:30`,
`PeoplePage.tsx:79` e `:89`, `AdministracionPage.tsx:53` e `:64`, `BudgetDetailPage.tsx:132` e
`:136` —, então o efeito de captura nunca roda no ciclo em que o diálogo nasce e
`DomHandler.focus(null)` é no-op. **Escrever a restauração aqui não duplica mecanismo do PrimeReact.**

- [ ] **Step 1: Ver o vermelho no navegador, antes de tocar o código**

Com `pnpm dev` de pé e sessão aberta em `/comercial`, abrir o diálogo de cliente pelo botão de
cadastro e fechar com `Escape`. Ler o `document.activeElement`:

```js
document.activeElement.tagName
```

Esperado AGORA (o defeito): `"BODY"`. Registrar o valor lido — é ele que a Task 8 vai reprovar de
novo se a correção regredir.

Inspecionar também o primeiro botão do header do diálogo aberto:

```js
document.querySelector('.p-dialog-header-maximize').outerHTML
```

Esperado AGORA: `<button type="button" class="p-dialog-header-icon p-dialog-header-maximize p-link">`
— **sem** `aria-label`, `aria-labelledby` ou `title`, que é o que o débito mediu.

- [ ] **Step 2: Adicionar as duas chaves i18n nos três locales**

Em `frontend/src/shared/config/locales/es-CL.json`, dentro do objeto `common`, na ordem alfabética
que o arquivo já usa:

```json
    "maximizeDialog": "Maximizar diálogo",
    "restoreDialog": "Restaurar diálogo",
```

Em `pt-BR.json`:

```json
    "maximizeDialog": "Maximizar diálogo",
    "restoreDialog": "Restaurar diálogo",
```

Em `en.json`:

```json
    "maximizeDialog": "Maximize dialog",
    "restoreDialog": "Restore dialog",
```

- [ ] **Step 3: Rodar o teste de paridade dos locales**

```bash
cd frontend && pnpm test -- parity
```

Expected: PASS. Se reprovar, a chave entrou em menos de três arquivos.

- [ ] **Step 4: Escrever o wrapper**

Substituir o conteúdo de `frontend/src/shared/ui/AppDialog/AppDialog.tsx` por:

```tsx
import { useEffect, useRef } from 'react'
import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'
import { useTranslation } from 'react-i18next'
import { appDialogPt } from './style'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto, header e footer na
 * mesma superfície. Usado pelo CrudDialog.
 *
 * Devolve o foco ao disparador no fechamento. O mecanismo do PrimeReact existe
 * (`onExited` -> `DomHandler.focus`) mas é INERTE aqui: ele captura dentro de um
 * `useUpdateEffect`, que pula a primeira execução, e as 9 páginas do repo montam
 * o diálogo condicionalmente já com `visible`. Os dois não competem — o do
 * PrimeReact segue rodando com `null`, que é no-op. */
export function AppDialog({ pt, visible, ...props }: DialogProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLElement | null>(null)
  const wasVisible = useRef(false)

  // Captura no RENDER, não em efeito: quando o efeito rodaria, o Dialog já moveu
  // o foco para dentro de si e o disparador deixou de ser o `activeElement`.
  if (visible && !wasVisible.current) {
    triggerRef.current = document.activeElement as HTMLElement | null
  }
  wasVisible.current = Boolean(visible)

  useEffect(() => {
    if (!visible) return
    return () => {
      const trigger = triggerRef.current
      triggerRef.current = null
      // Disparador que saiu do DOM (linha de tabela removida pela invalidação)
      // não recebe foco: o navegador fica onde está, sem exceção.
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [visible])

  return (
    <Dialog
      maximizable
      draggable={false}
      visible={visible}
      pt={{
        ...appDialogPt,
        ...pt,
        // Pinado DEPOIS do spread do caller: o nome do controle é acessibilidade,
        // não estilo, e não pode ser desligado por quem customiza o `pt` (mesma
        // regra do `customUpload` em `AppFileUpload`). O rótulo é DINÂMICO — o
        // `pt` do Dialog recebe `state` (`dialog.cjs.js:453-455`) —, porque um
        // rótulo fixo mentiria em metade dos estados.
        maximizableButton: ({ state }: { state: { maximized: boolean } }) => ({
          'aria-label': state.maximized ? t('common.restoreDialog') : t('common.maximizeDialog'),
        }),
      }}
      {...props}
    />
  )
}
```

- [ ] **Step 5: Type-check e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Expected: build verde, lint sem erro.

- [ ] **Step 6: Ver o verde no navegador, nas duas sondas do Step 1**

Repetir as duas leituras do Step 1 no mesmo caminho (`/comercial`, diálogo de cliente, `Escape`):

- `document.activeElement.tagName` → **`"BUTTON"`** (o disparador), não `"BODY"`;
- `document.querySelector('.p-dialog-header-maximize').getAttribute('aria-label')` →
  **`"Maximizar diálogo"`** com o diálogo restaurado; clicar no controle e reler → **`"Restaurar
  diálogo"`**. O rótulo tem de MUDAR; se ficar igual nos dois estados, o `state` não chegou ao `pt`.

- [ ] **Step 7: Provar a guarda do disparador removido**

Em `/comercial`, abrir uma linha da tabela pelo botão da própria linha, e com o diálogo aberto forçar
a invalidação que remove a linha. Fechar o diálogo. Esperado: **sem exceção no console** e o foco
onde o navegador o deixou. Este é o ramo `document.contains(trigger)` — sem ele, `focus()` num nó
órfão é silencioso em alguns navegadores e lança em outros.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/AppDialog/AppDialog.tsx frontend/src/shared/config/locales
git commit -m "fix(ui): AppDialog devolve o foco ao disparador e nomeia o maximizar"
```

---

### Task 2: `FormField`/`NestedField` ganham modo leitura

**Files:**
- Modify: `frontend/src/shared/ui/FormField/FormField.tsx`
- Create: `frontend/src/shared/ui/FormField/FormField.test.tsx`

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: `FormFieldProps` e `NestedFieldProps` com duas props novas — `readOnly?: boolean` e
  `value?: ReactNode`. Contrato: **em leitura o controle não é montado**; renderiza-se `value` como
  texto. Campo vazio em leitura mostra `—`. A Task 3 consome exatamente esta assinatura em 10
  arquivos.

**Por que o kit e não os wrappers de controle (spec D2/D3):** input `readOnly` colide com o
`readOnly` nativo do `<input>` e continua truncando; tooltip foi recusado porque não aparece no toque,
e duas das três viewports do DoD são de toque. Um componente novo com ternário em cada sítio
engordaria diálogos que o BD-4 vai ter de emagrecer.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/FormField/FormField.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField, NestedField } from './FormField'

describe('FormField em modo leitura', () => {
  it('mostra o valor como texto e NÃO monta o controle', () => {
    render(
      <FormField label="RUT" readOnly value="76.123.456-7">
        <input data-testid="controle" defaultValue="76.123.456-7" />
      </FormField>,
    )

    expect(screen.getByText('76.123.456-7')).toBeTruthy()
    // O ponto do item: em leitura não existe input para truncar o valor.
    expect(screen.queryByTestId('controle')).toBeNull()
  })

  it('mostra travessão quando o valor é vazio', () => {
    render(<FormField label="Giro" readOnly value="">{null}</FormField>)

    // Campo em branco é ambíguo entre "sem valor" e "não carregou".
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('em edição monta o controle e ignora `value`', () => {
    render(
      <FormField label="RUT" value="ignorado">
        <input data-testid="controle" defaultValue="76.123.456-7" />
      </FormField>,
    )

    expect(screen.getByTestId('controle')).toBeTruthy()
    expect(screen.queryByText('ignorado')).toBeNull()
  })

  it('mostra o erro do backend nos dois modos', () => {
    const { rerender } = render(
      <FormField label="RUT" error="RUT inválido" readOnly value="x">{null}</FormField>,
    )
    expect(screen.getByText('RUT inválido')).toBeTruthy()

    rerender(
      <FormField label="RUT" error="RUT inválido"><input /></FormField>,
    )
    expect(screen.getByText('RUT inválido')).toBeTruthy()
  })
})

describe('NestedField em modo leitura', () => {
  it('mostra o valor como texto e NÃO monta o controle', () => {
    render(
      <NestedField readOnly value="Módulo 1">
        <input data-testid="controle" defaultValue="Módulo 1" />
      </NestedField>,
    )

    expect(screen.getByText('Módulo 1')).toBeTruthy()
    expect(screen.queryByTestId('controle')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar pelo motivo certo**

```bash
cd frontend && pnpm test -- FormField
```

Expected: FAIL. O vermelho tem de ser `expect(screen.queryByTestId('controle')).toBeNull()`
recebendo o elemento — ou seja, **o controle foi montado em leitura**, que é o defeito. Se o vermelho
for erro de tipo em `readOnly`/`value`, é só a prop não existir ainda; siga.

- [ ] **Step 3: Implementar as duas props**

Em `frontend/src/shared/ui/FormField/FormField.tsx`, substituir os dois blocos de tipo e as duas
funções `FormField` e `NestedField` (o resto do arquivo — `FormErrorSummary` e `FormErrorBanner` —
fica intocado):

```tsx
import type { ReactNode } from 'react'

/** Texto de leitura: quebra linha, seleciona e copia. Usa `--text-color` e não
 * o secundário — leitura não é texto de apoio, e o cinza de desabilitado é
 * parte do que o débito mediu como contraste reduzido. Vazio vira travessão:
 * campo em branco é ambíguo entre "sem valor" e "não carregou". */
function ReadOnlyValue({ value }: { value?: ReactNode }) {
  const empty = value === undefined || value === null || value === ''
  return (
    <span className="block break-words text-sm" style={{ color: 'var(--text-color)' }}>
      {empty ? '—' : value}
    </span>
  )
}

export type FormFieldProps = {
  label: string
  error?: string
  /** Modo leitura: o controle NÃO é montado; `value` vira texto. */
  readOnly?: boolean
  /** O valor de APRESENTAÇÃO, montado por quem tem o vocabulário de domínio
   * (dropdown mostra o rótulo traduzido, não o código cru). */
  value?: ReactNode
  children: ReactNode
}

/** Campo de formulário: label + controle + mensagem de erro do backend. */
export function FormField({ label, error, readOnly, value, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm" style={{ color: 'var(--text-color-secondary)' }}>{label}</span>
      {readOnly ? <ReadOnlyValue value={value} /> : children}
      {error && (
        <span
          className="mt-1 block text-sm"
          style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}
        >
          {error}
        </span>
      )}
    </label>
  )
}

export type NestedFieldProps = {
  error?: string
  /** Modo leitura: o controle NÃO é montado; `value` vira texto. */
  readOnly?: boolean
  value?: ReactNode
  children: ReactNode
}

/** Campo aninhado (linhas de contato/endereço/módulo): sem label própria, mas
 * com o erro do backend visível. Sem isso, um 422 em `contacts.0.name` deixa o
 * botão de salvar aparentemente inerte. */
export function NestedField({ error, readOnly, value, children }: NestedFieldProps) {
  return (
    <div>
      {readOnly ? <ReadOnlyValue value={value} /> : children}
      {error && (
        <span
          className="mt-1 block text-sm"
          style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd frontend && pnpm test -- FormField
```

Expected: PASS, 5 testes.

- [ ] **Step 5: Provar que o teste discrimina (mutação)**

Trocar `{readOnly ? <ReadOnlyValue value={value} /> : children}` por `{children}` no `FormField` e
rodar de novo.

Expected: FAIL em `expect(screen.queryByTestId('controle')).toBeNull()`. **Desfazer a mutação.** Sem
isto, o teste poderia estar verde por acidente — é o padrão que este repo já puniu duas vezes.

- [ ] **Step 6: Suíte cheia e commit**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

Expected: **28 arquivos / 136 testes** (o baseline 27/131 mais este arquivo com 5).

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/FormField/
git commit -m "feat(ui): FormField e NestedField ganham modo leitura em texto"
```

---

### Task 3: adotar o modo leitura nos 40 sítios

**Files:**
- Modify (5 sítios): `frontend/src/features/commercial/components/Client/ClientGeneralFields.tsx`
- Modify (7): `frontend/src/features/commercial/components/Client/AddressFields.tsx`
- Modify (4 dos 5): `frontend/src/features/commercial/components/Client/ContactCard.tsx`
- Modify (5): `frontend/src/features/catalog/components/Course/ModuleCard.tsx`
- Modify (4): `frontend/src/features/catalog/components/Course/CourseDialog.tsx`
- Modify (1): `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx`
- Modify (4): `frontend/src/features/identity/components/Admin/StaffIdentifyFields.tsx`
- Modify (2): `frontend/src/features/identity/components/Admin/StaffUserDialog.tsx`
- Modify (4): `frontend/src/features/identity/components/Student/StudentIdentifyFields.tsx`
- Modify (4): `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx`

**Interfaces:**
- Consumes: `FormField`/`NestedField` com `readOnly` e `value` da Task 2.
- Produces: zero `disabled={readOnly}` em `src/features/**`, que é a pré-condição da regra de lint
  da Task 7 nascer com `ignores` vazio.

**Contagem medida em `18cf90a`, arquivo a arquivo:** 41 sítios de `disabled={readOnly}` em 10
arquivos — `AddressFields` 7, `ClientGeneralFields` 5, `ContactCard` 5, `ModuleCard` 5,
`StaffIdentifyFields` 4, `StudentIdentifyFields` 4, `RedatorIdentityFields` 4, `CourseDialog` 4,
`StaffUserDialog` 2, `BudgetDialog` 1. Por camada: 35 dentro de `FormField`, 5 dentro de
`NestedField` (os de `ModuleCard`), 1 solto.

**A exceção declarada, única do item:** `ContactCard:31-34` é o `AppRadioButton` que marca o contato
principal — **não entra**. Não é valor truncado, não há o que copiar, e o estado já é legível pela
marcação. Segue `disabled`. São **40** conversões, não 41.

- [ ] **Step 1: Converter `ClientGeneralFields` (5 sítios), que é o molde dos outros nove**

Em `frontend/src/features/commercial/components/Client/ClientGeneralFields.tsx`, cada `FormField`
recebe `readOnly` e `value`, e o `disabled={readOnly}` sai do controle. O primeiro campo:

```tsx
      <FormField
        label={t('client.legalName')}
        error={fieldErrors?.legal_name?.[0] ?? fieldErrors?.name?.[0]}
        readOnly={readOnly}
        value={form.legal_name}
      >
        <AppInputText
          value={form.legal_name}
          onChange={(e) => onChange('legal_name', e.target.value)}
          className="w-full"
        />
      </FormField>
```

O mesmo para `rut`, `email` e `business_activity` (`value={form.business_activity ?? ''}`).

**O dropdown é o caso que exige julgamento** — o valor de apresentação é o rótulo traduzido, nunca o
código cru:

```tsx
        <FormField label={t('client.type')} readOnly={readOnly} value={t(`clientType.${form.type}`)}>
          <AppDropdown
            value={form.type}
            options={types}
            onChange={(e) => onChange('type', e.value)}
          />
        </FormField>
```

- [ ] **Step 2: Ver o verde deste arquivo no navegador antes de repetir 9 vezes**

Com `pnpm dev`, abrir `/comercial` › aba Clientes › **ver** um cliente cujo giro seja longo. Em
`390x844`:

- o valor da razón social aparece **inteiro**, quebrando linha, e é selecionável com o cursor;
- o tipo mostra o rótulo traduzido (`Cliente`), não `client`;
- um campo vazio mostra `—`;
- entrar em **editar** e conferir que os inputs voltaram, byte a byte como hoje.

Só depois de este arquivo estar certo, repetir a forma nos outros nove — é o que evita reescrever 40
sítios com o molde errado.

- [ ] **Step 3: Converter os quatro arquivos de campos de identidade (16 sítios)**

`StaffIdentifyFields` (4), `StudentIdentifyFields` (4), `RedatorIdentityFields` (4) e
`StaffUserDialog` (2) seguem o molde do Step 1: `readOnly={readOnly}` e `value={...}` no `FormField`,
`disabled={readOnly}` fora do controle. Campo de data usa o valor já formatado que a tela exibe, não
o ISO cru; campo opcional usa `?? ''` para cair no travessão.

- [ ] **Step 4: Converter `AddressFields` (7) e `ContactCard` (4 dos 5)**

Mesmo molde. Em `ContactCard`, **não** tocar o `AppRadioButton` de `ContactCard:31-34`: ele fica com
`disabled={readOnly}`. Como a regra de lint da Task 7 casa exatamente esse padrão, o sítio precisa de
um `eslint-disable-next-line` **com o motivo escrito ao lado** — nunca de um `ignores` de arquivo
inteiro, que calaria também os quatro campos convertidos deste mesmo arquivo:

```tsx
        {/* Único `disabled={readOnly}` que fica: rádio de contato principal não
            é valor truncado e o estado já é legível pela marcação (spec §4.1). */}
        {/* eslint-disable-next-line no-restricted-syntax */}
        <AppRadioButton checked={c.is_primary} disabled={readOnly} onChange={...} />
```

- [ ] **Step 5: Converter `ModuleCard` (5 `NestedField`) e `CourseDialog` (4) e `BudgetDialog` (1)**

`ModuleCard` é o único consumidor de `NestedField`; a forma é idêntica, sem `label`:

```tsx
      <NestedField error={errors?.[`modules.${i}.name`]?.[0]} readOnly={readOnly} value={m.name}>
        <AppInputText value={m.name} onChange={(e) => onPatch(i, 'name', e.target.value)} className="w-full" />
      </NestedField>
```

- [ ] **Step 6: Provar que sobrou exatamente um**

```bash
cd frontend && grep -rn "disabled={readOnly}" src/features src/shared
```

Expected: **uma** linha, a do `AppRadioButton` de `ContactCard`. Qualquer outra é sítio esquecido.

- [ ] **Step 7: Gate e commit**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

Expected: 28 arquivos / 136 testes, build e lint verdes.

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/features
git commit -m "feat(ui): modo leitura mostra o valor inteiro nos 40 sitios de campo desabilitado"
```

---

### Task 4: estado vazio dentro da faixa visível

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:83-84`

**Interfaces:**
- Consumes: nada.
- Produces: `AppDataTable` esconde o `<thead>` sob a mesma condição que já zera a largura mínima.
  Alcança as 14 tabelas do sistema, inclusive as que não adotaram a moldura.

**A válvula que já existe e não bastou (spec §5.1):** `AppDataTable.tsx:83-84` já zera o
`min-w-[48rem]` quando não há linhas, desde `127e175` (2026-07-26) — **antes** da medição de
2026-08-10, que ainda assim encontrou 452px de conteúdo para 276px visíveis em `390x844`. O que sobra
é o `<thead>`: seis cabeçalhos com `px-4 py-2.5` têm largura intrínseca própria e sustentam a tabela
mesmo com o corpo ocupado por um único `<td>` de estado vazio.

- [ ] **Step 1: Ver o vermelho, medido e não descrito**

Com `pnpm dev` e a viewport em `390x844`, abrir `/comercial` › Clientes e buscar um termo sem
resultado (o estado vazio de busca). No console:

```js
const w = document.querySelector('.p-datatable-wrapper')
;[w.scrollWidth, w.clientWidth]
```

Expected AGORA: `scrollWidth` **maior** que `clientWidth` — há rolagem horizontal, que é o débito.
Registrar os dois números.

- [ ] **Step 2: Esconder o cabeçalho sob a mesma condição**

Em `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`, na linha 84, trocar o `widthPt` por:

```tsx
  // Sem linhas, sem cabeçalho. A largura mínima já era zerada aqui, e não
  // bastou: os seis `<th>` com `px-4 py-2.5` têm largura intrínseca própria e
  // sustentam a tabela mesmo com o corpo ocupado por um único `<td>` de estado
  // vazio (452px de conteúdo para 276px visíveis, medido em 390x844). Cabeçalho
  // sobre zero linha não informa nada: não há coluna a interpretar.
  const widthPt: DataTablePassThroughOptions = hasRows
    ? {}
    : { table: { className: '' }, thead: { className: 'hidden' } }
```

- [ ] **Step 3: Ver o verde na mesma medição**

Repetir o Step 1. Expected: `scrollWidth === clientWidth`, sem rolagem horizontal. Conferir também
que o `AppErrorState` (com a API derrubada) cabe pela mesma regra — os dois estados passam pelo mesmo
`hasRows`.

- [ ] **Step 4: Provar que a lista cheia NÃO mudou**

Limpar a busca e conferir em `1440x900` que o cabeçalho voltou, com as mesmas colunas e a mesma
largura mínima de antes. Este é o ramo `hasRows: true`, que não deve ter mudado uma linha.

**Declarado e fora (spec §5.2):** a toolbar da `SearchableTableFrame` tem dois `min-w-64` aninhados
(`SearchableTableFrame.tsx:103-104`) e continua sendo o que transborda com a lista **cheia** em
`390x844`. Reduzir esse mínimo é mexer no campo de busca de 6 tabelas por medição que este bloco não
fez.

- [ ] **Step 5: Gate e commit**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/AppDataTable/AppDataTable.tsx
git commit -m "fix(ui): sem linhas, sem cabecalho — estado vazio cabe na faixa visivel"
```

---

### Task 5: CTA de cadastro num lugar só

**Files:**
- Modify: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:115`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx:97`

**Interfaces:**
- Consumes: nada.
- Produces: a moldura decide sozinha onde o `actions` aparece. As 5 tabelas adotantes seguem passando
  `actions` uma vez cada e **não** mudam uma linha.

**A superfície é maior do que o débito dizia (spec §6):** `actions` chega ao `emptyState` **e** à
toolbar em **seis** tabelas, não nas duas nomeadas — `ClientsTable:41,45`, `CoursesTable:26,29`,
`UsersTable:26,29`, `StudentsTable:25,28`, `RedatoresTable:26,29` e `BudgetsTable:71,97` (que monta o
vazio à mão, fora da moldura, porque a adoção é BD-4).

- [ ] **Step 1: Ver o vermelho**

Com a lista de clientes vazia (busca sem resultado limpa não serve — é preciso lista vazia de
verdade; use um filtro que zere a lista ou um ambiente sem clientes), contar os botões de cadastro:

```js
document.querySelectorAll('button').length
```

Melhor, contar pelo rótulo:

```js
[...document.querySelectorAll('button')].filter((b) => b.textContent.includes('Nuevo')).length
```

Expected AGORA: **2** — um na toolbar, um dentro do `AppEmptyState`.

- [ ] **Step 2: Pôr a regra na moldura**

Em `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx`, linha 115, trocar:

```tsx
        end={error ? undefined : actions}
```

por:

```tsx
        // O CTA aparece na toolbar quando há linha e dentro do vazio quando não
        // há: com a lista vazia o convite a cadastrar É o empty state, e dois
        // botões idênticos na mesma tela é o débito. Irmã da supressão em erro,
        // que já morava nesta linha.
        end={error || table.rows.length === 0 ? undefined : actions}
```

- [ ] **Step 3: Aplicar a mesma regra à `BudgetsTable`, que ainda não adotou a moldura**

Em `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx:97`, trocar:

```tsx
        end={loadError ? undefined : actions}
```

por:

```tsx
        {/* Mesma regra da SearchableTableFrame; a adoção da moldura é o BD-4. */}
        end={loadError || budgets.length === 0 ? undefined : actions}
```

- [ ] **Step 4: Ver o verde**

Repetir a contagem do Step 1. Expected: **1**, o de dentro do `AppEmptyState`. Com a lista cheia,
expected: **1**, o da toolbar. Conferir nas duas: `/comercial` (Clientes e Presupuestos), `/catalogo`,
`/personas`, `/administracion`.

- [ ] **Step 5: Gate e commit**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/SearchableTableFrame/ frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
git commit -m "fix(ui): CTA de cadastro num lugar so — toolbar com linha, vazio sem"
```

---

### Task 6: Q-14 e Q-15 — o carregamento para de mentir

**Files:**
- Modify: `frontend/src/shared/ui/AppErrorState/AppErrorState.tsx:11,24,34-38`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:41,108`
- Modify: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:50`
- Modify: `frontend/src/shared/hooks/useCrudPage.ts:44`
- Modify: `frontend/src/shared/hooks/useCrudPage.test.ts`

**Interfaces:**
- Consumes: `AppDataTable` da Task 4 (mesmo arquivo, linha diferente — a Task 4 mexe em `:84`, esta
  em `:41` e `:108`) e `SearchableTableFrame` da Task 5 (a Task 5 mexe em `:115`, esta em `:50`).
- Produces: `onRetry` passa de `() => void` para `() => void | Promise<unknown>` nas **três** camadas
  que o declaram — `AppErrorStateProps:11`, `AppDataTableProps:41` e `SearchableTableFrameProps:50`.
  `useCrudPage.refetch` passa a **devolver** a promise em vez de descartá-la.

**Por que as três, e não só o `AppErrorState`:** TypeScript aceita atribuir `() => Promise<T>` a uma
prop `() => void`, então a promise **chegaria em runtime** com as camadas do meio ainda tipadas como
`void` e o build passaria verde. O tipo estaria mentindo sobre o contrato do qual o Q-14 depende, e o
próximo a ler `AppDataTableProps` concluiria que não há promise para aguardar.

**Os dois no mesmo commit porque são a mesma classe (spec §7):** estado de carregamento mentindo na
tela — o botão que não diz que está reintentando e a faixa que conta 0 durante o load.

- [ ] **Step 1: Escrever o teste que falha, no hook**

Em `frontend/src/shared/hooks/useCrudPage.test.ts`, acrescentar:

```ts
  it('refetch devolve a promise em vez de descartá-la', async () => {
    // O AppErrorState aguarda este retorno para manter o botão em `loading`.
    // Descartar a promise (`() => { void query.refetch() }`) deixa o Reintentar
    // sem feedback nenhum, que é o Q-14.
    const { result } = renderHook(() => useCrudPage(fakeApi), { wrapper })

    const returned = result.current.refetch()

    expect(returned).toBeInstanceOf(Promise)
    await returned
  })
```

Ajustar `fakeApi`/`wrapper` aos nomes já usados no arquivo — não inventar helpers novos.

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test -- useCrudPage
```

Expected: FAIL em `expect(returned).toBeInstanceOf(Promise)` — o retorno é `undefined`.

- [ ] **Step 3: Devolver a promise**

Em `frontend/src/shared/hooks/useCrudPage.ts:44`:

```ts
    /** Devolve a promise: o `AppErrorState` a aguarda para manter o Reintentar
     * em `loading` enquanto o GET está em voo (Q-14). */
    refetch: () => query.refetch(),
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd frontend && pnpm test -- useCrudPage
```

Expected: PASS.

- [ ] **Step 5: Fazer o `AppErrorState` aguardar**

Em `frontend/src/shared/ui/AppErrorState/AppErrorState.tsx`, trocar a prop e o botão:

```tsx
import { useState } from 'react'
import { AppButton } from '../AppButton'

export interface AppErrorStateProps {
  title: string
  detail?: string | null
  retryLabel?: string
  /** Devolver a promise do refetch faz o botão esperar por ela. Handler que
   * devolve `void` continua funcionando — só fica sem feedback, e isso está
   * declarado na spec §7.1 como limitação, não como bug. */
  onRetry?: () => void | Promise<unknown>
}
```

E dentro do componente:

```tsx
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    try {
      await onRetry?.()
    } finally {
      setRetrying(false)
    }
  }
```

```tsx
      {retryLabel && onRetry && (
        <div className="mt-1">
          <AppButton
            label={retryLabel}
            icon="pi pi-refresh"
            outlined
            loading={retrying}
            disabled={retrying}
            onClick={() => { void handleRetry() }}
          />
        </div>
      )}
```

- [ ] **Step 6: Propagar o tipo nas duas camadas do meio**

Em `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:41` e
`frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:50`, a mesma troca:

```tsx
  /** Devolver a promise do refetch faz o Reintentar do AppErrorState esperar
   * por ela (Q-14). Tipar `() => void` aqui compilaria — TS aceita descartar o
   * retorno — e faria o tipo mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
```

- [ ] **Step 7: Q-15 — a faixa diz "cargando", não "0"**

`AppDataTable` já importa `useTranslation` (linha 2) e já tem `const { t } = useTranslation()`
(linha 74) — não é preciso acrescentar nada. Na linha 108:

```tsx
      // Desligar o paginador durante o `loading` foi recusado: a faixa some e
      // volta, e o card salta de altura a cada GET. O que muda é o TEXTO.
      paginatorLeft={loading ? t('common.loading') : footerCount}
```

- [ ] **Step 8: Ver os dois verdes no navegador**

- **Q-14:** derrubar a API (`docker compose stop nginx`), abrir `/comercial`, clicar em
  **Reintentar** repetidamente. Expected: o botão fica **desabilitado com spinner** enquanto o GET
  está em voo, e cliques repetidos não disparam GETs empilhados (conferir na aba Network). Subir a
  API de volta.
- **Q-15:** com o throttle da rede em `Slow 3G`, recarregar `/comercial`. Expected: a faixa do rodapé
  diz **`Cargando...`** durante o GET e **nunca** "0 registros"; o card **não** salta de altura.

- [ ] **Step 9: Gate e commit**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

Expected: **28 arquivos / 137 testes** (o teste novo do `useCrudPage`).

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/AppErrorState/ frontend/src/shared/ui/AppDataTable/ frontend/src/shared/ui/SearchableTableFrame/ frontend/src/shared/hooks/useCrudPage.ts frontend/src/shared/hooks/useCrudPage.test.ts
git commit -m "fix(ui): Q-14 e Q-15 — Reintentar com feedback e faixa que nao conta 0 no load"
```

---

### Task 7: cor pelo tema, e as duas regras de lint

**Files:**
- Modify (35 ocorrências em 9 arquivos): `ModuleCard` (8), `ModuleFields` (6),
  `ImportResultSummary` (4), `RedatorDocumentSlot` (4), `BudgetDialog` (4), `ImportDialog` (3),
  `EnrollStudentForm` (2), `RedatorDialog` (2), `RoleDialog` (2)
- Modify: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: o `eslint-disable-next-line` que a Task 3 deixou em `ContactCard`.
- Produces: duas regras `no-restricted-syntax` novas em bloco próprio.

**Ocorrências medidas em `18cf90a`, linha a linha:** `ImportResultSummary:30` (`text-slate-600`,
`text-slate-300`), `:47` e `:48` (`text-red-600`); `ModuleFields:33` e `:57` (`text-slate-500`),
`:65` (`bg-amber-50`, `text-amber-700`, `bg-amber-950`, `text-amber-400`); `ModuleCard:26`
(`border-slate-200`, `border-slate-700`), `:28`, `:52`, `:62`, `:71`, `:77`, `:89`
(`text-slate-500`); `EnrollStudentForm:60` (`text-slate-500`), `:76` (`text-red-600`);
`ImportDialog:28` e `:37` (`text-slate-500`), `:52` (`text-red-600`); `BudgetDialog:41`
(`bg-slate-50`, `text-slate-600`, `bg-slate-800`, `text-slate-300`); `RoleDialog:64`
(`text-slate-500`), `:71` (`text-slate-400`); `RedatorDocumentSlot:44` e `:100` (`text-slate-500`),
`:160` (`border-slate-200`, `border-slate-700`); `RedatorDialog:159` e `:161` (`text-red-600`).

**A tradução, sem inventar fórmula nova** — as três já em uso no repo:

| Classe Tailwind | Vira |
|---|---|
| `text-slate-500` / `-400` / `-600` / `-300` (texto de apoio) | `style={{ color: 'var(--text-color-secondary)' }}` |
| `border-slate-200` / `-700` | `style={{ borderColor: 'var(--surface-border)' }}` |
| `text-red-600` | `style={{ color: 'color-mix(in srgb, var(--red-500) 70%, var(--text-color))' }}` |
| `bg-slate-50` / `-800` (fundo de bloco) | `style={{ background: 'var(--surface-ground)' }}` |
| `bg-amber-50`/`-950` + `text-amber-700`/`-400` (aviso) | `style={{ background: 'color-mix(in srgb, var(--yellow-500) 12%, var(--surface-card))', color: 'color-mix(in srgb, var(--yellow-500) 70%, var(--text-color))' }}` |

**O par claro/escuro morre junto.** Onde havia `text-slate-600 dark:text-slate-300`, some o `dark:`
inteiro — a variável já inverte com o tema, e manter o par seria reintroduzir o hardcode pela outra
metade.

- [ ] **Step 1: Converter os 9 arquivos**

Um arquivo por vez, conferindo a tabela acima. Nenhuma classe de **layout** sai: `text-sm`,
`font-semibold`, `px-3`, `rounded` ficam onde estão.

- [ ] **Step 2: Provar que os 9 zeraram**

```bash
cd frontend && grep -rEon "\b(text|bg|border|ring|divide)-(slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|emerald|sky|indigo|violet|rose|orange|teal|cyan|lime|fuchsia|purple|pink)-[0-9]{2,3}\b" src/features | cut -d: -f1 | sort | uniq -c | sort -rn
```

Expected: **7 arquivos**, exatamente os que a D7 deixa de fora — `LoginForm` 12, `CourseStep` 3,
`LoginPage` 2, `QuoteWizard` 2, `ValidationPage` 2, `ManualButton` 1, `ClientsTable` 1 = **23**.
Nenhum dos 9 diálogos pode aparecer.

- [ ] **Step 3: Ver os 9 nos dois temas**

Abrir cada diálogo em tema claro e escuro. Expected: o texto de apoio legível nos dois (é o que a
`color-mix` compra — os palette vars do Lara não invertem), a borda visível, o vermelho de erro com o
mesmo tom do `FormErrorBanner` ao lado.

- [ ] **Step 4: Escrever as duas regras de lint em bloco próprio**

Em `frontend/eslint.config.js`, **um bloco novo**, separado dos `no-restricted-syntax` existentes:

```js
  // Bloco PRÓPRIO de propósito: flat config faz merge raso de `rules`, e dois
  // blocos que casam o mesmo arquivo e declaram `no-restricted-syntax` NÃO
  // concatenam os seletores — o último apaga o primeiro inteiro. É o bug do
  // review de 2026-08-04 (Q-2), documentado em `eslint.config.js:111-116`.
  // Este bloco casa `src/features/**` e não colide com os de cima, que casam
  // `src/features/*/components/**` e o complemento por `ignores`.
  {
    files: ['src/features/**/*.tsx'],
    ignores: [
      // Catraca: lista que só ENCOLHE. Login e Validação têm fundo escuro
      // deliberado — mudá-las é desenho novo, não pagamento de débito (D7).
      'src/features/identity/components/Login/LoginForm.tsx',
      'src/features/identity/components/Login/LoginPage.tsx',
      'src/features/certification/components/Validation/ValidationPage.tsx',
      'src/features/commercial/components/Budget/CourseStep.tsx',
      'src/features/commercial/components/Budget/QuoteWizard.tsx',
      'src/features/operation/components/Document/ManualButton.tsx',
      'src/features/commercial/components/Client/ClientsTable.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/\\b(text|bg|border|ring|divide)-(slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|emerald|sky|indigo|violet|rose|orange|teal|cyan|lime|fuchsia|purple|pink)-[0-9]{2,3}\\b/]',
          message:
            'Cor Tailwind hardcoded: Tailwind é layout, cor vem de variável do tema (ADR-16). Use style={{ color: "var(--text-color-secondary)" }} e irmãs.',
        },
      ],
    },
  },
  // Regra do modo leitura: nasce VERDE, com `ignores` vazio, porque a Task 3
  // zerou os 40 sítios antes de ela existir. Bloco próprio pelo mesmo motivo de
  // merge raso acima.
  {
    files: ['src/features/**/*.tsx', 'src/shared/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="disabled"] > JSXExpressionContainer > Identifier[name="readOnly"]',
          message:
            'Campo desabilitado trunca o valor e some com o contraste em leitura: passe `readOnly` e `value` ao FormField/NestedField (spec BD-3 §4).',
        },
      ],
    },
  },
```

- [ ] **Step 5: Provar que as duas regras REPROVAM (mutação, nos dois sentidos)**

Reintroduzir `className="text-slate-500"` em `RoleDialog.tsx` e rodar:

```bash
cd frontend && pnpm lint
```

Expected: **erro** na linha, com a mensagem da regra. Desfazer.

Reintroduzir `disabled={readOnly}` num `AppInputText` de `ClientGeneralFields.tsx` e rodar de novo.
Expected: **erro** com a mensagem da segunda regra. Desfazer.

**Sem este step o bloco entrega duas regras que podem estar mortas** — seletor de
`no-restricted-syntax` que não casa nada passa verde e ninguém percebe.

- [ ] **Step 6: Provar que o `ignores` está certo, não largo demais**

```bash
cd frontend && pnpm lint
```

Expected: **limpo**. Se algum dos 7 arquivos da catraca reprovar, o path do `ignores` está errado; se
reprovar um dos 9 convertidos, sobrou classe.

- [ ] **Step 7: Gate e commit**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/features frontend/eslint.config.js
git commit -m "feat(ui): cor dos dialogos pelo tema, com catraca de lint para cor e modo leitura"
```

---

### Task 8: gate — os seis pelo `/lotus-ui-review`, numa passada

**Files:** nenhum de produção. Task de verificação pura; **nenhum commit de código.**

**O DoD do BD-3 é comportamento na tela, não lint verde.** `/lotus-ui-review` em `1440x900`,
`1024x768` e `390x844`. O `playwright-cli` está no PATH e `.artifacts/ui-review/` tem run de
2026-08-12 — o caminho está exercitado, ao contrário dos blocos de 2026-08-08 a 2026-08-10, que
declararam o browser indisponível.

- [ ] **Step 1: Higiene, medida e não herdada**

```bash
cd frontend && pnpm test && pnpm lint && pnpm build
```

Expected: **28 arquivos / 137 testes**, lint limpo, build verde. Registrar os números reais no
relatório — se divergirem da projeção, é o número medido que vale.

- [ ] **Step 2: Provar que o bloco não tocou o backend**

```bash
cd /home/jvbat/projetos/fix-frontend
git diff main...HEAD --stat -- backend/ frontend/src/shared/types/generated.ts
```

Expected: **vazio**. Zero backend, zero `generated.ts`.

- [ ] **Step 3: Sem sonda**

```bash
cd /home/jvbat/projetos/fix-frontend
git diff main...HEAD -- frontend/src | grep -nE "console\.log|debugger|SONDA"
```

Expected: **sem saída**.

- [ ] **Step 4: As leis do §5 conferidas, não presumidas**

```bash
cd frontend
grep -rn "from 'primereact" src/features | grep -v "^Binary"
```

Expected: **sem saída** — feature não importa PrimeReact direto.

- [ ] **Step 5: `/lotus-ui-review` nas três viewports**

Invocar a skill sobre `/comercial` (Clientes e Presupuestos), `/catalogo`, `/personas` e
`/administracion`, nas três viewports, com os seis itens como roteiro:

| Item | Sonda | Verde exigido |
|---|---|---|
| 1 foco | `document.activeElement.tagName` depois de `Escape` | `BUTTON` do disparador, nunca `BODY` |
| 1 nome | `aria-label` do `.p-dialog-header-maximize` | presente e **mudando** entre maximizar/restaurar |
| 2 leitura | valor na tela contra o valor do dado | valor inteiro, quebrando linha, selecionável |
| 3 faixa | `scrollWidth` vs `clientWidth` do wrapper em `390x844`, lista vazia | iguais — sem rolagem horizontal |
| 4 CTA | botões de cadastro no DOM com lista vazia | exatamente **1** |
| 5 Q-14 | cliques repetidos no Reintentar | desabilitado com spinner enquanto em voo |
| 5 Q-15 | texto da faixa durante o GET | `Cargando...`, nunca "0" |
| 6 cor | classes de paleta nos 9 arquivos | zero, e o lint reprovando a reintrodução |

- [ ] **Step 6: Registrar o que NÃO ficou provado, sem maquiagem**

A spec §8 declara: o runner do vitest não cobre componente com PrimeReact no jsdom, então **foco,
`aria-label`, largura, CTA e feedback de retry não ganham teste automatizado**. O único mecanismo que
sobrevive ao bloco é o lint da Task 7, e ele só vê cor e `disabled={readOnly}`. Um bloco futuro que
quebre a restauração de foco passa em tudo que é automático. Isto vai no relatório como limitação
declarada, não como pendência escondida.

- [ ] **Step 7: Promover o estado a `ready_for_review`**

Atualizar `docs/superpowers/state.md` com o resultado do gate e commitar junto — o estado muda em
fronteira durável, no mesmo commit do artefato que prova a transição.

---

## Handoff de execução

**`executor: claude`.**

Critério: o bloco é de julgamento visual e de fronteira. As Tasks 1, 4, 5 e 6 fecham por leitura de
sonda no navegador (`activeElement`, `scrollWidth`, contagem de botões, texto da faixa), e ler o
vermelho certo é julgamento, não passo mecânico — o próprio item 3 existe porque a spec do bloco
anterior tratou o mesmo sintoma pela largura mínima e o débito reincidiu. A Task 3 exige decisão por
sítio (qual texto de apresentação mostrar para dropdown, data e campo vazio, em 40 lugares), e a
Task 7 mexe em `eslint.config.js`, onde um bloco a mais no lugar errado apaga seletores existentes
**em silêncio** (Q-2 de 2026-08-04).

Nada é delegado ao Codex, então **não há `paths_autorizados`**.

**Risco de review: MÉDIO** (spec §9). Nenhum gatilho de ALTO se aplica — sem schema, `generated.ts`,
Sanctum, RBAC, dinheiro ou documento legal. Os dois riscos próprios são de alcance: `shared/ui`
alcança todas as telas de uma vez e quase nada disso tem teste; e o modo leitura toca 10 arquivos de
5 features. **O foco do review é um só: onde a mudança de `shared/ui` alcança tela que este bloco não
abriu, e o que ela faz lá.**

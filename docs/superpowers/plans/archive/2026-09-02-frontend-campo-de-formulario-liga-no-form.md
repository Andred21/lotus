# Campo de formulário liga no form — plano de implementação (item 24)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** o campo de formulário recebe `name` e busca valor, setter, erro e `readOnly` do form,
em vez de recebê-los como quatro props repetidas em cada um dos 45 call sites.

**Architecture:** o `FormField` já publica acessibilidade ao controle por `FieldContext`. Este
bloco estende esse mesmo canal com um `bind` (`value` + `onChange`), e cria um
`useFormField(bundle)` que devolve um componente `Field` **de identidade estável**, tipado em
`keyof T`, que desce ao subcomponente como **uma** prop no lugar das quatro. Os 5 wrappers que já
leem o contexto passam a pescar valor e setter dele.

**Tech Stack:** React 19 + TS · Vite · Vitest (jsdom) + `@testing-library/react` ·
PrimeReact via `shared/ui` · ESLint flat config.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-09-02-frontend-campo-de-formulario-liga-no-form-design.md`.
  As 23 decisões dela mandam; este plano não decide nada novo.
- **Branch:** `refactor/frontend-campo-de-formulario-liga-no-form`, worktree `fix-frontend`
  (lane-c), aberta de `main@8efd85f2`. O backend segue em branch própria na main tree.
- **Diretório:** todo comando roda de `frontend/`. Node 22 + pnpm, nativo no WSL — **não** entra
  no container.
- **Lei ADR-05:** feature não importa PrimeReact direto nem outra feature; `shared/hooks` **não**
  importa `shared/ui` (`useFilePreview.ts:12`, `useServerTable.ts:29`) — por isso o module nasce
  em `shared/ui/FormField/`, e não ao lado do `useEntityForm`.
- **Lei "prop do chamador vence"** (`fieldContext.ts`): vale para tudo. A única exceção mecânica
  é `value`/`onChange`, que usam merge explícito `props.x ?? bind.x` em vez do spread — spread cru
  deixaria um `value={undefined}` explícito virar input não-controlado.
- **`generated.ts` não se edita** (ADR-04). Nada aqui toca em tipo gerado.
- **Nenhum teste existente pode ser editado.** Os 21 `<FormField` dos testes atuais passando sem
  uma linha de diff é o que prova que o contrato do `FormField` não mudou.
- **`max-lines: 150`** vale em `src/features/*/components/**`. A migração encolhe arquivos; se
  algum crescer, o desenho saiu do lugar.
- **Commits:** um por task, `Conventional Commits`, mensagem em português.
- **Fora de escopo, sem exceção:** `NestedField`, campo aninhado (`ContactCard`, `AddressFields`,
  `ModuleCard`), `LoginForm`, `ForgotForm`, `SetPasswordPage`, `EnrollStudentForm`,
  `RegisterResultDialog`, `ConfirmIssueDialog`, `RevokeDialog`, `BatchIssueDialog`, os três
  arquivos só-leitura sem form, `AppCheckbox`, `AppRadioButton`, e derivar o `mapped` do
  `FormErrorSummary`.

---

## Estrutura de arquivos

**Criar**

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/ui/FormField/useFormField.tsx` | o `useFormField(bundle)` e o componente `Field` |
| `src/shared/ui/FormField/useFormField.test.tsx` | binding, precedência, `readOnly`, identidade estável |
| `src/shared/ui/FormField/fieldBind.test.tsx` | os 5 wrappers lendo `bind` do contexto |

**Modificar**

| Arquivo | O quê |
|---|---|
| `src/shared/ui/FormField/fieldContext.ts` | tipo `FieldBind`, campo `bind` no contexto, hook `useFieldBind` |
| `src/shared/ui/FormField/FormField.tsx` | prop `bind` opcional, publicada no contexto |
| `src/shared/ui/FormField/index.ts` | exporta `useFormField` e os tipos |
| `src/shared/ui/AppInputText/AppInputText.tsx` | lê `bind` (texto: `?? ''`) |
| `src/shared/ui/AppTextarea/AppTextarea.tsx` | idem |
| `src/shared/ui/AppPassword/AppPassword.tsx` | idem |
| `src/shared/ui/AppDropdown/AppDropdown.tsx` | lê `bind` (`e.value`, `null` passa) |
| `src/shared/ui/AppDatePicker/AppDatePicker.tsx` | lê `bind` (`string \| null` direto) |
| 13 arquivos de feature + os diálogos que os montam | migração (Tasks 5–9) |
| `eslint.config.js` | catraca (Task 10) |

---

### Task 1: `bind` no `FieldContext`

O canal existe e carrega `id`/`invalid`/`describedBy`. Esta task acrescenta `bind` e o hook que o
wrapper usa, **sem** ainda mudar wrapper nenhum.

**Files:**
- Modify: `src/shared/ui/FormField/fieldContext.ts`
- Modify: `src/shared/ui/FormField/FormField.tsx:19-32` (tipo) e `:47-59` (corpo)
- Test: `src/shared/ui/FormField/fieldBind.test.tsx` (criar)

**Interfaces:**
- Produces: `type FieldBind = { value: unknown; onChange: (raw: unknown) => void }` ·
  `useFieldBind<E>(fromEvent: (e: E) => unknown): { value?: unknown; onChange?: (e: E) => void }` ·
  `FormFieldProps.bind?: FieldBind`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/shared/ui/FormField/fieldBind.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FormField } from './FormField'
import { useFieldBind } from './fieldContext'

afterEach(() => {
  cleanup()
})

/** Controle de teste: o mesmo contrato dos wrappers de `shared/ui` — pesca o
 * bind do contexto e diz qual é a forma do próprio evento. */
function ControleFake(props: { value?: string; onChange?: (e: { target: { value: string } }) => void }) {
  const bind = useFieldBind((e: { target: { value: string } }) => e.target.value)
  const value = props.value ?? (bind.value as string | undefined) ?? ''
  const onChange = props.onChange ?? bind.onChange
  return <input data-testid="controle" value={value} onChange={(e) => onChange?.({ target: { value: e.target.value } })} />
}

describe('bind pelo FieldContext', () => {
  it('entrega valor e setter ao controle', () => {
    const onChange = vi.fn()
    render(
      <FormField label="RUT" bind={{ value: '76.123.456-7', onChange }}>
        <ControleFake />
      </FormField>,
    )

    const input = screen.getByTestId('controle') as HTMLInputElement
    expect(input.value).toBe('76.123.456-7')

    fireEvent.change(input, { target: { value: '77' } })
    expect(onChange).toHaveBeenCalledWith('77')
  })

  it('prop do chamador vence o bind', () => {
    const doContexto = vi.fn()
    const doChamador = vi.fn()
    render(
      <FormField label="RUT" bind={{ value: 'do contexto', onChange: doContexto }}>
        <ControleFake value="do chamador" onChange={doChamador} />
      </FormField>,
    )

    const input = screen.getByTestId('controle') as HTMLInputElement
    expect(input.value).toBe('do chamador')

    fireEvent.change(input, { target: { value: 'x' } })
    expect(doChamador).toHaveBeenCalled()
    expect(doContexto).not.toHaveBeenCalled()
  })

  it('sem FormField em volta, o controle não recebe nada', () => {
    render(<ControleFake />)
    expect((screen.getByTestId('controle') as HTMLInputElement).value).toBe('')
  })

  it('em modo leitura não há controle a ligar', () => {
    render(
      <FormField label="RUT" readOnly value="76.123.456-7" bind={{ value: 'x', onChange: vi.fn() }}>
        <ControleFake />
      </FormField>,
    )
    expect(screen.queryByTestId('controle')).toBeNull()
    expect(screen.getByText('76.123.456-7')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run src/shared/ui/FormField/fieldBind.test.tsx
```

Esperado: FAIL — `useFieldBind` não existe (`does not provide an export named 'useFieldBind'`).

- [ ] **Step 3: Acrescentar `FieldBind` e `useFieldBind`**

Em `src/shared/ui/FormField/fieldContext.ts`, acrescentar ao tipo do contexto e ao fim do arquivo:

```ts
/** O que o campo ligado a um form publica ao controle: o valor atual e o
 * setter. `unknown` porque a forma do valor é do domínio, não do canal — quem
 * conhece o tipo é o `Field`, que fecha sobre o `keyof T`. */
export type FieldBind = { value: unknown; onChange: (raw: unknown) => void }

export type FieldContextValue = {
  id: string
  invalid: boolean
  describedBy?: string
  /** Ausente fora de um campo ligado a form: o wrapper continua exatamente
   * como era, controlado pelo call site. */
  bind?: FieldBind
}
```

```ts
/**
 * Valor e setter para o wrapper pendurar no próprio controle.
 *
 * `fromEvent` existe pela mesma razão do `idProp`: a forma do evento é do
 * componente do Prime, não do canal — `e.target.value` no `InputText`, `e.value`
 * no `Dropdown`, o valor já normalizado no `AppDatePicker`. Quem sabe disso é o
 * wrapper.
 *
 * **O retorno NÃO se aplica por spread junto das props do chamador.** `value` e
 * `onChange` entram por merge explícito (`props.value ?? bind.value`), porque um
 * `value={undefined}` explícito vencendo pelo spread transforma input controlado
 * em não-controlado — aviso do React e cursor perdido. `''` do chamador continua
 * vencendo, porque `''` não é nulo.
 */
export function useFieldBind<E>(fromEvent: (e: E) => unknown) {
  const field = useContext(FieldContext)
  const bind = field?.bind
  if (!bind) return {}
  return { value: bind.value, onChange: (e: E) => bind.onChange(fromEvent(e)) }
}
```

Em `src/shared/ui/FormField/FormField.tsx`, acrescentar a prop ao tipo:

```tsx
  /** Valor e setter do form, quando o campo veio de um `Field` (§4.1 da spec).
   * Ausente no uso solto — login, filtro de tabela, célula de edição. */
  bind?: FieldBind
```

…importar `type FieldBind` junto do que já vem de `./fieldContext`, receber `bind` na assinatura
e publicá-lo no contexto:

```tsx
export function FormField({ label, error, readOnly, value, bind, children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const field: FieldContextValue = {
    id,
    invalid: !!error,
    describedBy: error ? errorId : undefined,
    bind,
  }
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run src/shared/ui/FormField/
```

Esperado: PASS nos 4 casos novos **e** nos arquivos `FormField.test.tsx` e
`fieldAssociation.test.tsx` sem edição.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/FormField/fieldContext.ts src/shared/ui/FormField/FormField.tsx src/shared/ui/FormField/fieldBind.test.tsx
git commit -m "feat(shared/ui): FieldContext carrega valor e setter do form"
```

---

### Task 2: `useFormField` e o `Field`

**Files:**
- Create: `src/shared/ui/FormField/useFormField.tsx`
- Create: `src/shared/ui/FormField/useFormField.test.tsx`
- Modify: `src/shared/ui/FormField/index.ts`

**Interfaces:**
- Consumes: `FormField`, `FieldBind` (Task 1)
- Produces:
  - `type FormBundle<T> = { form: T; set: <K extends keyof T>(k: K, v: T[K]) => void; fieldErrors?: Record<string, string[]> | null; readOnly?: boolean }`
  - `type FieldProps<T> = { name: keyof T & string; label: string; error?: string; readOnly?: boolean; value?: ReactNode; children?: ReactNode }`
  - `type FieldComponent<T> = (props: FieldProps<T>) => ReactNode`
  - `useFormField<T>(bundle: FormBundle<T>): FieldComponent<T>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/shared/ui/FormField/useFormField.test.tsx`:

```tsx
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useFormField } from './useFormField'
import { useFieldBind } from './fieldContext'

afterEach(() => {
  cleanup()
})

type Campos = { rut: string; nome: string }

function ControleFake() {
  const bind = useFieldBind((e: { target: { value: string } }) => e.target.value)
  return (
    <input
      data-testid="controle"
      value={(bind.value as string | undefined) ?? ''}
      onChange={(e) => bind.onChange?.({ target: { value: e.target.value } })}
    />
  )
}

function Formulario({
  inicial = { rut: '', nome: '' },
  fieldErrors = null,
  readOnly = false,
  onSet,
}: {
  inicial?: Campos
  fieldErrors?: Record<string, string[]> | null
  readOnly?: boolean
  onSet?: (k: keyof Campos, v: unknown) => void
}) {
  const [form, setForm] = useState<Campos>(inicial)
  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => {
    onSet?.(k, v)
    setForm((f) => ({ ...f, [k]: v }))
  }
  const Field = useFormField({ form, set, fieldErrors, readOnly })
  return (
    <Field name="rut" label="RUT">
      <ControleFake />
    </Field>
  )
}

describe('useFormField', () => {
  it('lê o valor do form pelo name', () => {
    render(<Formulario inicial={{ rut: '76.123.456-7', nome: '' }} />)
    expect((screen.getByTestId('controle') as HTMLInputElement).value).toBe('76.123.456-7')
  })

  it('escreve no form pelo name', () => {
    const onSet = vi.fn()
    render(<Formulario onSet={onSet} />)

    fireEvent.change(screen.getByTestId('controle'), { target: { value: '77' } })

    expect(onSet).toHaveBeenCalledWith('rut', '77')
    expect((screen.getByTestId('controle') as HTMLInputElement).value).toBe('77')
  })

  it('mostra o erro do backend da própria chave', () => {
    render(<Formulario fieldErrors={{ rut: ['RUT inválido'], nome: ['ignorado'] }} />)
    expect(screen.getByText('RUT inválido')).toBeTruthy()
    expect(screen.queryByText('ignorado')).toBeNull()
  })

  it('herda readOnly do bundle e mostra o valor cru', () => {
    render(<Formulario inicial={{ rut: '76.123.456-7', nome: '' }} readOnly />)
    expect(screen.queryByTestId('controle')).toBeNull()
    expect(screen.getByText('76.123.456-7')).toBeTruthy()
  })

  it('NÃO remonta o input entre duas teclas — o nó e o foco sobrevivem', () => {
    render(<Formulario />)
    const antes = screen.getByTestId('controle') as HTMLInputElement
    antes.focus()

    fireEvent.change(antes, { target: { value: '7' } })
    fireEvent.change(screen.getByTestId('controle'), { target: { value: '76' } })

    const depois = screen.getByTestId('controle') as HTMLInputElement
    // Identidade do NÓ, não do valor: componente recriado a cada render remonta
    // o input, e o remonte é invisível para uma asserção de valor.
    expect(depois).toBe(antes)
    expect(document.activeElement).toBe(depois)
    expect(depois.value).toBe('76')
  })
})

describe('useFormField — prop do chamador vence', () => {
  function ComEscapes({ readOnly }: { readOnly: boolean }) {
    const [form, setForm] = useState<Campos>({ rut: 'cru', nome: '' })
    const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setForm((f) => ({ ...f, [k]: v }))
    const Field = useFormField({ form, set, fieldErrors: { rut: ['do contexto'] }, readOnly: true })
    return (
      <Field name="rut" label="RUT" error="do chamador" readOnly={readOnly} value="apresentado">
        <ControleFake />
      </Field>
    )
  }

  it('a prop error vence o fieldErrors', () => {
    render(<ComEscapes readOnly />)
    expect(screen.getByText('do chamador')).toBeTruthy()
    expect(screen.queryByText('do contexto')).toBeNull()
  })

  it('a prop value vence o valor cru em leitura', () => {
    render(<ComEscapes readOnly />)
    expect(screen.getByText('apresentado')).toBeTruthy()
    expect(screen.queryByText('cru')).toBeNull()
  })

  it('a prop readOnly={false} vence o readOnly do bundle', () => {
    render(<ComEscapes readOnly={false} />)
    expect(screen.getByTestId('controle')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run src/shared/ui/FormField/useFormField.test.tsx
```

Esperado: FAIL — `Failed to resolve import "./useFormField"`.

- [ ] **Step 3: Escrever o module**

Criar `src/shared/ui/FormField/useFormField.tsx`:

```tsx
import { useRef, type ReactNode } from 'react'
import { FormField } from './FormField'

/**
 * O que um formulário precisa publicar para os campos se ligarem sozinhos.
 *
 * É um SUBCONJUNTO ESTRUTURAL do que os hooks de form já devolvem
 * (`useRedatorForm`, `useTurmaConfigForm`, `useClientForm`…): o diálogo passa o
 * próprio retorno do hook, sem adaptador.
 */
export type FormBundle<T> = {
  form: T
  set: <K extends keyof T>(k: K, v: T[K]) => void
  fieldErrors?: Record<string, string[]> | null
  /** Ausente nos formulários que não têm modo de leitura (troca de senha,
   * dados do perfil). Ausente = editável. */
  readOnly?: boolean
}

export type FieldProps<T> = {
  /** A chave do form E a chave do erro do backend. Checada contra `keyof T`. */
  name: keyof T & string
  label: string
  /** Escape para o 422 cuja chave não é o nome do campo — hoje um sítio:
   * `legal_name ?? name` no `ClientGeneralFields`. Vence o `fieldErrors`. */
  error?: string
  /** Escape para o campo cujo modo de leitura NÃO é o do formulário
   * (`StudentClientField`: `mode !== 'create'`; `RoleDialog`: input desabilitado
   * em vez de texto). Vence o `readOnly` do bundle. */
  readOnly?: boolean
  /** O valor de APRESENTAÇÃO em leitura, montado por quem tem o vocabulário de
   * domínio: `t('clientType.'+form.type)`, `readDate(form.start_date)`. Sem ele,
   * leitura mostra o valor cru do form. */
  value?: ReactNode
  children?: ReactNode
}

export type FieldComponent<T> = (props: FieldProps<T>) => ReactNode

/**
 * Devolve o campo ligado ao formulário: `<Field name="rut" label={t('common.rut')}>`
 * no lugar de `label` + `error` + `readOnly` + `value` no campo E `value` +
 * `onChange` no controle.
 *
 * **A identidade do componente é estável (`useRef`, criado uma vez).** Componente
 * recriado a cada render é um TIPO novo para o React, que desmonta e remonta a
 * subárvore — o input perde o foco a cada tecla. `useRef` e não `useMemo`: o
 * `useMemo` é dica de cache, e o React pode descartá-la; a estabilidade aqui é
 * requisito de correção, não otimização.
 *
 * O bundle atual chega ao `Field` por `ref` reescrito a cada render — o `Field`
 * lê `ref.current` no PRÓPRIO render, que acontece depois do render do dono, e
 * por isso nunca vê bundle velho.
 *
 * Não vive em `shared/hooks` porque monta JSX: `shared/hooks` não depende de
 * `shared/ui` (ver `useFilePreview.ts`, `useServerTable.ts`).
 */
export function useFormField<T>(bundle: FormBundle<T>): FieldComponent<T> {
  const atual = useRef(bundle)
  atual.current = bundle

  const componente = useRef<FieldComponent<T> | null>(null)
  if (!componente.current) {
    componente.current = function Field({ name, label, error, readOnly, value, children }: FieldProps<T>) {
      const { form, set, fieldErrors, readOnly: leituraDoForm } = atual.current
      const bruto = form[name as keyof T]

      return (
        <FormField
          label={label}
          error={error ?? fieldErrors?.[name]?.[0]}
          readOnly={readOnly ?? leituraDoForm ?? false}
          value={value ?? (bruto as ReactNode)}
          bind={{
            value: bruto,
            onChange: (v: unknown) => set(name as keyof T, v as T[keyof T]),
          }}
        >
          {children}
        </FormField>
      )
    }
  }
  return componente.current
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run src/shared/ui/FormField/
```

Esperado: PASS em tudo, inclusive `FormField.test.tsx` e `fieldAssociation.test.tsx` sem edição.

- [ ] **Step 5: Exportar pelo barril**

Em `src/shared/ui/FormField/index.ts`, acrescentar:

```ts
export { useFormField } from './useFormField'
export type { FormBundle, FieldProps, FieldComponent } from './useFormField'
```

`src/shared/ui/index.ts:46` já reexporta a pasta inteira (`export * from './FormField'`) — nada a
mudar lá.

- [ ] **Step 6: Type-check e commit**

```bash
pnpm build && pnpm lint
```

Esperado: os dois sem erro.

```bash
git add src/shared/ui/FormField/useFormField.tsx src/shared/ui/FormField/useFormField.test.tsx src/shared/ui/FormField/index.ts
git commit -m "feat(shared/ui): useFormField devolve campo ligado ao form"
```

---

### Task 3: os 5 wrappers leem o `bind`

**Files:**
- Modify: `src/shared/ui/AppInputText/AppInputText.tsx`
- Modify: `src/shared/ui/AppTextarea/AppTextarea.tsx`
- Modify: `src/shared/ui/AppPassword/AppPassword.tsx`
- Modify: `src/shared/ui/AppDropdown/AppDropdown.tsx`
- Modify: `src/shared/ui/AppDatePicker/AppDatePicker.tsx`
- Test: `src/shared/ui/FormField/fieldBind.test.tsx` (acrescentar bloco)

**Interfaces:**
- Consumes: `useFieldBind` (Task 1), `useFormField` (Task 2)
- Produces: os 5 wrappers, dentro de um `Field`, dispensam `value`/`onChange` do call site.

**Regra de coerção, por família:**

| Wrapper | Evento → valor | Valor → controle |
|---|---|---|
| `AppInputText`, `AppTextarea`, `AppPassword` | `e.target.value` | `?? ''` — `null` num input de texto é aviso do React ("value prop on input should not be null"), e `business_activity`/`technical_name`/`description` chegam `null` do backend |
| `AppDropdown` | `e.value` | passa direto — `null` é "nada selecionado", estado legítimo |
| `AppDatePicker` | o valor que ele já emite (`string \| null`) | passa direto — `null` é campo vazio |

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao fim de `src/shared/ui/FormField/fieldBind.test.tsx`:

```tsx
import { useState } from 'react'
import { AppInputText } from '../AppInputText/AppInputText'
import { AppDropdown } from '../AppDropdown/AppDropdown'
import { useFormField } from './useFormField'

describe('os wrappers de shared/ui pescam o bind', () => {
  type Campos = { rut: string; giro: string | null; tipo: string | null }

  function Tela() {
    const [form, setForm] = useState<Campos>({ rut: '76.123.456-7', giro: null, tipo: 'client' })
    const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setForm((f) => ({ ...f, [k]: v }))
    const Field = useFormField({ form, set, fieldErrors: null, readOnly: false })
    return (
      <>
        <Field name="rut" label="RUT"><AppInputText /></Field>
        <Field name="giro" label="Giro"><AppInputText /></Field>
        <Field name="tipo" label="Tipo">
          <AppDropdown options={[{ value: 'client', label: 'Cliente' }, { value: 'other', label: 'Outro' }]} />
        </Field>
      </>
    )
  }

  it('AppInputText mostra o valor do form e escreve de volta', () => {
    render(<Tela />)
    const input = screen.getByLabelText('RUT') as HTMLInputElement
    expect(input.value).toBe('76.123.456-7')

    fireEvent.change(input, { target: { value: '77.000.000-0' } })
    expect((screen.getByLabelText('RUT') as HTMLInputElement).value).toBe('77.000.000-0')
  })

  it('AppInputText mostra vazio, não "null", quando o campo é nulo', () => {
    render(<Tela />)
    expect((screen.getByLabelText('Giro') as HTMLInputElement).value).toBe('')
  })

  it('AppDropdown recebe o valor do form', () => {
    render(<Tela />)
    expect(screen.getByLabelText('Tipo')).toBeTruthy()
    expect(screen.getByText('Cliente')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm vitest run src/shared/ui/FormField/fieldBind.test.tsx
```

Esperado: FAIL — o input do RUT vem vazio (`expected '' to be '76.123.456-7'`), porque o wrapper
ainda não lê o bind.

- [ ] **Step 3: `AppInputText`**

Em `src/shared/ui/AppInputText/AppInputText.tsx`, trocar o corpo do componente por:

```tsx
export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    // Antes do spread do chamador: a associação é default, não imposição — quem
    // passa `id` próprio continua vencendo (P-37, spec D5).
    const fieldProps = useFieldProps('id')
    // Fora do spread, de propósito: `value={undefined}` explícito vencendo pelo
    // spread transformaria controlado em não-controlado. `?? ''` porque campo
    // de texto com `null` é aviso do React, e o backend manda `null` em campo
    // opcional (spec §4.5 / Task 3).
    const bind = useFieldBind((e: ChangeEvent<HTMLInputElement>) => e.target.value)
    const value = (props.value ?? bind.value ?? '') as InputTextProps['value']
    const onChange = props.onChange ?? bind.onChange

    if (!leftIcon) {
      return <InputText ref={ref} {...fieldProps} {...props} value={value} onChange={onChange} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        <InputText
          ref={ref}
          {...fieldProps}
          {...props}
          value={value}
          onChange={onChange}
          className={`w-full ${props.className ?? ''}`}
        />
      </IconField>
    )
  },
)
```

…com os imports ajustados no topo do arquivo:

```tsx
import { forwardRef, type ChangeEvent } from 'react'
import { useFieldBind, useFieldProps } from '../FormField/fieldContext'
```

- [ ] **Step 4: `AppTextarea` e `AppPassword`**

Mesma receita, com o `idProp` que cada um já usa (`'id'` no `AppTextarea`, `'inputId'` no
`AppPassword`) e o tipo de evento do próprio controle:

```tsx
// AppTextarea
const bind = useFieldBind((e: ChangeEvent<HTMLTextAreaElement>) => e.target.value)
const value = (props.value ?? bind.value ?? '') as InputTextareaProps['value']
const onChange = props.onChange ?? bind.onChange
// …e no JSX: {...fieldProps} {...props} value={value} onChange={onChange}
```

```tsx
// AppPassword
const bind = useFieldBind((e: ChangeEvent<HTMLInputElement>) => e.target.value)
const value = (props.value ?? bind.value ?? '') as PasswordProps['value']
const onChange = props.onChange ?? bind.onChange
```

> No `AppPassword` o `useFieldProps`/`useSplitFieldProps` já existente **não muda**: o `bind` é
> canal separado do `id`/`aria-*`.

- [ ] **Step 5: `AppDropdown`**

```tsx
export function AppDropdown(props: DropdownProps) {
  const { t, i18n } = useTranslation()
  const fieldProps = useFieldProps('inputId')
  // `null` passa: no dropdown é "nada selecionado", não campo de texto vazio.
  const bind = useFieldBind((e: DropdownChangeEvent) => e.value)
  const value = props.value ?? bind.value
  const onChange = props.onChange ?? bind.onChange
  return (
    <Dropdown
      key={i18n.language}
      className="w-full"
      emptyMessage={t('common.noOptions')}
      {...fieldProps}
      {...props}
      value={value}
      onChange={onChange}
    />
  )
}
```

…importando o tipo do evento: `import type { DropdownProps, DropdownChangeEvent } from 'primereact/dropdown'`.

- [ ] **Step 6: `AppDatePicker`**

O wrapper já converte ISO ↔ `Date` internamente e expõe `value: string | null` /
`onChange: (v: string | null) => void`. O bind entra **na fronteira do wrapper**, antes da
conversão:

```tsx
const bind = useFieldBind((v: string | null) => v)
const value = props.value ?? (bind.value as string | null) ?? null
const onChange = props.onChange ?? (bind.onChange as ((v: string | null) => void) | undefined)
```

…e o corpo passa a usar `isoToDate(value)` e a chamar `onChange?.(dateToIso(e.value as Date | null))`
onde hoje usa `props.value` e `props.onChange`.

- [ ] **Step 7: Rodar tudo e ver passar**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

Esperado: suíte inteira verde — inclusive os testes de tela que hoje montam esses wrappers com
`value`/`onChange` próprios, que continuam vencendo pelo merge.

- [ ] **Step 8: Commit**

```bash
git add src/shared/ui/AppInputText src/shared/ui/AppTextarea src/shared/ui/AppPassword src/shared/ui/AppDropdown src/shared/ui/AppDatePicker src/shared/ui/FormField/fieldBind.test.tsx
git commit -m "feat(shared/ui): os 5 wrappers leem valor e setter do FieldContext"
```

---

### Receita de migração (Tasks 5–9)

Vale para todo call site das tasks seguintes. **Cada arquivo migrado roda a suíte antes do commit.**

**No dono do formulário** (o diálogo que chama o hook):

```tsx
const f = useClientForm(client, mode, onHide)   // já devolve form/set/fieldErrors/readOnly
const Field = useFormField(f)                   // ← acrescentar
…
<ClientGeneralFields Field={Field} />           // ← no lugar de form/readOnly/fieldErrors/onChange
```

O subcomponente só volta a receber `form` quando **a apresentação de leitura** precisa do valor
(rótulo traduzido, data formatada) — duas props, nunca as quatro.

**No subcomponente:** trocar as 4 props por uma:

```tsx
// antes
export function ClientGeneralFields({ form, readOnly, fieldErrors, onChange }: {
  form: ClientFormFields
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onChange: <K extends keyof ClientFormFields>(k: K, v: ClientFormFields[K]) => void
}) {

// depois
export function ClientGeneralFields({ Field }: { Field: FieldComponent<ClientFormFields> }) {
```

…com `import type { FieldComponent } from '@shared/ui'`.

**No campo:**

```tsx
// antes
<FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]} readOnly={readOnly} value={form.rut}>
  <AppInputText value={form.rut} onChange={(e) => onChange('rut', e.target.value)} className="w-full" />
</FormField>

// depois
<Field name="rut" label={t('common.rut')}>
  <AppInputText className="w-full" />
</Field>
```

**Quando NÃO tirar a prop:**

| Situação | O que fica |
|---|---|
| chave de erro ≠ nome do campo | `error={fieldErrors?.legal_name?.[0] ?? fieldErrors?.name?.[0]}` |
| leitura mostra rótulo, não valor cru | `value={t('clientType.'+form.type)}`, `value={readDate(form.start_date)}` |
| `readOnly` do campo ≠ o do form | `readOnly={mode !== 'create'}`, `readOnly={false}` |
| valor convertido nos dois sentidos | `value` **e** `onChange` ficam **no controle** (Q23) |

**O que NÃO muda em nenhum arquivo:** o `FormErrorSummary` e o seu `mapped`, o `FormErrorBanner`,
o `NestedField`, e qualquer `<FormField>` fora da lista de escopo.

---

### Task 4: piloto — `ClientGeneralFields`

Um arquivo só, escolhido por concentrar **as três** escapes: erro com chave divergente, valor de
apresentação e campo `null`.

**Files:**
- Modify: `src/features/commercial/components/Client/ClientGeneralFields.tsx`
- Modify: `src/features/commercial/components/Client/ClientDialog.tsx:76` (a montagem)

**Interfaces:**
- Consumes: `useFormField`, `FieldComponent` (Task 2), wrappers ligados (Task 3)
- Produces: o molde que as Tasks 5–9 repetem.

**Duas coisas deste arquivo precisam do valor do form, e o `Field` sozinho não as resolve.** As
duas têm saída sem crescer a interface pública:

1. **O erro de `legal_name` soma duas chaves** (`legal_name ?? name`). O remendo sai da tela e vai
   para o `useClientForm`, onde o `fieldErrors` já mora — assim o subcomponente não precisa mais
   de `fieldErrors`, que é o que este bloco veio tirar.
2. **Em leitura, `type` mostra o rótulo traduzido.** Isso exige o valor do form. O subcomponente
   então recebe **duas** props, `Field` e `form` — e não quatro. `form` entra só como leitura para
   a apresentação; `set`, `readOnly` e `fieldErrors` somem.

- [ ] **Step 1: Mover o fallback do erro para o hook**

Em `src/features/commercial/hooks/useClientForm.ts`, junto do `useMutationErrors` que já existe:

```ts
const { fieldErrors: doBackend, generalError } = useMutationErrors([create.error, update.error])

/** `name` é derivado de `legal_name` no submit, então o 422 pode voltar com a
 * chave do derivado. O campo na tela é `legal_name` e é ele que gerou o erro —
 * mapear aqui é o que permite o campo ler o próprio erro pelo `name`, em vez de
 * a tela somar duas chaves à mão (item 24, spec §5). */
const fieldErrors =
  doBackend?.name && !doBackend.legal_name
    ? { ...doBackend, legal_name: doBackend.name }
    : doBackend
```

…e o `return` do hook continua devolvendo `fieldErrors` com o mesmo nome.

- [ ] **Step 2: Migrar o subcomponente**

`ClientGeneralFields.tsx`, inteiro, depois:

```tsx
import { useTranslation } from 'react-i18next'
import { AppInputText, AppDropdown, type FieldComponent } from '@shared/ui'
import type { ClientFormFields } from '../../hooks/useClientForm'

const TYPE_VALUES = ['client', 'provider', 'other'] as const

/** Dados gerais da empresa: razón social, RUT, email, tipo e giro. Subcomponente
 * local de `commercial` (não `shared/ui`): tem vocabulário de domínio. A foto
 * fica no diálogo — quem a alimenta é o `useEntityPhoto` de lá.
 *
 * `form` entra além do `Field` por UM motivo: em leitura o tipo mostra o rótulo
 * traduzido, não o código cru, e a apresentação precisa do valor. `set`,
 * `readOnly` e `fieldErrors` não entram — o `Field` os traz. */
export function ClientGeneralFields({
  Field, form,
}: {
  Field: FieldComponent<ClientFormFields>
  form: ClientFormFields
}) {
  const { t } = useTranslation()
  const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))

  return (
    <>
      {/* Empresa não tem "nome" separado da razón social — `name` (exigido pelo
          backend) é derivado de `legal_name` no submit, e o 422 pode voltar com
          a chave do derivado. O mapeamento vive no `useClientForm`. */}
      <Field name="legal_name" label={t('client.legalName')}>
        <AppInputText className="w-full" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="rut" label={t('common.rut')}>
          <AppInputText className="w-full" />
        </Field>
        <Field name="email" label={t('common.email')}>
          <AppInputText className="w-full" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="type"
          label={t('client.type')}
          value={t(`clientType.${form.type}`)}
        >
          <AppDropdown options={types} />
        </Field>
        <Field name="business_activity" label={t('client.businessActivity')}>
          <AppInputText className="w-full" />
        </Field>
      </div>
    </>
  )
}
```

Os cinco campos passam de 4+2 props para 1 (ou 2 no `type`). `business_activity` chega `null` do
backend e é o `?? ''` do `AppInputText` (Task 3) que cuida disso.

- [ ] **Step 3: Migrar a montagem no `ClientDialog`**

```tsx
const Field = useFormField(f)
…
<ClientGeneralFields Field={Field} form={f.form} />
```

- [ ] **Step 4: Rodar a suíte e o type-check**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

Esperado: verde. Se um teste de tela reprovar, **o teste não se edita** — o desvio é do código.

- [ ] **Step 5: Commit**

```bash
git add src/features/commercial/components/Client/ClientGeneralFields.tsx src/features/commercial/components/Client/ClientDialog.tsx src/features/commercial/hooks/useClientForm.ts
git commit -m "refactor(commercial): ClientGeneralFields lê o form pelo Field"
```

---

### Task 5: `commercial` — o que sobra

**Files:**
- Modify: `src/features/commercial/components/Budget/DataStep.tsx` (5 campos)
- Modify: `src/features/commercial/components/Budget/QuoteWizard.tsx:74` (a montagem)
- Modify: `src/features/commercial/components/Budget/BudgetDialog.tsx` (2 campos)

**Interfaces:**
- Consumes: o molde da Task 4.

Traps deste arquivo, medidos:

| Campo | O que fica manual |
|---|---|
| `DataStep.student_count` | `value={String(form.student_count)}` e `onChange` **no `AppInputText`** — converte nos dois sentidos |
| `DataStep.value_uf` | idem: `value={form.value_uf.replace('.', ',')}` e `onChange={(e) => onChange('value_uf', parseUfInput(e.target.value))}` — **o comentário de 8 linhas sobre a vírgula não se apaga** |
| `DataStep.purchase_order` | `onChange={(e) => onChange('purchase_order', e.target.value || null)}` no controle |
| `DataStep.planned_start_date` / `planned_end_date` | colapsam inteiros — o `AppDatePicker` já emite `string \| null` |
| `BudgetDialog.client_id` | colapsa: o dropdown emite `number` e o `set` o aceita |

- [ ] **Step 1: Migrar `DataStep`**

Trocar a assinatura por `{ Field }: { Field: FieldComponent<QuoteFormFields> }`, envolver os cinco
campos em `<Field name=… label=…>`, e manter `value`/`onChange` **nos três controles** da tabela
acima. Exemplo do caso que colapsa e do que não:

```tsx
      <Field name="student_count" label={t('quote.students')}>
        <AppInputText
          value={String(form.student_count)}
          onChange={(e) => onChange('student_count', Number(e.target.value.replace(/\D/g, '')) || 0)}
          className="w-full"
        />
      </Field>

      <Field name="planned_start_date" label={t('quote.plannedStart')}>
        <AppDatePicker />
      </Field>
```

> `DataStep` continua recebendo `form` e `onChange` **além** do `Field`, porque três dos cinco
> campos convertem nos dois sentidos (Q23). O que sai é `fieldErrors` — as 5 extrações `?.[0]`.

- [ ] **Step 2: Migrar a montagem no `QuoteWizard`**

```tsx
const Field = useFormField(f)
…
<DataStep Field={Field} form={f.form} onChange={f.set} />
```

- [ ] **Step 3: Migrar `BudgetDialog`**

Dois campos; ambos colapsam. `useFormField` chamado no próprio arquivo, sobre o retorno do hook
de form que ele já usa.

- [ ] **Step 4: Verificar**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/features/commercial
git commit -m "refactor(commercial): DataStep e BudgetDialog leem o form pelo Field"
```

---

### Task 6: `identity` — Redator e Student

**Files:**
- Modify: `src/features/identity/components/Redator/RedatorIdentityFields.tsx` (5)
- Modify: `src/features/identity/components/Redator/RedatorDialog.tsx:104` (montagem)
- Modify: `src/features/identity/components/Student/StudentIdentifyFields.tsx` (4)
- Modify: `src/features/identity/components/Student/StudentClientField.tsx` (1)
- Modify: `src/features/identity/components/Student/StudentDialog.tsx:75,79-88` (montagem)

Traps:

- `StudentClientField` **mantém** `readOnly={mode !== 'create'}` e `value={readOnlyLabel}` — o
  modo de leitura dele não é o do formulário, e o rótulo vem da entidade, não da lista de opções.
  Ele perde só o `error` e o `value`/`onChange` do `AppDropdown`; as outras 12 props (estado de
  carga) não têm nada a ver com este bloco e **não se tocam**.
- `RedatorIdentityFields` e `StudentIdentifyFields` colapsam inteiros.

- [ ] **Step 1: Migrar os três subcomponentes** pela receita, mantendo os desvios acima.
- [ ] **Step 2: Migrar as duas montagens** (`useFormField(f)` + prop `Field`).
- [ ] **Step 3: Verificar**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/features/identity/components/Redator src/features/identity/components/Student
git commit -m "refactor(identity): campos de redator e aluno leem o form pelo Field"
```

---

### Task 7: `identity` — Admin e Profile

**Files:**
- Modify: `src/features/identity/components/Admin/StaffIdentifyFields.tsx` (5)
- Modify: `src/features/identity/components/Admin/StaffUserDialog.tsx` (3 + montagem)
- Modify: `src/features/identity/components/Admin/RoleDialog.tsx` (1)
- Modify: `src/features/identity/components/Profile/ProfilePersonalSection.tsx` (2)
- Modify: `src/features/identity/components/Profile/ProfileSecuritySection.tsx` (3)

Traps:

- **`RoleDialog`**: o bundle do `useRoleForm` **tem** `readOnly`, mas o `FormField` de hoje não o
  recebe — o campo usa `disabled={!editable}` no input. Herdar do contexto trocaria input
  desabilitado por texto, que é mudança de comportamento não autorizada. **Passa
  `readOnly={false}` explícito** e mantém o `disabled` como está.
- **`StaffUserDialog`**: dos 3 campos, um é `readOnly` puro com `value={<AppTag …/>}` e **sem
  filho** — não vira `Field`, continua `FormField`. Os outros dois (`role`, `is_active`) viram
  `Field` mantendo o `value` de apresentação (`roleOptions.find(...)?.label`,
  `form.is_active ? t('common.active') : t('common.inactive')`) — sem ele, leitura mostraria o
  código cru e, no booleano, **nada**.
- `ProfilePersonalSection` e `ProfileSecuritySection`: os bundles não têm `readOnly` (o campo
  `readOnly?` do `FormBundle` é opcional justamente por isso) — colapsam inteiros.

- [ ] **Step 1: Migrar os cinco arquivos** pela receita, com os desvios acima.
- [ ] **Step 2: Verificar**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/features/identity/components/Admin src/features/identity/components/Profile
git commit -m "refactor(identity): campos de admin e perfil leem o form pelo Field"
```

---

### Task 8: `catalog` — `CourseDialog`

**Files:**
- Modify: `src/features/catalog/components/Course/CourseDialog.tsx` (4 campos)

Traps:

- `workload_hours` converte nos dois sentidos (`String(n)` / `Number(…replace)`): `value` e
  `onChange` ficam **no `AppInputText`**, e o `value` de apresentação do campo
  (`value={String(form.workload_hours)}`) também fica, porque em leitura o número cru
  renderizaria sem o `String`.
- `technical_name` e `description` chegam `null`: colapsam, e quem cuida do `null` é o `?? ''` do
  wrapper (Task 3).
- O arquivo passa `fieldErrors` para `ModuleFields` (`:85`) — **aquilo é campo aninhado, fora de
  escopo.** A prop continua sendo passada.

- [ ] **Step 1: Migrar os 4 campos.**
- [ ] **Step 2: Verificar**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "refactor(catalog): CourseDialog lê o form pelo Field"
```

---

### Task 9: `operation` — `TurmaConfigCard`

**Files:**
- Modify: `src/features/operation/components/Turma/TurmaConfigCard.tsx` (5 campos)

Traps:

- As duas datas convertem nos dois sentidos (`f.form.x || null` / `v ?? ''`): `value` e `onChange`
  ficam no `AppDatePicker`, e o `value={readDate(f.form.start_date)}` do campo fica, porque em
  leitura a data tem gramática de idioma, não ISO.
- `local_aplicacao` tem `disabled={f.form.modalidade === 'online'}` no input — **não é `readOnly`
  do form**, e não se toca.
- O arquivo tem `MAPPED` e um `FormErrorSummary` — **não se mexe** (§5 da spec).
- `TurmaConfigCard.test.tsx` existe e usa `fieldErrors`. **Não editar o teste**; ele monta o
  componente, e o componente é que muda.

- [ ] **Step 1: Migrar os 5 campos.**
- [ ] **Step 2: Verificar**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

Esperado: `TurmaConfigCard.test.tsx` verde sem edição.

- [ ] **Step 3: Commit**

```bash
git add src/features/operation/components/Turma/TurmaConfigCard.tsx
git commit -m "refactor(operation): TurmaConfigCard lê o form pelo Field"
```

---

### Task 10: a catraca

Só agora: a régua ligada antes da última migração reprovaria o repositório por tasks inteiras.

**Files:**
- Modify: `frontend/eslint.config.js`

> **A armadilha, escrita no próprio arquivo (Q-2, 2026-08-04):** `no-restricted-syntax` de bloco
> posterior **apaga** o do anterior por merge raso. A régua nova entra **nos arrays dos blocos que
> já existem** — nunca em bloco novo. Os blocos a tocar são os das linhas **497**, **510** e
> **531** (`src/features/*/components/**`, `CATRACA_COR` e `src/features/**`).

- [ ] **Step 1: Ver a régua reprovar antes de existir (sonda negativa)**

Escolher um arquivo já migrado, reintroduzir **temporariamente** uma extração
`fieldErrors?.rut?.[0]`, e guardar o arquivo original no scratchpad:

```bash
cp src/features/identity/components/Redator/RedatorIdentityFields.tsx "$SCRATCH/RedatorIdentityFields.orig.tsx"
```

- [ ] **Step 2: Escrever o seletor**

Junto dos outros seletores nomeados de `eslint.config.js` (perto de `DROPDOWN_SEM_NOME`, `:216`):

```js
// O campo ligado ao form (item 24) tem UMA porta para o erro do backend: o
// `name`. A extração à mão era a grafia de 48 sítios em 24 arquivos, e cada
// campo novo que a esquecesse ficava com o 422 invisível — botão de salvar
// aparentemente inerte. `error` continua existindo como escape declarada (a
// chave que não é o nome do campo), e é por isso que a régua mede a EXTRAÇÃO,
// não a prop.
const ERRO_DE_CAMPO_A_MAO = {
  selector:
    'MemberExpression[computed=true][object.object.name="fieldErrors"][property.value=0]',
  message:
    'Erro de campo extraído à mão: use <Field name="x"> e o erro vem do form (spec do item 24). A prop `error` fica para a chave que NÃO é o nome do campo.',
}
```

- [ ] **Step 3: Declarar a lista de fora, junto de `CATRACA_COR`**

```js
// Os arquivos que o item 24 deixou fora POR MEDIÇÃO (spec §2), e que por isso
// seguem extraindo o erro à mão. Não é dívida esquecida: é o escopo escrito.
// Particiona o mesmo glob do bloco de componente, exatamente como `CATRACA_COR`
// faz — ver o bloco gêmeo abaixo.
const FORA_DO_CAMPO_LIGADO = [
  // Sem bundle de form a que ligar o campo: setter por campo, estado solto, ou
  // chave de erro que não é o nome do campo (`grades.final`).
  'src/features/operation/components/Enrollment/EnrollStudentForm.tsx',
  'src/features/operation/components/Enrollment/RegisterResultDialog.tsx',
  'src/features/certification/components/Emission/ConfirmIssueDialog.tsx',
  'src/features/certification/components/Emission/BatchIssueDialog.tsx',
  'src/features/certification/components/Historial/RevokeDialog.tsx',
  // Campo aninhado: chave posicional `contacts.<i>.<campo>` e setter de patch.
  // A porta futura é um `FormScope prefix=`, não esta régua.
  'src/features/commercial/components/Client/ContactCard.tsx',
  'src/features/commercial/components/Client/ContactFields.tsx',
  'src/features/catalog/components/Course/ModuleCard.tsx',
  'src/features/catalog/components/Course/ModuleFields.tsx',
  // Não são formulário de entidade: sem entidade, sem dialog, sem modo.
  'src/features/identity/components/Login/LoginForm.tsx',
  'src/features/identity/components/Login/ForgotForm.tsx',
  'src/features/identity/components/Password/SetPasswordPage.tsx',
]
```

- [ ] **Step 4: Provar que as duas listas não se cruzam**

`CATRACA_COR` e `FORA_DO_CAMPO_LIGADO` particionam o **mesmo** glob. Arquivo nas duas casaria dois
blocos, e o segundo apagaria o `no-restricted-syntax` do primeiro **em silêncio** — o bug de merge
raso, de novo.

```bash
node -e "
const fs=require('fs');const s=fs.readFileSync('eslint.config.js','utf8');
const lista=(n)=>[...s.match(new RegExp('const '+n+' = \\\\[([^\\\\]]*)\\\\]'))[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
const a=lista('CATRACA_COR'),b=lista('FORA_DO_CAMPO_LIGADO');
const cruz=a.filter(x=>b.includes(x));
console.log(cruz.length?'CRUZAMENTO: '+cruz.join(', '):'sem cruzamento');
"
```

Esperado: `sem cruzamento`. Se cruzar, **pare** — o desenho da partição precisa mudar antes de
qualquer régua entrar.

- [ ] **Step 5: Acrescentar a régua aos arrays existentes e criar o bloco gêmeo**

Nos três blocos que já casam os globs, acrescentar `ERRO_DE_CAMPO_A_MAO` **ao fim do array**, sem
criar bloco novo:

- `:497` (`src/features/*/components/**`, hoje com `ignores: CATRACA_COR`) — o `ignores` passa a
  `ignores: [...CATRACA_COR, ...FORA_DO_CAMPO_LIGADO]`;
- `:510` (`files: CATRACA_COR`) — só acrescenta a régua ao array;
- `:531` (`src/features/**`, o resto da feature) — só acrescenta a régua ao array.

E **um bloco gêmeo novo**, com o mesmo array do `:497` **menos** `ERRO_DE_CAMPO_A_MAO`, cobrindo a
partição que saiu:

```js
  // Gêmeo do bloco de componente para os arquivos fora do item 24: MESMO array,
  // menos `ERRO_DE_CAMPO_A_MAO`. Sem ele, `ignores` no bloco de cima não
  // significa "esta régua não vale aqui" — significa "NENHUMA régua vale aqui",
  // e os 3 bans de query, o de cor e os de acessibilidade sumiriam desses 12
  // arquivos em silêncio. É o mesmo molde da partição `CATRACA_COR`.
  {
    files: FORA_DO_CAMPO_LIGADO,
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, ...REGRAS_COMPONENTE_FEATURE, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO, ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, DROPDOWN_SEM_NOME, BOTAO_SEM_PAPEL, ...GRAFIA_LITERAL, ...MONO_LITERAL, ...RAIO_LITERAL],
    },
  },
```

- [ ] **Step 6: Provar que nenhuma régua sumiu de nenhum arquivo**

A técnica que achou o bug de 2026-08-04:

```bash
npx eslint --print-config src/features/commercial/components/Client/ContactCard.tsx \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      const r=JSON.parse(s).rules['no-restricted-syntax'];
      console.log('seletores ativos:', r.length - 1);
    })"
```

Esperado: o **mesmo** número de seletores que num arquivo de componente comparável **menos 1**
(a régua nova). Repetir para um arquivo migrado (`RedatorIdentityFields.tsx`), onde o número deve
ser o cheio.

- [ ] **Step 7: Ver a régua reprovar o sítio da sonda**

- [ ] **Step 4: Ver a régua reprovar o sítio da sonda**

```bash
pnpm lint
```

Esperado: FAIL apontando a linha reintroduzida no Step 1, com a mensagem do seletor.

- [ ] **Step 8: Restaurar o arquivo da sonda e ver passar**

```bash
cp "$SCRATCH/RedatorIdentityFields.orig.tsx" src/features/identity/components/Redator/RedatorIdentityFields.tsx
pnpm lint && pnpm vitest run && pnpm build
```

Esperado: os três limpos.

- [ ] **Step 9: Commit**

```bash
git add eslint.config.js
git commit -m "feat(lint): catraca do erro de campo extraído à mão"
```

---

### Task 11: prova no navegador e fechamento

**Files:** nenhum de código — a task produz evidência.

- [ ] **Step 1: Subir o ambiente**

```bash
docker compose up -d
pnpm dev
```

- [ ] **Step 2: Rodar `/lotus-ui-review` no `ClientDialog`**

Nos três modos (`create`, `edit`, `view`), medindo:

1. digitar 3 caracteres seguidos no RUT **sem perder o foco** — a prova do §4.2 que o jsdom não dá;
2. em `view`, o campo Tipo mostra o rótulo traduzido, não `client`;
3. um 422 real (RUT duplicado) pinta o erro no campo certo;
4. console sem aviso de "controlled/uncontrolled" nem de "value prop on input should not be null".

- [ ] **Step 3: Contagem final**

```bash
grep -ro "fieldErrors?\." src/features --include=*.tsx | wc -l
grep -ro "<Field " src/features --include=*.tsx | wc -l
```

Esperado: as 48 extrações caíram para as declaradas fora de escopo; `<Field` cobre os 45 sítios
menos os que a receita deixou com `FormField` por desvio medido.

- [ ] **Step 4: Verificação final**

```bash
pnpm vitest run && pnpm build && pnpm lint
```

- [ ] **Step 5: Commit da evidência e abertura da PR**

Registrar a passada de navegador em `docs/superpowers/audits/` pelo molde dos audits existentes,
commitar, e seguir para `/revisar-sprint`.

---

## Self-review

**Cobertura da spec:**

| Seção da spec | Task |
|---|---|
| §3 interface (`useFormField`, `Field`, `name`) | 2 |
| §4.1 valor pelo contexto | 1, 3 |
| §4.2 identidade estável | 2 (teste do nó e do foco) |
| §4.3 onde mora | 2 (arquivo em `shared/ui/FormField/`) |
| §4.4 tipagem cruzando arquivo | 4 (prop `Field: FieldComponent<T>`) |
| §4.5 precedência | 1, 2, 3 (merge explícito + testes) |
| §5 escapes (`error`, `value`, `readOnly`) | 2 (testes), 4–9 (uso) |
| §5 `mapped` intocado | 5, 9 (dito explicitamente) |
| §6 catraca | 10 |
| §7 prova | 1–9 (testes), 11 (navegador) |
| §8 ordem | a ordem das tasks |
| §2 escopo (45 sítios, 13 arquivos) | 4–9 |

**Sem pendência aberta.** O único ponto que a spec não previa — a apresentação de leitura precisar
do valor do form num subcomponente que deixou de recebê-lo — se resolve sem crescer a interface:
o subcomponente recebe `Field` **e** `form` (duas props, não quatro), e o fallback de chave de erro
desce para o hook. Nenhuma das duas saídas toca no module.

**Contagem de props, antes e depois** — a medida do bloco:

| | antes | depois |
|---|---|---|
| `ClientGeneralFields` | `form`, `readOnly`, `fieldErrors`, `onChange` | `Field`, `form` |
| `RedatorIdentityFields`, `StudentIdentifyFields`, `StaffIdentifyFields` | as mesmas 4 | `Field` |
| campo típico | 4 props no campo + 2 no controle | `name` + `label` |

---

## Handoff de execução

**`executor: claude`**

Três critérios do `/planejar-bloco` puxam para `claude`, e basta um:

1. **Lei do §5 tocada.** A ADR-05 decide onde o module nasce (`shared/ui/FormField/`, e não ao lado
   do `useEntityForm`, porque `shared/hooks` não importa `shared/ui`) e a migração atravessa a
   fronteira `shared/ui` ↔ `features/**` em 13 arquivos de feature. Direção de dependência é lei,
   não detalhe de path.
2. **Decisão de arquitetura dentro das tasks 1–3.** O canal do `bind` no `FieldContext`, a
   identidade estável do `Field` e a precedência por merge explícito (`props.x ?? bind.x`, nunca
   spread) são desenho vivo; a spec fixa o quê, mas o como reage ao que o `tsc` responder.
3. **Julgamento fora do plano na Task 10.** A armadilha do `eslint.config.js` — `no-restricted-syntax`
   de bloco posterior **apaga** o do anterior por merge raso — exige acrescentar a régua aos três
   arrays que já casam os globs (`:497`, `:510`, `:531`) e conferir com `--print-config`. Bloco novo
   apagaria em silêncio quatro bans vivos em ~75 arquivos.

A Task 11 (prova no navegador, `/lotus-ui-review` sobre o `ClientDialog`) também não é delegável:
o defeito que ela caça — remonte por identidade instável — é exatamente o que o jsdom deixa passar
com aparência de verde.

`paths_autorizados` não se aplica (só vale para `executor: codex`). O escopo de arquivos deste
bloco é a seção **Estrutura de arquivos** acima, mais `docs/superpowers/**` da própria lane-c.

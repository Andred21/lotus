# Desenho — `frontend-campo-de-formulario-liga-no-form` (item 24)

> Origem: **§3 do review de arquitetura de 2026-09-01** (`main@8efd85f2`), aprovado seção a seção
> no grilling de **2026-09-02** com o João. `Contexto: não` — as fontes são o próprio código e o
> review, todos no repositório.
>
> **A spec vem antes da vez do bloco por decisão explícita (Q19/Q20).** O `CLAUDE.md` §4 manda
> planejar just-in-time, e é o **plano** que fica para a vez: as 22 decisões abaixo custam caro de
> reconstruir e não envelhecem com o calendário. Nenhuma linha daqui autoriza execução — quem
> promove é o `state.md`.

## §1 · Por que este bloco existe

O `FormField` tem interface larga e implementação funda: o call site repete **quatro props** por
campo (`label`, `error`, `readOnly`, `value`) e ainda escreve `value`/`onChange` no controle
dentro dele. Medido em 2026-09-02 contra `main@8efd85f2`:

| Medida | Número |
|---|---|
| `<FormField` no `src/` | 106 |
| … em arquivos de teste | 21 |
| … call sites reais | **85**, em 26 arquivos |
| `fieldErrors` no `src/` | 151 ocorrências |
| … extrações `fieldErrors?.x?.[0]` | 48, em 24 arquivos |
| `fieldErrors` **drilled** de dialog para subcomponente | 10 sítios |
| `mapped={[...]}` do `FormErrorSummary` escrito à mão | 4 sítios (+5 já extraídos em `errorSummary`) |

O `FieldContext` (`shared/ui/FormField/fieldContext.ts`, 78 L) **já provou o mecanismo**: resolveu
a P-37 em 55 campos sem tocar em nenhum call site, e **5** wrappers de `shared/ui` já leem dele via
`useFieldProps`/`useSplitFieldProps` — `AppInputText`, `AppTextarea`, `AppPassword`, `AppDropdown`
e `AppDatePicker`, exatamente os 5 do §2. O que ele publica para aí na acessibilidade — valor,
setter e erro continuam passando à mão.

## §2 · Escopo

**Dentro:** os formulários que publicam um bundle `{ form, set, fieldErrors, readOnly }` —
**45 call sites em 13 arquivos**, medidos em 2026-09-02:

`TurmaConfigCard` (5) · `RedatorIdentityFields` (5) · `StaffIdentifyFields` (5) ·
`ClientGeneralFields` (5) · `DataStep` (5) · `StudentIdentifyFields` (4) · `CourseDialog` (4) ·
`ProfileSecuritySection` (3) · `StaffUserDialog` (3) · `ProfilePersonalSection` (2) ·
`BudgetDialog` (2) · `StudentClientField` (1) · `RoleDialog` (1)

**Fora, com motivo escrito:**

| Fora | Sítios | Motivo |
|---|---|---|
| `LoginForm`, `ForgotForm`, `SetPasswordPage` | 5 | não têm entidade nem `fieldErrors` de dialog (Q3) |
| `ConfirmIssueDialog`, `RevokeDialog`, `BatchIssueDialog` | 7 | `useMutationErrors` **sem** `useEntityForm` — só `useState` solto; 4 dos 5 do `ConfirmIssueDialog` são snapshot só-leitura |
| `RegisterResultDialog` | 3 | setter por campo (`setStatus`/`setFinalGrade`/`setAttendance`), e a chave do erro é `grades.final` contra o campo `finalGrade` |
| `EnrollStudentForm` | 4 | `f.details` + `setField`, com o `rut` em estado separado — não é um bundle |
| `ContactCard`, `AddressFields` | 11 | chave posicional (`contacts.0.name`) e setter de patch, não `set(k,v)` (Q4) |
| `CertificateViewDialog`, `ProfileIdentityCard`, `CertificateIdentityFields` | 10 | só-leitura, sem form a que ligar |
| `NestedField` | 6 | contrato sem label; segue como está (Q4) |
| `AppCheckbox`, `AppRadioButton` | — | não leem o `FieldContext` hoje, e o único radio de form é o `is_primary`, já fora (Q13) |

## §3 · A interface

```tsx
// hoje — 4 props no campo + value/onChange no controle
<FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]} readOnly={readOnly} value={form.rut}>
  <AppInputText value={form.rut} onChange={(e) => onChange('rut', e.target.value)} className="w-full" />
</FormField>

// depois
<Field name="rut" label={t('common.rut')}>
  <AppInputText className="w-full" />
</Field>
```

O `Field` nasce de um hook novo em **`shared/ui/FormField/useFormField.ts`**:

```ts
export function useFormField<T>(bundle: {
  form: T
  set: <K extends keyof T>(k: K, v: T[K]) => void
  fieldErrors?: Record<string, string[]> | null
  readOnly: boolean
}): FieldComponent<T>
```

`FieldComponent<T>` aceita `name: keyof T & string`, `label`, e as escapes do §5
(`error`, `readOnly`, `value`).

**O bundle já é o retorno dos hooks de form, sem adaptador** — medido em 2026-09-02:
`useRedatorForm` devolve `{ form, set, readOnly, fieldErrors, generalError, … }` e
`useTurmaConfigForm` o mesmo conjunto. `useFormField` pede um **subconjunto estrutural** desse
retorno, então o dialog passa o próprio `f`.

**Composição no dialog:**

```tsx
const f = useClientForm(...)          // continua devolvendo form/set/fieldErrors/readOnly
const Field = useFormField(f)         // uma linha
…
<ClientGeneralFields Field={Field} />  // UMA prop, no lugar das quatro
```

## §4 · Mecanismo

**§4.1 · Por onde o valor chega ao controle (Q1).** O `Field` monta o `FormField`, que estende o
`FieldContext` com `value`/`onChange`. Os wrappers os pescam do contexto, **cada um sabendo a
própria forma de evento** — `e.target.value` no `AppInputText`/`AppTextarea`, `e.value` no
`AppDropdown`, `string | null` já normalizado no `AppDatePicker`. É a mesma repartição de
conhecimento que o `idProp` (`'id'` contra `'inputId'`) já faz hoje, e não usa `cloneElement`, que
quebraria com qualquer `children` embrulhado num `div`.

**§4.2 · Identidade estável (Q6).** O `Field` é criado dentro de um hook: componente recriado a
cada render **remonta o input e perde o foco a cada tecla**. Só sobrevive com `useMemo` de deps
`[]` lendo um `ref` reescrito a todo render com o bundle atual. **É a régua do §7.**

**§4.3 · Onde mora (Q11).** O `useFormField` fica em `shared/ui/FormField/`, **não** em
`shared/hooks`: `useFilePreview.ts:12` e `useServerTable.ts:29` declaram por escrito que
`shared/hooks` não depende de `shared/ui`. `useEntityForm` fica **intacto** e segue testável sem
DOM; o genérico `T` chega pelo `bundle`, então a tipagem não se perde.

**§4.4 · Tipagem que cruza a fronteira de arquivo (Q2/Q6).** Contexto de React não é genérico —
por isso o `Field` **desce como prop**, e não por contexto: `name` continua checado contra
`keyof T` dentro de `ClientGeneralFields`, que é outro arquivo. Quatro props viram uma, e a
checagem que hoje o `onChange('legal_name', v)` dá não é paga com `name: string` cru.

**§4.5 · Precedência (Q14).** A lei do `fieldContext` continua: **prop do chamador vence.** A
única exceção mecânica é `value`/`onChange`, que ganham merge explícito (`props.value ?? contexto`)
em vez do spread cru — um `value={undefined}` explícito no spread viraria input controlado virando
não-controlado, com aviso do React e cursor perdido. `value=""` do chamador continua vencendo,
porque `''` não é nulo.

## §5 · O que não colapsa

| Caso | Sítios | Saída |
|---|---|---|
| Chave de erro ≠ nome do campo (`fieldErrors?.legal_name ?? fieldErrors?.name`) | 1 | a prop `error` continua existindo e vence (Q7). Cadeia de fallback na interface pública pagaria generalidade que um sítio usa |
| Valor convertido nos **dois** sentidos — `String(n)` / `Number(…replace)`, `.replace('.',',')` / `parseUfInput`, `\|\| null` / `?? ''` | 6 | mantêm `value` e `onChange` à mão **no controle**; o `Field` ainda dá `name`, `label`, `error` e `readOnly` (Q23) |
| Apresentação em leitura — `readDate(form.start_date)`, `t('clientType.'+form.type)` | ~8 | a prop `value` do `FormField` continua sendo a porta (Q17). Sem `value`, leitura mostra o valor cru: não quebra, fica feio, e a passada de navegador do §7 pega |
| `mapped` do `FormErrorSummary` | 9 | **fica manual. Não-objetivo escrito** (Q16) |

**Por que não existe `parse` (Q23, corrige a Q12):** medido no plano — dos 6 sítios que convertem,
**5 convertem nos dois sentidos**: `student_count` mostra `String(n)` e lê `Number(…replace)`;
`value_uf` mostra `.replace('.', ',')` e lê `parseUfInput`; as duas datas do `TurmaConfigCard`
mostram `form.x || null` e leem `v ?? ''`. `parse` sozinho serviria **um** sítio
(`purchase_order`). O par `parse`/`format` seriam duas props públicas para 5 sítios, tirando do
lado do controle uma conversão que hoje se lê ali. A escape do §4.5 já cobre.

**Duas armadilhas de `readOnly` na migração:** `RoleDialog` tem `readOnly` no bundle mas **não** o
passa ao `FormField` hoje — herdar do contexto trocaria input desabilitado por texto. Passa
`readOnly={false}` explícito. `StudentClientField` usa `readOnly={mode !== 'create'}`, que **não**
é o `readOnly` do bundle (`mode === 'view'`) — mantém a prop.

**Por que `mapped` não se deriva do `name`:** o `FormErrorSummary` é irmão **anterior** dos campos
nos 9 sítios. Um registro em render teria o `Set` vazio no primeiro render — resumo listando campo
que **tem** input, ou um render extra para corrigir. E o modo de falha do lado oposto (campo do
passo 1 do `QuoteWizard`, não montado, deixar de registrar) é "erro some da tela", que é
exatamente o defeito que este componente existe para impedir. Ganho pequeno, risco no eixo errado.

## §6 · Catraca (Q8)

`no-restricted-syntax` reprovando a extração `fieldErrors?.X?.[0]` em `src/features/**`, com
`ignores` para os excluídos do §2 — sem o `ignores`, a régua mente sobre o escopo.

> **Armadilha do `eslint.config.js`, já documentada no próprio arquivo (Q-2, 2026-08-04):**
> `no-restricted-syntax` de bloco posterior **apaga** o do anterior por merge raso, não concatena.
> A régua nova entra **nos arrays dos blocos que já casam esses globs**. Bloco próprio apagaria em
> silêncio os 3 bans de query e o de `FormData` em ~75 arquivos de componente — foi o que a Task 7
> do item 18 tentou primeiro.

Sem régua de lint, a lição 14 se repete: instrução não segura padrão.

## §7 · Prova (Q15)

1. **Teste novo do binding**, no module: lê o valor do form · `onChange` escreve · erro vem do
   `fieldErrors` · `readOnly` vem do contexto · prop vence contexto em `error`/`value` · `parse`
   converte · **foco preservado entre duas teclas seguidas** (a régua do §4.2).
2. Os **21 `<FormField` de teste existentes passam sem edição** — é o que prova que o contrato do
   `FormField` não mudou.
3. `pnpm build` (`tsc -b`) e `pnpm lint` limpos.
4. **Passada de navegador via `/lotus-ui-review` no `ClientDialog`** — o `ClientGeneralFields`
   migrado (5 campos) exercita `value` de apresentação (`t('clientType.'+form.type)`), a escape de
   `error` (`legal_name ?? name`) e os três modos do diálogo numa tela só. O remonte por
   identidade instável é o defeito que o jsdom deixa passar com aparência de verde.

## §8 · Ordem de execução (Q18)

1. Module + testes do §7.
2. …N: migração **uma feature por commit**.
3. Última: ligar a catraca do §6 — **sem allowlist** além dos excluídos do §2.

Allowlist decrescente seria lista de dívida editada N vezes que mente enquanto encolhe; ligar a
régua antes da migração reprovaria o repositório inteiro por sprints.

## §9 · Registro das decisões

| # | Decisão | Escolha |
|---|---|---|
| Q1 | Como o valor chega ao controle | estender o `FieldContext`; wrapper pesca. Sem `cloneElement` |
| Q2 | Tipagem do `name` | `Field` tipado em `T`, `name: keyof T & string` |
| Q3 | Escopo | só forms sobre `useEntityForm` + `useMutationErrors` |
| Q4 | Aninhado e setter de patch | fora da v1; `FormScope prefix` é porta futura, caminho por ponto não |
| Q5 | `readOnly` e valor de apresentação | `readOnly` do contexto; `value` continua prop e vence |
| Q6 | `Field` até o subcomponente | prop única, `useMemo([])` + `ref` |
| Q7 | Chave de erro divergente | prop `error` continua e vence |
| Q8 | Catraca | lint + teste, com `ignores` do escopo |
| Q9 | Granularidade | bloco próprio, migração completa numa branch |
| Q10 | Destino do `FormField` | dois componentes; `FormField` segue público e não-deprecated |
| Q11 | Onde o `Field` nasce | `shared/ui/FormField/useFormField.ts`; `useEntityForm` intacto |
| Q12 | Conversão do valor | prop `parse` — **revogada pela Q23** |
| Q13 | Wrappers com binding | os 5 que já leem o contexto |
| Q14 | Precedência de `value` | merge explícito `props.value ?? contexto` |
| Q15 | Prova | teste de binding + 21 testes intactos + build/lint + navegador |
| Q16 | `mapped` derivado | **não** — não-objetivo |
| Q17 | Apresentação em leitura | a prop `value`, sem `display` |
| Q18 | Ordem e catraca | module → migração por feature → régua no fim |
| Q19 | O que acontece agora | ficha no backlog + esta spec; plano just-in-time |
| Q20 | Onde o registro mora | `specs/`, sem pasta nova |
| Q21 | Nomes | `useFormField`, `Field`, `parse` |
| Q22 | Ficha | item **24**, `frontend-campo-de-formulario-liga-no-form`, depois do bloco do §1 |
| Q23 | `parse` fica? | **sai** — 5 dos 6 sítios convertem nos dois sentidos e mantêm `value`/`onChange` no controle |

## §10 · Não-objetivos

- Derivar `mapped` (§5).
- Migrar campo aninhado, login, filtro de tabela e célula de edição (§2).
- Dar binding a `AppCheckbox`/`AppRadioButton`.
- Tocar em `useEntityForm`, `useMutationErrors` ou no contrato do `FormField`.
- `display` como segunda porta do que `value` já faz.
- `parse`/`format` no `Field` (Q23) — conversão fica ao lado do controle.
- Migrar `EnrollStudentForm`, `RegisterResultDialog` e os 3 diálogos de certificação: não têm
  bundle, e fabricar um só para caber aqui é inventar formulário.

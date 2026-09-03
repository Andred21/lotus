# `frontend-dividas-de-mecanismo` — Plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA — use
> `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans` para executar task a task. Os passos usam
> checkbox (`- [ ]`) para rastreio.

**Objetivo:** pagar as seis dívidas de frontend que fecham por mecanismo verde
(`P-69`, `D-69`, `P-70`, `P-30`) ou por veredito escrito (`P-68`, `P-42`), sem
abrir navegador e sem tocar `backend/`.

**Arquitetura:** cada ficha vira uma task independente. Quatro delas terminam
numa catraca que já existe no repositório (eslint `no-restricted-syntax`, teste
de contraste sobre hex, teste de drift do tema gerado, teste de unidade + jsdom);
duas terminam em texto commitado. Nenhuma task depende do resultado visual de
outra, e cada uma é reprovável sozinha.

**Stack:** React 19 + TS (Vite), Vitest 4 + jsdom + Testing Library, ESLint 9
flat config, PrimeReact/Lara via tema gerado por script Node.

**Spec:** [`docs/superpowers/specs/2026-09-02-frontend-dividas-de-mecanismo-design.md`](../specs/2026-09-02-frontend-dividas-de-mecanismo-design.md)

## Restrições globais

- **Escopo de arquivo:** só `frontend/`. `backend/` e
  `frontend/src/shared/types/generated.ts` terminam com diff VAZIO. Isso é DoD 5,
  provado por `git diff --stat`, não presumido.
- **Sem navegador.** Toda prova é `pnpm test`, `pnpm lint`, `pnpm build` ou
  aritmética de contraste sobre hex.
- **Cor vem de variável do tema** (CLAUDE.md §5.6, ADR-16). Tailwind é layout.
- **Catraca nova é vista reprovar por sonda**, com o arquivo salvo em
  `$SCRATCH` por `cp` e restaurado por `cp` de volta. **NUNCA `git stash`** — a
  pilha é compartilhada com outras árvores de trabalho e outras sessões.
- `$SCRATCH` = `/tmp/claude-1000/-home-jvbat-projetos-fix-frontend/7ebd8fe2-04ab-4d98-96d7-32dc1caaea01/scratchpad`
- Todo comando de frontend roda **de `frontend/`**, nativo no WSL (Node 22 /
  pnpm). Nada deste bloco entra no container.
- **Uma task, um commit.** Mensagem em português, tipo convencional.
- **`eslint.config.js` faz merge RASO de `rules`:** dois blocos que casam o mesmo
  arquivo e declaram `no-restricted-syntax` NÃO concatenam — o de baixo apaga o
  de cima inteiro. Regra nova entra nos ARRAYS dos blocos que já casam cada glob;
  nunca em bloco próprio. É lei escrita no topo do arquivo (Q-2, 2026-08-04).

---

## Estrutura de arquivos

| Arquivo | Task | Responsabilidade |
|---|---|---|
| `src/features/commercial/components/Budget/CourseStep.tsx` | 1 | sítio de cor crua (texto secundário) |
| `src/features/commercial/components/Budget/QuoteWizard.tsx` | 1 | dois sítios (texto secundário + erro de campo) |
| `src/features/operation/components/Document/ManualButton.tsx` | 1 | sítio de cor crua (erro de download) |
| `eslint.config.js` | 1, 3, 6 | `CATRACA_COR` zera e o bloco sai; `CLEANUP_A_MAO` entra; razão da régua de 150 |
| `src/test-setup.ts` | 2 | **novo** — o único `afterEach(cleanup)` do repositório |
| `vite.config.ts` | 2 | declara `setupFiles` |
| `tests/desmonte-global.test.ts` | 2 | **novo** — guarda estática de que o mecanismo existe |
| 31 arquivos `*.test.tsx` | 3 | perdem o `cleanup` à mão |
| `src/shared/lib/screenDetail.ts` | 4 | a política de `detail` na tela |
| `src/shared/lib/screenDetail.test.ts` | 4 | casos de unidade da allowlist |
| `src/shared/ui/AppDataTable/AppDataTable.test.tsx` | 4 | prova em jsdom, no consumidor real |
| `scripts/generate-brand-theme.mjs` | 5 | transformação de FORMA do warning |
| `src/shared/styles/themes/lara-{light,dark}-lotus.css` | 5 | saída regerada (não editar à mão) |
| `tests/tone-ink.test.ts` | 5 | régua de contraste do botão warning |
| `docs/superpowers/pendencias/abertas.md` | 5 | ficha nova: a família de severidade no claro |
| `docs/superpowers/specs/archive/2026-08-14-celula-de-identidade-design.md` | 7 | emenda datada no D1 |
| `src/shared/ui/IdentityCell/IdentityCell.tsx` | 7 | docblock aponta para a emenda |

---

### Task 1: `D-69` — os quatro sítios de cor crua e a lista que zera

**Arquivos:**
- Modificar: `src/features/commercial/components/Budget/CourseStep.tsx:102`
- Modificar: `src/features/commercial/components/Budget/QuoteWizard.tsx:48,72`
- Modificar: `src/features/operation/components/Document/ManualButton.tsx:28`
- Modificar: `eslint.config.js:514-518` (a lista) e `:575-587` (o bloco gêmeo)

**Interfaces:**
- Consome: `dangerText` de `@shared/styles/tokens` — já exportado como
  `export const dangerText = 'var(--tone-danger-ink)'`, com régua medida em
  `tests/tone-ink.test.ts` e 11 adotantes em `src/features/`.
- Produz: `CATRACA_COR` deixa de existir como partição; nenhuma task posterior a
  referencia.

**Contexto que o executor não tem:** `CATRACA_COR` não é só uma lista de
exceções. Ela PARTICIONA o glob `src/features/*/components/**` em dois blocos,
porque um array de `no-restricted-syntax` não aceita `ignores` por seletor
individual. O bloco `files: CATRACA_COR` é o array do bloco principal **menos**
`COR_HARDCODED`. Com a lista vazia esse bloco não particiona nada, e um bloco com
`files: []` é ruído que o próximo leitor lê como catraca viva — por isso ele sai
inteiro, e não só a lista.

- [ ] **Passo 1: ver a catraca reprovar antes de mexer no código**

O lint hoje está verde porque os 4 sítios estão na lista. Prove que sair da lista
reprova, ANTES de corrigir — é isto que faz o verde do fim significar algo.

```bash
cd frontend
cp eslint.config.js "$SCRATCH/eslint.config.js.bak"
python3 - <<'PY'
p='eslint.config.js'; s=open(p).read()
s=s.replace("""const CATRACA_COR = [
  'src/features/commercial/components/Budget/CourseStep.tsx',
  'src/features/commercial/components/Budget/QuoteWizard.tsx',
  'src/features/operation/components/Document/ManualButton.tsx',
]""", "const CATRACA_COR = []")
open(p,'w').write(s)
PY
pnpm lint
cp "$SCRATCH/eslint.config.js.bak" eslint.config.js
```

Esperado: **4 erros**, um por sítio, todos com a mensagem
`Cor Tailwind hardcoded: Tailwind é layout, cor vem de variável do tema (ADR-16).`
— em `CourseStep.tsx:102`, `QuoteWizard.tsx:48`, `QuoteWizard.tsx:72` e
`ManualButton.tsx:28`. Se vierem menos de 4, PARE: a lista não é a única coisa
segurando esses arquivos.

- [ ] **Passo 2: os dois sítios de texto secundário**

Em `CourseStep.tsx:102`, `ml-2` fica (é layout), `text-slate-500` sai:

```tsx
                <span className="ml-2" style={{ color: 'var(--text-color-secondary)' }}>{c.workload_hours}h</span>
```

Em `QuoteWizard.tsx:48`, `text-xs font-normal` fica, `text-slate-500` sai:

```tsx
          <span className="text-xs font-normal" style={{ color: 'var(--text-color-secondary)' }}>{t('quote.step', { current: step, total: 2 })}</span>
```

- [ ] **Passo 3: os dois sítios de erro**

`QuoteWizard.tsx` ganha o import (linha 3, junto dos outros de `@shared`):

```tsx
import { dangerText } from '@shared/styles/tokens'
```

E a linha 72 — os dois `eslint-disable-next-line no-restricted-syntax` que já
estão lá FICAM: eles suprimem `ERRO_DE_CAMPO_A_MAO`, que segue valendo neste
arquivo depois da migração.

```tsx
      {/* eslint-disable-next-line no-restricted-syntax */}
      {fieldErrors?.course_id?.[0] && (
        // eslint-disable-next-line no-restricted-syntax
        <p className="mb-4 text-sm" style={{ color: dangerText }}>{fieldErrors.course_id[0]}</p>
      )}
```

`ManualButton.tsx` ganha o import depois da linha 2:

```tsx
import { dangerText } from '@shared/styles/tokens'
```

E a linha 28:

```tsx
        <p className="text-sm" style={{ color: dangerText }}>
```

- [ ] **Passo 4: zerar a lista e apagar o bloco gêmeo**

Em `eslint.config.js`, a lista vira vazia e o comentário registra o
encolhimento final (a linha "lista que só ENCOLHE" já estava lá; ela ganha a
última entrada):

```js
// Catraca da regra de cor: lista que só ENCOLHE. O Login
// SAIU em 2026-08-13: o desenho novo que esta linha previa é o bloco
// `login-fora-do-adr16`, e a tela passou a ler token de superfície e de texto
// em vez de utility fixa. Não reintroduza arquivo aqui para calar o lint —
// quem precisa de cor pede token ao tema.
// A Validação SAIU em 2026-08-28: o `bg-slate-50 dark:bg-slate-950` virou
// `--surface-ground` (achado C2 do audit de 2026-08-26) e o arquivo não tem
// mais cor crua nenhuma.
// Os TRÊS ÚLTIMOS saíram em 2026-09-02 (D-69, item 25): `--text-color-secondary`
// nos dois sítios de texto e `dangerText` nos dois de erro. A lista chegou a
// zero e a PARTIÇÃO morreu junto — o bloco `files: CATRACA_COR` que existia
// logo abaixo foi removido nesta data. Reabri-la exige recriar os dois lados,
// não só empurrar um nome para dentro do array.
const CATRACA_COR = []
```

E o bloco inteiro `{ files: CATRACA_COR, rules: { 'no-restricted-syntax': [...] } }`,
junto com o comentário que o explicava (`// A catraca de cor (D7): mesmo array
do bloco acima, sem COR_HARDCODED …`), sai do `defineConfig([...])`.

O `ignores` do bloco principal PERDE a referência:

```js
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    ignores: [...FORA_DO_CAMPO_LIGADO],
    rules: {
```

E o parágrafo do comentário acima daquele bloco que explica
`ignores: CATRACA_COR` (o que começa em `// \`ignores: CATRACA_COR\` porque a
catraca de cor (D7, dois blocos abaixo)`) é substituído por:

```js
  // O `ignores` guarda só `FORA_DO_CAMPO_LIGADO` desde 2026-09-02: a partição
  // por `CATRACA_COR` existia porque a catraca de cor precisava das MESMAS
  // proibições de componente menos `COR_HARDCODED`, e um array de
  // `no-restricted-syntax` não aceita `ignores` por seletor individual. Com a
  // lista em zero (D-69, item 25) o segundo lado da partição foi removido.
```

- [ ] **Passo 5: lint e build verdes**

```bash
cd frontend && pnpm lint && pnpm build
```

Esperado: `pnpm lint` sem saída (0 erros, 0 avisos); `pnpm build` termina com o
sumário do Vite. Se algum dos 4 sítios ainda acusar, a correção não pegou.

- [ ] **Passo 6: commit**

```bash
git add frontend/eslint.config.js frontend/src/features/commercial/components/Budget/CourseStep.tsx frontend/src/features/commercial/components/Budget/QuoteWizard.tsx frontend/src/features/operation/components/Document/ManualButton.tsx
git commit -m "fix(frontend): a catraca de cor chega a zero e a particao morre (D-69)"
```

---

### Task 2: `P-69` (a) — o desmonte vira mecanismo, com guarda estática

**Arquivos:**
- Criar: `frontend/src/test-setup.ts`
- Modificar: `frontend/vite.config.ts:48-57`
- Criar: `frontend/tests/desmonte-global.test.ts`

**Interfaces:**
- Produz: `setupFiles: ["./src/test-setup.ts"]` no bloco `test:` do
  `vite.config.ts`, e o `afterEach(cleanup)` global de que a Task 3 depende para
  poder remover os 31 manuais.

**Contexto que o executor não tem:** o `vite.config.ts` NÃO tem `setupFiles`
hoje. O comentário acima do bloco `test:` explica a ausência de `globals` — e só
ela. Ele ganha a segunda metade nesta task, senão a ausência anterior de
`setupFiles` fica sem registro e o próximo leitor não sabe se foi escolha.

A guarda estática (`tests/desmonte-global.test.ts`) entra **além do desenho
apresentado no brainstorming**, declarada no D7 da spec. A razão: a catraca
`CLEANUP_A_MAO` da Task 3, sozinha, deixa o repositório PIOR na falha — proibida
a grafia manual e apagado o `setupFiles`, nenhum teste desmonta nada e nada
acusa. Catraca que só faz sentido enquanto a outra existe precisa que a outra
seja verificada.

- [ ] **Passo 1: escrever a guarda, que reprova porque o mecanismo não existe**

Crie `frontend/tests/desmonte-global.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const fonte = (caminho: string) => readFileSync(resolve(root, caminho), 'utf8')

/**
 * O par que a `CLEANUP_A_MAO` pressupõe.
 *
 * A catraca do eslint proíbe `afterEach(cleanup)` escrito à mão em arquivo de
 * teste. Sozinha ela deixa o repositório PIOR na falha: apagado o `setupFiles`,
 * nenhum teste desmonta nada, a proibição segue de pé e NADA acusa — a suíte
 * fica verde com componente vazando entre casos, que é exatamente o defeito que
 * a P-69 fechou. Uma catraca que só faz sentido enquanto a outra existir precisa
 * que a outra seja verificada, e é isto aqui.
 *
 * Estático de propósito: um teste que RODASSE dentro do setup provaria que o
 * setup rodou naquele arquivo, não que ele está declarado para todos.
 */
describe('desmonte entre testes (P-69)', () => {
  it('o vite.config declara o arquivo de setup', () => {
    expect(fonte('vite.config.ts')).toMatch(/setupFiles:\s*\[\s*["']\.\/src\/test-setup\.ts["']\s*\]/)
  })

  it('o arquivo de setup registra o desmonte no `afterEach`', () => {
    const setup = fonte('src/test-setup.ts')
    expect(setup).toMatch(/from '@testing-library\/react'/)
    expect(setup).toMatch(/afterEach\(cleanup\)/)
  })
})
```

- [ ] **Passo 2: rodar a guarda e ver as duas asserções reprovarem**

```bash
cd frontend && npx vitest run tests/desmonte-global.test.ts
```

Esperado: **1 arquivo reprovado**. O primeiro caso reprova com
`expected '…' to match /setupFiles…/`; o segundo reprova antes de asserir, com
`ENOENT: no such file or directory` em `src/test-setup.ts`. É a sonda: a guarda
foi vista reprovar antes de o mecanismo existir.

- [ ] **Passo 3: criar o arquivo de setup**

`frontend/src/test-setup.ts`:

```ts
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * O ÚNICO desmonte do repositório (P-69). Era escrito à mão em 31 arquivos de
 * teste e ausente nos outros 96 — quem escrevia teste novo copiava o molde do
 * vizinho, e o vizinho decidia se o componente vazava para o caso seguinte.
 *
 * `tests/desmonte-global.test.ts` guarda o par: sem ele, apagar esta linha
 * deixaria a catraca `CLEANUP_A_MAO` do eslint de pé sobre nada.
 */
afterEach(cleanup)
```

- [ ] **Passo 4: declarar o setup no vite.config**

Em `frontend/vite.config.ts`, o comentário acima de `test:` ganha a segunda
metade e o bloco ganha a chave:

```ts
    // Sem `globals`: cada teste importa describe/it/expect de 'vitest'. Assim os
    // arquivos de teste continuam type-checados pelo `tsc -b` do pnpm build, em
    // vez de virarem zona sem tipo.
    //
    // COM `setupFiles`, desde 2026-09-02 (P-69): o `afterEach(cleanup)` do
    // Testing Library era grafia manual em 31 dos 127 arquivos, e o desmonte
    // dependia de quem copiava o molde de quem. O par que sustenta a decisão é
    // a catraca `CLEANUP_A_MAO` (eslint.config.js) mais a guarda estática
    // `tests/desmonte-global.test.ts`, que confere que ESTA linha existe.
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      // `tests/` fica fora de `src/` porque o que ele confere é o REPOSITÓRIO,
      // não a app: o container `app` monta só `./backend` e `./frontend`, então
      // o vitest é o único runner do projeto com acesso à raiz.
      include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    },
```

- [ ] **Passo 5: a guarda passa e a suíte inteira segue verde**

```bash
cd frontend && npx vitest run tests/desmonte-global.test.ts && pnpm test
```

Esperado: a guarda com 2 testes passando; a suíte com **128 arquivos** (os 127
de hoje mais o novo) e **736 testes** passando. Os 31 `cleanup` manuais ainda
estão lá e são redundantes, não conflitantes — a medição de 2026-09-02 já rodou
exatamente esta configuração.

- [ ] **Passo 6: commit**

```bash
git add frontend/src/test-setup.ts frontend/vite.config.ts frontend/tests/desmonte-global.test.ts
git commit -m "test(frontend): o desmonte entre testes vira setupFiles com guarda (P-69)"
```

---

### Task 3: `P-69` (b) — os 31 desmontes à mão saem, e a grafia vira proibida

**Arquivos:**
- Modificar: 30 arquivos `*.test.tsx` (lista abaixo) — some o `afterEach` e o
  `cleanup` do import
- Modificar: `src/shared/hooks/useServerTable.test.tsx` — some só o `cleanup()`
  do corpo; o `afterEach` FICA, porque devolve os timers reais
- Modificar: `eslint.config.js` — `CLEANUP_A_MAO` entra em 5 arrays

**Interfaces:**
- Consome: o `afterEach(cleanup)` global da Task 2.
- Produz: `CLEANUP_A_MAO`, objeto de `no-restricted-syntax` exportado no escopo
  do módulo de config, referenciado por 5 blocos.

**Contexto que o executor não tem — três coisas, e nenhuma é óbvia:**

1. **São 31 arquivos, não 28.** A spec §3.3 contou 28 porque mediu uma grafia só.
   Existem duas: `afterEach(cleanup)` (28 arquivos) e `afterEach(() => cleanup())`
   (`src/app/layouts/Sidebar/SidebarItem.test.tsx` e
   `src/app/pages/Dashboard/redator/PendenciasList.test.tsx`). O 31º é
   `src/shared/hooks/useServerTable.test.tsx`, cujo `afterEach` chama `cleanup()`
   **e** `vi.useRealTimers()`. Uma catraca que pegasse só a primeira grafia
   deixaria a segunda como porta aberta — e a segunda já está no repositório.

2. **A ordem do `useServerTable` foi medida e está certa.** O vitest roda
   `afterEach` em ordem INVERSA de registro: o hook do arquivo primeiro, o do
   `setupFiles` depois. Medido em 2026-09-02 com o `cleanup()` removido daquele
   arquivo: 11 testes passam. O comentário de lá afirma um
   `ReferenceError: window is not defined` que **não reproduz mais** — a suíte
   inteira (127 arquivos, 734 testes) passa sem `setupFiles` e sem aquele
   `cleanup()`. O comentário é reescrito por isso, não por estilo.

3. **`CLEANUP_A_MAO` NÃO pode ganhar bloco próprio.** Um bloco novo com
   `files: ['**/*.test.{ts,tsx}']` casaria os mesmos arquivos que os blocos de
   componente, de shared e de app — e o merge raso de `rules` apagaria o
   `no-restricted-syntax` deles INTEIRO nos arquivos de teste, desligando em
   silêncio a catraca de cor e as de acessibilidade. É a colisão documentada no
   topo do arquivo (Q-2, 2026-08-04). A regra entra nos arrays que já existem.

**Os 30 arquivos que perdem o `afterEach` inteiro:**

```
src/app/layouts/Sidebar/SidebarItem.test.tsx
src/app/pages/Dashboard/redator/PendenciasList.test.tsx
src/features/certification/components/Emission/EmissionPanel.test.tsx
src/features/certification/components/Historial/HistorialTable.test.tsx
src/features/commercial/components/Budget/BudgetStatusFilter.test.tsx
src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx
src/features/identity/components/Student/StudentCertificateCell.test.tsx
src/features/operation/components/Turma/TurmasTable.test.tsx
src/features/operation/hooks/useTurmasPage.test.tsx
src/shared/ui/AppCard/AppCard.test.tsx
src/shared/ui/AppDataTable/AppDataTable.test.tsx
src/shared/ui/AppDialog/AppDialog.test.tsx
src/shared/ui/AppDropdown/AppDropdown.test.tsx
src/shared/ui/AppFilePreviewDialog/AppFilePreviewDialog.test.tsx
src/shared/ui/AppFileRow/AppFileRow.test.tsx
src/shared/ui/AppFileUpload/AppFileUpload.test.tsx
src/shared/ui/AppLineChart/legend.test.tsx
src/shared/ui/AppSelectableCard/AppSelectableCard.test.tsx
src/shared/ui/AppTabView/AppTabView.test.tsx
src/shared/ui/AppTag/AppTag.test.tsx
src/shared/ui/ArchiveSwitch/ArchiveSwitch.test.tsx
src/shared/ui/CertificateFolio/CertificateFolio.test.tsx
src/shared/ui/ConfirmDialog/ConfirmDialog.test.tsx
src/shared/ui/CrudDialog/CrudDialog.test.tsx
src/shared/ui/FormField/fieldAssociation.test.tsx
src/shared/ui/FormSection/FormSection.test.tsx
src/shared/ui/LanguageMenu/LanguageMenu.test.tsx
src/shared/ui/SearchableTableFrame/SearchableTableFrame.test.tsx
src/shared/ui/SectionLabel/SectionLabel.test.tsx
src/shared/ui/StatValue/StatValue.test.tsx
```

- [ ] **Passo 1: escrever a catraca e vê-la reprovar nos 31**

Em `eslint.config.js`, ao lado dos outros objetos de seletor (depois de
`ERRO_DE_CAMPO_A_MAO`, por volta da linha 256):

```js
// P-69: o desmonte é do `setupFiles`, não de cada arquivo. A grafia manual era
// o molde que se copiava do vizinho — 31 arquivos a escreviam, 96 não, e quem
// escrevia teste novo herdava a decisão de quem escreveu o anterior.
//
// Descendente, e não `> Identifier`, porque as DUAS grafias vivas precisam
// cair: `afterEach(cleanup)` (28 arquivos) e `afterEach(() => cleanup())`
// (SidebarItem, PendenciasList) — na segunda o nome aparece como callee de uma
// CallExpression dentro da arrow, e um seletor de filho direto a deixaria
// passar. O que ela NÃO pega, dito para ninguém supor cobertura que não existe:
// apelido (`const desmontar = cleanup; afterEach(desmontar)`). Casa grafia, não
// origem — mesmo limite do `DROPDOWN_SEM_NOME` e do `ERRO_DE_CAMPO_A_MAO`.
//
// O par que a sustenta é `tests/desmonte-global.test.ts`: sem ele, apagar o
// `setupFiles` deixaria esta proibição de pé sobre nada.
const CLEANUP_A_MAO = {
  selector: 'CallExpression[callee.name="afterEach"] Identifier[name="cleanup"]',
  message:
    'Desmonte à mão: o `afterEach(cleanup)` é global (src/test-setup.ts, P-69). Apague a linha e o import — repeti-la aqui não muda comportamento e faz o próximo copiar o molde.',
}
```

E ela entra nos **5 arrays** de `no-restricted-syntax` que já casam arquivo de
teste, sempre como ÚLTIMO elemento:

| Bloco (`files:`) | Onde |
|---|---|
| `['src/features/*/components/**/*.{ts,tsx}']` | o principal, com `ignores: [...FORA_DO_CAMPO_LIGADO]` |
| `FORA_DO_CAMPO_LIGADO` | o gêmeo |
| `['src/features/**/*.{ts,tsx}']` | o resto da feature |
| `['src/shared/**/*.tsx']` | shared |
| `['src/app/**/*.tsx']` | app |

Exemplo, no primeiro:

```js
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, ...REGRAS_COMPONENTE_FEATURE, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO, ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, DROPDOWN_SEM_NOME, BOTAO_SEM_PAPEL, ...GRAFIA_LITERAL, ...MONO_LITERAL, ...RAIO_LITERAL, ERRO_DE_CAMPO_A_MAO, CLEANUP_A_MAO],
```

**Buraco declarado:** teste `.ts` fora desses globs (`src/shared/**/*.ts`,
`tests/**`) não é alcançado. Não é descuido: `cleanup` só existe onde há render,
e render exige `.tsx`. Registrar o buraco vale mais que fingir cobertura.

```bash
cd frontend && pnpm lint
```

Esperado: **31 erros** com a mensagem `Desmonte à mão:` — 28 nos de grafia
direta, 2 nos de arrow, 1 no `useServerTable.test.tsx`. Se vierem menos de 31, o
seletor não pega as duas grafias e a catraca nasce com porta aberta.

- [ ] **Passo 2: apagar o desmonte dos 30**

Em cada um dos 30 arquivos da lista: apague a linha do `afterEach` (a versão
`afterEach(cleanup)` ou `afterEach(() => cleanup())`, mais a linha em branco que
sobra) e tire `cleanup` da lista de imports de `@testing-library/react`. Se
`afterEach` deixar de ser usado no arquivo, tire-o também do import de `vitest`
— senão o `tsc -b` do `pnpm build` reprova com `'afterEach' is declared but its
value is never read`.

Em `src/shared/ui/AppCard/AppCard.test.tsx`, por exemplo, o antes:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

afterEach(cleanup)
```

e o depois:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
```

**Atenção:** vários desses arquivos usam `afterEach` para OUTRA coisa também
(`vi.restoreAllMocks()`, `vi.useRealTimers()`). Nesses, só o `cleanup` sai — o
`afterEach` fica e o import de `vitest` também.

- [ ] **Passo 3: o caso do `useServerTable`, que é o único com ordem a preservar**

Em `src/shared/hooks/useServerTable.test.tsx`, o `afterEach` FICA (devolve os
timers reais); saem o `cleanup()` do corpo, o `cleanup` do import, e o
comentário é reescrito porque afirma um defeito que não reproduz mais:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
```

```tsx
/* `vi.useRealTimers()` sem `cleanup()`: o desmonte é global desde 2026-09-02
 * (`src/test-setup.ts`, P-69) e o vitest roda `afterEach` em ordem INVERSA de
 * registro — este hook primeiro, o do setup depois.
 *
 * O comentário anterior afirmava que sem o `cleanup()` daqui o `setTimeout` do
 * debounce disparava depois da destruição do jsdom e matava a rodada com
 * `ReferenceError: window is not defined`. Medido em 2026-09-02, no vitest
 * 4.1.10: não reproduz — a suíte inteira passa sem `setupFiles` E sem este
 * `cleanup()`. Fica registrado para ninguém remedir. */
afterEach(() => {
  vi.useRealTimers()
})
```

- [ ] **Passo 4: lint zerado, suíte verde, build verde**

```bash
cd frontend && pnpm lint && pnpm test && pnpm build
```

Esperado: `pnpm lint` sem saída; `pnpm test` com **128 arquivos / 736 testes**
passando **e terminando** (a P-69 é sobre rodada que não termina, não só sobre
teste que reprova — se a linha `Duration` não aparecer, a task reprovou mesmo
com todos os testes verdes); `pnpm build` completo.

- [ ] **Passo 5: commit**

```bash
git add frontend/eslint.config.js frontend/src frontend/tests
git commit -m "test(frontend): o desmonte a mao sai dos 31 arquivos e vira proibido (P-69)"
```

---

### Task 4: `P-70` — o `detail` do servidor chega à tela em três status

**Arquivos:**
- Modificar: `src/shared/lib/screenDetail.ts:1-43`
- Modificar: `src/shared/lib/screenDetail.test.ts`
- Modificar: `src/shared/ui/AppDataTable/AppDataTable.test.tsx`

**Interfaces:**
- Consome: `ScreenDetailSource`, que **já** carrega `status?: number` — hoje só
  `loadErrorHint` o lê.
- Produz: `screenDetail(problem)` passa a devolver `problem.detail` quando
  `problem.status` é 403, 404 ou 429, além do caso `localDetail` que já passava.
  Assinatura e tipo de retorno inalterados (`string | undefined`).

**Contexto que o executor não tem:** o corte é por STATUS porque
`backend/app/Shared/Exceptions/ProblemDetails.php` escolhe o `detail` por TIPO de
exceção, e só em três status o envelope PROVA que o texto passou por `lang/`:
403, 404 e 429. O ramo `default` daquele arquivo devolve `getMessage()` cru — é
por ele que sai o `CSRF token mismatch.` em inglês no 419 (`P-72`, que **não**
fecha aqui). Uma allowlist fechada é o que impede um status novo de atravessar
sem ninguém decidir. O 401 não entra porque sessão expirada não vira estado de
carga (o interceptor de `shared/api/axios.ts` redireciona para o login); o 422
não entra porque o `FormErrorSummary` já imprime campo a campo.

- [ ] **Passo 1: escrever os casos de unidade que reprovam**

Em `src/shared/lib/screenDetail.test.ts`, o primeiro caso do `describe` muda de
sentido e ganha vizinhos. Substitua o caso
`'envelope do SERVIDOR: não vai à tela'` por:

```ts
  it('403, 404 e 429: o `detail` do servidor VAI à tela', () => {
    // Os três status em que o `ProblemDetails.php` prova que o texto saiu de
    // `lang/` — forbidden, notFound e ThrottleRequests têm chave própria lá.
    expect(screenDetail({ detail: 'Cotización sin cliente', status: 403 })).toBe('Cotización sin cliente')
    expect(screenDetail({ detail: 'Turma no encontrada', status: 404 })).toBe('Turma no encontrada')
    expect(screenDetail({ detail: 'Demasiados intentos', status: 429 })).toBe('Demasiados intentos')
  })

  it('todo o resto segue calado — a allowlist é fechada por desenho', () => {
    // O ramo `default` do ProblemDetails devolve `getMessage()` CRU: é por ele
    // que sai o `CSRF token mismatch.` em inglês do 419 (P-72). Status que
    // ninguém decidiu não entra sozinho.
    expect(screenDetail({ detail: 'Ocorreu um erro inesperado.', status: 500 })).toBeUndefined()
    expect(screenDetail({ detail: 'CSRF token mismatch.', status: 419 })).toBeUndefined()
    expect(screenDetail({ detail: 'Method Not Allowed', status: 405 })).toBeUndefined()
    expect(screenDetail({ detail: 'algo', status: 422 })).toBeUndefined()
    expect(screenDetail({ detail: 'sem status nenhum' })).toBeUndefined()
  })
```

E o caso `'marcado mas sem detail'` ganha a metade dos status novos:

```ts
  it('marcado mas sem detail: undefined, nunca string vazia', () => {
    // `''` é falsy mas NÃO é `undefined`: devolvido cru, o `?? hint` do chamador
    // não dispara e a tela mostra erro sem texto.
    expect(screenDetail({ detail: '', localDetail: true })).toBeUndefined()
    expect(screenDetail({ detail: null, localDetail: true })).toBeUndefined()
    // A mesma guarda vale nos três status novos: a porta que abriu foi a do
    // detail localizado, não a do erro sem texto (peso legal).
    for (const status of [403, 404, 429]) {
      expect(screenDetail({ detail: '', status })).toBeUndefined()
      expect(screenDetail({ detail: null, status })).toBeUndefined()
      expect(screenDetail({ detail: '   ', status })).toBeUndefined()
    }
  })
```

- [ ] **Passo 2: rodar e ver reprovar**

```bash
cd frontend && npx vitest run src/shared/lib/screenDetail.test.ts
```

Esperado: **2 casos reprovados** — os três status novos devolvem `undefined`
(`expected undefined to be 'Cotización sin cliente'`). Os casos de allowlist
fechada e de string vazia passam desde já, porque hoje TUDO é calado; eles são a
guarda de que a mudança não abre demais.

- [ ] **Passo 3: a política, e o docblock que deixou de ser verdade**

Substitua o docblock do topo de `src/shared/lib/screenDetail.ts` (linhas 1-21) e
a função por:

```ts
/**
 * O `detail` que pode ir à tela — o que o FRONT escreveu, e o que o servidor
 * escreveu em três status.
 *
 * **A política anterior calava o servidor inteiro** e a razão dela foi paga: o
 * `ProblemDetails` devolvia `title` e `detail` literais em português, e desde o
 * bloco `hardening-i18n-e-erros-api` (2026-08-29) o envelope sai de `lang/` e
 * responde ao `Accept-Language`. O que faltava era decidir se o `detail` do
 * SERVIDOR substitui a dica do i18n em erro de CARGA. Decidido em 2026-09-02
 * (P-70): substitui, nos status em que o backend PROVA que o texto é localizado.
 *
 * **Por que status, e não tipo de envelope:** o `ProblemDetails.php` escolhe o
 * `detail` por TIPO de exceção, e só três caminhos passam por chave de `lang/` —
 * forbidden (403), not found (404) e `ThrottleRequests` (429). O ramo `default`
 * devolve `getMessage()` CRU, e é por ele que sai o `CSRF token mismatch.` em
 * inglês do 419 (P-72, que segue aberta). A allowlist é fechada por desenho:
 * status novo não entra sozinho, atravessando sem ninguém decidir.
 *
 * **Quem fica de fora, e por quê:** 401 não vira estado de carga — o
 * interceptor do `shared/api/axios.ts` redireciona para o login antes. 422 não
 * entra porque o `FormErrorSummary` já imprime campo a campo, e a frase geral
 * ali seria eco.
 *
 * Os envelopes que o PRÓPRIO front sintetiza (rede caída, corpo não-parseável)
 * seguem indo à tela: eles já são i18n e dizem coisa distinta da dica genérica
 * — `common.unexpectedErrorHint` é "não deu para processar a resposta", que o
 * `common.loadErrorHint` ("verifique sua conexão") não diz.
 *
 * **A exceção declarada é uma só:** o `CertificateViewDialog` imprime o `detail`
 * cru, porque `CorruptedSnapshotException` implementa `PublicDetail` de
 * propósito para o suporte descobrir QUAIS campos do snapshot faltam (D8 da
 * spec de certificação). Ele não chama esta função, e isso está comentado lá.
 */

/**
 * A forma mínima que a política lê. **Estrutural de propósito:**
 * `shared/ui/AppDataTable` tipa o `error` dele assim justamente para não
 * importar de `shared/api` (decisão registrada em `AppDataTable.tsx:16-18`), e a
 * política não pode ser o que quebra essa fronteira. `ProblemDetails` a satisfaz.
 */
export interface ScreenDetailSource {
  detail?: string | null
  localDetail?: true
  /** Status HTTP do envelope. Lido por DUAS políticas deste arquivo: a dica
   * (`loadErrorHint`) e a allowlist de `detail` localizado. Uma política, um
   * lugar, uma chave. */
  status?: number
}

/** Os status em que o `ProblemDetails.php` PROVA que o `detail` saiu de `lang/`.
 * Fechada de propósito — ver o docblock do arquivo. */
const DETALHE_LOCALIZADO = new Set([403, 404, 429])

export function screenDetail(problem: ScreenDetailSource | null | undefined): string | undefined {
  if (!problem) return undefined
  if (!problem.localDetail && !DETALHE_LOCALIZADO.has(problem.status ?? 0)) return undefined

  // `''` devolvido cru não dispara o `?? hint` do chamador, e a tela mostraria
  // um erro sem texto. Erro nunca é só cor nem só ícone (peso legal).
  return problem.detail?.trim() ? problem.detail : undefined
}
```

- [ ] **Passo 4: rodar a unidade e ver passar**

```bash
cd frontend && npx vitest run src/shared/lib/screenDetail.test.ts
```

Esperado: todos os casos de `screenDetail`, `loadErrorHint` e `loadMessage`
passando.

- [ ] **Passo 5: a prova em jsdom, no consumidor real**

A unidade prova a função; o DoD da ficha diz "na tela". `AppDataTable` é o
consumidor mais usado do par `screenDetail(error) ?? t(loadErrorHint(error))`
(`AppDataTable.tsx:94`), e ele imprime dentro de `AppErrorState`. Acrescente ao
fim de `src/shared/ui/AppDataTable/AppDataTable.test.tsx`:

```tsx
/**
 * P-70 atravessando a árvore de render, e não parando na função: o par
 * `screenDetail(error) ?? t(loadErrorHint(error))` decide QUAL frase o
 * `AppErrorState` imprime, e é a frase na tela que a ficha cobra.
 */
describe('detalhe do servidor no estado de erro (P-70)', () => {
  it('403: a frase que o servidor escreveu aparece na tela', () => {
    render(
      <AppDataTable value={[]} error={{ detail: 'La cotización no tiene cliente', status: 403 }}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(screen.getByText('La cotización no tiene cliente')).toBeTruthy()
  })

  it('500: a dica do i18n assume, porque o `detail` daquele status não é localizado', () => {
    render(
      <AppDataTable value={[]} error={{ detail: 'Ocorreu um erro inesperado.', status: 500 }}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )

    expect(screen.queryByText('Ocorreu um erro inesperado.')).toBeNull()
    expect(screen.getByText(i18n.t('common.loadErrorHint'))).toBeTruthy()
  })
})
```

- [ ] **Passo 6: rodar o consumidor e a suíte**

```bash
cd frontend && npx vitest run src/shared/ui/AppDataTable/AppDataTable.test.tsx && pnpm test && pnpm build
```

Esperado: os dois casos novos passando; a suíte inteira verde. Se o caso do 403
reprovar com `Unable to find an element with the text`, confira que
`AppDataTable` está em estado de erro — ele só monta o `AppErrorState` quando
`errored` é verdadeiro.

- [ ] **Passo 7: commit**

```bash
git add frontend/src/shared/lib/screenDetail.ts frontend/src/shared/lib/screenDetail.test.ts frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx
git commit -m "feat(frontend): o detail do servidor vai a tela em 403, 404 e 429 (P-70)"
```

---

### Task 5: `P-30` — o warning volta para a família amarela

**Arquivos:**
- Modificar: `scripts/generate-brand-theme.mjs`
- Regerar: `src/shared/styles/themes/lara-light-lotus.css`, `lara-dark-lotus.css`
- Modificar: `tests/tone-ink.test.ts`
- Modificar: `docs/superpowers/pendencias/abertas.md` (ficha nova, achado desta task)

**Interfaces:**
- Consome: `transform(css, map, tinta)` do gerador, cujo terceiro argumento já é,
  na prática, "é o tema claro" (o escuro não recebe tinta e retorna antes das
  passadas de forma).
- Produz: `warningAmarelo(css, receita)` e as duas receitas `WARNING_CLARO` /
  `WARNING_ESCURO`, aplicadas dentro de `transform`. Nada é exportado — o teste
  mede a SAÍDA, não a função.

**Contexto que o executor não tem — a medição que decide a receita.** A spec
§3.2 mediu só o estado base. Medidos os três estados em 2026-09-02:

| Estado (tema claro) | Hoje | Troca degrau a degrau | Receita desta task |
|---|---|---|---|
| base | `#ffffff` sobre `#f97316` = **2,80:1** | `#5e4803` sobre `#eab308` = 4,55:1 | 4,55:1 |
| hover | `#ffffff` sobre `#ea580c` = 3,56:1 | `#5e4803` sobre `#c79807` = **3,30:1** | `#5e4803` sobre `#eec137` = 5,12:1 |
| active | `#ffffff` sobre `#c2410c` = 5,18:1 | `#5e4803` sobre `#a47d06` = **2,29:1** | `#5e4803` sobre `#f2d066` = 5,82:1 |
| outlined/text | `#f97316` sobre branco = 2,80:1 | `#eab308` sobre branco = **1,92:1** | `#816204` sobre branco = 5,70:1 |

Amarelo é matiz claro: a tinta TEM de ser escura, e por isso os estados sobem a
rampa em vez de descer. Não é escolha de gosto — é a única progressão que passa
AA com uma tinta só, e é a direção que o Lara já usa no tema ESCURO
(`#fb923c` → `#fdba74` → `#fed7aa`). O tema escuro mantém a direção dele, só
trocando de família: `--yellow-400` → `--yellow-300` → `--yellow-200`, com a
mesma tinta `--yellow-900` (5,12 / 5,82 / 6,57).

O `color` de `outlined`/`text` é primeiro plano sobre superfície clara, não
fundo: ele vai para o degrau que o tema já publica como `--tone-warning-ink` —
`--yellow-800` (`#816204`) no claro, `--yellow-400` (`#eec137`) no escuro. É o
mesmo remédio que a UI-02 aplicou ao `danger` em `brand-theme.css`.

**A população foi enumerada antes de aplicar** (risco da spec §5): no Lara stock
há 19 blocos com laranja no claro e 20 no escuro. **Um só** em cada tema fica de
fora do seletor `warning`: o `:root`, que publica a rampa `--orange-50..900`. É
por isso que a regra é de FORMA e não entrada no mapa de hex — uma chave
`#f97316` no mapa apagaria a rampa publicada.

- [ ] **Passo 1: escrever a régua de contraste e vê-la reprovar**

Ao fim de `frontend/tests/tone-ink.test.ts`, use os helpers `hex`, `contraste`,
`temaClaro` e `temaEscuro` que já estão no topo do arquivo:

```ts
/**
 * P-30. O único `AppButton severity="warning"` do produto
 * (`MoveConfirmDialog.tsx:36`) confirma uma ação irreversível de matrícula, e no
 * tema claro o Lara o pintava com `#ffffff` sobre `#f97316`: **2,80:1**, abaixo
 * do 4,5:1 de texto e abaixo até do 3:1 de elemento gráfico.
 *
 * A ficha pedia coerência de família (o `AppTag` warning já pintava com
 * `--yellow-*`), e a coerência resolveu o contraste junto. Mede os TRÊS estados
 * porque a regra base do Lara é (0,3,0) e `:hover`/`:active` chegam a (0,5,0)
 * repetindo a cor: sem uma asserção por estado, passar o mouse devolveria a
 * reprovação sem a captura de tela acusar — o mesmo defeito da UI-02.
 */
describe('botão `warning` filled e outlined (P-30)', () => {
  /** O corpo da regra cujo seletor começa por `prefixo`. */
  const regra = (css: string, prefixo: string) =>
    css.match(new RegExp(`${prefixo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{}]*\\{([^{}]*)\\}`))?.[1] ?? ''

  const corDe = (corpo: string) => corpo.match(/(?<![-\w])color:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''
  const fundoDe = (corpo: string) => corpo.match(/background(?:-color)?:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''

  describe.each([
    { tema: 'claro', folha: temaClaro, ground: '#ffffff' },
    { tema: 'escuro', folha: temaEscuro, ground: '' },
  ])('tema $tema', ({ folha, ground }) => {
    it.each([
      { estado: 'base', prefixo: '.p-button.p-button-warning,' },
      { estado: 'hover', prefixo: '.p-button.p-button-warning:not(:disabled):hover,' },
      { estado: 'active', prefixo: '.p-button.p-button-warning:not(:disabled):active,' },
    ])('o filled no estado $estado passa AA (4,5:1)', ({ prefixo }) => {
      const corpo = regra(folha, prefixo)
      const [tinta, fundo] = [corDe(corpo), fundoDe(corpo)]

      expect(fundo).toMatch(/^#[0-9a-f]{6}$/)
      expect(contraste(tinta, fundo)).toBeGreaterThanOrEqual(4.5)
    })

    it('a tinta do filled é o degrau 900 do amarelo nos dois temas', () => {
      expect(corDe(regra(folha, '.p-button.p-button-warning,'))).toBe(hex(folha, '--yellow-900'))
    })

    it('o outlined/text é primeiro plano e passa AA sobre a superfície onde vive', () => {
      const cor = corDe(regra(folha, '.p-button.p-button-warning.p-button-outlined,'))
      const fundo = ground || hex(folha, '--surface-card')

      expect(contraste(cor, fundo)).toBeGreaterThanOrEqual(4.5)
    })
  })

  /** Os dois controles que fazem o teste discriminar (lição 10). O primeiro é o
   * defeito que a ficha fecha; o segundo é a "correção" ingênua — trocar cada
   * degrau de laranja pelo degrau de amarelo na MESMA posição —, que reprova o
   * active do claro por 2,29:1 e que este arquivo tem de recusar. */
  it('o laranja de stock do Lara reprova, e a troca degrau a degrau reprova pior', () => {
    expect(contraste('#ffffff', '#f97316')).toBeLessThan(3)
    expect(contraste('#5e4803', '#a47d06')).toBeLessThan(3)
  })
})
```

```bash
cd frontend && npx vitest run tests/tone-ink.test.ts
```

Esperado: os casos do `describe` novo reprovam nos dois temas — no claro o filled
base mede 2,80 e a tinta é `#ffffff`, não `#5e4803`; no escuro a tinta é
`#431407`. Os dois controles passam desde já.

- [ ] **Passo 2: a transformação de FORMA no gerador**

Em `frontend/scripts/generate-brand-theme.mjs`, depois de `BORDA_DE_CONTROLE` e
antes de `export function transform`:

```js
// ── P-30: o warning volta para a família amarela ────────────────────────────
// O `AppTag` warning já pintava com `--yellow-500`/`--yellow-400` e
// `--tone-warning-ink` (style próprio, `AppTag.tsx`), enquanto o BOTÃO seguia no
// laranja compilado do Lara. Uma severidade, duas famílias — e o único
// `severity="warning"` do produto é a confirmação de uma ação irreversível.
//
// Regra de FORMA, pelo mesmo argumento do `CELESTE_PRIMEIRO_PLANO`: o gate é o
// SELETOR conter `warning`. Trocar a entrada no mapa de hex alcançaria também o
// `:root`, que publica a rampa `--orange-50..900` — enumerado em 2026-09-02: dos
// 19 blocos com laranja no claro (20 no escuro), o `:root` é o ÚNICO fora do
// seletor de warning.
//
// Os estados SOBEM a rampa no claro em vez de descer, e isso é medido, não
// estético: amarelo é matiz claro, a tinta tem de ser escura, e com
// `--yellow-900` fixo os degraus 600/700 (que seriam o hover/active "na mesma
// posição" do laranja) medem 3,30:1 e 2,29:1 — pior que o defeito que a ficha
// fecha. Subindo, medem 5,12:1 e 5,82:1. É a direção que o Lara já usa no tema
// ESCURO, onde hover e active clareiam.
//
// O `color:` de outlined/text é primeiro plano sobre superfície clara, não
// fundo: vai para o degrau que o tema já publica como `--tone-warning-ink`
// (`--yellow-800` no claro, `--yellow-400` no escuro). Mesmo remédio da UI-02
// para o `danger`.
const WARNING_CLARO = {
  laranjaBase: '#f97316',
  tintaLara: '#ffffff',
  tinta: '#5e4803', //         --yellow-900, 4,55:1 sobre o degrau 500
  primeiroPlano: '#816204', // --yellow-800 = --tone-warning-ink do claro, 5,70:1 sobre branco
  fundo: {
    '#f97316': '#eab308', //           orange-500 → --yellow-500 (base)
    '#ea580c': '#eec137', //           orange-600 → --yellow-400 (hover, CLAREIA)
    '#c2410c': '#f2d066', //           orange-700 → --yellow-300 (active, CLAREIA)
    'rgba(249, 115, 22': 'rgba(234, 179, 8', // veladura de outlined/text
  },
}
const WARNING_ESCURO = {
  laranjaBase: '#fb923c',
  tintaLara: '#431407',
  tinta: '#5e4803', //         --yellow-900, 5,12:1 sobre o degrau 400
  primeiroPlano: '#eec137', // --yellow-400 = --tone-warning-ink do escuro, 8,58:1 sobre o card
  fundo: {
    '#fb923c': '#eec137', //           orange-400 → --yellow-400 (base)
    '#fdba74': '#f2d066', //           orange-300 → --yellow-300 (hover)
    '#fed7aa': '#f6de95', //           orange-200 → --yellow-200 (active)
    'rgba(251, 146, 60': 'rgba(238, 193, 55',
  },
}

function warningAmarelo(css, receita) {
  const chaves = Object.keys(receita.fundo).sort((a, b) => b.length - a.length)
  const busca = new RegExp(chaves.map(escapar).join('|'), 'gi')
  const indice = new Map(Object.entries(receita.fundo).map(([k, v]) => [k.toLowerCase(), v]))

  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (bloco, seletor, corpo) => {
    if (!/warning/i.test(seletor)) return bloco
    // O `color:` PRIMEIRO, e com lookbehind para não pegar `border-color` nem
    // `background-color`: depois desta passada não sobra laranja em declaração
    // de texto, e o mapa de fundo abaixo não o alcança por engano. Bloco que
    // pinta traz `color: <tintaLara>`; bloco de outlined/text traz
    // `color: <laranjaBase>` — nenhum traz os dois.
    const novo = corpo
      .replace(new RegExp(`(?<![-\\w])color:(\\s*)${receita.tintaLara}\\b`, 'gi'), `color:$1${receita.tinta}`)
      .replace(new RegExp(`(?<![-\\w])color:(\\s*)${receita.laranjaBase}\\b`, 'gi'), `color:$1${receita.primeiroPlano}`)
      .replace(busca, (achado) => indice.get(achado.toLowerCase()) ?? achado)
    return `${seletor}{${novo}}`
  })
}
```

E dentro de `transform`, a passada entra junto das outras de forma — antes do
mapa, porque o mapa não toca laranja (as severidades ficam intactas de
propósito) e porque `textoSobrePrimaria` já roda ali:

```js
  const out = warningAmarelo(
    textoSobrePrimaria(semFontFace(css)),
    tinta ? WARNING_CLARO : WARNING_ESCURO,
  ).replace(busca, (achado) => indice.get(achado.toLowerCase()) ?? achado)
```

- [ ] **Passo 3: regerar as duas folhas**

```bash
cd frontend && pnpm brand-theme
```

Esperado: duas linhas `gerado: src/shared/styles/themes/lara-{light,dark}-lotus.css`.
O diff dessas folhas é SAÍDA DE SCRIPT, não edição — o cabeçalho "NÃO editar à
mão" já está lá e `tests/brand-theme.test.ts` prova a correspondência.

- [ ] **Passo 4: conferir que a rampa laranja sobreviveu**

```bash
cd frontend && grep -o -- "--orange-500:[^;]*" src/shared/styles/themes/lara-light-lotus.css
grep -c "p-button-warning" src/shared/styles/themes/lara-light-lotus.css
```

Esperado: `--orange-500:#f97316` intacto (a rampa publicada não se mexe), e as
regras de `p-button-warning` presentes. Se `--orange-500` tiver virado amarelo, a
regra vazou para fora do seletor de warning e a task REPROVA (é o risco escrito
na spec §5).

- [ ] **Passo 5: as réguas passam e o drift não acusa**

```bash
cd frontend && npx vitest run tests/tone-ink.test.ts tests/brand-theme.test.ts && pnpm test
```

Esperado: o `describe` do warning inteiro verde nos dois temas; `brand-theme`
verde (committed == geração fresca); suíte inteira verde.

- [ ] **Passo 6: registrar o achado que NÃO se paga aqui**

Medido nesta task: no tema claro, a família inteira de botão de severidade filled
reprova AA no estado base — success **2,28:1**, info **2,77:1**, warning
**2,80:1**, danger **3,76:1**, help **3,96:1**; só `secondary` passa (4,76:1). O
warning não era caso especial, e consertar os outros quatro é campanha de tema,
não item 25. Abra ficha em `docs/superpowers/pendencias/abertas.md`, no molde das
vizinhas, com: os cinco números, o fato de que o `danger` já tem remédio parcial
em `brand-theme.css` (UI-02, só `text`/`outlined`), e o critério de fechamento
(régua por estado no molde do `describe` da P-30, para as cinco severidades).

- [ ] **Passo 7: commit**

```bash
git add frontend/scripts/generate-brand-theme.mjs frontend/src/shared/styles/themes frontend/tests/tone-ink.test.ts docs/superpowers/pendencias/abertas.md
git commit -m "fix(frontend): o botao warning volta para a familia amarela e passa AA (P-30)"
```

---

### Task 6: `P-68` — a razão da assimetria fica escrita

**Arquivos:**
- Modificar: `eslint.config.js` (bloco `max-lines` de `src/features/*/components/**`)

**Interfaces:** nenhuma. **Zero mudança de comportamento** — só comentário.

**Contexto que o executor não tem:** a régua de 150 linhas alcança arquivo de
TESTE em `src/features/*/components/**`, enquanto o bloco gêmeo de
`src/app/**/*.tsx`, doze linhas abaixo, tem `ignores: ['**/*.test.tsx']` com
razão escrita. A assimetria existe e não estava justificada — é isso que a ficha
cobra. Medido: 24 arquivos `*.test.tsx` em `src/features/*/components/**`; um
passou de 150 e foi QUEBRADO (`e76747a6`, fechamento do item 18) em vez de a
régua ser afrouxada; dois estão exatamente em 150 (`EnrollmentSection.test.tsx`,
`ProfileDocumentSlot.test.tsx`), que é a assinatura de quem aparou para caber.
A decisão é MANTER a régua e escrever a razão.

- [ ] **Passo 1: escrever a razão ao lado da régua**

No bloco `max-lines` de `src/features/*/components/**/*.{ts,tsx}`, acrescente ao
fim do comentário que já está lá:

```js
  // Teste de feature NÃO é isento, ao contrário do gêmeo de `src/app/**` doze
  // linhas abaixo, e a assimetria é escolha (P-68, escrita em 2026-09-02).
  //
  // O precedente é o item 18: o único teste de componente de feature que passou
  // de 150 foi QUEBRADO (`e76747a6`), não isentado. A razão é que o teste de
  // componente de feature cresce pelo mesmo motivo que o componente cresce —
  // muitos casos porque há muita responsabilidade —, então o limite mede o
  // mesmo defeito dos dois lados. Em `src/app/**` não vale: lá o que passa de
  // 150 é teste de PÁGINA, coeso por natureza, e quebrá-lo paga preço pela
  // regra e não pelo defeito.
  //
  // Medido em 2026-09-02: dos 24 arquivos `*.test.tsx` sob este glob, nenhum
  // passa de 150 e DOIS estão exatamente em 150 (`EnrollmentSection.test.tsx`,
  // `ProfileDocumentSlot.test.tsx`) — a régua está mordendo, não decorando.
```

- [ ] **Passo 2: provar que nada mudou de comportamento**

```bash
cd frontend && pnpm lint
```

Esperado: sem saída. Comentário não muda regra; se algo acusar, a edição saiu do
comentário.

- [ ] **Passo 3: commit**

```bash
git add frontend/eslint.config.js
git commit -m "docs(frontend): a regua de 150 em teste de feature ganha razao escrita (P-68)"
```

---

### Task 7: `P-42` — emenda datada no D1 da spec arquivada

**Arquivos:**
- Modificar: `docs/superpowers/specs/archive/2026-08-14-celula-de-identidade-design.md`
  (tabela de decisões, linha `| D1 |`)
- Modificar: `src/shared/ui/IdentityCell/IdentityCell.tsx` (docblock)

**Interfaces:** nenhuma. **Código intocado** — a divergência FICA, o que muda é
o registro.

**Contexto que o executor não tem:** o D1 daquela spec diz `font-medium` no
título, `text-xs` na descrição e `gap-3` entre as linhas. O construído é
`font-semibold` no título, `text-sm font-medium` na descrição e `gap-2` — decidido
pelo João em 2026-08-14, com a tela na frente, no achado Q-3 do `/revisar-sprint`.
A consequência é medível e não é cosmética invisível: `gap-2` × N linhas muda a
altura de TODA tabela que usa a célula. O snapshot não se reescreve em silêncio;
ganha linha nova com data, no molde da emenda de 2026-08-24 no ADR-13.

- [ ] **Passo 1: a emenda na spec arquivada**

Logo abaixo da tabela de decisões daquela spec (depois da linha `| D13 |`),
acrescente:

```markdown
### Emenda de 2026-09-02 ao D1 (P-42)

O D1 acima é o desenho; a grafia **construída** diverge dele em três pontos, e a
divergência é decisão do João de 2026-08-14, tomada com a tela na frente no
achado Q-3 do `/revisar-sprint` do próprio bloco:

| Ponto | D1 (desenho) | Construído (`IdentityCell.tsx`) |
|---|---|---|
| título | `font-medium` | `font-semibold` |
| descrição | `text-xs` | `text-sm font-medium` |
| espaço entre as linhas | `gap-3` | `gap-2` |

O `--text-color-secondary` da descrição e o `size="large"` do avatar seguem como
o D1 os escreveu.

**Não é detalhe cosmético invisível:** o `gap-2` multiplica por N linhas e muda a
ALTURA de toda tabela que usa a célula — `TurmasTable`, `HistorialTable`,
`EmissionStudentsTable` e as outras onze. Ler o D1 sozinho e "corrigir" o
componente para `gap-3` mexeria em catorze telas de uma vez.

O código **não volta** ao D1. Esta emenda é o fechamento da `P-42`, que existia
porque o snapshot afirmava uma grafia que a tela não tinha.
```

- [ ] **Passo 2: o docblock que aponta para a emenda**

Em `src/shared/ui/IdentityCell/IdentityCell.tsx`, acrescente ao fim do docblock
do componente (depois do parágrafo que explica a cor do título na forma inline):

```tsx
 * **A grafia diverge do D1 da spec de propósito** — `font-semibold` no título,
 * `text-sm font-medium` na descrição e `gap-2` entre as linhas, contra o
 * `font-medium`/`text-xs`/`gap-3` que o D1 escreveu. Decisão do João em
 * 2026-08-14 com a tela na frente (Q-3 do `/revisar-sprint`), registrada na
 * emenda de 2026-09-02 daquela spec
 * (`docs/superpowers/specs/archive/2026-08-14-celula-de-identidade-design.md`).
 * Não "corrija" para o D1: o `gap` multiplica por linha e muda a altura das
 * catorze tabelas que usam esta célula.
```

- [ ] **Passo 3: provar que o código não mudou de comportamento**

```bash
cd frontend && pnpm lint && pnpm test && git diff --stat -- src/shared/ui/IdentityCell/
```

Esperado: lint sem saída, suíte verde, e o diff do `IdentityCell/` mostrando
apenas linhas de comentário adicionadas (nenhuma linha de JSX alterada).

- [ ] **Passo 4: commit**

```bash
git add docs/superpowers/specs/archive/2026-08-14-celula-de-identidade-design.md frontend/src/shared/ui/IdentityCell/IdentityCell.tsx
git commit -m "docs(spec): emenda datada no D1 da celula de identidade (P-42)"
```

---

### Task 8: fechamento — o DoD provado, não presumido

**Arquivos:** nenhum de código. Esta task só mede.

- [ ] **Passo 1: as três catracas verdes de uma vez**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: `pnpm lint` sem saída; `pnpm build` completo; `pnpm test` com **128
arquivos** passando e a linha `Duration` presente — rodada que TERMINA, que é
metade do que a P-69 cobra.

- [ ] **Passo 2: provar que `pint` e `typescript:transform` são N/A por escopo**

```bash
cd /home/jvbat/projetos/fix-frontend
git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: **saída vazia**. É o DoD 5. Se sair qualquer linha, o bloco atravessou
o seam e as duas ferramentas deixam de ser N/A.

- [ ] **Passo 3: provar que `CATRACA_COR` chegou a zero e a partição morreu**

```bash
cd frontend
grep -n "const CATRACA_COR" -A2 eslint.config.js
grep -c "files: CATRACA_COR" eslint.config.js
```

Esperado: `const CATRACA_COR = []` e contagem **0** para o bloco. É o DoD 2, e a
prova de que os quatro sítios morreram é o lint verde SEM a lista — não o grep.

- [ ] **Passo 4: conferir a lista de sonda**

As três catracas novas foram vistas reprovar, cada uma no passo 1 da sua task:

| Catraca | Sonda | Task |
|---|---|---|
| `CATRACA_COR = []` | 4 erros de cor hardcoded antes da correção | 1 |
| guarda do `setupFiles` | 2 asserções reprovadas antes do mecanismo existir | 2 |
| `CLEANUP_A_MAO` | 31 erros antes da remoção | 3 |
| allowlist da `P-70` | 2 casos reprovados antes da política | 4 |
| contraste do warning | filled e outlined reprovando nos dois temas | 5 |

Se alguma sonda foi pulada, a task correspondente não está feita — DoD 4.

- [ ] **Passo 5: commit final, se houver o que commitar**

Se os passos acima não mudaram arquivo nenhum (o esperado), não há commit. O
bloco termina com o estado a transicionar para `ready_for_review` por
`/executar-bloco`, não por esta task.

---

## Auto-revisão do plano

**Cobertura da spec:** §4.1 `P-69` → Tasks 2 e 3. §4.2 `D-69` → Task 1. §4.3
`P-70` → Task 4. §4.4 `P-30` → Task 5. §4.5 `P-68` → Task 6. §4.6 `P-42` →
Task 7. §6 DoD 1-6 → Task 8 (DoD 6, a remoção das seis linhas do índice de
pendências, é do `/fechar-sprint` por desenho da própria spec).

**Onde o plano corrige a spec, e por quê:**

1. **§3.3 diz 28 arquivos; são 31.** A spec contou uma grafia só. Task 3 lista os
   31 e o seletor da catraca cobre as duas grafias.
2. **§4.1 desenha uma sonda negativa que não reprova.** Medido em 2026-09-02: a
   suíte inteira (127 arquivos, 734 testes) passa sem `setupFiles` E sem o
   `cleanup()` do `useServerTable.test.tsx`. O `ReferenceError: window is not
   defined` que o comentário daquele arquivo afirma não reproduz no vitest 4.1.10.
   A prova da P-69 passa a ser a guarda estática (Task 2, passo 2) e a
   `CLEANUP_A_MAO` (Task 3, passo 1), as duas vistas reprovar.
3. **§3.2 mediu só o estado base da `P-30`.** A troca degrau a degrau regride
   hover (3,30:1), active (2,29:1) e outlined (1,92:1) no tema claro. A receita
   da Task 5 sobe a rampa e mede 4,55 / 5,12 / 5,82 / 5,70. A decisão D3 não
   muda; a receita, sim.
4. **§4.1 desenha `CLEANUP_A_MAO` sem dizer onde ela entra.** Bloco próprio
   colidiria por merge raso e apagaria em silêncio a catraca de cor nos arquivos
   de teste. Entra em 5 arrays existentes, com o buraco declarado.

**Achado que não vira task deste bloco:** a família inteira de botão de
severidade reprova AA no tema claro (Task 5, passo 6, abre ficha).

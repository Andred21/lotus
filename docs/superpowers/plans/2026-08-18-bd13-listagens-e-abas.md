# BD-13 · listagens e abas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar D-02, D-04, D-05, D-06 e D-31 — plural de verdade nas contagens, uma aba por GET,
a tela falando um idioma só, e a linha do certificado corrompido dizendo o que falta.

**Architecture:** frontend puro, em quatro frentes independentes. Os dicionários ganham a forma
`_one`/`_other` do i18next (forma nova no projeto). A `PeoplePage` vira casca de abas e o dado desce
para dois componentes de aba, com `staleTime` nos dois hooks para a troca de aba não pagar GET. A
política "só imprimo `detail` que eu escrevi" nasce como função pura em `shared/lib` e é aplicada nos
três produtores de estado de carga, o que faz 12 telas mudarem de comportamento sem serem editadas.

**Tech Stack:** React 19 + TS, Vite, i18next 26 (JSON v4), TanStack Query v5, PrimeReact via
`shared/ui`, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-08-18-bd13-listagens-e-abas-design.md`

## Global Constraints

- **Frontend puro.** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` deve
  devolver **zero arquivo** no fim do bloco. Nenhuma task escreve em `backend/`.
- **Lei §5.3:** `frontend/src/shared/types/generated.ts` não se edita à mão. Nenhuma task o toca.
- **Lei §5.6:** feature não importa PrimeReact direto (só via `shared/ui`) nem outra feature, nem
  para tipo. `shared/ui` → `shared/lib` é permitido e já é padrão; `shared/ui` → `shared/api` **não**
  é o caminho aqui (ver Task 4).
- **Comandos** (sempre de `frontend/`): `pnpm test`, `pnpm test <path>`, `pnpm lint`, `pnpm build`.
- **Paridade de locales:** toda chave alterada muda nos **três** arquivos —
  `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`. `parity.test.ts` reprova o esquecimento.
- **es-CL é a referência** do `parity.test.ts`; `en` e `pt-BR` são comparadas contra ela.
- **Commits pequenos**, um por task, mensagem em português, sem `Co-Authored-By` nas tasks (o gate
  final não é commit de código).

---

## Mapa de arquivos

**Criados**

| Path | Responsabilidade |
|---|---|
| `frontend/src/shared/lib/screenDetail.ts` | a política "só vai à tela o `detail` que o front escreveu", como função pura sobre forma estrutural |
| `frontend/src/shared/lib/screenDetail.test.ts` | os dois ramos da política |
| `frontend/src/shared/config/locales/plural.test.ts` | prova comportamental do plural nas 17 chaves × 3 idiomas |
| `frontend/src/features/identity/components/Redator/RedatoresTab.tsx` | aba de redatores: hook, tabela, diálogo e deep link `?redator=` |
| `frontend/src/features/identity/components/Student/StudentsTab.tsx` | aba de alunos: hook, tabela e diálogo |
| `frontend/src/features/identity/components/PeoplePage.test.tsx` | contagem de GET na montagem e na troca de aba |
| `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx` | célula de aluno do snapshot corrompido |

**Modificados**

| Path | O quê |
|---|---|
| `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` | 17 chaves viram `_one`/`_other`; 2 chaves órfãs saem; 1 chave nova entra |
| `frontend/src/shared/api/axios.ts` | `ProblemDetails.localDetail?: true`; marca os 2 envelopes sintetizados ali |
| `frontend/src/shared/api/problemFromBlob.ts` | marca o 3º envelope sintetizado |
| `frontend/src/shared/hooks/useLoadState.ts` | `errorDetail` passa por `screenDetail` |
| `frontend/src/shared/hooks/useResourceState.ts` | idem |
| `frontend/src/app/pages/Dashboard/useDashboard.ts` | `staleError` passa por `screenDetail` |
| `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx` | tipo do `error` vira `ScreenDetailSource`; corpo usa `screenDetail` |
| 11 telas que leem `.detail` do envelope cru | trocam para `screenDetail(x) ?? hint` |
| `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx` | **mantém** o `detail` cru, com comentário da exceção D8 |
| `frontend/src/features/certification/components/Historial/HistorialTable.tsx` | célula de aluno trata string vazia |
| `frontend/src/shared/hooks/useCrudPage.ts` | segundo parâmetro de opções, repassado ao `useList` |
| `frontend/src/features/identity/hooks/{useRedatoresPage,useStudentsPage}.ts` | passam `staleTime` |
| `frontend/src/features/identity/components/PeoplePage.tsx` | vira casca de abas |
| `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx` | nota no comentário sobre a chave apagada |
| `docs/superpowers/backlog.md` | entra o débito de localização do envelope RFC 7807 |

---

## Task 1: D-31 — apagar as duas chaves i18n órfãs

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`
- Modify: `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx`
- Test: `frontend/src/shared/config/locales/parity.test.ts` (existente, não muda)

**Interfaces:**
- Consumes: nada.
- Produces: nada. Task independente das demais.

- [ ] **Step 1: confirmar que as duas chaves seguem órfãs**

```bash
cd frontend && grep -rn "documents\.noValidity\|identity\.role" src --include='*.tsx' --include='*.ts' | grep -v locales
```

Esperado: **uma única linha**, `src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx:118`,
que é asserção NEGATIVA. Qualquer outra linha para a task: a chave não está órfã e a D-31 precisa de
nova decisão.

- [ ] **Step 2: apagar `profile.documents.noValidity` nos 3 locales**

`noValidity` é a **última** chave do bloco `documents`, então a vírgula da linha anterior sai junto.

`es-CL.json`, dentro de `profile.documents`:

```json
      "validUntil": "Vence el {{date}}",
      "noValidity": "Sin fecha de vencimiento"
    },
```

vira

```json
      "validUntil": "Vence el {{date}}"
    },
```

`pt-BR.json`:

```json
      "validUntil": "Vence em {{date}}",
      "noValidity": "Sem data de vencimento"
    },
```

vira

```json
      "validUntil": "Vence em {{date}}"
    },
```

`en.json`:

```json
      "validUntil": "Valid until {{date}}",
      "noValidity": "No expiry date"
    },
```

vira

```json
      "validUntil": "Valid until {{date}}"
    },
```

- [ ] **Step 3: apagar `profile.identity.role` nos 3 locales**

Está no meio do bloco `identity`, então é remoção de linha simples.

`es-CL.json`: apagar `      "role": "Perfil",`
`pt-BR.json`: apagar `      "role": "Perfil",`
`en.json`: apagar `      "role": "Profile",`

**Atenção:** existem outras chaves `role` no arquivo (`admin.role`, `role.count`, …). A que sai é a
que fica dentro de `profile.identity`, entre `"rut"` e `"noRut"`.

- [ ] **Step 4: rodar a paridade e o JSON**

```bash
cd frontend && pnpm test src/shared/config/locales/parity.test.ts
```

Esperado: **PASS** nos 2 testes. Se reprovar com `faltando`/`excedente`, uma das três remoções não
foi feita ou foi feita na chave errada.

- [ ] **Step 5: atualizar o comentário do teste que cita a chave apagada**

Em `src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx`, o teste
`'o caso SEM validade nao imprime linha nenhuma'`. O `t` está mockado devolvendo a chave, então a
asserção continua válida e continua guardando a decisão. Só o comentário ganha a nota:

```tsx
  it('o caso SEM validade nao imprime linha nenhuma', () => {
    // Tres dos quatro slots tem valid_until null e imprimiam
    // `Sin fecha de vencimiento` -- uma linha que so diz que nao ha informacao,
    // e que e ela quem rebaixou a que importa.
    //
    // A chave `profile.documents.noValidity` foi APAGADA dos 3 locales na D-31
    // (2026-08-18), justamente por nao ter consumidor. A assercao segue valendo:
    // o `t` esta mockado devolvendo a chave, entao ela nao depende do dicionario
    // -- e continua guardando a decisao de nao imprimir a linha.
    montar({ valid_until: null })

    expect(screen.queryByText(/profile\.documents\.noValidity/)).toBeNull()
  })
```

- [ ] **Step 6: rodar a suíte de perfil**

```bash
cd frontend && pnpm test src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx
```

Esperado: **PASS**.

- [ ] **Step 7: commit**

```bash
git add frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/en.json frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx
git commit -m "chore(i18n): apaga as duas chaves orfas de /perfil (D-31)"
```

---

## Task 2: D-02 — plural do i18next em 17 chaves

**Files:**
- Create: `frontend/src/shared/config/locales/plural.test.ts`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: nada.
- Produces: as chaves `<nome>_one` / `<nome>_other`. **Nenhum `.tsx` muda** — `t('course.count',
  { count: n })` continua igual; quem resolve o sufixo é o i18next.

**Contexto que o implementador precisa:** i18next 26 usa o formato JSON v4 por default, em que a
forma plural é o sufixo `_one`/`_other` e a resolução vem do `Intl.PluralRules` do idioma. `es-CL`,
`pt-BR` e `en` têm exatamente as categorias `one` e `other`. **Nada muda em
`src/shared/config/i18n.ts`.** A chave-base sem sufixo é removida — ela ficaria morta.

- [ ] **Step 1: escrever o teste que falha**

Criar `frontend/src/shared/config/locales/plural.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import i18n from '../i18n'

/**
 * A `parity.test.ts` prova ESTRUTURA: que as 3 locales têm as mesmas chaves.
 * Ela não prova PLURAL — copiar `"{{count}} clientes"` nas duas formas passa
 * verde lá. É isto que este arquivo mede.
 *
 * A comparação tira o número das duas saídas antes de comparar: com ele dentro,
 * "1 usuario" e "2 usuarios" diferem sempre, inclusive quando as duas formas
 * carregam o mesmo substantivo — que é exatamente o defeito que se quer pegar.
 */
const CHAVES = [
  'admin.count',
  'course.count',
  'courseModule.countShort',
  'role.count',
  'dashboard.compliance.count',
  'dashboard.redatorLoad.count',
  'client.count',
  'budget.count',
  'quote.studentsShort',
  'redator.count',
  'student.count',
  'operation.pending.students',
  'operation.table.count',
  'operation.enrollment.footerCount',
  'certificate.vigenciaMeses',
  'certificate.certCount',
  'certificate.validation.hours',
] as const

const IDIOMAS = ['es-CL', 'pt-BR', 'en'] as const

const semNumero = (texto: string, n: number) => texto.replace(String(n), '').trim()

describe('plural das chaves de contagem', () => {
  it.each(IDIOMAS)('%s: toda chave de contagem tem forma singular própria', (lng) => {
    const t = i18n.getFixedT(lng)

    const semSingular = CHAVES.filter(
      (k) => semNumero(t(k, { count: 1 }), 1) === semNumero(t(k, { count: 2 }), 2),
    )

    expect(
      semSingular,
      `Em ${lng} estas chaves usam o mesmo texto para 1 e para 2: ${semSingular.join(', ') || '—'}`,
    ).toEqual([])
  })

  it.each(IDIOMAS)('%s: a forma de 1 traz o número 1, não some com ele', (lng) => {
    const t = i18n.getFixedT(lng)

    for (const k of CHAVES) {
      expect(t(k, { count: 1 }), `${lng} / ${k}`).toContain('1')
    }
  })
})
```

- [ ] **Step 2: rodar para ver falhar**

```bash
cd frontend && pnpm test src/shared/config/locales/plural.test.ts
```

Esperado: **FAIL** nos 3 casos do primeiro `it.each`, listando as 17 chaves (nenhuma tem forma
singular ainda). O segundo `it.each` passa desde já.

- [ ] **Step 3: converter as 17 chaves em `es-CL.json`**

Cada linha `"<nome>": "{{count}} <plural>"` vira **duas** linhas, `_one` e `_other`, na mesma
posição e com a mesma indentação. A chave sem sufixo **desaparece**.

```json
"count_one": "{{count}} usuario",              "count_other": "{{count}} usuarios",              → admin
"count_one": "{{count}} curso",                "count_other": "{{count}} cursos",                → course
"countShort_one": "{{count}} módulo",          "countShort_other": "{{count}} módulos"           → courseModule
"count_one": "{{count}} rol",                  "count_other": "{{count}} roles",                 → role
"count_one": "{{count}} clase",                "count_other": "{{count}} clases",                → dashboard.compliance
"count_one": "{{count}} relator",              "count_other": "{{count}} relatores",             → dashboard.redatorLoad
"count_one": "{{count}} cliente",              "count_other": "{{count}} clientes",              → client
"count_one": "{{count}} presupuesto",          "count_other": "{{count}} presupuestos",          → budget
"studentsShort_one": "{{count}} alumno",       "studentsShort_other": "{{count}} alumnos"        → quote
"count_one": "{{count}} redactor",             "count_other": "{{count}} redactores",            → redator
"count_one": "{{count}} alumno",               "count_other": "{{count}} alumnos",               → student
"students_one": "{{count}} alumno",            "students_other": "{{count}} alumnos",            → operation.pending
"count_one": "{{count}} turma",                "count_other": "{{count}} turmas",                → operation.table
"footerCount_one": "{{count}} alumno matriculado", "footerCount_other": "{{count}} alumnos matriculados" → operation.enrollment
"vigenciaMeses_one": "{{count}} mes",          "vigenciaMeses_other": "{{count}} meses",         → certificate
"certCount_one": "{{count}} certificado",      "certCount_other": "{{count}} certificados",      → certificate
"hours_one": "{{count}} hora",                 "hours_other": "{{count}} horas",                 → certificate.validation
```

**`operation.table.count` fica com "turma/turmas" mesmo em es-CL.** O termo já está em português no
arquivo hoje; traduzi-lo é outro débito e **não** entra aqui — trocar a palavra escondia a mudança
de plural no mesmo diff.

- [ ] **Step 4: converter as 17 chaves em `pt-BR.json`**

```json
"count_one": "{{count}} usuário",              "count_other": "{{count}} usuários",              → admin
"count_one": "{{count}} curso",                "count_other": "{{count}} cursos",                → course
"countShort_one": "{{count}} módulo",          "countShort_other": "{{count}} módulos"           → courseModule
"count_one": "{{count}} papel",                "count_other": "{{count}} papéis",                → role
"count_one": "{{count}} turma",                "count_other": "{{count}} turmas",                → dashboard.compliance
"count_one": "{{count}} relator",              "count_other": "{{count}} relatores",             → dashboard.redatorLoad
"count_one": "{{count}} cliente",              "count_other": "{{count}} clientes",              → client
"count_one": "{{count}} orçamento",            "count_other": "{{count}} orçamentos",            → budget
"studentsShort_one": "{{count}} aluno",        "studentsShort_other": "{{count}} alunos"         → quote
"count_one": "{{count}} redator",              "count_other": "{{count}} redatores",             → redator
"count_one": "{{count}} aluno",                "count_other": "{{count}} alunos",                → student
"students_one": "{{count}} aluno",             "students_other": "{{count}} alunos",             → operation.pending
"count_one": "{{count}} turma",                "count_other": "{{count}} turmas",                → operation.table
"footerCount_one": "{{count}} aluno matriculado", "footerCount_other": "{{count}} alunos matriculados" → operation.enrollment
"vigenciaMeses_one": "{{count}} mês",          "vigenciaMeses_other": "{{count}} meses",         → certificate
"certCount_one": "{{count}} certificado",      "certCount_other": "{{count}} certificados",      → certificate
"hours_one": "{{count}} hora",                 "hours_other": "{{count}} horas",                 → certificate.validation
```

- [ ] **Step 5: converter as 17 chaves em `en.json`**

```json
"count_one": "{{count}} user",                 "count_other": "{{count}} users",                 → admin
"count_one": "{{count}} course",               "count_other": "{{count}} courses",               → course
"countShort_one": "{{count}} module",          "countShort_other": "{{count}} modules"           → courseModule
"count_one": "{{count}} role",                 "count_other": "{{count}} roles",                 → role
"count_one": "{{count}} class",                "count_other": "{{count}} classes",               → dashboard.compliance
"count_one": "{{count}} instructor",           "count_other": "{{count}} instructors",           → dashboard.redatorLoad
"count_one": "{{count}} client",               "count_other": "{{count}} clients",               → client
"count_one": "{{count}} budget",               "count_other": "{{count}} budgets",               → budget
"studentsShort_one": "{{count}} student",      "studentsShort_other": "{{count}} students"       → quote
"count_one": "{{count}} instructor",           "count_other": "{{count}} instructors",           → redator
"count_one": "{{count}} student",              "count_other": "{{count}} students",              → student
"students_one": "{{count}} student",           "students_other": "{{count}} students",           → operation.pending
"count_one": "{{count}} class",                "count_other": "{{count}} classes",               → operation.table
"footerCount_one": "{{count}} student enrolled", "footerCount_other": "{{count}} students enrolled" → operation.enrollment
"vigenciaMeses_one": "{{count}} month",        "vigenciaMeses_other": "{{count}} months",        → certificate
"certCount_one": "{{count}} certificate",      "certCount_other": "{{count}} certificates",      → certificate
"hours_one": "{{count}} hour",                 "hours_other": "{{count}} hours",                 → certificate.validation
```

**`operation.table.count` em `en` vira "class/classes"**, não "turma": em inglês a palavra já estava
traduzida, e manter o inglês certo não é mudança de termo.

- [ ] **Step 6: rodar plural e paridade**

```bash
cd frontend && pnpm test src/shared/config/locales/
```

Esperado: **PASS** em `plural.test.ts` (6 casos) e em `parity.test.ts` (2 casos). Se a paridade
reprovar com `faltando: <chave>_one`, um dos três arquivos ficou com a chave-base ou com só uma das
formas.

- [ ] **Step 7: provar que a catraca pega o copy-paste**

Trocar, em `es-CL.json`, `"count_one": "{{count}} cliente"` por `"count_one": "{{count}} clientes"`
e rodar `pnpm test src/shared/config/locales/plural.test.ts`.

Esperado: **FAIL** em `es-CL`, com a mensagem nomeando `client.count`. **Desfazer a mudança** e rodar
de novo para voltar ao verde. Sem este passo o teste pode estar passando por não medir nada.

- [ ] **Step 8: rodar a suíte inteira**

```bash
cd frontend && pnpm test
```

Esperado: **PASS**. Nenhum teste existente afirma o texto dessas chaves (os testes de componente
mockam `t` devolvendo a chave), então nada mais deve mexer.

- [ ] **Step 9: commit**

```bash
git add frontend/src/shared/config/locales/
git commit -m "fix(i18n): plural de verdade nas 17 chaves de contagem (D-02)"
```

---

## Task 3: D-06 — a célula de aluno do certificado corrompido

**Files:**
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx:60`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`
- Create: `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: chave i18n `certificate.snapshotMissingField`.

**Contexto:** `c.snapshot.aluno.name` chega **string vazia** quando o snapshot está corrompido — é o
que `CertificateSnapshotData::missingRequiredFields()` mede (`trim($value) === ''`). Por isso o
fallback testa vazio, e não só `null`: o `?? '—'` de hoje deixa `''` passar e a célula fica em
branco. A assimetria entre nome e RUT é medida: RUT **não** está em `missingRequiredFields`, é
ausência legítima.

- [ ] **Step 1: acrescentar a chave nova nos 3 locales**

A chave entra **logo depois de `snapshotCorrupted`**, que hoje está na linha 834 dos três arquivos,
entre `colStatus` e `viewTitle`. As duas andam juntas: uma marca a linha, a outra a célula.

`es-CL.json`:

```json
    "colStatus": "Estado",
    "snapshotCorrupted": "Documento corrupto",
    "snapshotMissingField": "Nombre ausente",
    "viewTitle": "Detalle del certificado",
```

`pt-BR.json`:

```json
    "colStatus": "Estado",
    "snapshotCorrupted": "Documento corrompido",
    "snapshotMissingField": "Nome ausente",
    "viewTitle": "Detalhe do certificado",
```

`en.json`:

```json
    "colStatus": "Status",
    "snapshotCorrupted": "Corrupted document",
    "snapshotMissingField": "Name missing",
    "viewTitle": "Certificate detail",
```

- [ ] **Step 2: escrever o teste que falha**

Criar `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CertificateData } from '@shared/types/generated'
import type { useHistorial } from '../../hooks/useHistorial'
import { HistorialTable } from './HistorialTable'

/** `t` devolve a chave: o que se prova é QUAL texto a célula escolhe, não a
 * tradução (isso é do `parity.test.ts`). */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

type Historial = ReturnType<typeof useHistorial>

const historial = vi.hoisted<{ current: Partial<Historial> }>(() => ({ current: {} }))
vi.mock('../../hooks/useHistorial', () => ({
  useHistorial: () => historial.current as Historial,
}))

/** Um certificado com o snapshot CORROMPIDO: o backend projeta
 * `snapshot_ok: false` e deixa os campos vazios em vez de derrubar a listagem
 * inteira (CorruptedSnapshotException, "a listagem é a exceção deliberada"). */
function certificado(over: Partial<CertificateData['snapshot']['aluno']> = {}): CertificateData {
  return {
    id: 1,
    codigo: 'LOT-2026-1001',
    created_at: '2026-08-01T10:00:00Z',
    valido_ate: null,
    snapshot_ok: false,
    aluno_photo_url: null,
    snapshot: {
      aluno: { name: '', rut: '', ...over },
      curso: { name: 'Alta tensión' },
    },
  } as unknown as CertificateData
}

const montar = (c: CertificateData) => {
  historial.current = {
    table: { rows: [c], search: '', setSearch: () => {}, filtering: false, clear: () => {} },
    statusFilter: null,
    setStatusFilter: () => {},
    clearStatusFilter: () => {},
    statusSummary: { vigente: 1 },
    loading: false,
    loadError: null,
    reload: () => {},
    setViewingCertificateId: () => {},
  } as unknown as Historial

  return render(<HistorialTable />)
}

afterEach(cleanup)

describe('HistorialTable — a linha do snapshot corrompido', () => {
  it('nome vazio: a célula DIZ que o campo falta, em vez de ficar em branco', () => {
    montar(certificado({ name: '' }))

    // A lista é o único lugar onde o registro aparece antes do clique: uma
    // célula em branco não distingue "sem nome" de "campo faltando".
    expect(screen.getByText('certificate.snapshotMissingField')).toBeTruthy()
  })

  it('RUT vazio: travessão, NÃO o texto de campo ausente', () => {
    // Assimetria deliberada: RUT não está em `missingRequiredFields` no
    // backend, então ausência de RUT é dado legítimo (aluno estrangeiro).
    // Só não pode renderizar em branco — o `??` de hoje deixa `''` passar.
    montar(certificado({ name: 'Ana Torres', rut: '' }))

    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.queryByText('certificate.snapshotMissingField')).toBeNull()
  })

  it('nome presente: nem travessão nem texto de ausência no lugar do nome', () => {
    montar(certificado({ name: 'Ana Torres', rut: '11.111.111-1' }))

    expect(screen.getByText('Ana Torres')).toBeTruthy()
    expect(screen.queryByText('certificate.snapshotMissingField')).toBeNull()
  })
})
```

- [ ] **Step 3: rodar para ver falhar**

```bash
cd frontend && pnpm test src/features/certification/components/Historial/HistorialTable.test.tsx
```

Esperado: **FAIL** no 1º caso (`Unable to find an element with the text:
certificate.snapshotMissingField`) e **FAIL** no 2º (`—` não está na tela: `rut: ''` passa pelo `??`
e renderiza vazio).

- [ ] **Step 4: implementar**

Em `HistorialTable.tsx`, acrescentar o helper acima do componente:

```tsx
/** Vazio aqui não é `null`: o snapshot corrompido chega com string VAZIA — é o
 * que `CertificateSnapshotData::missingRequiredFields()` mede (`trim === ''`).
 * O `?? '—'` de antes só pegava `null`/`undefined` e deixava a célula em branco. */
const ausente = (valor: string | null | undefined) => (valor ?? '').trim() === ''
```

E trocar o corpo da coluna do aluno (linha 60):

```tsx
            <IdentityCell
              /* Nome vazio é CORRUPÇÃO (o campo está em `missingRequiredFields`
               * no backend), e a lista é o único lugar onde o registro aparece
               * antes do clique: a célula diz o que falta em vez de ficar em
               * branco, e casa com a tag de defeito na coluna de estado.
               *
               * RUT vazio é ausência LEGÍTIMA (fora de `missingRequiredFields`
               * — aluno estrangeiro), então segue travessão. A assimetria é o
               * contrato do backend, não estética. */
              title={ausente(c.snapshot.aluno.name) ? t('certificate.snapshotMissingField') : c.snapshot.aluno.name}
              description={ausente(c.snapshot.aluno.rut) ? '—' : c.snapshot.aluno.rut}
              image={c.aluno_photo_url}
            />
```

O comentário longo que já existia acima do `IdentityCell` (foto viva × snapshot, spec D4) **fica**,
acima deste bloco.

- [ ] **Step 5: rodar até passar**

```bash
cd frontend && pnpm test src/features/certification/components/Historial/HistorialTable.test.tsx
```

Esperado: **PASS** nos 3 casos.

- [ ] **Step 6: paridade e suíte**

```bash
cd frontend && pnpm test src/shared/config/locales/ && pnpm test
```

Esperado: **PASS**.

- [ ] **Step 7: commit**

```bash
git add frontend/src/features/certification/components/Historial/HistorialTable.tsx frontend/src/features/certification/components/Historial/HistorialTable.test.tsx frontend/src/shared/config/locales/
git commit -m "fix(certificados): a linha do snapshot corrompido diz o campo que falta (D-06)"
```

---

## Task 4: D-05 (1/3) — `screenDetail` e a marca `localDetail`

**Files:**
- Create: `frontend/src/shared/lib/screenDetail.ts`
- Create: `frontend/src/shared/lib/screenDetail.test.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Modify: `frontend/src/shared/api/axios.ts`
- Modify: `frontend/src/shared/api/problemFromBlob.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `export interface ScreenDetailSource { detail?: string | null; localDetail?: true }`
  - `export function screenDetail(problem: ScreenDetailSource | null | undefined): string | undefined`
  - `ProblemDetails` ganha `localDetail?: true`.

**Por que `shared/lib` e não `shared/api`:** `shared/ui/AppDataTable/AppDataTable.tsx:16-18`
**documenta** que o tipo do `error` dele é estruturalmente compatível com `ProblemDetails` *sem
importar de `shared/api`*. Pôr a política em `shared/api` obrigaria o `AppDataTable` a quebrar essa
fronteira ou a duplicar o predicado inline — que é a divergência que o `useLoadState` foi extraído
para impedir. `shared/ui` → `shared/lib` já é padrão (9 sítios).

- [ ] **Step 1: escrever o teste que falha**

Criar `frontend/src/shared/lib/screenDetail.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { screenDetail } from './screenDetail'

describe('screenDetail', () => {
  it('envelope do SERVIDOR: não vai à tela', () => {
    // O backend não localiza o envelope RFC 7807: `ProblemDetails.php` devolve
    // português literal e `CorruptedSnapshotException` devolve es-CL fixo. Até
    // isso virar bloco de backend, o corpo visível é dica do i18n do front.
    expect(screenDetail({ detail: 'Ocorreu um erro inesperado. Tente novamente.' })).toBeUndefined()
  })

  it('envelope do FRONT: vai à tela, porque já é i18n', () => {
    expect(
      screenDetail({ detail: 'No se pudo procesar la respuesta del servidor.', localDetail: true }),
    ).toBe('No se pudo procesar la respuesta del servidor.')
  })

  it('sem problema nenhum: undefined, para o `?? hint` do chamador assumir', () => {
    expect(screenDetail(null)).toBeUndefined()
    expect(screenDetail(undefined)).toBeUndefined()
  })

  it('marcado mas sem detail: undefined, nunca string vazia', () => {
    // `''` é falsy mas NÃO é `undefined`: devolvido cru, o `?? hint` do chamador
    // não dispara e a tela mostra erro sem texto.
    expect(screenDetail({ detail: '', localDetail: true })).toBeUndefined()
    expect(screenDetail({ detail: null, localDetail: true })).toBeUndefined()
  })
})
```

- [ ] **Step 2: rodar para ver falhar**

```bash
cd frontend && pnpm test src/shared/lib/screenDetail.test.ts
```

Esperado: **FAIL** — `Failed to resolve import "./screenDetail"`.

- [ ] **Step 3: escrever a implementação**

Criar `frontend/src/shared/lib/screenDetail.ts`:

```ts
/**
 * O `detail` que pode ir à tela — e só vai o que o FRONT escreveu.
 *
 * O `detail` do servidor não é apresentável hoje, e isso é medido, não suposto:
 * `backend/app/Shared/Exceptions/ProblemDetails.php` devolve `title` e `detail`
 * genéricos LITERAIS em português ("Erro interno", "Ocorreu um erro
 * inesperado."), apesar de o `SetLocale` já traduzir por `Accept-Language`.
 * Num 500 o cliente chileno lia português. Localizar o envelope é débito de
 * backend registrado no `backlog.md`; até lá, o corpo visível é dica do i18n.
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
}

export function screenDetail(problem: ScreenDetailSource | null | undefined): string | undefined {
  if (!problem?.localDetail) return undefined

  // `''` devolvido cru não dispara o `?? hint` do chamador, e a tela mostraria
  // um erro sem texto. Erro nunca é só cor nem só ícone (peso legal).
  return problem.detail?.trim() ? problem.detail : undefined
}
```

- [ ] **Step 4: exportar no barrel**

Em `frontend/src/shared/lib/index.ts`, seguindo o estilo do arquivo (`export *` para módulo que
exporta valor; `export type` só para módulo type-only, como `dialogMode`). Acrescentar junto dos
outros `export *`:

```ts
export * from './screenDetail'
```

O arquivo hoje é:

```ts
export * from './datetime'
export * from './enrollmentStatus'
export * from './redatorStatus'
export * from './roles'
export * from './name'
export * from './uf'
export * from './upload'
export { CHILE_REGIONS } from './chileRegions'
export type { DialogMode } from './dialogMode'
```

- [ ] **Step 5: rodar até passar**

```bash
cd frontend && pnpm test src/shared/lib/screenDetail.test.ts
```

Esperado: **PASS** nos 4 casos.

- [ ] **Step 6: marcar os 3 envelopes sintetizados pelo front**

Em `frontend/src/shared/api/axios.ts`, no tipo:

```ts
export interface ProblemDetails {
    type: string
    title: string
    status: number
    detail: string
    instance: string
    errors?: Record<string, string[]>
    /** Envelope montado pelo FRONT, não pelo servidor: o `detail` dele já é
     * i18n e pode ir à tela. Sem a marca, `screenDetail` (shared/lib) o
     * silencia junto com os do backend, que não são localizados. */
    localDetail?: true
}
```

No ramo de rede caída (`if(!error.response)`), acrescentar a marca ao objeto rejeitado:

```ts
            return Promise.reject({
                type: "https://lotus.cl/errors/network",
                title: i18n.t('common.networkError'),
                status: 0,
                detail: i18n.t('common.networkErrorHint'),
                instance: '',
                localDetail: true,
            } satisfies ProblemDetails);
```

No fallback de corpo não-objeto:

```ts
        const normalized: ProblemDetails = envelope ?? {
            type: 'https://lotus.cl/errors/unknown',
            title: i18n.t('common.unexpectedError'),
            status: error.response.status,
            detail: i18n.t('common.unexpectedErrorHint'),
            instance: '',
            localDetail: true,
        };
```

Em `frontend/src/shared/api/problemFromBlob.ts`, no fallback de corpo não-JSON:

```ts
      return {
        type: 'https://lotus.cl/errors/unknown',
        title: i18n.t('common.unexpectedError'),
        status: 0,
        detail: i18n.t('common.unexpectedErrorHint'),
        instance: '',
        localDetail: true,
      }
```

- [ ] **Step 7: rodar os testes do axios**

```bash
cd frontend && pnpm test src/shared/api/
```

Esperado: **PASS**. `axios.test.ts` afirma `detail` e `title` dos envelopes sintetizados; acrescentar
um campo não os quebra. Se algum caso usar `toEqual` sobre o objeto inteiro, **acrescentar
`localDetail: true` ao literal esperado** — a marca é comportamento novo e deve estar no teste.

- [ ] **Step 8: type-check**

```bash
cd frontend && pnpm build
```

Esperado: **PASS**. `satisfies ProblemDetails` reprovaria a marca se o campo não tivesse entrado no
tipo.

- [ ] **Step 9: commit**

```bash
git add frontend/src/shared/lib/screenDetail.ts frontend/src/shared/lib/screenDetail.test.ts frontend/src/shared/lib/index.ts frontend/src/shared/api/axios.ts frontend/src/shared/api/problemFromBlob.ts frontend/src/shared/api/axios.test.ts
git commit -m "feat(erro): screenDetail e a marca localDetail nos envelopes do front (D-05)"
```

---

## Task 5: D-05 (2/3) — a política nos três produtores

**Files:**
- Modify: `frontend/src/shared/hooks/useLoadState.ts:25`
- Modify: `frontend/src/shared/hooks/useResourceState.ts:22`
- Modify: `frontend/src/app/pages/Dashboard/useDashboard.ts:177`
- Test: `frontend/src/shared/hooks/useResourceState.test.ts` (existente, ganha casos)
- Create: `frontend/src/shared/hooks/useLoadState.test.ts`

**Interfaces:**
- Consumes: `screenDetail` da Task 4.
- Produces: `useLoadState(...).errorDetail`, `useResourceState(...).errorDetail` e
  `useDashboard(...).staleError` passam a valer **só** para `detail` de autoria do front.
  `errorDetail` continua `string | undefined`; `staleError` continua `string | null`.

**O que esta task compra sem editar nada:** as 12 telas que escrevem
`x.errorDetail ?? t('common.loadErrorHint')` ou consomem `staleError` **não mudam uma linha** — o
fallback que elas já têm vira o mecanismo. São: `ProfilePage:39` e `:50`, `CourseStep:52` e `:79`,
`CourseRedatoresSection:31`, `RedatorCourseSelector:42`, `QuotesList:40`, `BudgetDialog:82`,
`StudentClientField:61`, `DashboardPage:89`, `PeriodFilter:71`, `AdminView:62`.

- [ ] **Step 1: escrever o teste que falha para `useLoadState`**

Criar `frontend/src/shared/hooks/useLoadState.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useLoadState } from './useLoadState'

type Item = { id: number }

/** O hook não chama hook nenhum: é derivação pura sobre o resultado da query.
 * `renderHook` está aqui só para não violar `react-hooks/rules-of-hooks` — o
 * mesmo arranjo do `useResourceState.test.ts`. */
function query(
  over: Partial<Omit<UseQueryResult<Item[], ProblemDetails>, 'error'>> & {
    error?: ProblemDetails | null
  },
) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: () => Promise.resolve(),
    ...over,
  } as unknown as UseQueryResult<Item[], ProblemDetails>
}

const DO_SERVIDOR = { detail: 'Ocorreu um erro inesperado. Tente novamente.' } as ProblemDetails
const DO_FRONT = { detail: 'Revisa tu conexión.', localDetail: true } as ProblemDetails

describe('useLoadState — o detail que pode ir à tela', () => {
  it('detail do SERVIDOR não sai do hook', () => {
    const { result } = renderHook(() => useLoadState(query({ isError: true, error: DO_SERVIDOR })))

    expect(result.current.errorDetail).toBeUndefined()
    // `loadError` continua carregando o envelope INTEIRO: quem precisa do
    // objeto (o `AppDataTable`) segue recebendo, e a política é de quem imprime.
    expect(result.current.loadError).toBe(DO_SERVIDOR)
  })

  it('detail do FRONT sai, porque já é i18n', () => {
    const { result } = renderHook(() => useLoadState(query({ isError: true, error: DO_FRONT })))

    expect(result.current.errorDetail).toBe('Revisa tu conexión.')
  })

  it('sem erro: undefined', () => {
    const { result } = renderHook(() => useLoadState(query({ isSuccess: true, data: [] })))

    expect(result.current.errorDetail).toBeUndefined()
  })
})
```

- [ ] **Step 2: rodar para ver falhar**

```bash
cd frontend && pnpm test src/shared/hooks/useLoadState.test.ts
```

Esperado: **FAIL** no 1º caso — `errorDetail` devolve `'Ocorreu um erro inesperado. Tente
novamente.'` em vez de `undefined`.

- [ ] **Step 3: acrescentar os mesmos dois casos ao teste do `useResourceState`**

Em `frontend/src/shared/hooks/useResourceState.test.ts`, acrescentar ao `describe` existente:

```ts
  it('detail do SERVIDOR não sai do hook, mas o envelope continua em loadError', () => {
    const DO_SERVIDOR = { detail: 'Erro interno' } as ProblemDetails

    const { result } = renderHook(() =>
      useResourceState(query({ isError: true, error: DO_SERVIDOR })),
    )

    expect(result.current.errorDetail).toBeUndefined()
    expect(result.current.loadError).toBe(DO_SERVIDOR)
  })

  it('detail do FRONT sai, porque já é i18n', () => {
    const DO_FRONT = { detail: 'Revisa tu conexión.', localDetail: true } as ProblemDetails

    const { result } = renderHook(() => useResourceState(query({ isError: true, error: DO_FRONT })))

    expect(result.current.errorDetail).toBe('Revisa tu conexión.')
  })
```

**Atenção:** o caso existente `'falhou sem nada em cache…'` afirma `errorDetail` = `'boom'` sobre
`const BOOM = { detail: 'boom' } as ProblemDetails`, que é envelope **de servidor**. Ele passa a
falhar, e a correção é marcar o `BOOM` como do front — não relaxar a asserção:

```ts
const BOOM = { detail: 'boom', localDetail: true } as ProblemDetails
```

- [ ] **Step 4: implementar nos três produtores**

`frontend/src/shared/hooks/useLoadState.ts` — trocar a linha 25 e o import:

```ts
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { screenDetail } from '@shared/lib'
```

```ts
    /** O `detail` que pode ir à TELA, não o do envelope. O do servidor não é
     * localizado (`ProblemDetails.php` devolve português literal), então
     * `screenDetail` o silencia e o `?? t('common.loadErrorHint')` que os
     * consumidores já escrevem assume. Quem precisa do envelope inteiro usa
     * `loadError` — a política é de quem IMPRIME. */
    errorDetail: screenDetail(query.error),
```

`frontend/src/shared/hooks/useResourceState.ts` — mesmo import e mesma troca na linha 22, com o
mesmo comentário.

`frontend/src/app/pages/Dashboard/useDashboard.ts` — na linha 177:

```ts
  // `?? null` e não `?? undefined`: o tipo declarado em `:51,58` é
  // `string | null`, e a linha só existe quando `isError`.
  const staleError = query.isError ? (screenDetail(query.error) ?? null) : null
```

com `import { screenDetail } from '@shared/lib'` no topo.

- [ ] **Step 5: rodar até passar**

```bash
cd frontend && pnpm test src/shared/hooks/ src/app/pages/Dashboard/
```

Esperado: **PASS**. Se `useDashboard.test.tsx` afirmar `staleError` com texto de envelope de
servidor, marcar o envelope do teste com `localDetail: true` — a intenção do caso é "a falha avisa
ao lado", não "o texto do servidor aparece".

- [ ] **Step 6: suíte inteira e type-check**

```bash
cd frontend && pnpm test && pnpm build
```

Esperado: **PASS** nos dois.

- [ ] **Step 7: commit**

```bash
git add frontend/src/shared/hooks/useLoadState.ts frontend/src/shared/hooks/useLoadState.test.ts frontend/src/shared/hooks/useResourceState.ts frontend/src/shared/hooks/useResourceState.test.ts frontend/src/app/pages/Dashboard/useDashboard.ts frontend/src/app/pages/Dashboard/useDashboard.test.tsx
git commit -m "fix(erro): a politica do detail mora nos 3 produtores de estado de carga (D-05)"
```

---

## Task 6: D-05 (3/3) — as 12 telas que leem o envelope cru

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:16-18,85`
- Modify: `frontend/src/app/pages/Dashboard/DashboardPage.tsx:57`
- Modify: `frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx:27`
- Modify: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx:21`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx:58`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx:20`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx:43`
- Modify: `frontend/src/features/identity/components/Student/StudentDetailSections.tsx:39`
- Modify: `frontend/src/features/certification/components/Emission/EmissionPanel.tsx:20`
- Modify: `frontend/src/features/certification/components/Emission/IssuedDialog.tsx:64`
- Modify: `frontend/src/features/certification/components/Historial/ReissueDialog.tsx:48`
- Modify: `frontend/src/features/certification/components/Validation/ValidationPage.tsx:102`
- Modify: `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx:57` (**só comentário**)
- Test: `frontend/src/features/certification/components/Validation/ValidationPage.test.tsx` (existente, ganha caso)

**Interfaces:**
- Consumes: `screenDetail` e `ScreenDetailSource` da Task 4.
- Produces: nada que outra task use.

- [ ] **Step 1: escrever o teste que falha, na tela pública**

Em `frontend/src/features/certification/components/Validation/ValidationPage.test.tsx`, acrescentar:

```tsx
  it('500 de snapshot corrompido: a tela PUBLICA nao imprime os campos do documento', () => {
    // A rota do QR é pública: quem escaneou não é o suporte. Hoje ela imprime
    // `El certificado LOT-2026-1001 no puede presentarse: su documento
    // congelado no tiene los campos aluno.name, curso.name.` — mensagem escrita
    // em es-CL fixo para o OPERADOR ler no CertificateViewDialog (D8), não para
    // um terceiro. Aqui vale a dica genérica, no idioma da sessão.
    const problema = {
      type: 'https://lotus.cl/errors/server',
      title: 'Erro interno',
      status: 500,
      detail:
        'El certificado LOT-2026-1001 no puede presentarse: su documento congelado no tiene los campos aluno.name, curso.name.',
      instance: '/api/validate/LOT-2026-1001',
    }

    renderizarComErro(problema)

    expect(screen.queryByText(/aluno\.name/)).toBeNull()
    expect(screen.getByText('common.loadErrorHint')).toBeTruthy()
  })
```

**Adaptar `renderizarComErro` ao helper que o arquivo já usa** para forjar o ramo de falha (o
arquivo mocka `useValidationPage`; usar o mesmo caminho, colocando o objeto acima em `state.error`).

- [ ] **Step 2: rodar para ver falhar**

```bash
cd frontend && pnpm test src/features/certification/components/Validation/ValidationPage.test.tsx
```

Esperado: **FAIL** — `aluno.name` está na tela.

- [ ] **Step 3: mudar o `AppDataTable`, que serve todas as tabelas de uma vez**

Em `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`, no topo:

```tsx
import { screenDetail, type ScreenDetailSource } from '@shared/lib'
```

O tipo da prop (linhas 16-18):

```tsx
  /** Problema que impediu o carregamento. Truthy => o corpo vira
   * `AppErrorState` (spec D16). `ScreenDetailSource` vem de `shared/lib`, não de
   * `shared/api`: a fronteira registrada aqui — não importar do cliente HTTP —
   * continua de pé, e a política de qual `detail` pode ir à tela deixa de ser
   * duplicada inline. `ProblemDetails` satisfaz a interface. */
  error?: ScreenDetailSource | null
```

E o corpo (linha 85):

```tsx
      detail={screenDetail(error) ?? t('common.loadErrorHint')}
```

- [ ] **Step 4: mudar as outras 11 telas**

Em cada arquivo: acrescentar `import { screenDetail } from '@shared/lib'` (ou juntar ao import de
`@shared/lib` que já exista) e trocar a expressão do `detail`.

```tsx
// DashboardPage.tsx:57
detail={screenDetail(state.error) ?? t('common.loadErrorHint')}

// PendingQuotesPanel.tsx:27
detail={screenDetail(error) ?? t('common.loadErrorHint')}

// RedatorDesignation.tsx:21
detail={screenDetail(picker.loadError) ?? t('common.loadErrorHint')}

// TurmaDetailPage.tsx:58   (arquivo usa aspas duplas)
detail={screenDetail(d.loadError) ?? t("common.loadErrorHint")}

// TurmaDocuments.tsx:20
detail={screenDetail(s.loadError) ?? t('common.loadErrorHint')}

// BudgetDetailPage.tsx:43
detail={screenDetail(d.loadError) ?? t('common.loadErrorHint')}

// StudentDetailSections.tsx:39   (arquivo usa aspas duplas)
detail={screenDetail(detail.error) ?? t("common.loadErrorHint")}

// EmissionPanel.tsx:20
detail={screenDetail(s.loadError) ?? t('common.loadErrorHint')}

// IssuedDialog.tsx:64
detail={screenDetail(error) ?? t('common.loadErrorHint')}

// ReissueDialog.tsx:48
detail={screenDetail(panelError) ?? t('common.loadErrorHint')}

// ValidationPage.tsx:102
detail={screenDetail(state.error) ?? t('common.loadErrorHint')}
```

- [ ] **Step 5: comentar a exceção no `CertificateViewDialog`, sem mudar o código**

Em `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx`, acima do
`<AppErrorState`, **mantendo `detail={error.detail ?? t('common.loadErrorHint')}` como está**:

```tsx
        {/* A UNICA tela que imprime o `detail` CRU do servidor, e é deliberado:
            `CorruptedSnapshotException` implementa `PublicDetail` justamente
            para o suporte descobrir aqui QUAIS campos do snapshot faltam (D8 da
            spec de certificação). Todas as outras passam por `screenDetail`
            (shared/lib) porque o envelope do backend não é localizado; esta
            não passa, e trocá-la por `screenDetail` desfaz a D8.
            A rota pública do QR (`ValidationPage`) NÃO é exceção: lá quem lê
            não é o suporte. */}
        <AppErrorState
          title={t('common.loadError')}
          detail={error.detail ?? t('common.loadErrorHint')}
```

- [ ] **Step 6: provar que a exceção é exceção**

Acrescentar ao teste da tela pública (mesmo arquivo do Step 1) **ou** criar um caso equivalente para
o `CertificateViewDialog`, provando o outro lado:

```tsx
// no arquivo de teste do CertificateViewDialog, ou criando-o com o mesmo
// arranjo de mock do HistorialTable.test.tsx (vi.mock do hook da feature):
  it('a excecao D8: o dialogo do suporte IMPRIME os campos que faltam', () => {
    // Sem este caso, trocar a linha por `screenDetail` passaria verde e a D8
    // morreria em silencio -- o suporte perderia o unico lugar onde descobre
    // QUAL campo do snapshot esta vazio.
    renderizarComErro({
      type: 'https://lotus.cl/errors/server',
      title: 'Erro interno',
      status: 500,
      detail: 'El certificado LOT-2026-1001 no puede presentarse: ... aluno.name, curso.name.',
      instance: '/api/certificates/1',
    })

    expect(screen.getByText(/aluno\.name/)).toBeTruthy()
  })
```

- [ ] **Step 7: rodar até passar**

```bash
cd frontend && pnpm test src/features/certification/
```

Esperado: **PASS**, com o caso da `ValidationPage` (sem `aluno.name`) e o do `CertificateViewDialog`
(com `aluno.name`) verdes ao mesmo tempo. Os dois juntos são a prova de que a exceção é uma só.

- [ ] **Step 8: suíte, lint e type-check**

```bash
cd frontend && pnpm test && pnpm lint && pnpm build
```

Esperado: **PASS** nos três. Testes existentes que afirmem texto de `detail` de servidor na tela
(ex.: `CourseStep.test.tsx` afirma `'Sin conexión'`) passam a falhar — a correção é marcar o
envelope do teste com `localDetail: true`, porque a intenção do caso é "a falha explica", não "o
texto do servidor aparece". **Não relaxar a asserção.**

- [ ] **Step 9: commit**

```bash
git add frontend/src/shared/ui/AppDataTable/AppDataTable.tsx frontend/src/app/pages/Dashboard/DashboardPage.tsx frontend/src/features/
git commit -m "fix(erro): so vai a tela o detail que o front escreveu, com a D8 como unica excecao (D-05)"
```

---

## Task 7: D-04 (1/2) — `useCrudPage` aceita opções de query

**Files:**
- Modify: `frontend/src/shared/hooks/useCrudPage.ts:7-19,34-35`
- Test: `frontend/src/shared/hooks/useCrudPage.test.ts` (existente, ganha caso)

**Interfaces:**
- Consumes: nada.
- Produces: `useCrudPage<T>(resource: ListableResource<T>, options?: CrudPageQueryOptions)`.
  `CrudPageQueryOptions = { staleTime?: number }`. O retorno **não muda**.

**Contexto:** `createCrudResource.useList` já aceita `Partial<UseQueryOptions<T[], ProblemDetails>>`
(`shared/api/createCrudResource.ts:17-19`). O que falta é o `useCrudPage` repassar. O tipo das opções
fica **estreito de propósito** — só `staleTime` — para o hook não virar porta aberta: quem precisar
de `enabled` ou `select` está usando o recurso direto, não a página.

- [ ] **Step 1: escrever o teste que falha**

Acrescentar em `frontend/src/shared/hooks/useCrudPage.test.ts`:

```ts
  it('repassa as opcoes de query ao useList do recurso', () => {
    // Sem isto a pagina nao tem como pedir `staleTime`, e a aba desmontada
    // pelo `renderActiveOnly` refaz o GET a cada volta (staleTime default 0
    // com refetchOnMount ligado, medido em AppProviders.tsx:6-10).
    const recebido: Array<Record<string, unknown> | undefined> = []
    const resource = {
      useList: (options?: Record<string, unknown>) => {
        recebido.push(options)
        return {
          data: [] as { id?: number }[],
          isLoading: false,
          isError: false,
          error: null,
          refetch: () => Promise.resolve(),
        }
      },
    }

    renderHook(() => useCrudPage(resource, { staleTime: 30_000 }))

    expect(recebido[0]).toEqual({ staleTime: 30_000 })
  })

  it('sem opcoes, chama o useList sem argumento nenhum', () => {
    const recebido: Array<Record<string, unknown> | undefined> = []
    const resource = {
      useList: (options?: Record<string, unknown>) => {
        recebido.push(options)
        return {
          data: [] as { id?: number }[],
          isLoading: false,
          isError: false,
          error: null,
          refetch: () => Promise.resolve(),
        }
      },
    }

    renderHook(() => useCrudPage(resource))

    expect(recebido[0]).toBeUndefined()
  })
```

**Ajustar os literais** ao arranjo que o arquivo já usa para forjar o `ListableResource` — reaproveitar
o helper existente em vez de duplicar, se houver.

- [ ] **Step 2: rodar para ver falhar**

```bash
cd frontend && pnpm test src/shared/hooks/useCrudPage.test.ts
```

Esperado: **FAIL** no 1º caso — `recebido[0]` é `undefined`, porque `useCrudPage` chama
`resource.useList()` sem argumento.

- [ ] **Step 3: implementar**

Em `frontend/src/shared/hooks/useCrudPage.ts`, no contrato estrutural:

```ts
/** Opções de query que a PÁGINA pode pedir. Estreito de propósito: quem precisa
 * de `enabled`, `select` ou `queryKey` está usando o recurso direto, não a
 * página, e alargar isto transformaria o hook em porta aberta para o TanStack. */
export interface CrudPageQueryOptions {
  staleTime?: number
}

interface ListableResource<T> {
  useList: (options?: CrudPageQueryOptions) => {
    data?: T[]
    isLoading: boolean
    isError: boolean
    error: ProblemDetails | null
    refetch: () => Promise<unknown>
  }
}
```

E a chamada:

```ts
export function useCrudPage<T extends { id?: number }>(
  resource: ListableResource<T>,
  options?: CrudPageQueryOptions,
) {
  const query = resource.useList(options)
```

- [ ] **Step 4: exportar o tipo no barrel**

Em `frontend/src/shared/hooks/index.ts`, junto do export existente:

```ts
export { useCrudPage } from './useCrudPage'
export type { CrudPageQueryOptions } from './useCrudPage'
```

- [ ] **Step 5: rodar até passar**

```bash
cd frontend && pnpm test src/shared/hooks/useCrudPage.test.ts && pnpm build
```

Esperado: **PASS** nos dois. O `pnpm build` prova que os ~8 consumidores de `useCrudPage` que não
passam opção continuam compilando (o parâmetro é opcional).

- [ ] **Step 6: commit**

```bash
git add frontend/src/shared/hooks/useCrudPage.ts frontend/src/shared/hooks/useCrudPage.test.ts frontend/src/shared/hooks/index.ts
git commit -m "feat(crud): useCrudPage aceita opcoes de query, repassadas ao useList (D-04)"
```

---

## Task 8: D-04 (2/2) — a `PeoplePage` vira casca de abas

**Files:**
- Create: `frontend/src/features/identity/components/Redator/RedatoresTab.tsx`
- Create: `frontend/src/features/identity/components/Student/StudentsTab.tsx`
- Create: `frontend/src/features/identity/components/PeoplePage.test.tsx`
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx` (reescrita)
- Modify: `frontend/src/features/identity/hooks/useRedatoresPage.ts`
- Modify: `frontend/src/features/identity/hooks/useStudentsPage.ts`

**Interfaces:**
- Consumes: `useCrudPage(resource, options?)` da Task 7.
- Produces: `RedatoresTab` e `StudentsTab`, ambos `() => JSX.Element`, sem props.

**Contexto medido:** `ModuleTabs = AppTabView = TabView` do PrimeReact **sem** `renderActiveOnly`,
logo vale o default `true` e só a aba ativa monta. Quem faz 2 GETs é a `PeoplePage`, que chama os
dois hooks **no corpo da página**, acima das abas, onde o `renderActiveOnly` não alcança. A
`CertificatesPage` já é o padrão certo. `AppProviders.tsx:6-10` não define `staleTime`, então vale
`0` com `refetchOnMount` ligado — por isso o `staleTime` entra junto.

- [ ] **Step 1: escrever o teste que falha**

Criar `frontend/src/features/identity/components/PeoplePage.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import { PeoplePage } from './PeoplePage'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

/** Conta no limite do AXIOS, não no do hook: é GET de verdade que a D-04 mede,
 * e contar renders do hook contaria outra coisa. */
const gets: string[] = []

beforeEach(() => {
  gets.length = 0
  vi.spyOn(api, 'get').mockImplementation((url: string) => {
    gets.push(url)
    return Promise.resolve({ data: [] }) as never
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const montar = () => {
  const qc = new QueryClient({
    // `staleTime` NÃO entra aqui: é justamente o que a página passa e o que
    // este teste mede. Fixá-lo no client provaria o client, não a página.
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <PeoplePage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const gtsDe = (recurso: string) => gets.filter((u) => u === `/api/${recurso}`).length

describe('PeoplePage — uma aba, um GET', () => {
  it('a montagem busca SO a aba ativa', async () => {
    montar()

    await waitFor(() => expect(gtsDe('redatores')).toBe(1))
    // O defeito da D-04: `useStudentsPage()` no corpo da página buscava alunos
    // com a aba de alunos fechada.
    expect(gtsDe('students')).toBe(0)
  })

  it('abrir a segunda aba busca a segunda aba, uma vez', async () => {
    montar()
    await waitFor(() => expect(gtsDe('redatores')).toBe(1))

    fireEvent.click(screen.getByRole('tab', { name: 'redator.tabStudents' }))

    await waitFor(() => expect(gtsDe('students')).toBe(1))
    expect(gtsDe('redatores')).toBe(1)
  })

  it('voltar a aba dentro da janela NAO refaz o GET', async () => {
    // Sem `staleTime` a volta refaria: default 0 com `refetchOnMount` ligado
    // (AppProviders.tsx:6-10). Alternar 3 vezes custaria 4 GETs contra os 2 de
    // hoje -- o conserto estrutural sozinho pioraria quem alterna.
    montar()
    await waitFor(() => expect(gtsDe('redatores')).toBe(1))

    fireEvent.click(screen.getByRole('tab', { name: 'redator.tabStudents' }))
    await waitFor(() => expect(gtsDe('students')).toBe(1))

    fireEvent.click(screen.getByRole('tab', { name: 'redator.tabRedatores' }))
    await waitFor(() => expect(gtsDe('students')).toBe(1))

    expect(gtsDe('redatores')).toBe(1)
  })
})
```

**Se `getByRole('tab', …)` não achar o cabeçalho**, inspecionar o DOM com
`screen.debug()` e trocar por `screen.getByText('redator.tabStudents')` — o TabView do PrimeReact
renderiza o título dentro do `<a>`. Não mudar o que o teste MEDE, só como ele acha o alvo.

- [ ] **Step 2: rodar para ver falhar**

```bash
cd frontend && pnpm test src/features/identity/components/PeoplePage.test.tsx
```

Esperado: **FAIL** no 1º caso — `gtsDe('students')` é `1`, não `0`.

- [ ] **Step 3: criar `RedatoresTab`**

Criar `frontend/src/features/identity/components/Redator/RedatoresTab.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useRedatoresPage } from '../../hooks/useRedatoresPage'
import { RedatoresTable } from './RedatoresTable'
import { RedatorDialog } from './RedatorDialog'

/**
 * A aba de redatores, dona do PRÓPRIO dado.
 *
 * Isto não é decomposição estética: com o hook no corpo da `PeoplePage`, acima
 * das abas, o `renderActiveOnly` do TabView (default `true`) não alcançava a
 * chamada, e abrir a tela buscava as DUAS abas (D-04). Aqui o hook vive dentro
 * do que só monta quando a aba está ativa — o mesmo desenho que a
 * `CertificatesPage` já usava.
 *
 * O deep link `?redator=` desce junto: a aba 0 é a ativa por default, então o
 * link chega com este componente montado.
 */
export function RedatoresTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const page = useRedatoresPage()

  const [params, setParams] = useSearchParams()
  const deepLinkId = params.get('redator')
  const [consumed, setConsumed] = useState<string | null>(null)

  // Abrir o diálogo é mudança de estado: vai no corpo do render (o padrão da
  // casa), nunca num useEffect — `react-hooks/set-state-in-effect` proíbe.
  if (deepLinkId !== null && deepLinkId !== consumed) {
    setConsumed(deepLinkId)
    const id = Number(deepLinkId)
    if (Number.isInteger(id) && id > 0) page.openViewById(id)
  }

  // Limpar a URL é efeito colateral de navegação, não setState: aqui o effect é
  // o lugar certo. `replace` para o botão Voltar não reabrir o diálogo.
  useEffect(() => {
    if (deepLinkId === null) return
    const next = new URLSearchParams(params)
    next.delete('redator')
    setParams(next, { replace: true })
  }, [deepLinkId, params, setParams])

  return (
    <>
      <RedatoresTable
        redatores={page.items}
        loading={page.loading}
        error={page.error}
        onRetry={page.refetch}
        onView={page.openView}
        actions={
          can('identity.user.create')
            ? <AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
            : undefined
        }
      />

      {/* Em `view` sem entidade (deep link enquanto o GET não voltou, ou id
          inexistente) não há o que mostrar: um diálogo de campos vazios é pior
          que nenhum. `create` não tem entidade por definição. */}
      {page.dialog && (page.dialog.mode === 'create' || page.dialog.entity) && (
        <RedatorDialog
          visible
          mode={page.dialog.mode}
          redator={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: criar `StudentsTab`**

Criar `frontend/src/features/identity/components/Student/StudentsTab.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useStudentsPage } from '../../hooks/useStudentsPage'
import { StudentsTable } from './StudentsTable'
import { StudentDialog } from './StudentDialog'

/**
 * A aba de alunos, dona do próprio dado — mesma razão da `RedatoresTab`: com o
 * hook no corpo da `PeoplePage`, abrir a tela buscava esta lista com a aba
 * fechada (D-04). Sem deep link: só a aba de redatores tem um.
 */
export function StudentsTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const students = useStudentsPage()

  return (
    <>
      <StudentsTable
        students={students.items}
        loading={students.loading}
        error={students.error}
        onRetry={students.refetch}
        onView={students.openView}
        actions={
          can('identity.user.create')
            ? <AppButton variant="brandIcon" label={t('student.new')} icon="pi pi-user-plus" onClick={students.openCreate} />
            : undefined
        }
      />

      {students.dialog && (
        <StudentDialog
          visible
          mode={students.dialog.mode}
          student={students.dialog.entity}
          onHide={students.close}
          onEdit={can('identity.user.update') ? students.startEdit : undefined}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: reescrever a `PeoplePage`**

Substituir `frontend/src/features/identity/components/PeoplePage.tsx` inteiro por:

```tsx
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppCard } from '@shared/ui'
import { RedatoresTab } from './Redator/RedatoresTab'
import { StudentsTab } from './Student/StudentsTab'

/**
 * Casca de abas: cabeçalho, cartão e as duas abas. **Nenhum hook de dado.**
 *
 * O dado desceu para `RedatoresTab`/`StudentsTab` na D-04: chamado aqui, acima
 * das abas, ele ficava fora do alcance do `renderActiveOnly` do TabView e a
 * tela buscava as duas listas na montagem. Mesmo desenho da `CertificatesPage`.
 */
export function PeoplePage() {
  const { t } = useTranslation()

  return (
    <ModulePage title={t('module.personas.title')} description={t('module.personas.description')}>
      <AppCard>
        <ModuleTabs>
          <ModuleTab header={t('redator.tabRedatores')}>
            <RedatoresTab />
          </ModuleTab>

          <ModuleTab header={t('redator.tabStudents')}>
            <StudentsTab />
          </ModuleTab>
        </ModuleTabs>
      </AppCard>
    </ModulePage>
  )
}
```

- [ ] **Step 6: `staleTime` nos dois hooks**

`frontend/src/features/identity/hooks/useRedatoresPage.ts` — acrescentar ao fim do docblock existente
e à chamada:

```ts
/** ... (docblock existente, preservado inteiro) ...
 *
 * `staleTime` de 30s: com o `renderActiveOnly` do TabView, trocar de aba
 * DESMONTA a anterior, e o default `0` do `AppProviders` com `refetchOnMount`
 * ligado faria cada volta pagar um GET novo — ida-e-volta 3× custaria 4 GETs
 * contra os 2 de antes da D-04. Trinta segundos é a janela de alternância de um
 * operador; criação e edição invalidam por `queryKey` e atravessam a janela,
 * então ela nunca segura dado que a própria sessão escreveu. */
export function useRedatoresPage() {
  return useCrudPage(redatoresApi, { staleTime: 30_000 })
}
```

Em `useStudentsPage.ts`, a mesma chamada e um comentário curto apontando para o de cima:

```ts
  // `staleTime` pelo mesmo motivo da `useRedatoresPage` (D-04): a aba desmonta
  // na troca, e sem ele a volta paga GET.
  return useCrudPage(studentsApi, { staleTime: 30_000 })
```

- [ ] **Step 7: rodar até passar**

```bash
cd frontend && pnpm test src/features/identity/components/PeoplePage.test.tsx
```

Esperado: **PASS** nos 3 casos.

- [ ] **Step 8: provar que a catraca pega a regressão**

Trocar temporariamente `useCrudPage(redatoresApi, { staleTime: 30_000 })` por
`useCrudPage(redatoresApi)` e rodar de novo.

Esperado: **FAIL** no 3º caso (`voltar a aba dentro da janela NAO refaz o GET`), com
`gtsDe('redatores')` valendo `2`. **Desfazer** e voltar ao verde. Sem este passo, o teste pode estar
passando por outro motivo.

- [ ] **Step 9: suíte, lint e type-check**

```bash
cd frontend && pnpm test && pnpm lint && pnpm build
```

Esperado: **PASS** nos três.

- [ ] **Step 10: commit**

```bash
git add frontend/src/features/identity/
git commit -m "perf(pessoas): uma aba, um GET -- a PeoplePage vira casca de abas (D-04)"
```

---

## Task 9: gate do bloco

**Files:**
- Modify: `docs/superpowers/backlog.md`
- Modify: `docs/superpowers/state.md`

**Interfaces:**
- Consumes: as Tasks 1–8.
- Produces: o bloco pronto para `/revisar-sprint`.

- [ ] **Step 1: provar que o bloco é frontend puro**

```bash
cd /home/jvbat/projetos/fix-frontend && git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: **saída vazia**. Qualquer arquivo listado quebra a fronteira do §1 da spec e dispara a
P-03 — parar e reportar, não "consertar" apagando.

- [ ] **Step 2: as três catracas**

```bash
cd frontend && pnpm test && pnpm lint && pnpm build
```

Esperado: `pnpm test` PASS, `pnpm lint` **0 problemas**, `pnpm build` PASS. Colar as três saídas no
relatório — o DoD é critério de aceite PROVADO (lei §5.8), não comando rodado.

- [ ] **Step 3: medir a contagem de GET no navegador**

```bash
cd frontend && pnpm dev
```

Abrir `http://localhost:5173/pessoas` com o devtools na aba Network, filtro `Fetch/XHR`. Medir:

1. na abertura: **1** request para `/api/redatores`, **0** para `/api/students`;
2. clicando na aba de alunos: **1** para `/api/students`;
3. voltando à aba de redatores dentro de 30s: **nenhum** request novo.

O backend do `:8080` é o do main tree e estará servindo outra branch — **isso não importa aqui**:
nenhum item deste bloco precisa de API viva, e o que se mede é a contagem, não o corpo.

- [ ] **Step 4: registrar o débito que sai deste bloco**

Em `docs/superpowers/backlog.md`, na seção de débitos sem bloco, acrescentar:

```markdown
- **D-32 · O envelope RFC 7807 não é localizado, e o front teve de calar o `detail` por causa disso.**
  `backend/app/Shared/Exceptions/ProblemDetails.php:22-36,68,71` devolve `title` e `detail` genéricos
  LITERAIS em português ("Erro interno", "Ocorreu um erro inesperado. Tente novamente.", "Erro ao
  processar a requisição."), apesar de `App\Shared\Http\Middleware\SetLocale` já traduzir por
  `Accept-Language` e de existirem `backend/lang/{en,es,es_CL,pt_BR}`. Num 500 o cliente chileno lia
  português. `CorruptedSnapshotException::missingFields()` é es-CL fixo pelo mesmo motivo — ali é
  deliberado (D8), mas continuaria fixo se a sessão fosse pt-BR ou en. **Medido em 2026-08-18, no
  BD-13.** O `title` nunca chegou à tela (o front usa `t('common.loadError')`), e a D-05 do BD-13
  acabou de calar o `detail` nos estados de carga — então o custo hoje é o
  `CertificateViewDialog`, que imprime o `detail` cru por desenho, e qualquer consumidor futuro da
  API. **A correção é `__()` com chaves nas 4 `lang/`**; entra em bloco de backend, onde o custo da
  P-03 já esteja pago. Frente: backend.
```

Confirmar que `D-32` não colide com um ID existente antes de usar o número:

```bash
grep -n 'D-32' docs/superpowers/backlog.md
```

Esperado: **nenhuma linha** antes da inserção. Se colidir, usar o próximo livre e anotar qual.

- [ ] **Step 5: transicionar o estado**

Em `docs/superpowers/state.md`, no frontmatter:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
```

e atualizar `updated_at`.

**Antes do `git push`, LER o frontmatter.** Duas branches escrevendo `state.md` produzem frontmatter
auto-mesclado que ninguém escreveu, fica verde e não deixa marcador de conflito — é o que o PR #57
cobrou.

- [ ] **Step 6: commit do gate**

```bash
git add docs/superpowers/backlog.md docs/superpowers/state.md
git commit -m "docs(state): bd13 executado, estado em ready_for_review"
```

---

## Handoff de execução

**executor: claude**

**Critério aplicado, não default.** O `codex` cabe em task mecânica, com verificação executável e
paths fechados. Seis das nove tasks não satisfazem isso:

- **Tasks 4, 5, 6** desenham contrato em `shared/` — onde `screenDetail` mora (fronteira registrada
  do `AppDataTable`), o que `errorDetail` passa a significar, e qual é a única exceção da D8. A Task
  6 ainda exige julgamento por arquivo: testes existentes vão falhar, e a correção certa é **marcar
  o envelope do teste**, não relaxar a asserção — decisão que o plano orienta mas não pode fechar.
- **Tasks 7 e 8** mexem em fronteira FSD (lei §5.6) e no desenho da página; a Task 8 tem um passo que
  **pode não achar o alvo** (`getByRole('tab')` no TabView do PrimeReact) e manda ajustar como acha
  sem mudar o que mede.
- **Task 9** é gate, com decisão de ID no backlog e frontmatter de `state.md` sob risco de merge.

**Tasks 1 e 2 são mecânicas** e caberiam no `codex`. Não vão: são 2 de 9, e o custo de coordenar dois
executores no mesmo bloco é maior que o que elas economizam.

**paths_autorizados:** N/A (executor `claude`).

**Área de trabalho:** worktree `fix-frontend`, branch `feat/bd13-listagens-e-abas`, a partir de
`main@b758068`. **P-03 não dispara** — o bloco é frontend puro e continua havendo um único
`active_work_item` de backend. `backend/config/cors.php` (WIP do João, o outro lado da P-45) fica no
main tree e **fora de todo `git add`**.

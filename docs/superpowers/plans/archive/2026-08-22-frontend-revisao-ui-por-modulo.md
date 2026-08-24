# Revisão de UI por módulo — Implementation Plan (item 16, fatia 1 de 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** passar três superfícies ainda não revisadas — Dashboard view `ready-redator`, Operação e
Comercial — pela rubrica de `/lotus-ui-review`, fechar no bloco todo achado `C`, e pagar a D-39.

**Architecture:** serial por superfície — run, triagem com o João, correção medida na tela, próxima
run. Achado de wrapper corrige-se no wrapper (`shared/ui`), nunca no call-site: 6 dos 8 achados da
passada de 2026-08-22 eram de wrapper, e corrigir antes da run seguinte impede o mesmo defeito
ocupar três relatórios.

**Tech Stack:** React 19 + TS (Vite) · PrimeReact via `shared/ui` · Tailwind v4 · i18next (3 locales)
· Vitest + Testing Library (jsdom) · Playwright CLI (headed chromium) para as runs.

**Spec:** `docs/superpowers/specs/archive/2026-08-22-frontend-revisao-ui-por-modulo-design.md`

## Global Constraints

- **Frontend puro.** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` deve
  devolver **vazio** no fim. Medido vazio na abertura. Pint e `typescript:transform` ficam N/A **por
  escopo medido**, nunca por omissão.
- **Lei §5.6:** feature não importa PrimeReact direto (só via `shared/ui`) nem outra feature — nem
  para tipo. Customização de componente Prime mora no wrapper.
- **Lei §5.3:** `generated.ts` não se edita à mão.
- **i18n:** chave nova entra nas **três** locales (`pt-BR`, `es-CL`, `en`) com a mesma grafia.
- **Rubrica manda:** `references/review-rubric.md` classifica. A lente `frontend-design` é
  complementar e, em conflito com uma rule de `.claude/rules/`, **a rule vence e o conflito é
  avisado ao João** — não se resolve em silêncio.
- **Fora do bloco:** acessibilidade, foco e overflow (item 8); redesenho de tela (item 9);
  Certificados, Cursos, Pessoas, Administração e o wizard `/operacion/turmas/nueva` (bloco irmão).
- **Baseline de teste medida na branch em 2026-08-22:** `pnpm test` = **87 arquivos / 481 testes**
  verdes. Todo gate compara contra ela.
- **Árvore:** worktree `fix-frontend`, branch `refactor/frontend-revisao-ui`. Docs de
  `docs/superpowers/**` escritos aqui **por exceção declarada** na abertura (spec, §Exceções).
- **Um commit por correção.** Correção provada na tela, não no diff.

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `frontend/src/shared/testing/i18n.ts` (criar) | fábrica do mock de `useTranslation` com a forma real da API | 1 |
| `frontend/src/shared/testing/i18n.test.tsx` (criar) | catraca: `AppDropdown` sob a fábrica; morde se a forma regredir | 1 |
| os 17 `*.test.tsx` que mockam `react-i18next` (modificar) | passam a consumir a fábrica | 2 |
| `.claude/rules/frontend-fsliced.md` (modificar) | registra a pasta nova `shared/testing/` | 2 |
| `docs/superpowers/audits/2026-08-22-lotus-ui-review-dashboard-redator.md` (criar) | relatório da run 1 | 4 |
| `docs/superpowers/audits/AAAA-MM-DD-lotus-ui-review-operacion.md` (criar) | relatório da run 2 | 7 |
| `docs/superpowers/audits/AAAA-MM-DD-lotus-ui-review-comercial.md` (criar) | relatório da run 3 | 10 |
| `docs/superpowers/backlog.md` (modificar) | ficha `D-38` decidida; fichas `D-*` nascidas dos `B` | 12 |
| `frontend/src/shared/ui/**` (modificar, imprevisível) | correções de wrapper dos achados `C` | 6, 9, 11 |

Os arquivos de correção não são enumeráveis antes das runs — é o que a run descobre. O **protocolo**
de cada correção está fixado na Task 6 e vale para as tasks 9 e 11.

---

### Task 1: a fábrica do mock de `useTranslation`, com a catraca vista morder

**Files:**
- Create: `frontend/src/shared/testing/i18n.ts`
- Create: `frontend/src/shared/testing/i18n.test.tsx`

**Interfaces:**
- Consumes: `AppDropdown` de `@shared/ui` (lê `i18n.language` para o `key` de remontagem).
- Produces: `mockUseTranslation(over?: { t?: TFunctionLike; language?: string }): () => UseTranslationLike`
  — usada como `useTranslation: mockUseTranslation()` dentro de `vi.mock('react-i18next', …)`.
  Tipos exportados junto: `type TFunctionLike = (key: string, opts?: Record<string, unknown>) => string`.

**Contexto que o implementador não tem:** `AppDropdown`
(`frontend/src/shared/ui/AppDropdown/AppDropdown.tsx:33-38`) faz
`const { t, i18n } = useTranslation()` e usa `key={i18n.language}` para remontar na troca de idioma
(UI-03 da revisão de 2026-08-22). Os 17 mocks do repositório devolvem só `{ t }`, então qualquer
teste que renderize um dropdown estoura. Já aconteceu em `HistorialTable.test.tsx`, corrigido no
lugar — o formato certo está lá (`i18n: { language: 'es-CL' }`) e é o molde desta fábrica.

- [ ] **Step 1: escrever a sonda que prova o defeito (temporária, mock parcial inline)**

Criar `frontend/src/shared/testing/i18n.test.tsx` com o mock **errado** de propósito:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AppDropdown } from '@shared/ui'

// SONDA TEMPORÁRIA — a forma que os 17 arquivos usam hoje. Sai no Step 3.
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('mock de useTranslation', () => {
  it('deixa o AppDropdown renderizar', () => {
    const { container } = render(
      <AppDropdown options={[{ label: 'Uno', value: 1 }]} value={null} onChange={() => {}} />,
    )
    expect(container.querySelector('.p-dropdown')).toBeTruthy()
  })
})
```

`.p-dropdown` e não `getByRole('combobox')`: é a forma que `AppDropdown.test.tsx:19` já usa para
alcançar o controle do Prime. E note por que o teste vizinho **não** quebra hoje — ele importa o
i18n real (`@shared/config/i18n`) e não mocka nada; o defeito da D-39 só aparece sob mock.

- [ ] **Step 2: rodar e ver a falha exata**

Run: `cd frontend && pnpm test src/shared/testing/i18n.test.tsx`
Expected: FAIL com `TypeError: Cannot read properties of undefined (reading 'language')`.

**Se passar, PARE.** Significa que o `AppDropdown` deixou de ler `i18n.language` e a premissa da
D-39 mudou — leve ao João antes de escrever a fábrica.

- [ ] **Step 3: trocar a sonda pela fábrica (que ainda não existe)**

No mesmo arquivo, substituir o bloco `vi.mock` por:

```tsx
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})
```

e acrescentar o segundo caso, que é o que a catraca guarda:

```tsx
  it('entrega o idioma ativo, que é o que o AppDropdown usa para remontar', async () => {
    const { mockUseTranslation } = await import('@shared/testing/i18n')
    expect(mockUseTranslation()().i18n.language).toBe('es-CL')
    expect(mockUseTranslation({ language: 'pt-BR' })().i18n.language).toBe('pt-BR')
  })
```

O `await import` dentro da factory do `vi.mock` é obrigatório: a factory é içada acima dos imports
do arquivo, então um import estático da fábrica seria `undefined` na hora da chamada.

- [ ] **Step 4: rodar e ver falhar por módulo inexistente**

Run: `cd frontend && pnpm test src/shared/testing/i18n.test.tsx`
Expected: FAIL com `Failed to load url @shared/testing/i18n`.

- [ ] **Step 5: escrever a fábrica**

Criar `frontend/src/shared/testing/i18n.ts`:

```ts
import { vi } from 'vitest'

/** Forma real de `useTranslation` para teste. Existe porque 17 arquivos
 * devolviam só `t`, e o `AppDropdown` lê `i18n.language` para remontar na troca
 * de idioma (UI-03, `ac4eef8a`): mock parcial estoura com
 * `Cannot read properties of undefined (reading 'language')`. Home única — o
 * próximo campo que a API do hook exigir se conserta aqui, não em 17 lugares.
 *
 * `t` devolve a CHAVE: o que os testes provam é qual texto a tela escolhe, não
 * a tradução dele — isso é do `parity.test.ts`. */
export type TFunctionLike = (key: string, opts?: Record<string, unknown>) => string

export function mockUseTranslation(over: { t?: TFunctionLike; language?: string } = {}) {
  const t: TFunctionLike = over.t ?? ((key: string) => key)
  const i18n = { language: over.language ?? 'es-CL', changeLanguage: vi.fn() }
  return () => ({ t, i18n, ready: true })
}
```

- [ ] **Step 6: rodar e ver passar**

Run: `cd frontend && pnpm test src/shared/testing/i18n.test.tsx`
Expected: PASS, 2 testes.

- [ ] **Step 7: ver a catraca morder de novo, agora contra a fábrica**

Apagar a linha `const i18n = …` e devolver `{ t, ready: true }` na fábrica; rodar o mesmo comando e
confirmar `Cannot read properties of undefined (reading 'language')`. Restaurar a linha e confirmar
PASS. **A catraca só vale se foi vista reprovar.**

- [ ] **Step 8: commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/testing/i18n.ts frontend/src/shared/testing/i18n.test.tsx
git commit -m "test(shared): mock de useTranslation ganha a forma real da API"
```

**DoD comportamental:** com a fábrica mutilada, o teste do `AppDropdown` reprova pelo erro exato da
ficha D-39; com ela inteira, passa.

---

### Task 2: os 17 arquivos passam a consumir a fábrica

**Files:**
- Modify (17): `src/features/operation/components/Turma/TurmaDetailPage.test.tsx`,
  `src/features/operation/components/Turma/TurmaRowActions.test.tsx`,
  `src/features/operation/components/Enrollment/EnrollmentSection.test.tsx`,
  `src/features/commercial/components/Budget/BudgetDetailPage.test.tsx`,
  `src/features/commercial/components/Budget/QuotesList.test.tsx`,
  `src/features/commercial/components/Budget/CourseStep.test.tsx`,
  `src/features/catalog/components/Course/CourseRedatoresSection.test.tsx`,
  `src/features/identity/components/PeoplePage.test.tsx`,
  `src/features/identity/components/Admin/UserRowActions.test.tsx`,
  `src/features/identity/components/Student/StudentDetailSections.test.tsx`,
  `src/features/identity/components/Redator/RedatorCourseSelector.test.tsx`,
  `src/features/identity/components/Redator/RedatorRowActions.test.tsx`,
  `src/features/identity/components/Login/AuthPanel.test.tsx`,
  `src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx`,
  `src/features/certification/components/Historial/HistorialTable.test.tsx`,
  `src/features/certification/components/Historial/CertificateViewDialog.test.tsx`,
  `src/features/certification/components/Validation/ValidationPage.test.tsx`
- Modify: `.claude/rules/frontend-fsliced.md`

**Interfaces:**
- Consumes: `mockUseTranslation` da Task 1.

- [ ] **Step 1: conferir a lista antes de tocar**

Run: `cd frontend && grep -rl "vi.mock('react-i18next'" src | sort`
Expected: 18 caminhos — os 17 acima **mais** `src/shared/testing/i18n.test.tsx`, criado na Task 1.
Se o número divergir, atualize a lista em vez de assumir a do plano.

- [ ] **Step 2: migrar os 16 de forma idêntica**

Em cada um dos 16 arquivos cujo mock é exatamente
`useTranslation: () => ({ t: (key: string) => key }),`, trocar o bloco inteiro por:

```ts
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})
```

Comentários que já existem acima do bloco (`HistorialTable.test.tsx` tem dois) ficam — eles
explicam por que `t` devolve a chave, e isso segue verdade.

- [ ] **Step 3: migrar o 17º, que tem `t` próprio**

`ProfileDocumentSlot.test.tsx` interpola `opts.date`. Ele passa o `t` pela fábrica:

```ts
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation({
      t: (key, opts) => (opts?.date === undefined ? key : `${key}:${String(opts.date)}`),
    }),
  }
})
```

- [ ] **Step 4: rodar a suíte inteira**

Run: `cd frontend && pnpm test`
Expected: **88 arquivos / 483 testes** passando — a baseline de 87/481 mais o arquivo e os 2 testes
da Task 1. Zero falha. Se algum dos 17 quebrar, é sinal de que ele dependia da forma parcial:
leve o caso ao João, não relaxe a fábrica.

- [ ] **Step 5: registrar a pasta nova na rule**

Em `.claude/rules/frontend-fsliced.md`, na seção que descreve `shared/`, acrescentar:

```markdown
- **`shared/testing/` é o kit de teste, e só ele mocka biblioteca externa.** `mockUseTranslation`
  (`shared/testing/i18n.ts`) é a forma real de `useTranslation` — `{ t, i18n, ready }`. Mock parcial
  escrito à mão no arquivo de teste está proibido: foi assim que 17 arquivos ficaram com a forma
  errada e o primeiro `AppDropdown` renderizado estourou com
  `Cannot read properties of undefined (reading 'language')` (D-39). Campo novo que a API do hook
  exigir entra na fábrica, não nos consumidores.
```

- [ ] **Step 6: lint e build**

Run: `cd frontend && pnpm lint && pnpm build`
Expected: lint exit 0; build verde (o `tsc -b` cobre os arquivos de teste — sem `globals`, eles são
type-checados).

- [ ] **Step 7: commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src .claude/rules/frontend-fsliced.md
git commit -m "test: os 17 mocks de react-i18next passam pela fábrica única"
```

**DoD comportamental:** `grep -rn "useTranslation: () => ({ t:" frontend/src` devolve **zero**
linha, e a suíte fecha em 88/483 verdes.

---

### Task 3: provisionar o acesso de redator, com o estado anterior medido

**Files:** nenhum arquivo do repositório. Escreve no **banco de dev** e é desfeita na Task 13.

**Contexto:** a P-47 mede que nenhum dos 7 redatores do `OperationDemoSeeder` carrega a role
`redator`. `/lotus-ui-review` é read-only ("nenhuma mutação além do login"), então o acesso precisa
existir **antes** da run. As portas são as reais: `POST /api/redatores/{redator}/invitation`
(`app/Domains/Identity/routes.php:75`) atribui a role, e `POST /api/invitation/accept`
(`routes.php:31`) define a senha. O e-mail cai no Mailpit (`http://localhost:8025`).

- [ ] **Step 1: subir o stack e medir o estado anterior**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d
docker compose exec -T app php artisan tinker --execute="\
\$r = App\Domains\Identity\Models\Redator::with('user')->find(1); \
echo \$r->user->email, ' | roles=', \$r->user->getRoleNames()->implode(','), \
' | senha_definida=', \$r->user->password ? 'sim' : 'nao', PHP_EOL;"
```

Expected: `juan.morales@lotus.cl | roles= | senha_definida=…`. **Anote a linha inteira** — ela é o
alvo da restauração na Task 13. Se `roles` já vier com `redator`, anote isso também: a restauração
tem de devolver o estado medido, não um estado presumido.

- [ ] **Step 2: disparar o convite pela porta real**

Logar como admin no navegador (`http://localhost:5173`), abrir Pessoas → Redatores → Juan Morales e
acionar o reenvio de convite. Alternativa por API, com cookie de sessão de admin já obtido:

```bash
curl -s -X POST http://localhost:8080/api/redatores/1/invitation \
  -H 'Accept: application/json' -H 'Origin: http://localhost:5173' \
  -H "X-XSRF-TOKEN: $XSRF" -b cookies.txt -c cookies.txt -i | head -3
```

Expected: `HTTP/1.1 200` ou `204`.

- [ ] **Step 3: confirmar que a role chegou**

Repetir o tinker do Step 1.
Expected: `roles=redator`. Essa é a prova de que o convite — e não um atalho — atribuiu a role.

- [ ] **Step 4: pegar o token no Mailpit e definir a senha**

```bash
curl -s 'http://localhost:8025/api/v1/messages?limit=1' | head -c 400
```

Abrir a mensagem, extrair a URL `…/definir-clave/<token>?flow=invite`, e definir a senha **pela
tela** em `http://localhost:5173/definir-clave/<token>?flow=invite`.

- [ ] **Step 5: provar o login de redator**

Sair da sessão de admin, logar com `juan.morales@lotus.cl` e a senha definida.
Expected: o Dashboard abre na view `ready-redator` — não na `ready-admin`, e não em tela de erro.

**DoD comportamental:** um redator real loga pela tela de login e o Dashboard renderiza a view do
papel dele. Estado anterior anotado por escrito, para a Task 13 ter o que restaurar.

---

### Task 4: run 1 — `/lotus-ui-review` da view `ready-redator`

**Files:**
- Create: `docs/superpowers/audits/2026-08-22-lotus-ui-review-dashboard-redator.md`

**Interfaces:**
- Consumes: o acesso de redator da Task 3.

- [ ] **Step 1: árvore limpa antes**

Run: `git status --short`
Expected: vazio. A skill exige registrar o estado do Git antes e depois; run sobre árvore suja
contamina a evidência.

- [ ] **Step 2: rodar a skill**

Invocar `/lotus-ui-review` com a superfície: *"Dashboard, view `ready-redator` na rota `/`, logado
como redator — carga inicial, seções do papel, troca de tema, troca de idioma EN→ES→PT."*

Seguir a skill **como ela está escrita**; ela é a fonte canônica. Jornada read-only: nenhuma
mutação além do login.

- [ ] **Step 3: gravar o relatório no molde vigente**

Escrever `docs/superpowers/audits/2026-08-22-lotus-ui-review-dashboard-redator.md` no molde de
`docs/superpowers/audits/2026-08-22-lotus-ui-review-dashboard.md`: §1 escopo e limites da run
(viewports, estados **não** testados e por quê, falsos positivos descartados **com o motivo**), §2
o `report.txt` **verbatim** entre os marcadores da skill, §3 o que foi feito com ele — e a §3 só
se preenche depois da Task 5.

- [ ] **Step 4: árvore limpa depois, e commit do relatório**

Run: `git status --short`
Expected: só o relatório novo (a evidência bruta em `.artifacts/ui-review/` é coberta pelo
`.gitignore` — confirme com `git check-ignore -v .artifacts/ui-review`).

```bash
git add docs/superpowers/audits/2026-08-22-lotus-ui-review-dashboard-redator.md
git commit -m "docs(audit): revisão de UI da view ready-redator"
```

**DoD comportamental:** relatório datado com jornada, viewports e achados classificados pela
rubrica; nenhuma escrita na aplicação além do login.

---

### Task 5: triagem da run 1 com o João

**Files:** nenhum (a decisão vira as tasks de correção).

- [ ] **Step 1: apresentar a lista**

Para cada achado: classe (`A`/`B`/`C`), o que foi **observado** (fato), o que se **infere** (causa,
com arquivo e linha), o impacto e a correção proposta — separados, como o molde exige.

- [ ] **Step 2: propor o destino de cada um**

- `C` → task de correção neste bloco.
- `B` → corrige se couber no escopo; senão vira ficha `D-*`.
- Achado cuja correção mexe em foco, overflow ou acessibilidade → **item 8**; registre a ficha e
  diga qual parte fica.
- Achado que exija decisão de arquitetura → **PARE** e leve ao João; não decida dentro da run.

- [ ] **Step 3: obter aprovação item a item**

Não agrupe: o João aprova, recusa ou adia cada achado. Recusa com motivo entra no relatório.

**DoD comportamental:** cada achado da run 1 com destino escrito e aprovado.

---

### Task 6: correções da run 1 — protocolo (uma por commit)

**Files:** imprevisíveis por natureza — o que a run 1 descobrir. Precedente: 6 dos 8 achados de
2026-08-22 moravam em `frontend/src/shared/ui/`.

**Este protocolo vale também para as tasks 9 e 11.** Para cada achado `C` aprovado, nesta ordem:

- [ ] **Step 1: catraca no nível certo, vista reprovar**

Escrever o teste que falha **pelo defeito**, no nível onde o defeito mora: se é wrapper, teste do
wrapper em `frontend/src/shared/ui/<Wrapper>/<Wrapper>.test.tsx`; se é tela, teste da tela.
Rodar e **ver a mensagem de falha**, transcrevendo-a no commit. Catraca não vista reprovar não
conta (lição 10 do `docs/README.md`).

Achado que nenhum teste alcança — pintura, contraste, layout — **não ganha catraca falsa**: a prova
é a medição no navegador do Step 3, e o commit diz que o teste não alcança e por quê.

- [ ] **Step 2: corrigir no dono**

Defeito de wrapper corrige-se **no wrapper**, nunca no call-site: alcança todo consumidor futuro, e
foi assim que os 6 de `ac4eef8a` foram pagos. Chave i18n nova entra nas três locales.

- [ ] **Step 3: medir na tela, antes e depois**

Reabrir a superfície no navegador, no mesmo viewport do achado, e registrar o número: contraste de
3,44:1 para 5,83:1, alvo de 16×16 para 28×28, 6 paradas de Tab para 3 — é essa a forma da prova.
"Corrigido" sem número não fecha achado medível.

- [ ] **Step 4: rodar as catracas locais**

Run: `cd frontend && pnpm test <arquivo-do-teste>`
Expected: PASS.

- [ ] **Step 5: commit único, com o número dentro**

```bash
git add <arquivos>
git commit -m "fix(<escopo>): <o que o usuário passa a ver>"
```

O corpo do commit traz o antes/depois medido e o id do achado (`UI-0N`) do relatório.

- [ ] **Step 6: fechar a §3 do relatório**

Preencher a §3 do relatório da run com o destino de cada achado: corrigido (com o commit), recusado
(com o motivo) ou adiado (com a ficha `D-*`).

**DoD comportamental:** nenhum achado `C` da run 1 aberto; cada correção com prova na tela e a §3 do
relatório fechada.

---

### Task 7: run 2 — Operação (`/operacion` → `/operacion/turmas/:id`)

**Files:**
- Create: `docs/superpowers/audits/AAAA-MM-DD-lotus-ui-review-operacion.md` — a data é a **do dia
  da run**, não a de hoje

- [ ] **Step 1: voltar ao papel admin**

Sair da sessão de redator e logar como admin. A jornada de Operação é do operador administrativo.

- [ ] **Step 2: árvore limpa antes**

Run: `git status --short` → vazio.

- [ ] **Step 3: rodar a skill**

Invocar `/lotus-ui-review` com: *"Operação — lista `/operacion` com filtro e ordenação, abrir uma
turma (`/operacion/turmas/:id`) e percorrer as abas do detalhe; três viewports; tema claro/escuro;
idioma EN→ES→PT."* Read-only: **não** criar turma, não matricular, não subir documento.

- [ ] **Step 4: gravar o relatório e commitar**

Mesmo molde e mesmos cuidados da Task 4, incluindo os estados não testados e os falsos positivos
com motivo.

```bash
git add docs/superpowers/audits/AAAA-MM-DD-lotus-ui-review-operacion.md
git commit -m "docs(audit): revisão de UI de Operação"
```

**DoD comportamental:** relatório datado cobrindo lista **e** detalhe, sem mutação na aplicação.

---

### Task 8: triagem da run 2 com o João

Mesmos passos da Task 5, aplicados aos achados da run 2.

- [ ] **Step 1: apresentar a lista** (fato / inferência com arquivo e linha / impacto / correção)
- [ ] **Step 2: propor destino** (`C` corrige aqui; `B` corrige ou vira ficha; foco/overflow → item 8)
- [ ] **Step 3: aprovação item a item**

**Nota:** achado que a run 1 já corrigiu no wrapper **não deve reaparecer**. Se reaparecer, a
correção da run 1 não alcançou o consumidor — isso é regressão do bloco e tem prioridade sobre
achado novo.

**DoD comportamental:** cada achado da run 2 com destino escrito e aprovado.

---

### Task 9: correções da run 2

Aplicar o **protocolo da Task 6**, passo a passo, a cada achado `C` aprovado na Task 8.

- [x] **Step 1: catraca vista reprovar** (ou registro explícito de que o achado não é alcançável por teste)
- [x] **Step 2: corrigir no dono (wrapper > call-site); i18n nas três locales**
- [x] **Step 3: medir na tela, antes e depois, com número**
- [x] **Step 4: `pnpm test <arquivo>` verde**
- [x] **Step 5: um commit por correção, com o número no corpo**
- [x] **Step 6: fechar a §3 do relatório da run 2**

**DoD comportamental:** nenhum achado `C` da run 2 aberto. — **atendido**: UI-01 (o único `C`)
corrigido em `b91764c3` + `aa7fcba6`, e os oito `B` também; §3 do relatório fechada com o destino de
cada um.

> **Tasks 10 a 13 não executadas — corte de escopo decidido pelo João em 2026-08-23**
> ("quero seguir logo para o review"). O bloco vai a `ready_for_review` com a run 3 (Comercial), as
> fichas `D-*` da Task 12, a devolução do banco de dev e o commit de fechamento **em aberto**. As
> pendências estão listadas na §3 do relatório da run 2
> (`docs/superpowers/audits/2026-08-23-lotus-ui-review-operacion.md`) e não se perdem por estarem
> fora deste plano.

---

### Task 10: run 3 — Comercial (`/comercial` → `/comercial/presupuestos/:id`)

**Files:**
- Create: `docs/superpowers/audits/AAAA-MM-DD-lotus-ui-review-comercial.md` — a data é a **do dia
  da run**

- [ ] **Step 1: árvore limpa antes** (`git status --short` vazio)

- [ ] **Step 2: rodar a skill**

Invocar `/lotus-ui-review` com: *"Comercial — lista `/comercial` com filtro, abrir um orçamento
(`/comercial/presupuestos/:id`) e percorrer as cotações do detalhe; três viewports; tema
claro/escuro; idioma EN→ES→PT."* Read-only: **não** criar orçamento, não gerar cotação, não
aprovar nada — são mutações com peso comercial.

- [ ] **Step 3: gravar o relatório e commitar**

```bash
git add docs/superpowers/audits/AAAA-MM-DD-lotus-ui-review-comercial.md
git commit -m "docs(audit): revisão de UI de Comercial"
```

**DoD comportamental:** relatório datado cobrindo lista e detalhe, sem mutação na aplicação.

---

### Task 11: triagem e correções da run 3

- [ ] **Step 1: triagem com o João** — mesmos passos da Task 5.
- [ ] **Step 2: correções pelo protocolo da Task 6**, uma por commit, cada uma medida na tela.
- [ ] **Step 3: fechar a §3 do relatório da run 3.**

**DoD comportamental:** nenhum achado `C` da run 3 aberto.

---

### Task 12: registro — D-38 decidida, D-39 paga, fichas novas

**Files:**
- Modify: `docs/superpowers/backlog.md`

- [ ] **Step 1: reescrever a ficha D-38**

Trocar "Decisão pendente: o backend traduz a frase, ou manda as partes e o cliente compõe." por a
decisão tomada e o destino:

```markdown
  **Decidido em 2026-08-22 (spec `2026-08-22-frontend-revisao-ui-por-modulo-design.md`, D1): o
  backend manda as partes e o cliente compõe.** Localizar a frase no backend exige
  `Accept-Language`, que não existe hoje e é o que o item 7 (`hardening-i18n-e-erros-api`) instala
  junto de D-36 e D-18 — a D-38 é da mesma família e passa a ser paga lá, não aqui.
```

E mover o ponteiro do bloco de `frontend-revisao-ui-por-modulo` para `hardening-i18n-e-erros-api`.

- [ ] **Step 2: marcar a D-39 como paga**

A linha só sai do registro canônico depois do `/fechar-sprint` — anotar na ficha o commit da Task 2
e o número da suíte, sem apagá-la.

- [ ] **Step 3: escrever as fichas `D-*` nascidas dos achados `B` adiados**

Cada uma no molde vigente: o que foi medido, onde mora (arquivo e linha), o bloco que a paga e um
**DoD comportamental** — nunca "melhorar X".

- [ ] **Step 4: registrar o que sobrou do item 16**

Na seção do item 16 do `backlog.md`, anotar que Certificados, Cursos, Pessoas, Administração e o
wizard `/operacion/turmas/nueva` seguem abertos, para o bloco irmão.

- [ ] **Step 5: commit**

```bash
git add docs/superpowers/backlog.md
git commit -m "docs(backlog): D-38 decidida, D-39 paga e o que resta do item 16"
```

**DoD comportamental:** nenhuma ficha do bloco fica com decisão pendente escrita como pendente
quando a decisão existe.

---

### Task 13: devolver o banco de dev, e gate final

**Files:** nenhum arquivo do repositório além do que o gate provar.

- [ ] **Step 1: restaurar o estado do redator, medido**

Comparar com a linha anotada na Task 3 e devolvê-la:

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan tinker --execute="\
\$u = App\Domains\Identity\Models\Redator::with('user')->find(1)->user; \
\$u->removeRole('redator'); \
echo \$u->email, ' | roles=', \$u->fresh()->getRoleNames()->implode(','), PHP_EOL;"
```

Expected: `roles=` vazio — igual à medição do Step 1 da Task 3. Se a Task 3 tiver medido outro
estado, devolva **aquele**. A senha definida fica declarada como resíduo se não houver porta para
desfazê-la; resíduo declarado, nunca escondido.

- [ ] **Step 2: fence de escopo**

```bash
cd /home/jvbat/projetos/fix-frontend
git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts
```

Expected: **vazio**. É o que torna Pint e `typescript:transform` N/A por escopo medido.

- [ ] **Step 3: catracas**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Expected: lint exit 0; build verde; testes **≥ 88 arquivos / 483** e zero falha — a baseline de
87/481 mais o que as catracas das correções tiverem somado.

- [ ] **Step 4: conferir que nenhum achado `C` ficou aberto**

Reler a §3 dos três relatórios: cada achado com destino escrito — corrigido (com commit), recusado
(com motivo) ou adiado (com ficha).

- [ ] **Step 5: commit do fechamento**

```bash
git add -A
git commit -m "chore(bloco): fecha a fatia 1 da revisão de UI por módulo"
```

**DoD comportamental:** as três superfícies com relatório datado, zero `C` aberto, banco de dev
devolvido ao estado medido e o fence de frontend puro vazio.

---

## Handoff de execução

`executor: claude`

As runs são sessão de navegador com julgamento de rubrica, as correções de `C` tocam `shared/ui` —
dono da customização de componente Prime, isto é, decisão de arquitetura sob a lei §5.6 — e as
tasks 5, 8 e 11 são gates com o João. Nada disso é task mecânica de paths fechados, então não vai
para o Codex.

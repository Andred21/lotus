# Spec — Abstração de componentes de `operation`

- **Work item:** `abstracao-componentes-operation`
- **Data:** 2026-08-02
- **Origem:** item 4 de `docs/superpowers/backlog.md`, aberto pelo `/revisar-frontend` de
  `features/operation` em 2026-08-02
- **Context packet:** nenhum — a fonte é o código do repositório e o relatório do
  `/revisar-frontend` da mesma sessão. Sem dependência de Drive, Notion ou Figma.

## 1. Problema

O `/revisar-frontend` varreu os 32 arquivos de `features/operation` (2127 linhas) contra a
`.claude/rules/frontend-fsliced.md`. A lei §6 está limpa — zero `primereact` direto, zero import
cross-feature — e as camadas `api/`, `hooks/` e `lib/` são aderentes: `useTurmaDocsSection`,
`useEnrollmentSection`, `useConclusionSection`, `useRedatorPicker` e `useTurmaDetail` orquestram
tudo fora do componente, com `loadError` separado de erro de mutação.

O problema é que **essa disciplina não é uniforme**: seis componentes da mesma feature fazem o que
os hooks vizinhos existem para evitar.

| # | Arquivo | Cheiro | Rule violada |
|---|---|---|---|
| C-1 | `TurmaConfigCard.tsx:22-23` | `coursesApi.useList()` + derivação do curso no componente | "componente de feature = declarativo" |
| C-2 | `EnrollmentTable.tsx:26-33,42-43` | reimplementa `useTableFilter` (estado de `first`, clamp e `onPage`) | "tabela em card = `useTableFilter`" |
| C-3 | `ImportDialog.tsx:18-35` | mutation + `result` + `sizeError` + `close` soltos no componente | rule 2 (2+ `useState` que mudam juntos) |
| B-1 | `RedatorDesignation.tsx:57-89` | ternário de 4 níveis dentro do `return` | rule 1 (ternário aninhado no JSX) |
| B-2 | `ManualButton.tsx:11-47` | mutation + 2 refs + handler de 20 linhas no componente | "componente de feature = declarativo" |
| B-3 | `DocumentTypeCard.tsx:46-59` | `uploadHandler` de 13 linhas dentro do atributo JSX | rule 1 (handler no `return`) |

Dois deles são **reincidência literal** de achados já aprovados e corrigidos no bloco anterior
(`abstracao-componentes-redator`, 2026-08-02):

- **C-1 é o Q-4**: `RedatorCourseSelector` carregava query + derivação; foi extraído `useRedatorCourses`.
- **B-1 é o Q-2**: `RedatorDocumentSlot` tinha ternários irmãos num `return`; viraram `SlotBody` com
  guardas sequenciais.

E **C-2 é o defeito que a própria rule nomeia**: o bloco de busca/paginação foi copiado literalmente
do `useTableFilter` — comentário de clamp incluído ([`useTableFilter.ts:64-70`](../../../frontend/src/shared/hooks/useTableFilter.ts)) —
e é a duplicação que, em seis cópias, rendeu o `RolesTable` com paginador duplo e o empty state falso
durante o loading.

## 2. Escopo

Bloco **100% frontend**. Nenhuma migration, nenhum DTO, nenhuma rota, nenhuma mudança de regra de
negócio, nenhum arquivo de `backend/`. `generated.ts` não é tocado. Nenhuma chave i18n nova.

Refatoração: **o comportamento observável permanece idêntico. Sem exceção declarada.** Diferente do
bloco anterior (que tinha a D7 de rótulo), aqui nada do que a tela renderiza ou faz pode mudar —
inclusive o texto, a ordem dos botões e o estado de página das tabelas.

**Fora de escopo, declarado:**

- **Cor Tailwind hardcoded** em `EnrollStudentForm.tsx:60,76`, `ImportDialog.tsx:49,58,72`,
  `ImportResultSummary.tsx:30,47,48` e `ManualButton.tsx:59` (`text-slate-500`, `text-red-600`,
  `text-slate-600 dark:text-slate-300`), enquanto os vizinhos da mesma feature já usam
  `var(--text-color-secondary)`. É a fatia de `operation` do débito "Cor fora do corte do D18" do
  `backlog.md`, e é **eixo UI** — muda pixel, cabe ao `/revisar-ui`, não a este bloco.
- **As 5 asserções `turma.id!`** (`EnrollmentSection.tsx:57,62`, `useTurmaDocsSection`,
  `useEnrollmentSection`, `useConclusionSection`). É a forma do Q-1 do bloco anterior, mas o id vem
  sempre de GET bem-sucedido: risco real baixo e a correção tocaria a assinatura de 5 arquivos além
  do refactor. Fica registrado no `backlog.md`.
- **A formatação divergente de `TurmaDetailPage.tsx`** (único arquivo da feature com aspas duplas e
  ponto-e-vírgula; não há Prettier no repo, o eslint não pega).
- **Busca na aba Alumnos** — a aba não tem busca por decisão do protótipo ("Aba sem busca", packet do
  bloco 6c). Adicioná-la resolveria C-2 "de brinde" e **mudaria comportamento**; recusado (ver D4).
- **Introduzir test runner no frontend** (Vitest) — decisão de stack, exige ADR e bloco próprio.
- **`TurmasTable` (147 linhas)** — no limite da régua de ~150, mas com derivação toda acima do
  `return` e `useTableFilter` usado corretamente. Aderente; não se mexe.

## 3. Restrições que moldam o desenho

| # | Restrição | Origem |
|---|---|---|
| R1 | Feature não importa outra feature, nem para tipo | `CLAUDE.md` §5.6 · ADR-05 |
| R2 | Feature não importa PrimeReact direto — só via `shared/ui` | `CLAUDE.md` §5.6 |
| R3 | Componente de feature é declarativo; estado, queries, mutations e derivação vão para hook da feature | `frontend-fsliced.md` |
| R4 | Tabela em card usa `useTableFilter` + `AppCardToolbar` + `footerCount`; não reescrever o bloco na feature | `frontend-fsliced.md` |
| R5 | Reset/ajuste de estado durante o render, nunca `useEffect` com `setState` | `frontend-fsliced.md` · lint `react-hooks/set-state-in-effect` |
| R6 | `shared/` nunca importa de `features/` | ADR-05 |
| R7 | Definition of done = critério de aceite provado, não build verde | `CLAUDE.md` §5.8 |
| R8 | Refatoração que muda o que a tela renderiza é bug, não refatoração (peso legal) | `/revisar-frontend` |

## 4. Decisões

### D1 — Bloco 100% frontend, zero `backend/`

Nenhum arquivo sob `backend/` é tocado. Prova no gate: `git diff --name-only main...HEAD -- backend/`
vazio. A suíte backend roda como **regressão** (baseline 372 passed / 1360 assertions), não como
prova do bloco.

### D2 — Branch a partir do `main`, no main tree, sem worktree

`refactor/abstracao-componentes-operation` a partir do `main`. Mesma D12 do bloco anterior: o DoD se
prova na tela com o app rodando e o `docker compose` aponta para o main tree; um worktree exigiria
subir um segundo ambiente para provar o que o main tree já prova.

### D3 — C-1: a query do curso desce para `useTurmaConfigForm`

`useTurmaConfigForm` passa a chamar `coursesApi.useList()` e a derivar o curso, expondo
`workloadHours: number | null`. `TurmaConfigCard` perde o import de `coursesApi` e o `find`, e lê só
`f.workloadHours`.

A query **continua disparando em `create`**, como hoje — hoje o componente já a chama
incondicionalmente e só esconde o campo (`mode !== 'create'`). Condicionar a query seria mudança de
comportamento fora do escopo desta spec.

Precedente direto: Q-4 do bloco anterior (`useRedatorCourses`).

### D4 — C-2: `searchable` vira opcional em `useTableFilter`; `EnrollmentTable` adota o hook

`shared/hooks/useTableFilter.ts` muda a assinatura para:

```ts
export function useTableFilter<T>(
  items: T[],
  searchable?: (item: T) => (string | null | undefined)[],
  where?: (item: T) => boolean,
): TableFilter<T>
```

com `rows` calculado como `term === '' || !searchable ? scoped : scoped.filter(…)`. A mudança é
**retrocompatível**: os 7 consumidores atuais (`CoursesTable`, `BudgetsTable`, `ClientsTable`,
`UsersTable`, `RedatoresTable`, `StudentsTable`, `TurmasTable`) não mudam uma linha.

`EnrollmentTable` vira o 8º consumidor com `useTableFilter(enrollments)` e apaga `useState(first)`,
o clamp local e o `onPage` próprio. Comportamento idêntico: sem `searchable`, `rows === scoped ===
items`, e o clamp do hook é o mesmo código que o componente copiou.

**Alternativa recusada:** passar `() => []` no chamador. Não toca `shared/`, mas deixa um argumento
falso permanente que o próximo leitor precisa decodificar. O contrato honesto ("tabela em card pode
não ter busca") custa 3 linhas.

**Alternativa recusada:** ligar busca na aba. Resolveria o achado e melhoraria a tela, mas viola R8 e
a decisão "Aba sem busca" do protótipo.

### D5 — C-3: `useImportStudentsFlow` novo

`features/operation/hooks/useImportStudentsFlow.ts` recebe `(turmaId, onHide)` e concentra a
mutation, `result`, `sizeError`, a resolução de mensagem (`useMutationErrors`) e o `close` que
reseta os três e respeita `isPending`. `ImportDialog` só consome e renderiza.

Molde: `useEnrollStudentFlow`, o vizinho da mesma pasta — hoje a feature diverge dela mesma, com um
diálogo de matrícula disciplinado ao lado de um diálogo de import solto.

### D6 — B-1: `PickerBody` local, guardas sequenciais

O ternário de 4 níveis (`loadError ? … : loadingList ? … : eligible.length === 0 ? … : <ul>`) vira um
subcomponente `PickerBody` **no mesmo arquivo** `RedatorDesignation.tsx`, com guardas sequenciais na
ordem **erro > loading > vazio > lista**.

Fica no mesmo arquivo, não em arquivo próprio: precedente `SlotBody`/`EmptySlot`, que o bloco
anterior deixou dentro de `RedatorDocumentSlot.tsx`. É corpo de render de um componente só, sem
reuso previsto.

O comentário que hoje defende a ordem das guardas (spec D16 — inverter faria falha de carga passar
por "nenhum redator elegível") sobe para o topo do `PickerBody`, onde a ordem é código sequencial e
não expressão aninhada.

Tipagem da prop: `ReturnType<typeof useRedatorPicker>`, sem novo tipo exportado.

### D7 — B-2: `useTurmaManualOpener` novo

`features/operation/hooks/useTurmaManualOpener.ts` concentra a mutation do blob, os refs de
`objectURL` e da aba, o `popupBlocked` e o handler `open`. Expõe `{ open, pending, popupBlocked,
message }`. `ManualButton` fica com o botão e a linha de erro.

O `useEffect` de cleanup vai junto para o hook: ele revoga `objectURL` e fecha a aba órfã no
unmount — é liberação de recurso, não sincronização de estado, e portanto não cai na proibição da R5.

### D8 — B-3: `handleUpload` acima do `return`, sem hook

No `DocumentTypeCard`, o corpo de `uploadHandler` (13 linhas, incluindo o comentário que explica por
que o `e.options.clear()` vem **antes** da mutação) sobe para uma função `handleUpload` acima do
`return`. Sem hook: é handler local de um único `useState` que não cruza componente — promovê-lo
seria o over-engineering que a própria rule desaconselha.

### D9 — Um hook por componente; hooks de seção não engordam

`useEnrollmentSection` **não** absorve o fluxo de import; `useTurmaDocsSection` **não** absorve o
manual. Diálogo e botão têm ciclo de vida próprio (abrem, fecham, resetam) e a seção não precisa
saber deles. É o padrão que a feature já segue com `useEnrollStudentFlow` ao lado de
`useEnrollmentSection`.

### D10 — Nenhuma chave i18n nova, nenhum texto alterado

Prova no gate: `git diff --name-only main...HEAD -- frontend/src/shared/config/locales/` vazio.

### D11 — Prova visual em 2 checkpoints

Não há ferramenta de browser/screenshot nesta sessão (mesma limitação que derrubou a D11 do bloco
anterior). Não haverá baseline capturada; a prova é a conferência ao vivo do João, em **dois**
momentos, cada um cobrindo só o que acabou de mudar:

- **CP-1, depois dos C** — aba *Configuración* (carga horária no view e no edit, salvar) e aba
  *Alumnos* (tabela, paginação acima de 10 linhas, remoção na última página, diálogo de import com
  sucesso e com erro).
- **CP-2, depois dos B** — aba *Redator* (picker nos 4 estados: erro de carga, carregando, vazio,
  lista com designar/remover) e aba *Documentación* (upload, remoção, botão Manual, incluindo popup
  bloqueado).

**Se o code review alterar markup depois de um checkpoint aprovado, aquele checkpoint se repete.**
Lição do bloco anterior: fechar sobre a lembrança da tela anterior é assinar o gate em falso.

## 5. Arquivos

**Novos (2):**

| Path | Conteúdo |
|---|---|
| `frontend/src/features/operation/hooks/useImportStudentsFlow.ts` | D5 |
| `frontend/src/features/operation/hooks/useTurmaManualOpener.ts` | D7 |

**Alterados (7):**

| Path | Mudança |
|---|---|
| `frontend/src/shared/hooks/useTableFilter.ts` | D4 — `searchable` opcional |
| `frontend/src/features/operation/hooks/useTurmaConfigForm.ts` | D3 — recebe a query e expõe `workloadHours` |
| `frontend/src/features/operation/components/Turma/TurmaConfigCard.tsx` | D3 — perde query e derivação |
| `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx` | D4 — adota o hook |
| `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx` | D5 — só consome |
| `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx` | D6 — `PickerBody` |
| `frontend/src/features/operation/components/Document/ManualButton.tsx` | D7 — só consome |
| `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx` | D8 — `handleUpload` |

Único arquivo fora de `features/operation/`: `shared/hooks/useTableFilter.ts`.

## 6. Definition of Done

Cada item é uma verificação, não uma afirmação.

**Comportamento (provado por você na tela — R7/R8):**

1. **Configuración** — a carga horária aparece igual ao `main` no `view` e no `edit`; `—` quando o
   curso não resolve; salvar continua funcionando e voltando para `view`.
2. **Alumnos** — a tabela pagina igual; com mais de uma página, remover o último aluno da última
   página volta para a primeira em vez de mostrar página vazia; a faixa de rodapé conta o mesmo.
3. **Import** — arquivo válido mostra o resumo; arquivo acima do teto mostra o erro de tamanho;
   erro do servidor mostra a mensagem; fechar e reabrir o diálogo **não** carrega resultado nem erro
   da tentativa anterior; o diálogo não fecha com a mutação em voo.
4. **Redator** — os 4 estados do picker aparecem na mesma ordem de precedência: API derrubada mostra
   erro com Reintentar (**não** "nenhum redator elegível"), carregando mostra o texto de loading,
   lista sem elegíveis mostra o vazio, lista com elegíveis designa e fecha.
5. **Documentación** — upload de PDF sobe e some do seletor (clique seguinte reabre o seletor, não
   reenvia o mesmo arquivo); arquivo acima do teto mostra o erro; remoção pede confirmação e
   funciona; o botão Manual abre a aba com o PDF e, com popup bloqueado, mostra a mensagem.

**Estrutural (grep/diff):**

6. `git diff --name-only main...HEAD -- backend/` vazio (D1).
7. `git diff --name-only main...HEAD -- frontend/src/shared/config/locales/` vazio (D10).
8. Os 7 consumidores antigos de `useTableFilter` não mudaram (D4):
   `git diff --stat main...HEAD -- frontend/src/features/catalog/ frontend/src/features/commercial/ frontend/src/features/identity/`
   vazio, **e** `TurmasTable.tsx` ausente de `git diff --name-only main...HEAD`.
9. Nenhuma query nem mutation sobrando em componente de `operation`:
   `grep -rnE "use(Query|Mutation)\b|Api\.useList" frontend/src/features/operation/components/` sem
   saída. Hoje esse grep devolve exatamente 1 linha (`TurmaConfigCard.tsx:22`), que é o C-1 — o
   `\b` existe para não casar `useMutationErrors`, que é consumo de erro e pode ficar no componente.
10. Nenhum `useState` de paginação sobrando: `grep -rn "useState(0)" frontend/src/features/operation/components/`
    devolve **apenas** `TurmaDetailPage.tsx` (índice da aba do `AppTabView`, que é estado de UI
    legítimo do componente, não paginação). A linha do `EnrollmentTable` tem de sumir.
11. Greps da lei §6 limpos: sem `primereact` direto e sem import cross-feature em `features/`.

**Automatizado:**

12. `pnpm build` e `pnpm lint` verdes.
13. Suíte backend 372 passed (1360 assertions) como regressão — não deve mudar; se mudar, o bloco
    tocou o que não devia.

Build verde **não** é aceite (R7).

## 7. Riscos

| # | Risco | Mitigação |
|---|---|---|
| 1 | `useTableFilter` é `shared/` e serve 7 telas — uma regressão aqui atinge o app inteiro | O parâmetro é **opcional**: nenhum chamador atual muda, e o `tsc` do `pnpm build` prova a compatibilidade. Item 8 do DoD exige diff zero nas 3 features consumidoras |
| 2 | Sem baseline visual (sem browser na sessão), "idêntico" depende da memória de quem confere | Os 2 checkpoints da D11 conferem cada área **logo depois** de mudá-la, com o `main` disponível para comparação lado a lado; e o checkpoint se repete se o review mexer no markup |
| 3 | Refatorar pela metade — o Q-1/Q-2 do bloco anterior nasceram exatamente assim | Os itens 9 e 10 do DoD são greps, não julgamento: query/mutation em componente e `useState(0)` de paginação têm de sumir da feature, não só do arquivo em foco |
| 4 | O `useEffect` de cleanup do `ManualButton` migrar para o hook e perder o unmount | O hook é usado por um componente só; o cleanup roda no unmount do consumidor igual. Item 5 do DoD exercita abrir o manual e sair da aba |

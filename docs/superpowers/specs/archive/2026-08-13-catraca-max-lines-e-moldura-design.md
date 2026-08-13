# BD-4 · Catraca do `max-lines` e adoção da moldura — desenho

> Bloco promovido explicitamente pelo João em 2026-08-13, com o estado em `idle`, sob o slug
> `catraca-max-lines-e-moldura`. Rota direta a `ready_for_planning` **sem Context Packet**, por
> ausência medida de fonte externa: o BD-4 não cita Drive, Notion nem Figma — as fontes são o
> repositório, os débitos versionados do `backlog.md` e a régua do `eslint.config.js`.
>
> Base: `feat/catraca-max-lines-e-moldura` em `0c2a24b`, idêntica à `main`, árvore limpa,
> `pnpm lint` exit 0. Bloco **frontend puro** — a P-03 não dispara e a worktree
> `/home/jvbat/projetos/fix-frontend` segue.

## §1 — O terreno medido, e as cinco divergências que ele achou

Toda medição abaixo é de 2026-08-13 sobre `0c2a24b`, não herdada de relatório.

| O que o BD-4 (ou o registro) afirma | Medido |
|---|---|
| `StudentDialog` 283 linhas | **281** |
| `RedatorDialog` 199 | **206** |
| `BudgetDetailPage` 171 | **187** |
| `RedatorDocumentSlot` 175 | 175 (único que bate) |
| "o bloco existe por causa do modo leitura do BD-3" | **falso** — o BD-3 tocou o `StudentDialog` num único commit (`dfc3f4b`), saldo **−2 linhas**. Os dois blocos grandes vêm de `501b731` (2026-08-05) |
| `FormErrorSummary.tsx:62-67` (citado 4× em doc normativo) | **arquivo inexistente** — é export nomeado em `FormField.tsx`, e as linhas 62-67 de lá caem no `NestedField` |
| "a adoção tira linha das tabelas antes de medir os diálogos" | **falso** — `BudgetsTable` (141) e `TurmasTable` (150) não estão na catraca, e a moldura não tira linha de diálogo nenhum |

Déficit real contra a régua de 150: **131 + 56 + 25 + 37 = 249 linhas a extrair**.

Duas divergências têm consequência de escopo e estão resolvidas nas decisões:

- **Os dois diálogos do item (c) não são o mesmo caso.** `useStudentForm` roda sobre `useCrudForm` e
  já devolve `errorSummary` pronto (`mapped: ['name','rut','email','client_id']`,
  `summaryOnly: ['phone']`); montar o resumo lá é um destructuring e uma linha de JSX.
  `useRedatorForm` **não usa `useCrudForm`** — fia `useEntityForm` + `useMutationErrors` na mão e não
  expõe `mapped`, `summaryOnly` nem `errorSummary`.
- **O DoD escrito não era provável.** Não existe regra de validação de `phone` em
  `StudentData`/`RedatorData`/`UserData` (zero `Max(` em `Identity/Data`; a coluna é
  `users.phone varchar(30)` sem unique; nenhum teste assere 422 em phone). Pela UI o `onChange`
  sempre entrega string, então o único 422 alcançável é por não-string.

Mecanismo do item (c), provado no código e não suposto: `summaryOnly` **nunca chega ao componente**
(`useCrudForm` devolve só `{ mapped, excludePrefixes }`) e o `FormErrorSummary` filtra apenas por
`mapped`/`excludePrefixes` — `summaryOnly` é asserção de classificação em tempo de DEV, com efeito de
renderização **zero**. Hoje, um 422 em `phone`: `fieldErrors.phone` existe, `generalError` é `null`
(o `useMutationErrors` só o preenche quando o ProblemDetails **não** tem `errors`), o `FormField` de
phone não recebe `error=`, nenhum summary está montado — a tela não muda em nada.

## §2 — Decisões (D1–D9)

Todas do João, em 2026-08-13. Nenhuma é default.

**D1 — O 422 de `phone` é provado por request forjado, sem tocar o backend.** No e2e do gate,
`phone` como array: o tipo `string|Optional|null` recusa e devolve 422 com `errors.phone`. Prova o
circuito inteiro sem ampliar o bloco nem mudar contrato de validação. Alternativas recusadas: regra
`max:30` nova nos DTOs (tocaria backend, dispararia a P-03 e mudaria contrato que ninguém pediu) e
trocar o critério por teste isolado (não prova nada na tela real).

**D2 — O `RedatorDialog` ganha o resumo com `mapped` literal**
(`mapped={['name','rut','email']}`), no estilo B que `CourseDialog`, `QuoteWizard`,
`TurmaConfigCard` e `EnrollStudentForm` já usam. `useRedatorForm` **não** migra para `useCrudForm`:
o BD-5 declarou essa exclusão **por critério** (multipart com chave polimórfica, exceção de
`new FormData()` registrada por caminho no eslint), não por corte de escopo. Custo aceito: sem a
guarda DEV de chave não-classificada, e o `mapped` literal desincroniza se alguém acrescentar campo.

**D3 — O campo de cliente do `StudentDialog` colapsa no molde do `BudgetDialog`.** Hoje ele
renderiza `<AppInputText value={...} disabled />` em view/edit — `disabled` **estático e sozinho**,
quarta grafia do débito BD-3 §4, que escapa das duas catracas (`DISABLED_READONLY` exige `readOnly`
dentro da expressão do `disabled`; `DISABLED_READONLY_ESTATICO` exige o par estático
`disabled readOnly`). Passa a `readOnly={mode !== 'create'}` + `value={label}`, como o `BudgetDialog`
já faz para o caso idêntico. **Exceção declarada ao "comportamento idêntico"**: em view/edit o campo
vira texto em vez de input cinza.

**D4 — O bloco de view vira um filho, e `useStudentDetail` fica no pai.** O filho recebe `detail`
por prop. Medido: o hook é chamado sempre que `mode !== 'create'`, mas o JSX que o consome só existe
sob `mode === 'view'` — **em edit a requisição sai e nada a renderiza.** Descer o hook corrigiria
isso e mudaria comportamento de rede dentro de um refactor; a decisão é preservar a rede e registrar
o desperdício como débito.

**D5 — O par do redator recebe dois arquivos novos, um por movimento.** Partir o slot não tira linha
do diálogo e puxar a seção do diálogo não tira linha do slot; os dois precisam cair. Absorver tudo
num arquivo só foi recusado por medição: 55 + 116 = ~171, o arquivo novo nasceria acima da régua.

**D6 — Três correções de padrão entram**, todas fora do movimento literal: UI-01 no
`shared/ui/AppFileRow`, os dois `<p>` crus de erro de arquivo do `RedatorDialog` virando
`FormErrorBanner` (como o irmão `BudgetDocumentsCard` já faz), e a morte do `className="sp"`.

**D7 — O `BudgetDetailPage` perde overlays + `CONFIRM_COPY` + `StatCard`**, e os ramos de estado
ficam intocados. Os ramos são o maior bloco coeso (36) e são byte a byte iguais aos da
`TurmaDetailPage`, mas são exatamente o que os 3 testes vivos guardam, e deduplicá-los exigiria um
molde em `shared/ui` que arrastaria `operation` para dentro do bloco.

**D8 — O critério de CTA da moldura vence na `BudgetsTable`.** Hoje ela usa
`end={loadError || (!busy && budgets.length === 0) ? undefined : actions}` — mede a prop crua, antes
de qualquer filtro, e não tem a guarda `!table.filtering` que o BD-3 introduziu. Os dois critérios
discordam em **um caso**: lista vazia **com termo digitado** — hoje o CTA some, sob a moldura
aparece. **Exceção declarada**; é o critério que o BD-3 escolheu de propósito ("busca sem resultado
não é lista vazia", emenda `36c6847`).

**D9 — Quatro textos são corrigidos, um deles não.** A rule `.claude/rules/frontend-fsliced.md:106`
("4 legados em `ignores`") é reescrita **no mesmo commit que esvazia o array** — o teste
`repo-docs-refs` não pega isso, porque os tokens não têm `/` nem extensão e `pareceCaminho` os
descarta. O docblock da `SearchableTableFrame` (que diz que as duas tabelas "não entram aqui — spec
D2" e três linhas abaixo descreve o caminho delas) é corrigido no commit da adoção. O ponteiro
fantasma `FormErrorSummary.tsx` é corrigido **só no `state.md`**: a spec e o plano arquivados do BD-8
ficam como estão, porque artefato fechado não se reescreve. O `backlog.md` é corrigido **durante a
execução**, não no planejamento (o comando proíbe mexer nele nesta fase).

## §3 — Ordem

Catraca primeiro, moldura por último. A justificativa escrita no backlog está medida falsa (as duas
frentes não se pagam), e separar "nada muda na tela" de "isto muda a tela" é o que torna o gate
legível: se a prova visual achar problema, ele fica isolado nos commits finais.

1. `StudentDialog` → sai dos `ignores` no mesmo commit
2. `RedatorDocumentSlot` → idem
3. `RedatorDialog` → idem
4. `BudgetDetailPage` → idem; **este commit esvazia o array e reescreve a rule**
5. UI-01 no `AppFileRow` (`shared/ui`)
6. `BudgetsTable` adota a moldura (+ docblock da moldura + comentário falso do retry)
7. `TurmasTable` adota a moldura
8. Docs: ponteiro fantasma no `state.md`, números do `backlog.md`
9. Gate

## §4 — O desenho, arquivo a arquivo

Números são `wc -l` de hoje; a "chamada de volta" é estimativa que o plano fecha com contagem real.
Todo componente novo nasce em `features/<x>/components/<Entidade>/`, arquivo irmão sem subpasta —
a convenção medida em 6 exemplos da casa. Extração é **movimento literal**: quem tinha irmãos
diretos devolve `Fragment`, nunca `<div>`, porque um nó novo muda o `space-y-*` do pai.

### 4.1 `StudentDialog` 281 → ~111

Conta: `281 + 3 − 9 − 45 − 119 = 111`.

- `+3` — `FormErrorSummary` montado no molde do `ClientDialog`/`StaffUserDialog`
  (`{...errorSummary}`), logo após o `FormErrorBanner`.
- `−9` — colapso do campo (D3). **`FormField` em modo leitura faz
  `readOnly ? <ReadOnlyValue value={value}/> : children`, trocando os filhos inteiros.** Duas
  consequências: as 28 linhas de dica (erro ao carregar clientes, lista vazia) são filhas e só
  existem no create, então **ficam**; e o aviso `clientLocked`, hoje filho direto e renderizado em
  **edit**, some sob `readOnly` — ele **sai para fora do `FormField`**, senão o colapso apaga um
  aviso em silêncio.
- `−45` — o campo (já colapsado, ~50 linhas) vira `StudentClientField.tsx` levando as dicas junto:
  −42 líquidos no pai, contra uma chamada de ~8 linhas, mais 3 linhas de import que ficam órfãs
  (`AppButton`, `AppDropdown`, `dangerText`).
- `−119` — o bloco `mode === 'view'` (106 linhas: vínculos 42 + tabela de turmas 41 + moldura de
  erro/skeleton) vira `StudentDetailSections.tsx`, com 15 linhas de import saindo junto.
- `useStudentClients` **fica no pai**: `clientsUnusable` alimenta o `disabled` do `CrudDialog` na
  linha 77, fora do campo — descer o hook derrubaria o gate de submit do create.
- `className="sp"` morto (D6): `sp` não é utilitário Tailwind e não existe em CSS nenhum do `src`.

### 4.2 `RedatorDocumentSlot` 175 → 59

`EmptySlot` (26) + `SlotBody` (90) + o tipo `SlotBodyProps` saem para `SlotBody.tsx`; o tipo é
exportado de lá porque é prop-type dos dois lados (o wrapper faz `{ type, mode, doc, ...body }` e
repassa `{...body}`). Preserva as duas assimetrias medidas: o ramo `view` sem documento devolve `<p>`
cru e não `EmptySlot`, e o ramo `create` monta a linha de arquivo sem `AppFileActions`. A D6 do
próprio arquivo continua valendo: `preview` e `sizeError` **não** descem para o slot.

### 4.3 `RedatorDialog` 206 → ~129

`−55` corpo de documentos (hooks 4 + handlers 15 + seção 36), `−10` imports órfãos, `+~7` chamada,
`+3` resumo = **151, uma acima da régua**. Por isso o bloco corta **duas** seções:

- `RedatorDocumentsSection.tsx` — a seção DOCUMENTS inteira, com os dois `<p>` virando
  `FormErrorBanner` (D6);
- `RedatorUserSection.tsx` — a seção USUARIO (FormSection + `AppPhotoField` +
  `RedatorIdentityFields`, 27 linhas).

`useEntityPhoto` fica no pai pelo mesmo motivo do Student (`photo.pending` alimenta o `disabled` do
`CrudDialog`). O resumo entra com `mapped` literal (D2).

### 4.4 `BudgetDetailPage` 187 → ~145

`−51` (overlays 36 + `CONFIRM_COPY` 5 + `StatCard` 10), `−3` imports órfãos (`BudgetDialog`,
`QuoteWizard`, `ConfirmDialog`), `+~12` chamada: `187 − 51 − 3 + 12 = 145`. **Contingência declarada:**
se a contagem real passar de 150, o segundo corte é a prop `actions` do `DetailHeader` (20 linhas,
três `AppButton`). Os ramos de estado não são tocados e `BudgetDetailPage.test.tsx` **não é editado**
— os 3 casos verdes sem uma linha de diff são a prova de que o corte foi literal. O arquivo tem 19
linhas de comentário de justificativa (11 vindas de `d0c3b86`, do bloco de estilização); como
`skipComments` é `false`, elas contam para a régua e **saem junto com o bloco que explicam**, nunca
apagadas.

## §5 — A moldura nas duas tabelas

Adotar **não exige tocar a moldura**: os quatro pontos que poderiam exigir foram medidos e passam,
inclusive o `resetPage` extra do `useTableFilter` (probe com `tsc --strict` prova que
`{ ...table, clear: () => {} }` compila sem erro de excess-property).

O dropdown de status entra pelo `filterSlot`, no mesmo `<div className="w-48">` da `HistorialTable`.
O `clear` composto — hoje inline no JSX do empty state (`table.clear(); setStatus(null)`) — sobe para
a prop `table` como `{ ...table, clear: clearAll }`; a `useHistorial` monta isso no hook, mas estas
duas guardam o estado do dropdown em `useState` local, então fica no componente.

`TurmasTable` (150) não tem `actions`, então lá nada muda além da moldura — e ela está **exatamente
no teto sem estar nos `ignores`**, o que faz o lint reprovar sozinho se a adoção inflar o arquivo.

`BudgetsTable` (141) carrega a exceção da D8 e mais uma correção: o comentário das linhas 38-41
afirma que o `retry` devolve a promise das duas recargas, mas `useCommercialClients.refetch` descarta
a própria com `void` — o `Promise.all` só espera o `onRetry` do pai. Comentário falso em linhas que o
bloco já vai mover.

**Efeito de layout a medir, não a supor:** a moldura interpõe um
`<div class="flex min-w-64 flex-1 items-center gap-3">` **sem `flex-wrap`** entre o slot `start` do
`AppCardToolbar` (que tem `flex-wrap`) e os filhos. Hoje input e dropdown são filhos diretos e
envolvem a 390px. O gate mede.

## §6 — Provas e DoD

**Teste automatizado nasce em um lugar só, e não é diálogo.** Componente com PrimeReact no jsdom está
fora do corte do runner (`frontend-fsliced.md`), então nenhum dos quatro alvos ganha teste. Mas o
`FormErrorSummary` é `<ul>` puro, sem PrimeReact, e **não tem teste nenhum**: os casos entram em
`FormField.test.tsx` — chave fora de `mapped` aparece, chave dentro não aparece, `excludePrefixes`
corta. É o único mecanismo que sobrevive ao bloco para o item (c).

**Baseline medido, não herdado:** `pnpm lint` exit 0; `vitest run` **28 arquivos / 138 testes** (o
`state.md` registra 27/131 e está vencido). O gate remede e o executor trava sobre o número medido.

**A prova central é uma linha de config:** `pnpm lint` verde com o array `ignores` **vazio**.

**No navegador** (`/lotus-ui-review`): os quatro alvos antes e depois; o CTA da `BudgetsTable` nos
quatro casos, incluindo o que muda; wrap da toolbar a 390x844; `title` no nome truncado; espaçamento
da lista de vínculos.

**No e2e contra a API real:** `phone` forjado → 422 → o resumo aparece no `StudentDialog` **e** no
`RedatorDialog`.

**DoD:** `ignores` vazio com lint verde · `pnpm build` e `pnpm test` verdes · 422 de `phone` visível
nos dois diálogos · comportamento idêntico na tela **exceto** as quatro exceções declaradas (CTA da
`BudgetsTable`; campo de cliente vira texto em view/edit; lista de vínculos ganha espaçamento; nome
de arquivo ganha `title`).

## §7 — Fora de escopo

- Migração de `useRedatorForm` (ou qualquer hook) para `useCrudForm` — é o BD-5.
- Molde em `shared/ui` para os ramos de estado duplicados entre `BudgetDetailPage` e
  `TurmaDetailPage`.
- Qualquer regra de validação nova no backend.
- Estender a catraca de modo leitura para pegar a quarta grafia (`disabled` estático sozinho): o
  alcance da regra nova não foi medido e viraria trabalho de tamanho desconhecido dentro do bloco.
  O sítio que a motivou é corrigido aqui pela D3; a **forma** continua sem mecanismo.

## §8 — Riscos e limitações declaradas

1. **Margens estreitas.** `BudgetDetailPage` pousa em ~145 (folga 5) e `RedatorDialog` em ~129
   (folga 21). Comentário de justificativa acrescentado depois come a folga, e o commit que remove o
   `ignore` reprova o lint.
2. **Nada guarda as extrações.** Nenhum diálogo ganha teste de componente; a equivalência é visual e
   não sobrevive ao bloco como mecanismo.
3. **`StaffUserDialog` está em 150 exatas.** Qualquer padronização que encoste nele reprova o lint
   sem ninguém ter tocado num arquivo-alvo.
4. **Alcance fora do bloco.** `AppFileRow` alcança 4 consumidores que o BD-4 não abre; a moldura
   passa a servir 8 tabelas.
5. **A requisição inútil de `useStudentDetail` em edit continua saindo** (D4), por decisão.
6. **`mapped` literal do redator (D2) nasce sem guarda** — campo novo no payload não é acusado.

## §9 — Risco de review

**MÉDIO nesta spec; BAIXO pelo gate binário do `/revisar-sprint`** — divergência declarada, sem
conflito, mesmo caso do BD-3. Nenhum gatilho de ALTO se aplica: sem schema, `generated.ts`, Sanctum,
RBAC, dinheiro ou documento legal, e `executor: claude`. O risco próprio é de **alcance** (§8.4) e de
**margem** (§8.1).

**`executor: claude`**, sem `paths_autorizados`: o bloco decide apresentação em vários sítios,
atravessa a lei §5.6 e mexe no `eslint.config.js`, onde um bloco no lugar errado apaga seletor
existente **em silêncio** (Q-2 de 2026-08-04, reincidente no BD-3).

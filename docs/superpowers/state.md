---
schema_version: 1
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
resume_state: null
active_spec: null
active_plan: null
context_packet: null
blocker: null
last_completed_work_item: catraca-max-lines-e-moldura
state_basis_commit: 7c28699
updated_at: 2026-08-13T09:10:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Último item fechado — 2026-08-13 (`catraca-max-lines-e-moldura`, BD-4)

### Seleção — 2026-08-13

**BD-4 do `backlog.md:127`, promovido explicitamente pelo João** com o estado em `idle` e
`active_work_item` `null`. O gate do `/planejar-bloco` não promove; as três decisões dele fecharam o
gate: o slug `catraca-max-lines-e-moldura` (mesmo da branch já criada), **rota direta a
`ready_for_planning` sem Context Packet** por ausência medida de fonte externa, e a worktree
`/home/jvbat/projetos/fix-frontend` seguindo — bloco **frontend puro**, a P-03 não dispara.

A branch `feat/catraca-max-lines-e-moldura` já existia em `0c2a24b`, **com zero commit sobre a
`main`** e árvore limpa; isso não era divergência de estado, e `0c2a24b` passa a ser o
`state_basis_commit`.

### O terreno foi medido antes de desenhar, e achou cinco divergências

Medição de 2026-08-13 sobre `0c2a24b`, por workflow de 9 agentes lançado antes do `/clear`.
**Três dos quatro números da catraca estavam vencidos** — `StudentDialog` 281 (o backlog diz 283),
`RedatorDialog` 206 (diz 199), `BudgetDetailPage` 187 (diz 171); só `RedatorDocumentSlot` (175)
bate. Déficit real: **249 linhas a extrair**.

**A premissa do bloco é falsa:** ele não existe por causa do modo leitura do BD-3 — o BD-3 tocou o
`StudentDialog` num único commit (`dfc3f4b`) com saldo **−2 linhas**, e os dois blocos grandes vêm de
`501b731` (2026-08-05). **A justificativa da ordem também:** a adoção da moldura não tira linha de
diálogo nenhum, e as duas tabelas não estão na catraca.

**O DoD escrito não era provável:** não existe regra de validação de `phone` em nenhum DTO de
`Identity` (zero `Max(` na pasta; coluna `varchar(30)` sem unique; nenhum teste assere 422 em phone).

**Os dois diálogos do item (c) não são o mesmo caso:** `useStudentForm` roda sobre `useCrudForm` e já
entrega `errorSummary` pronto; `useRedatorForm` não usa `useCrudForm` e não tem o que espalhar.

E o ponteiro `FormErrorSummary.tsx:62-67`, citado 4× em doc normativo, **apontava para arquivo que não
existia** — o componente é export nomeado em `FormField.tsx`, e as linhas 62-67 de lá são do
`NestedField`, não do `FormErrorSummary` (que vive em `FormField.tsx:79-107`). Corrigido na Task 9
do BD-4 (2026-08-13): as citações vivas passaram a apontar para o destino real.

### Brainstorming e spec — 2026-08-13

Nove decisões do João (D1–D9), registradas na spec
`docs/superpowers/specs/archive/2026-08-13-catraca-max-lines-e-moldura-design.md`. As que mudam trabalho:
o 422 de `phone` provado por **request forjado** (backend intocado); o resumo do redator com `mapped`
**literal**, sem migrar o hook (o BD-5 já o excluiu por critério); o campo de cliente do
`StudentDialog` **colapsado** no molde do `BudgetDialog`, pagando a quarta grafia do débito BD-3 §4;
`useStudentDetail` **ficando no pai** para preservar a rede; **dois** arquivos novos no par do
redator; UI-01, os dois `<p>` e o `sp` morto **entrando**; overlays em vez dos ramos de estado no
`BudgetDetailPage`; o critério de CTA da moldura **vencendo** na `BudgetsTable`; e a rule reescrita
no mesmo commit que esvazia o `ignores`. Ordem escolhida: **catraca primeiro, moldura por último**.

**Uma conta apresentada no brainstorming estava errada e foi corrigida antes da spec:** o colapso do
campo de cliente não corta ~46 linhas, corta ~9 — `FormField` em modo leitura troca os **filhos
inteiros** (`readOnly ? <ReadOnlyValue/> : children`), então as 28 linhas de dica são create-only e
ficam, e o aviso `clientLocked` do modo edit **sumiria** se não saísse para fora do campo. Com a
conta certa, o corte do bloco de view sozinho deixaria o arquivo em 156 — acima da régua —, e por
isso o desenho extrai **dois** blocos do `StudentDialog` e **duas** seções do `RedatorDialog`.

**Risco de review declarado MÉDIO** na spec (§9), contra o BAIXO do gate binário da skill —
divergência declarada, sem conflito. O risco próprio é de alcance (`shared/ui` alcança 4 consumidores
fora do bloco; a moldura passa a servir 8 tabelas) e de margem (`BudgetDetailPage` pousa com folga
de ~5 linhas).

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-13-catraca-max-lines-e-moldura.md`: **dez tasks**, uma por commit, na
ordem testes do resumo → `StudentDialog` → slot → `RedatorDialog` → `BudgetDetailPage` (que **zera o
`ignores`** e reescreve a rule) → UI-01 → `BudgetsTable` → `TurmasTable` → docs → gate.

**Baseline medido, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` = **28
arquivos / 138 testes** — o número registrado neste arquivo até agora (27/131) estava vencido.
Projeção do plano: **29 arquivos / 142 testes** (3 casos do `FormErrorSummary`, 1 arquivo e 1 caso do
`AppFileRow`).

**Três coisas apareceram só ao escrever o plano, e duas mudam trabalho:**

1. **O `BudgetDetailPage` fica mais barato do que a spec projetou.** Os quatro overlays consomem o
   objeto `d` (`useBudgetDetail`) **inteiro**, que a página já tem, então a chamada de volta é de uma
   linha e `formatUf`/`AppCardTone` também ficam órfãos: **~136**, não ~145. A contingência da spec
   (extrair a prop `actions` do `DetailHeader`) vira reserva.
2. **O rótulo do modo leitura do campo de cliente precisa vir do pai.** Hoje o texto é
   `student?.current_client_name ?? t("student.noClient")` — se o filho derivasse o rótulo do
   `options`, view/edit cairia no travessão do `ReadOnlyValue`, que é o default certo para vazio e
   **não** é o texto atual. O filho recebe `readOnlyLabel` pronto e não conhece `StudentData`.
3. **Os testes novos do `FormErrorSummary` nascem verdes**, porque afirmam comportamento que já
   existe — então a Task 1 tem passo de sonda: com o filtro de `mapped` desligado à mão, o caso "não
   repete a chave que já aparece no campo" tem de reprovar, e a árvore volta limpa em seguida.

`executor: claude`, sem `paths_autorizados`: o bloco decide apresentação em vários sítios, atravessa
a lei §5.6 e mexe no `eslint.config.js`, onde bloco no lugar errado apaga seletor existente em
silêncio (Q-2 de 2026-08-04, reincidente no BD-3); a Task 5 ainda reescreve rule normativa.

**Estado: `ready_for_execution`.** `/executar-bloco catraca-max-lines-e-moldura` exige instrução
posterior do João.

### Execução — 2026-08-13: início

`/executar-bloco catraca-max-lines-e-moldura` validou as âncoras (spec, plano, `context_packet`
`null` coerente, Git limpo em `671bc94`, sem divergência) e abriu o gate main tree/worktree: bloco
frontend puro, `using-git-worktrees` normal — a worktree `/home/jvbat/projetos/fix-frontend` na
branch `feat/catraca-max-lines-e-moldura` já era o isolamento certo, sem criar nova.

**Mesmo conflito do `rastro-unicidade-e-gates` reapareceu, e foi resolvido do mesmo jeito:** o
plano recomenda `subagent-driven-development`; a sessão tem regra de não chamar o Agent tool sem
pedido. Escalado ao João via pergunta direta — **subagent-driven-development**, com Agent tool
autorizado para este bloco. Pre-flight scan do plano (10 tasks contra os Global Constraints e a
spec): limpo, sem conflito novo — as dívidas aceitas (D2 sem guarda, D4 requisição ociosa, D8
exceção de CTA) já são decisão declarada do João em §8 da spec, não achado a escalar aqui.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do `BD-3`, já fechado).

**Estado:** `executing`.

### Execução — 2026-08-13: fechamento

10 tasks do plano completas via SDD, cada uma com revisor de task independente. Dois loops de fix
durante a execução: Task 2 (`StudentClientField` devolvia `Fragment` quando devia devolver `<div>`
— o `<p>` do aviso `clientLocked` não era irmão direto da section no original, achado escalado ao
João, ele escolheu `<div>`); Task 9 (número esquecido em `backlog.md:143`). A catraca `max-lines`
fechou de fato — array `ignores` do bloco removido inteiro em `eslint.config.js` (Task 5), regra
vale sem exceção, `.claude/rules/frontend-fsliced.md:106` reescrito. `BudgetsTable`/`TurmasTable`
migraram para `SearchableTableFrame` (D8: CTA muda comportamento só no caso lista-vazia-com-termo,
verificado por álgebra exaustiva no review final). UI-01 corrigido (`AppFileRow` ganha `title`).

**Gate da Task 10 — Steps 1-4 provados** (lint/build/test verdes, 29 arquivos/142 testes, os 6
arquivos-alvo abaixo de 150, sem sonda/vazamento de camada/órfão). **Steps 5 e 6 (e2e do 422 de
`phone` contra API real, checagem visual `/lotus-ui-review`) NÃO executados** — bloqueio de
ambiente: nem o main tree (branch WIP alheia, 500 em `/api/students`) nem uma stack própria da
worktree (comando `docker compose up` bloqueado pelo classifier de auto mode) ficaram disponíveis.
Escalado ao João duas vezes; ele escolheu prosseguir sem essas duas provas. Débito explícito, não
maquiado — ver `.superpowers/sdd/task-10-report.md` Step 7.

**Review final de branch inteira** (opus, intervalo `0c2a24b..96d36ba`, depois `..d50d7f8`):
veredito inicial "Ready to merge: With fixes" — 3 achados Important, todos verificados
pessoalmente antes de agir: `SearchableTableFrame.tsx` sem `flex-wrap` (regressão de layout em
telas estreitas nas duas tabelas migradas, achado real de CSS, não hipótese) e duas entradas do
próprio `state.md` (aqui perto, §"Brainstorming e spec — 2026-08-13") que a Task 9 corrompeu com
um find-replace cego — achado histórico do ponteiro fantasma virou afirmação invertida, e a
descrição de uma spec ARQUIVADA (protegida por D9) passou a mentir sobre o que ela cita. Um fix
subagent corrigiu os dois (commits `eb9bc47`, `d50d7f8`); re-review confirmou ambos resolvidos na
raiz. **Veredito final: "Ready to merge: Yes."** Achados Minor (margem fina em dois arquivos
novos, nome `SlotBody.tsx` foge da convenção `Redator*`, D6 muda espaçamento do banner em ~16px,
`backlog.md:137` com racional que a spec provou falso, D8 sem guarda automatizada) ficam
registrados no ledger local, não bloqueiam.

**Estado:** `ready_for_review`. Próxima instrução aciona a revisão do trabalho ativo — este
comando não a inicia sozinho.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 4 achados

**BAIXO pelo gate binário da skill:** zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal gerado; `executor: claude`. A spec §9 declara MÉDIO por alcance
e margem — divergência declarada, sem conflito, como no BD-3. **Só lente Claude, sem Codex.**

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 142 testes** (a projeção do plano, exata); os **13** arquivos do bloco
abaixo de 150, o maior sendo `SlotBody` em 144; `ignores` do `max-lines` inexistente (só o
`globalIgnores` do topo e o `CATRACA_COR`, que é outra regra); zero `className="sp"`; zero
`primereact` em `features/`; `BudgetDetailPage.test.tsx` com **diff vazio**.

**A catraca foi provada nos dois sentidos (lição 10), não por lint verde:** 25 linhas em branco
apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar com
`File has too many lines (153). Maximum allowed is 150`, e a árvore volta limpa em seguida. Verde
sozinho não distinguiria "a régua vale" de "a regra parou de casar o glob".

**Órfãos: zero.** Os 7 componentes novos têm exatamente um consumidor cada, conferido por grep.

**As extrações foram conferidas linha a linha, não presumidas:** `StudentDetailSections` bate byte a
byte com `StudentDialog.tsx:172-278` do `0c2a24b`, com uma única divergência — o `sp` → `space-y-2`
da D6; `BudgetOverlays` e `BudgetStatCard` idênticos ao original; `SlotBody` preserva as duas
assimetrias medidas. **E a conferência que o `backlog.md:409-411` pedia foi feita:** todo campo em
`mapped` passa `error=` ao `FormField` nos dois diálogos, e `phone` não passa em nenhum — o resumo
não duplica erro de campo visível.

**A D8 foi confirmada por álgebra sobre o hook, não por leitura do JSX:** `useTableFilter.ts:98` é
`term !== '' || scoped.length !== items.length`, então lista crua vazia **com** termo digitado dá
`filtering: true` e o CTA aparece, onde o critério antigo (`budgets.length === 0`) o escondia. É o
único caso que diverge.

**Os quatro achados:**

1. **Q-1 🟡 P** — `RedatorDocumentsSection.tsx:37,69-70`: `removeDoc.error` **nunca é lido**. Um
   DELETE de documento do redator que falha deixa a linha na tela e não diz nada — vazio silencioso
   (D16) sobre dado que alimenta a idoneidade. O irmão `commercial` já resolve os dois no mesmo
   banner (`useBudgetDetail.ts:47`: `useMutationErrors([uploadFile.error, removeFile.error])`). O
   bloco reescreveu exatamente as duas linhas vizinhas (D6, `<p>` → banner) e passou ao lado da
   terceira. Não registrado em `backlog.md` nem em `pendencias.md`.
2. **Q-2 🟡 M** — o contrato "quem passa `filterSlot` passa um `clear` COMPOSTO"
   (`SearchableTableFrame.tsx:41-45`) é **prosa, não mecanismo**, e este bloco trouxe o terceiro
   consumidor: `BudgetsTable:63,67`, `TurmasTable:40,44` e `useHistorial:60,86` remontam o mesmo
   `clearAll` à mão. Esquecer produz um "Limpar filtros" que não devolve a lista — a mesma classe de
   falha silenciosa que o `filtering` do `useTableFilter` existiu para matar em 2026-08-03, quando
   estas duas tabelas erraram juntas. Pela lição 14 (instrução repetida três vezes quer mecanismo) e
   pela cláusula de reincidência da skill, **vira regra ou tipo, não refactor**: a moldura compondo
   por `onClearFilter`, o par virando tipo obrigatório, ou um `useStatusFilteredTable` em
   `shared/hooks`.
3. **Q-3 🟢 P** — `StudentDialog.tsx:115` introduz
   `options={clients.options as { label: string; value: number }[]}`. A fonte
   (`useStudentClients.ts:16`) devolve `value: c.id` com `ClientData.id` sendo `number | undefined`.
   A extração criou uma fronteira tipada e o cast é o que a atravessa; corrigir no dono do dado
   (filtrar/normalizar uma vez) elimina a asserção em vez de justificá-la em três linhas de
   comentário.
4. **Q-4 🟢 P** — `RedatorDocumentSlot.tsx:10-12` afirma que `preview` e `sizeError` "vivem no
   diálogo"; depois da Task 4 eles vivem em `RedatorDocumentsSection.tsx:38-39`. Lição 13 na forma
   exata, e a mesma classe do ponteiro fantasma que a Task 9 **deste bloco** existiu para corrigir.
   `repo-docs-refs` não pega: é comentário em `.tsx`, não doc normativo.

**O que NÃO virou achado, e por quê:** decisão consciente registrada não é achado — requisição
ociosa de `useStudentDetail` em edit (D4), `mapped` literal do redator sem guarda (D2), CTA da
`BudgetsTable` em lista-vazia-com-termo (D8), margem de 6 linhas do `SlotBody` (spec §8.1, no
ledger), `SlotBody.tsx` fora da convenção `Redator*` (ledger) e os números do `backlog.md` §Débitos
ainda descrevendo o estado pré-bloco (a baixa é do `/fechar-sprint`, por instrução do plano).

**Veredito: o bloco está bom.** Dez tasks, dez commits, nenhuma condicional mudou de forma, nenhum
`key` mudou de critério, e as quatro mudanças de tela são as quatro declaradas. Os quatro achados
são de acabamento e de mecanismo; nenhum é de correção.

### Correção dos achados — 2026-08-13: João aprovou os quatro

Triagem do João: **Q-1 a Q-4, todos**. Quatro commits, um por achado, na ordem do relatório.

**Q-1 (`3451976`)** — `RedatorDocumentsSection` adota o molde do `useBudgetDetail`:
`useMutationErrors([upload.error, removeDoc.error])` num banner só. A exclusão reprovada agora fala;
antes o documento reaparecia na linha e a tela ficava calada.

**Q-2 (`b4d1a50`) — virou tipo, não refactor,** que é o que a cláusula de reincidência pede. Das três
formas oferecidas no relatório (regra escrita, par obrigatório por tipo, `useStatusFilteredTable`),
a escolhida foi a do meio: `SearchableTableFrameProps` deixou de ser interface e virou
`SearchableTableFrameBaseProps<T> & FilterSlotProps`, com `FilterSlotProps` sendo
`{ filterSlot?: undefined; onClearFilter?: undefined } | { filterSlot: ReactNode; onClearFilter: () => void }`.
A composição saiu dos chamadores e entrou na moldura (`table.clear()` + `onClearFilter?.()`). Os três
consumidores (`BudgetsTable`, `TurmasTable`, `useHistorial`) pararam de remontar `clearAll` à mão —
o `useHistorial` passou a expor `clearStatusFilter` e devolve o `table` do hook intacto.
**Provado nas duas direções** (lição 10), não por lint verde: removi o `onClearFilter` da
`TurmasTable` mantendo o `filterSlot` e o `tsc -b` deu
`TS2322: Property 'onClearFilter' is missing ... but required in type '{ filterSlot: ReactNode; onClearFilter: () => void }'`;
restaurado, compila. O terceiro consumidor que motivou o achado é agora impossível de errar.
A regra ficou registrada no bullet "Tabela em card" de `.claude/rules/frontend-fsliced.md`.

**Q-3 (`ae52a6c`)** — `useStudentClients` descarta o `id` nulo com `flatMap` e devolve
`value: number` de verdade; o cast e as três linhas que o justificavam sumiram do `StudentDialog`.
Corrigido no dono do dado, não na fronteira.

**Q-4 (`20bc7e7`)** — docblock do `RedatorDocumentSlot` aponta para `RedatorDocumentsSection`.

**Gate reproduzido depois das correções:** `pnpm build` verde, `pnpm lint` exit 0,
`pnpm test` **29 arquivos / 142 testes** — mesmos números do fechamento da execução, nenhum teste
tocado. Os cinco componentes mexidos seguem sob a régua de 150 (maior: `HistorialTable`, 132).
A `SearchableTableFrame` foi a 164 linhas e isso é legítimo: a régua cobre
`src/features/*/components/**`, e a moldura é `shared/ui` — foi justamente ela que absorveu a
complexidade que estava espalhada em três features.

**Estado: `ready_for_closure`.** Nenhum achado aberto. O fechamento é passo explícito
(`/fechar-sprint`), não automático — e é lá que a baixa dos débitos do `backlog.md` acontece.

### Fechamento — 2026-08-13

A árvore já estava limpa em `7c28699` (as correções dos quatro achados entraram commitadas), que
passa a ser o `state_basis_commit` — diferente do fechamento anterior, aqui não houve trabalho
pendente a commitar antes de arquivar.

**O item 0 foi refeito contra a API real e PAGOU a dívida que a execução declarou.** Os Steps 5 e 6
do gate da Task 10 tinham ficado de fora por bloqueio de ambiente (500 em `/api/students` no main
tree, `docker compose up` recusado na worktree), com o João escolhendo prosseguir sem eles. No
fechamento a stack estava de pé e respondendo — `/api/students` sem cookie devolve **401**, não mais
500 —, então o Step 5 rodou: com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept` nos dois
lados), o payload forjado `"phone": []` devolveu **422 `application/problem+json`** com
`errors.phone` em `PUT /api/students/37` **e** em `PUT /api/redatores/1`, mensagem
`El campo teléfono debe ser una cadena de caracteres.`. É exatamente o insumo que o item (c) do
bloco mostra: `phone` não está em `mapped` em nenhum dos dois diálogos (`useStudentForm` o declara
em `summaryOnly`; o `RedatorDialog` passa a lista literal `['name', 'rut', 'email']`), então o 422
cai no `FormErrorSummary` em vez de sumir. **Ressalva escrita, não maquiada:** o `:8080` serve o
main tree, hoje na branch alheia `feat/contrato-de-entrada-identidade-e-nested`. O `phone` é
`string\|Optional\|null` no DTO e o 422 vem do cast do spatie/laravel-data, não de regra de formato;
`git diff main...HEAD -- backend/app/Domains/Identity/Data/` está **vazio** naquele tree, então o
caminho medido é o mesmo que a `main` percorre — mas a medição não é de uma stack limpa, e isso é
o custo da **P-03** aparecendo num bloco de frontend.

**A catraca foi provada no próprio fechamento, nos dois sentidos (lição 10), não herdada do
review:** 30 linhas em branco apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar
com `File has too many lines (154). Maximum allowed is 150`, e a árvore volta limpa em seguida.
Ferramentas: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **29 arquivos / 142 testes**. Os
seis alvos do plano pousaram em **124 / 125 / 34 / 133 / 105 / 116** linhas. Suíte backend, Pint e
`typescript:transform` são **N/A por escopo medido, não por suposição**: `git diff main...HEAD --
backend/` e `-- frontend/src/shared/types/generated.ts` devolvem **zero arquivo**, e rodar a suíte
no container mediria o código da outra branch, não este bloco.

**Um achado do próprio gate de código morto, corrigido no commit de fechamento:** o comentário de
`useStudentForm.ts:36-38` ainda dizia que "`StudentDialog` não tem FormErrorSummary: um 422 em
`phone` não aparece em lugar nenhum hoje". O bloco tornou a frase falsa ao adicionar o resumo em
`StudentDialog.tsx:74`, e o arquivo ficou **fora** do diff das dez tasks — lição 13 na forma exata,
mesma classe da Q-4 do review, um nível abaixo (comentário de hook, que a guarda `repo-docs-refs`
não alcança).

**Pendências: nenhum gatilho venceu.** A **P-34** (`COR_HARDCODED` fora de `src/app/**`) espera
bloco que toque o shell, e este não tocou — `src/app/` não aparece no diff. A **P-23** (formato do
`progress.md`) segue com revisão em 2026-09-30, e foi exercitada aqui ao mover a entrega mais antiga
para o `progress-archive.md`, que tem as três colunas que o `progress.md` fundiu. A **P-03** ganhou
uma linha: a ausência de compose por worktree custou dois passos de gate **num bloco de frontend**,
não de backend — a worktree não pôde subir stack própria e dependeu do main tree, que naquele
momento servia branch alheia quebrada. Nenhuma pendência nova nasceu: o que fica aberto deste bloco
é prova não executada, registrada no `progress.md`, não divergência entre doc e realidade.

**Arquivamento e histórico:** plano e spec foram para `plans/archive/` e `specs/archive/` (a spec
não é compartilhada por nenhum item futuro), com os ponteiros da narrativa acima e o da §Spec do
próprio plano atualizados. O `progress.md` recebeu a entrega e voltou a dez linhas, movendo
`Certificação · lote em Action e gate único de snapshot` (2026-08-10) para o `progress-archive.md`.
Do `backlog.md` saíram o **BD-4** e os **três débitos que ele cobria** — as 2 tabelas sem a
`SearchableTableFrame`, a catraca do `max-lines` e o `FormErrorSummary` ausente nos dois diálogos —,
mais a atualização da ordem (`BD-5 → BD-6`). O gatilho do trio da foto, que o BD-4 venceu, ficou
escrito no próprio BD-5. **Nada foi promovido:** o próximo item é escolha explícita do João.

**O que o fechamento NÃO provou, sem maquiagem:** o **Step 6 segue não executado** — nada foi visto
renderizado, então o wrap da toolbar a 390x844, os quatro casos de CTA da D8, o aviso `clientLocked`
sobrevivendo fora do `FormField` e o resumo com o 422 **na tela** continuam sem checagem visual. A
equivalência das extrações é literal e conferida linha a linha no review, mas não vira mecanismo:
nenhum diálogo tem teste de componente. D8 e D2 seguem sem guarda automatizada, por decisão
declarada na spec §8.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Penúltimo item fechado — 2026-08-13 (`rastro-unicidade-e-gates`)

### Seleção — 2026-08-12

**BD-8 do `backlog.md:208`, promovido explicitamente pelo João.** Ele abriu com
`/planejar-bloco BD-8 · Rastro, unicidade e gate no eixo de peso legal (achados 1+2+3)` e o gate do
comando **reprovou por dois motivos**, como em BD-1, BD-2 e BD-7:

1. Argumento é **título de seção**, não slug promovido, com o estado em `idle` e `active_work_item`
   `null`. O comando pode mostrar o backlog e pedir seleção; não pode promover.
2. Existia **item ativo em paralelo**: a worktree `/home/jvbat/projetos/fix-frontend`, na branch
   `feat/dialogos-faixa-visivel-acessibilidade`, carrega `faixa-visivel-e-acessibilidade-dos-dialogos`
   em `executing` (`updated_at` 14:48). A invariante de um `active_work_item` só precisava da mesma
   exceção declarada de 12-08.

**Três decisões do João fecharam o gate**, e as três ficam registradas porque nenhuma é default:
promover o BD-8 com o **paralelismo autorizado** (a outra frente é frontend, então a P-03 não
dispara contra este bloco de backend); **rota direta a `ready_for_planning`, sem Context Packet**,
por ausência medida de fonte externa — o bloco nasceu de revisão do próprio repositório e cita só
arquivos, ADR-17 e o relatório da revisão, sem Drive, Notion ou Figma; e o slug
`rastro-unicidade-e-gates`.

**A proposta foi commitada antes da promoção** (`e6c831f`, que passa a ser o `state_basis_commit`),
precedente de BD-1 e da estilização: BD-8 e BD-9 estavam só no working tree. Aquele commit carrega
junto o item 4 (Login) que o João já tinha pendente no mesmo arquivo — declarado na mensagem, não
misturado em silêncio.

**Toca backend e schema → main tree, sem worktree (P-03).** Branch `feat/rastro-unicidade-e-gates`,
criada de `18cf90a`.

### Terreno medido antes de desenhar (fato, não desenho)

1. **Os call-sites crus de pivot são exatamente cinco** — o grep de
   `->(sync|syncWithoutDetaching|attach|detach|toggle|updateExistingPivot)\(` em `app/` devolve as
   cinco linhas do achado e mais nada. A guarda estática nasce verde, sem allowlist além do próprio
   helper.
2. **O rastro de pivot não é fraco: não existe.** As 14 asserções sobre `audits` em `tests/` cobrem
   6 `auditable_type` e **dois** eventos (`deleted` 8×, `updated` 3×). Zero `sync`/`attach`/`detach`,
   zero sobre `turma` ou `redator`.
3. **A armadilha do `$auditInclude` do bloco anterior NÃO se aplica a pivot.**
   `Auditable.php:262` desvia para `getCustomEventAttributes()` quando `isCustomEvent`, então o
   filtro de atributos não zera o diff da relação.
4. **Mas existe outra, oposta:** `auditSync` com diff vazio zera os dois lados e **ainda dispara**
   (`Auditable.php:831-840`), e `config/audit.php:104` tem `empty_values => true`. Como
   `UpdateRedatorAction:66` roda `courses()->sync` em toda edição de redator, a `audits` ganharia
   linha vazia por salvada. É o que a D12 mata.
5. **O `version` tem três caminhos de escrita, não um:** `CourseTemplateController::store` (controller
   cru, sem Action nem transação), `CreateCourseAction:28-32` e `UpdateCourseAction:35-40`.
6. **O replace nested obriga `withTrashed()` na derivação.** `UpdateCourseAction:36` soft-deleta
   todos e recria; com `unique(course_id, version)` cru, `MAX` sobre vivos voltaria a 1 e o banco
   recusaria a segunda salvada.
7. **Um quarto caminho sem gate, que o relatório não listou e o código autodenuncia:**
   `DeleteTurmaAction.php:8-9` — "Home para futuras guardas do 6d (blindagem pós-conclusão RN-15) —
   hoje sem gate".
8. **Trocar a chave do erro é inerte na tela.** `frontend/src/shared/ui/FormField/FormField.tsx:79-107` renderiza qualquer
   chave sem input mapeado e `useMutationErrors` cai no primeiro valor do mapa. Só um teste afirma
   texto literal de gate (`EnrollmentResultTest:150-151`), e é a mensagem que **fica**.

### Brainstorming e spec — 2026-08-12

O João aprovou o desenho por seções (§1+§2, depois §3+§4). Oito decisões novas entram na spec como
D9–D16; as D1–D8 vêm fechadas do grilling e não foram reabertas.

**Quatro são escolha dele entre alternativas apresentadas:** `version` **imutável** com PUT editando
in-place (contra versionamento por linha nova); **Action única como escritor exclusivo** mais
`version` fora do `$fillable` (contra service solto e contra evento `creating`, que rodaria a trava
fora de transação e viraria no-op silencioso em SQLite); **`UpdateTurmaAction` fecha total sem
caminho de correção novo** — a pergunta que o backlog deixou aberta, respondida com o precedente da
conclusão terminal; e **helper que não grava audit em no-op** (contra aceitar o ruído e contra
curto-circuitar só a designação).

**Uma amplia o escopo por decisão dele:** o `DeleteTurmaAction` entra no gate, que passa de dez para
**onze** caminhos.

**Três são consequência declarada, não escolha:** a audit cai no model que o usuário tocou, então
`course_redator` passa a ter dois `auditable_type`; o gate mantém nome e mensagem **verbatim**
para não churnar os dois testes que afirmam o texto; e a sonda de concorrência MySQL fica **fora**,
porque aqui o `unique` é a defesa de integridade e a corrida degrada para 500, não para duplicata —
o `seq_in_budget`, mesmo padrão do mesmo ADR-17, também não tem sonda.

**Risco de review declarado ALTO** (§5 da spec): schema, peso legal e `generated.ts`.

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-12

**João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-12-rastro-unicidade-e-gates.md`: **sete tasks**, uma por commit, na
ordem helper → call-sites → guarda → índice → derivação → gate → fechamento. O índice vem **antes**
da derivação de propósito: sem ele, o `withTrashed()` não teria o que provar.

**Baseline medido antes de escrever (não herdado do bloco anterior):** 548 passed, 5 skipped, 2025
assertions. Projeção do plano: **+21 casos → 569**; assertions ficam para o gate medir.

**Duas coisas que só apareceram ao escrever o plano, e que mudam trabalho:**

1. **Tirar `version` do `$fillable` quebra sete sítios de teste** que criam template por mass
   assignment (`CourseModelTest`, `IssueCertificateTest`, `CertificateListingTest`,
   `CertificateEligibilityTest` e o `IssuableEnrollmentBuilder`). O vermelho é ruidoso
   (`NOT NULL constraint failed`), não silencioso, e a Task 5 traz o trait
   `Tests\Support\CreatesCertificateTemplates` para resolvê-lo por atribuição explícita.
2. **A recusa do `RemoveEnrollmentAction` nunca teve teste** — é um dos sete caminhos que a prova 11
   afirma cobrir. A Task 6 escreve o caso que falta, e ele nasce vermelho pela mensagem PT-BR antiga.

`executor: claude`, sem `paths_autorizados`: três gatilhos de lei do §5 (auditoria, schema com peso
legal, `generated.ts`) e quatro pontos que fecham por prova de mutação.

### Execução — 2026-08-12, via Subagent-Driven Development

O João escolheu **SDD (subagentes)** quando o `/executar-bloco` levantou o conflito entre a
prioridade do comando e a configuração de sessão. Cada task virou um agente implementador isolado
(brief extraído do plano, report próprio) seguido de um agente revisor dedicado. As seis tasks com
código fecharam **todas Approved**; a sétima é gate, sem commit.

- **Task 1** (`9ba3615`) — `App\Shared\Audit\PivotAudit` como fonte única da escrita de pivot
  auditada, comparando antes de delegar (D12).
- **Task 2** (`e67cbf4`) — os cinco call-sites convertidos, nas duas portas (`turma_redator` e
  `course_redator`).
- **Task 3** (`5ed6ed9`) — guarda estática: escrita crua de pivot em `app/` reprova, com allowlist
  de exatamente um arquivo.
- **Task 4** (`673cb25`) — migration `UNIQUE(course_id, version)` em `course_certificate_templates`.
- **Task 5** (`4aa077b`) — `CreateCertificateTemplateAction` derivando `MAX(version)+1` sob
  `lockForUpdate` com `withTrashed()`, `version` fora do `$fillable`, DTO em `int|Optional` e
  `generated.ts` regenerado.
- **Task 6** (`4586e6f`) — `assertAcademicallyWritable()` nos onze caminhos, nome e mensagem
  **verbatim**.
- **Task 7** — gate, verificação pura.

**Dois vermelhos de audit não discriminavam, e um deles teria passado falso.** As contagens literais
do brief incluíam a linha `created` que a própria fixture grava (`makeCourse()`, `Turma::create()`).
Na Task 1 isso reprovou o teste bom (`Failed asserting that 2 is identical to 1`); na Task 2 o
`assertSame(1, …)` **casava com a linha `created`** e passava contra o código velho. Corrigido nos
**testes**, filtrando por evento — `PivotAudit.php` não foi tocado para caber em asserção.

**Um vermelho da Task 5 não era o esperado.** Entre as 90 falhas do Step 8, 89 eram o
`NOT NULL constraint failed: course_certificate_templates.version` previsto; a de
`test_derivacao_conta_os_arquivados` era 422 do `required` pré-existente sobre `layout_config => []`.
Corrigido o **payload do teste**, não a regra de validação — afrouxar `required` seria mudança de
contrato não pedida.

**Gate (Task 7):** backend **569 passed, 5 skipped (2092 assertions)** — exatamente a projeção do
plano (548+21). Frontend 27 arquivos/131 testes, lint limpo, build verde; o diff de `frontend/`
contra a `main` são **só** os dois arquivos gerados, conferido — os 17/86 do registro anterior são do
gate do `last-login`, antes de merges posteriores na main. Pint `passed` nos 33 `.php` do bloco;
`typescript:transform` regenera com diff **zero**.

**E2E contra a API real: 7/7**, com sessão Sanctum viva. `version: 99` no payload produziu **3**;
MySQL recusou o par repetido (`Duplicate entry '8-90'`); designação real gravou audit com
`new_values` populado e a repetida gravou **zero** linhas (D12 provada onde precisa valer); D13
confirmada com os dois `auditable_type`; os quatro caminhos da RN-15 devolveram 422 +
`application/problem+json` + mensagem exata, sem mutar nada. Dois casos além do brief foram escritos
porque o status sozinho não provaria a afirmação: designar redator **já anexado** (se o gate rodasse
depois do `PivotAudit`, o diff vazio curto-circuitaria para 200) e redator **não habilitado**.

**Mutação declarada no banco de dev**, append-only e nomeada no ledger (course 8, budget 7, quote 9,
turma 5 criada para o gate, templates, dois `course_redator`, um `turma_redator`, files 20-22,
audits 460-481). **Nenhuma turma semeada foi concluída, apagada ou tocada.** Uma única linha
pré-existente mudou, aditiva e reversível: `course_ids` do redator 2 de `[2,3]` para `[2,3,8]`.
`LOT-2026-1001` reconferido corrompido, intocado. Nenhum `migrate:fresh`, `refresh`, `reset` ou
seeder rodou.

**O que o gate NÃO provou, sem maquiagem:** a derivação não tem prova de concorrência MySQL (D16,
escolha declarada — `lockForUpdate` é no-op em SQLite, onde a suíte roda, e o `unique` é a defesa de
integridade); 7 dos 11 caminhos da RN-15 só foram exercitados em SQLite; a cadeia
template → certificado não foi percorrida ponta a ponta, então "o resolver escolhe o template certo"
segue não provado; nenhuma tela vista renderizada (bloco de backend); **sem backfill (D2)** — o
rastro dos dois pivots começa aqui e o passado não é recuperável; a retenção de `audits` segue aberta
(P-02/P-30) e este bloco aumenta o volume.

### Achados abertos, para triagem do review — 2026-08-12

Os reviews de task fecharam Approved; estes seis ficaram registrados no ledger como Minor ou como
achado do próprio gate, e **nenhum foi corrigido**. Entram no `/revisar-sprint` como entrada, não
como pendência resolvida.

1. **Achado do gate, o mais grave da lista:** a audit de `sync` registra o **delta, não o conjunto**.
   O redator 2 já tinha os cursos 2 e 3 e `old_values` veio `{"courses":[]}` — o **estado** anterior
   não é reconstruível a partir da `audits`. Numa tabela de peso legal, é o que este bloco existia
   para consertar e consertou pela metade.
2. `HabilitacaoTest.php:267-284` —
   `test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync` **não discrimina**: `sync()` cru
   também não grava audit, então ele passa contra os dois códigos. Texto veio verbatim do plano; a
   D12 está provada de fato em `PivotAuditTest` e no e2e.
3. `PersistenceLawsTest` — a regex da guarda nova não tem o modificador `i`, e o dispatch de método
   em PHP é case-insensitive: `->Attach(` passaria. A guarda irmã do mesmo arquivo tem a mesma
   lacuna, então é estilo da casa, não defeito novo.
4. `tests/Support/CreatesCertificateTemplates.php:19-24` — engole chave desconhecida em silêncio;
   um `makeTemplate($id, ['validityMonths' => 24])` futuro gravaria o default e o teste passaria
   contra o default. Nenhum chamador atual está errado.
5. `CreateQuoteAction` ainda escreve `seq_in_budget` por mass assignment enquanto este bloco tirou
   `version` do `$fillable` — os dois consumidores do mesmo padrão do ADR-17 passam a defender a
   coluna derivada em profundidades diferentes.
6. Duas dívidas pré-existentes achadas e deliberadamente não corrigidas: validação `required` sobre
   o `redator_ids` read-only, e ~80 avisos de `Optional` no `typescript:transform`.

**Dois erros de ponteiro na spec, conferidos por mim no código, que não são defeito de código:** a
D14 afirma que **dois** testes congelam a string da RN-15, mas `IssueCertificateTest:107` afirma a
mensagem da **RN-08** (outro gate, condição oposta) — só o `EnrollmentResultTest:151` congela a
RN-15; e a spec justifica a troca de chave `status` → `turma` citando `FormErrorSummary.tsx:62-67`,
**arquivo que não existe** no repositório (a spec arquivada não foi corrigida — D9 do BD-4 proíbe
reescrever artefato fechado). A conclusão da spec sobrevive pelo mecanismo real:
`useMutationErrors` (`frontend/src/shared/hooks/useEntityForm.ts:54-63`) cai no primeiro valor do
mapa **independentemente da chave**, e `useConclusionSection.ts:15` consome esse `message`.

Ledger fino task-a-task em `.superpowers/sdd/progress.md` (local, não versionado).

**Estado: `ready_for_review`.** O review final de branch inteira **não foi rodado** — o João recusou
o despacho. Este comando não inicia review; a próxima instrução dele aciona `/revisar-sprint` sobre
o trabalho ativo, com a lista de seis achados acima como entrada.

### Review de sprint — 2026-08-12: ALTO risco, duas lentes, 6 achados

**ALTO RISCO pelo gate da skill, e a escala da spec (§5) concorda:** schema (índice novo),
auditoria/peso legal e `generated.ts`. Duas lentes — Claude com o gabarito do projeto mais revisão
independente do Codex (read-only, `mcp__codex__codex`, `model_reasoning_effort: high`).

**Gate reproduzido, não herdado do relatório de execução:** backend **569 passed, 5 skipped (2092
assertions)**; frontend **27 arquivos / 131 testes**, `pnpm lint` limpo e `pnpm build` verde; Pint
`{"tool":"pint","result":"passed"}` nos 33 `.php` do bloco; `typescript:transform` **sem diff**
(`git status --porcelain frontend/` vazio depois de rodar); nenhuma sonda `dd(`/`dump(`/
`console.log`/`SONDA` no diff de `backend/app` e `frontend/src`.

**Órfãos: zero.** `PivotAudit` tem os cinco call-sites previstos; `CreateCertificateTemplateAction`
tem os três (controller, `CreateCourseAction`, `UpdateCourseAction`); `CreatesCertificateTemplates`
é usada por cinco arquivos de teste; `assertAcademicallyWritable()` é chamada por **onze** Actions,
conferido por grep.

**Dois achados foram provados por sonda, não por leitura** (lição 10), com o controle rodado nos
dois sentidos e a árvore restaurada em seguida (`git status --porcelain` limpo).

**Os seis achados:**

1. **Q-1 🟡** *(Claude)* — a guarda nova do `PersistenceLawsTest` é **cega para a forma maiúscula**:
   o regex não tem `i` e o dispatch de método em PHP é case-insensitive. Sonda: um arquivo em
   `app/Shared/Audit/` com `->Sync([1, 2])` faz o caso **passar**; a mesma linha em minúscula o faz
   **reprovar**. E a varredura cobre só `app/`, enquanto a guarda irmã do mesmo arquivo varre
   `app/` **e** `database/` — correção feita no review de 2026-08-11 (Q-3) pelo argumento de que a
   lei não tem escopo. Medido: `database/` tem **zero** escrita de pivot hoje, então ampliar mantém
   verde. O docblock da guarda irmã escreve que "guarda que promete cobrir uma forma e não cobre é o
   defeito que este bloco existe para não repetir" — pelo gabarito (§lição institucionalizada) o
   argumento é de 🔴; fica 🟡 porque a forma que escapa (`->Sync(`) ninguém escreve.
2. **Q-2 🟡** *(Claude + gate)* — a audit de pivot grava o **delta, não o conjunto**.
   `PivotAudit` delega ao `auditSync`, e `Auditable::dispatchRelationAuditEvent`
   (`vendor/owen-it/laravel-auditing/src/Auditable.php:827-829`) grava `old->diff(new)` e
   `new->diff(old)`. Conferido no fonte do pacote, não presumido. Consequência: numa habilitação que
   só acrescenta, `old_values` vem `{"courses":[]}` e o estado anterior **não é reconstruível** a
   partir da linha; e com a D2 (sem backfill) também não é pela soma das linhas, porque o ponto de
   partida dos pivots que já existiam nunca foi gravado. Corrigir exige **não** usar o `auditSync`
   (o pacote calcula o diff dentro de método privado) — custo M/G, decisão do João.
3. **Q-3 🟢** *(Codex, verificado)* — pivot e audit **não são atômicos** nos três call-sites sem
   transação externa (`DesignateRedatorAction`, `RemoveRedatorAction`, `CourseRedatorController`):
   o pacote grava o pivot e só depois dispara o `AuditCustom`, então falha na escrita da audit deixa
   o pivot mudado sem rastro. Os dois de `Identity` já correm dentro de transação. Correção
   proporcional: `DB::transaction` dentro do próprio helper (aninha sem efeito nos dois que já têm).
4. **Q-4 🟢** *(Claude)* — `HabilitacaoTest.php:267-284`
   (`test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync`) **não discrimina** o mutante
   que mais importa. Sonda: devolvendo `->courses()->sync()` cru ao `UpdateRedatorAction:67`, o caso
   **passa** (2 assertions), enquanto o irmão `test_habilitacao_pelo_lado_do_redator_grava_audit_no_redator`
   **reprova**. Ele guarda a remoção da comparação (D12), não a remoção do helper. Correção P: no
   mesmo caso, um PUT que **muda** os cursos primeiro (1 audit) e o PUT idêntico depois (segue 1).
5. **Q-5 🟢** *(Claude)* — `tests/Support/CreatesCertificateTemplates.php:19-24` engole chave
   desconhecida em silêncio: `makeTemplate($id, ['validityMonths' => 24])` gravaria o default e o
   teste passaria contra o default. É a classe do `IssuableEnrollmentBuilder` (rule
   `backend-ddd.md` §Testes). Nenhum chamador atual está errado.
6. **Q-6 🟢** *(Claude)* — o gate pergunta `status === Concluida`, e as quatro grafias inline que ele
   substituiu perguntavam `status !== EmAndamento`. Hoje é a mesma condição (o `TurmaStatus` tem
   exatamente dois casos, conferido), mas a forma passou de fail-closed para **fail-open**: um
   terceiro estado futuro (`cancelada`) abriria os onze caminhos sem ninguém ver. A forma é anterior
   ao bloco (D14 congelou o método verbatim); o que o bloco fez foi estendê-la a mais quatro
   caminhos.

**Achados do Codex recusados, com a razão:**

- *"`lockForUpdate()` não cria mutex confiável quando ainda não há template — duas primeiras
  criações derivam versão 1 e uma termina em 500"* — em InnoDB/REPEATABLE READ o `SELECT … FOR
  UPDATE` com `where course_id = X` toma gap lock no índice, então a segunda transação bloqueia em
  vez de correr; e, mesmo se corresse, a **D16 declara exatamente essa degradação** ("aqui o
  `unique` é a defesa de integridade: sem lock a corrida vira 500, não duplicata"). Decisão
  consciente registrada não é achado.
- *"o gate lê o status sem travar a turma — corrida entre check e escrita"* — TOCTOU real em tese,
  mas a forma do `assertAcademicallyWritable()` é **anterior** ao bloco (D14 a congelou) e exigiria
  conclusão simultânea a uma escrita, com ~10 usuários internos e concorrência declarada baixa no
  `CLAUDE.md`. Não é defeito introduzido aqui; fica como nota, não como achado.

**Triagem do João — 2026-08-13: "aprovado de Q-1 à Q-6".** Os seis entraram; nenhum foi deferido.

### Correção dos achados — 2026-08-13

Cada correção foi provada por sonda, com a árvore restaurada em seguida (`git status` limpo entre
elas). O que a sonda mostrou, e não o que o código parecia dizer:

- **Q-1** — regex com `i` e varredura de `app/` **e** `database/` em `PersistenceLawsTest:145`.
  Duas sondas ao mesmo tempo (`app/Shared/Audit/SondaCaixa.php` com `->Sync([1,2])` e
  `database/seeders/SondaEscopo.php` com `->attach(1)`): a guarda corrigida reprova nomeando as
  duas; a guarda anterior, com as MESMAS sondas no lugar, passa verde.
- **Q-2** — `PivotAudit` deixou de delegar ao `auditSync` e passou a montar o `AuditCustom` à mão,
  com o CONJUNTO dos dois lados lido do banco antes e depois da escrita. Sonda: com o payload de
  volta na forma do delta, os três casos novos de conjunto reprovam e os dois casos de no-op (D12)
  seguem verdes — eles medem coisa diferente.
- **Q-3** — escrita e audit na mesma `DB::transaction`, dentro do helper: cobre os cinco call-sites
  de uma vez, e quem já abria transação (as duas Actions de redator) só ganha savepoint.
- **Q-4** — `HabilitacaoTest` passou a fazer duas edições, a segunda idêntica à primeira. Sonda:
  com `$redator->courses()->sync(...)` cru de volta na Action, o caso reprova (antes passava).
- **Q-5** — `makeTemplate()` estoura `InvalidArgumentException` em chave desconhecida.
- **Q-6** — o gate voltou à forma fail-closed `!== EmAndamento`. Sonda: com um terceiro caso no
  `TurmaStatus` (`cancelada`), a forma `=== Concluida` deixa a escrita acadêmica passar e a forma
  corrigida recusa. `TurmaCrudTest` ganhou uma guarda que varre `TurmaStatus::cases()`, então o
  status que alguém acrescentar amanhã cai nela sozinho.

**A Q-6 revelou um buraco anterior a ela, e é o achado desta rodada:** `Turma::create([...])` sem
`status` deixa a instância em memória com `status` NULO — o default `em_andamento` é do INSERT, não
do objeto. Enquanto o gate perguntava `=== Concluida`, esse nulo passava batido; com o fail-closed,
**sete casos da suíte reprovaram**, nenhum deles falando de conclusão. Corrigido no model
(`protected $attributes = ['status' => 'em_andamento']`), com guarda própria em `TurmaCrudTest`. A
forma antiga não estava só latente: escondia um caminho em que a RN-15 já não valia.

`.claude/rules/migrations.md` dizia "Pivot não audita sozinho: use `auditSync`" — a Q-2 tornou a
linha falsa e ela é carregada por quem tocar em schema. Reescrita apontando para o `PivotAudit`,
com a razão (delta vs. conjunto) junto.

**Gate reproduzido após as correções:** backend **573 passed, 5 skipped (2104 assertions)** — os 569
anteriores mais os quatro casos novos; Pint `passed` nos 7 arquivos tocados; `typescript:transform`
sem diff (nenhum DTO mudou); frontend intocado nesta rodada, então lint/build seguem valendo da
medição de 12-08.

**Estado: `ready_for_closure`.** O fechamento não roda sozinho — é chamada do João.

### Fechamento — 2026-08-13

**As correções do review estavam no working tree, não commitadas** — o último commit da branch era o
handoff para review (`bcac2d5`). O fechamento começou por commitá-las (`bd769f8`), que passa a ser o
`state_basis_commit`; a árvore ficou limpa antes de qualquer arquivamento.

**O item 0 foi refeito contra a API real, não herdado do review** — as correções entraram depois do
e2e de execução e mexeram exatamente no que ele mediu (helper, gate e model). Sessão Sanctum por
cookie + CSRF, `Origin` e `Accept` nos dois lados.

**O conjunto provado nas três portas, com o `auditable_type` do model tocado (D13):** designar o
redator 3 na turma 4 gravou `old {"redatores":[1]}` → `new [1,3]` (com o `auditSync` o `old` viria
`[]`, que é o defeito da Q-2); o `detach` gravou `[1,3]` → `[1]`; a habilitação pelo lado do curso
gravou em `course` (`[1,3,4]` → `[1,3,4,6]`); e o `PUT /api/redatores/2` gravou em `redator`
(`[2,3,8]` → `[1,2,3,8]`) **de dentro da transação externa da Action** — o savepoint da Q-3 não
quebrou o caminho. **As três repetições idênticas gravaram zero linha** (D12). Os pivots tocados
foram devolvidos ao estado original.

**A derivação foi discriminada, não só exercitada:** `version: 99` no payload produziu **92**; e o
`withTrashed()` foi medido arquivando a v92 e criando de novo — deu **93**, quando sem ele daria 92
e o `unique` estouraria. `INSERT` direto do par repetido recusado pelo banco
(`Duplicate entry '8-92'`).

**Seis caminhos da RN-15** em turma concluída devolveram **422 `application/problem+json`** com a
mensagem exata sob a chave `turma` (designar, `DELETE` da turma, `PUT` da turma, matricular, remover
matrícula e resultado acadêmico). O sétimo tentado, a importação, para na validação de `file` antes
do gate. **E o fail-closed não fechou o caminho normal:** a turma 6, criada da cotação 1 no próprio
gate, aceitou designação, matrícula e remoção de matrícula.

**Placar:** backend **573 passed, 5 skipped (2104 assertions)**; frontend **`pnpm lint` limpo e
`pnpm build` verde**; Pint `{"tool":"pint","result":"passed"}` nos **33** `.php` do bloco;
`typescript:transform` **sem diff** em `generated.ts`; nenhuma sonda no diff; órfãos zero
(`PivotAudit` com cinco call-sites, `assertAcademicallyWritable()` em onze Actions,
`CreatesCertificateTemplates` em cinco testes, `CreateCertificateTemplateAction` nos três caminhos);
resíduo de `auditSync` só em comentário.

**Mutação declarada no banco de dev**, append-only: turma 6, templates 9 e 11 (v92 arquivado, v93
vivo), audits 482-497 e um aluno de gate. `LOT-2026-1001` segue corrompido de propósito, intocado.

**Duas decisões do João no gate**, nenhuma default: a segunda `P-30` — a do `ámbar-aviso`, que veio
da branch de estilização e colidiu com a retenção de `login_logs` sem o merge acusar — seria
**renumerada para P-33**; e das três coisas abertas oferecidas para registro, só a assimetria do
`seq_in_budget` entrou, como **P-34**. O backfill (D2) e os avisos de `Optional` do
`typescript:transform` ficam sem linha própria por decisão dele.

**A primeira dessas duas foi desfeita pelo merge da `main`, e o parágrafo acima fica como está
porque história não se reescreve.** O fechamento do BD-3 já tinha resolvido o mesmo `P-30` duplicado
**pelo critério oposto** — quem renumera é a linha que chegou à `main` por último, então quem virou
`P-33` foi a retenção de `login_logs`, e o `ámbar-aviso` **ficou com o P-30**. Aquela decisão foi
publicada na `main` (PR #43) antes desta branch mesclar; esta ainda não tinha saído. Reverter a
publicada quebraria as referências que já vivem lá, então **a da `main` prevalece**: a renumeração
deste fechamento foi desfeita e a pendência nova do `seq_in_budget` passou de `P-34` — número que a
`main` já tinha dado à lacuna de alcance da catraca `COR_HARDCODED` — para **P-35**.

**O que o fechamento NÃO provou, sem maquiagem:** a derivação segue sem prova de concorrência MySQL
(D16, escolha declarada); 5 dos 11 caminhos da RN-15 só foram exercitados em SQLite; a cadeia
template → certificado não foi percorrida ponta a ponta; nenhuma tela vista renderizada; e **sem
backfill** — o rastro dos dois pivots começa aqui.

**Estado:** `idle`. Nada foi promovido — a escolha do próximo item é do João, no `backlog.md`.
## Antepenúltimo item fechado — 2026-08-12 (`faixa-visivel-e-acessibilidade-dos-dialogos`, BD-3)

### Seleção — 2026-08-12: o item entra com a spec já escrita, e é isso que muda a fase

**BD-3 do `backlog.md:57`, promovido explicitamente pelo João** com o estado em `idle`, pelo título
literal da seção (`/planejar-bloco do ### BD-3 · Faixa visível e acessibilidade dos diálogos
(fronteira shared/ui)`) — mesmo precedente de BD-1, BD-2 e BD-7: o argumento é título de seção, não
slug promovido, e quem promove é ele, não o comando.

**A diferença deste bloco para todos os anteriores: a spec já existia antes da promoção, e não por
acidente.** `docs/superpowers/specs/2026-08-12-faixa-visivel-e-acessibilidade-dos-dialogos-design.md`
foi gravada em `397548c`, cuja mensagem é literalmente `docs(spec): desenho do BD-3 escrito e NAO
promovido`. Ela carrega os seis itens e as **oito decisões da §2 já tomadas pelo João**. Isso **não é
divergência de estado**: `active_spec: null` e `workflow_state: idle` eram a redação correta de "spec
escrita, bloco não promovido", e o próprio documento abre declarando isso. O gate foi conferido nos
dois sentidos antes de qualquer escrita — `plans/` só tem `archive/`, então `active_plan: null`
também era coerente.

**Por que não foi promovido na época, e por que pode ser agora:** a spec parou porque
`estilizacao-adr16-shell-tipografia` seguia `executing`, e promover o BD-3 violaria a invariante de
um `active_work_item` só — além de o item 6 escrever variáveis de tema contra uma folha Lara-Lotus
que vivia só naquela branch. **As duas travas caíram:** a estilização entrou na `main` pelo PR #41
(`0b72dba`) e o `last-login` pelo PR #42 (`18cf90a`). O estado está `idle` com
`last_completed_work_item: last-login` — nenhum item concorrente.

### A remedição que a própria spec exigia foi feita, e o resultado é o oposto do temido

A spec declarava que todo número da §4.1, §5.1, §6 e §7.3 fora medido contra `main`@`4b02b72` e
**precisava ser remedido antes de executar**, porque a branch da estilização mexera em `AppButton`,
`AppHeader`, `AppSidebar` e na camada de cor. Remedido contra `18cf90a`, e a tabela completa está no
cabeçalho da spec. O resumo:

- **41 sítios de `disabled={readOnly}` em 10 arquivos** — idênticos, arquivo a arquivo;
- **`AppDataTable.tsx:83-84` e `:106`, `SearchableTableFrame.tsx:103-104` e `:115`,
  `AppErrorState.tsx:36`** — todos na linha exata;
- **os 35 hits de cor nos 9 diálogos** — idênticos, com a contagem por arquivo batendo uma a uma;
- **7 das 9 montagens condicionais da §3.1 na linha exata**; só `BudgetDetailPage` deslocou
  (`:126`/`:140` → `:132`/`:136`);
- **duas correções de número:** `UsersTable` de `25,28` para `26,29` (o `last-login` inseriu coluna) e
  o total dos `ignores` da §7.3 de **24 para 23**, porque a estilização baixou o `LoginPage` de 3
  ocorrências para 2.

**A colisão prevista não existiu.** `git diff 4b02b72..18cf90a -- frontend/src/` toca 47 arquivos e
**nenhum** deles é `AppDialog`, `AppDataTable`, `SearchableTableFrame`, `FormField`, `AppErrorState`,
nem qualquer um dos 9 diálogos ou dos 10 arquivos do modo leitura. Os arquivos que a estilização
tocou e que este bloco cita (`LoginForm`, `LoginPage`, `ValidationPage`) são exatamente os que a **D7
deixa de fora** e a §7.3 põe em `ignores`. **As oito decisões da §2 seguem íntegras** — eram
independentes da base, e a medição confirma.

**Um efeito a favor:** o item 6 ficou mais barato. As variáveis que ele passa a usar
(`--text-color-secondary`, `--surface-border`) agora vivem no tema Lotus gerado
(`shared/styles/themes/lara-{light,dark}-lotus.css` + `brand-theme.css`), entregue pelo PR #41 — antes
eram as do Lara stock.

### Isolamento — worktree por instrução do João, não por P-03

Bloco frontend puro (zero schema, zero `generated.ts`, zero backend), então a **P-03 não dispara** —
ela restringe worktree apenas em bloco de backend. A escolha de worktree é instrução dele
(`Criando uma branch e liberando a main para worktree principal`): branch
`feat/dialogos-faixa-visivel-acessibilidade` criada de `main`@`18cf90a` na worktree
`/home/jvbat/projetos/fix-frontend`, o que devolve a `main` à árvore principal
`/home/jvbat/projetos/lotus`, que estava presa em `feat/last-login`.

### Context Packet — dispensado por ausência medida de fonte externa

`context_packet: null`, e a razão é a que a própria spec já registrava: nenhum dos seis itens cita
Drive, Notion ou Figma. As fontes são o repositório, os débitos versionados do `backlog.md` (os três
do piloto UI, `Q-14`, `Q-15`, o CTA duplicado e a cor fora do corte do D18) e o `D18`, que é decisão
de spec versionada (`specs/archive/2026-07-26-bloco-visual-refino-ui-design.md:395`). Confirmar na
abertura do brainstorming, como nos precedentes.

### Fase: `planning`, com o brainstorming reduzido ao que a base nova abriu

O estado entra em `planning` no commit `0533303`, junto do primeiro artefato durável desta sessão — a
remedição da spec. `active_plan` seguiu `null` até o plano existir. **Risco de review declarado na §9
da spec: MÉDIO** — nenhum gatilho de ALTO se aplica (sem schema, `generated.ts`, Sanctum, RBAC,
dinheiro ou documento legal), e os dois riscos próprios são de alcance: `shared/ui` toca todas as
telas de uma vez, e o modo leitura atravessa 10 arquivos de 5 features.

### Spec aprovada e plano escrito — 2026-08-12

**O brainstorming foi curto por construção, e as duas perguntas que sobraram foram feitas em vez de
presumidas.** O João respondeu que **já leu a spec e a aprova** — as oito decisões da §2 são dele e o
documento escrito passou pela leitura —, e **dispensou o Context Packet**, confirmando a ausência
medida de fonte externa (nenhum dos seis itens cita Drive, Notion ou Figma). Nada foi
complementado na spec além da remedição, porque a base nova não abriu decisão nova: ela mudou dois
números e não tocou um único arquivo-alvo.

**Uma medição desfez um bloqueio herdado dos quatro blocos anteriores.** De 2026-08-08 a 2026-08-10 o
fechamento registrou "WSL sem browser utilizável" e empurrou o checkpoint visual para o João. Isso
**não vale mais**: `playwright-cli` está no PATH e `.artifacts/ui-review/` tem run de 2026-08-12. O
DoD do BD-3 é comportamento na tela, e ele é executável — o que torna a Task 8 um gate de verdade em
vez de uma limitação declarada.

O plano (`docs/superpowers/plans/2026-08-12-faixa-visivel-e-acessibilidade-dos-dialogos.md`) decompõe
o bloco em **8 tasks**: `AppDialog` (foco + nome do maximizar); o kit `FormField`/`NestedField` com
modo leitura; a adoção nos 40 sítios; a faixa visível; o CTA único; Q-14 e Q-15; cor pelo tema mais as
duas regras de lint; gate.

**O item 2 virou duas tasks, não uma.** O mecanismo (kit) é rejeitável por um revisor que aprove a
adoção, e vice-versa — é exatamente onde a fronteira de task deve cair. A adoção também é o único
lugar do bloco com decisão por sítio: dropdown mostra rótulo traduzido, não o código cru.

**A escrita do plano achou uma lacuna no próprio rascunho, corrigida antes de gravar:** o Q-14 depende
de o `onRetry` devolver a promise, e `onRetry` é declarado em **três** camadas — `AppErrorStateProps`,
`AppDataTableProps` e `SearchableTableFrameProps`. Mudar só a primeira **compilaria**: TypeScript
aceita atribuir `() => Promise<T>` a uma prop `() => void`, então a promise chegaria em runtime com as
camadas do meio mentindo sobre o contrato, e o build passaria verde. As três entram no plano.

**Baseline medido, não herdado:** `pnpm test` = **27 arquivos / 131 testes** em `18cf90a`; lint e
build verdes. Projeção do plano: **28 arquivos / 137 testes** — o kit de leitura (5) e o retorno do
`refetch` (1). Só duas tasks ganham teste automatizado, e a razão está declarada: componente com
PrimeReact no jsdom está fora do corte do runner, então foco, `aria-label`, largura, CTA e feedback de
retry provam no navegador ou não provam.

**Handoff: `executor: claude`**, sem `paths_autorizados`. O bloco fecha por leitura de sonda no
navegador e por decisão de apresentação em 40 sítios; e a Task 7 mexe em `eslint.config.js`, onde um
bloco no lugar errado apaga seletores existentes **em silêncio** (Q-2 de 2026-08-04).

**Estado:** `ready_for_execution`. `/executar-bloco faixa-visivel-e-acessibilidade-dos-dialogos` exige
instrução posterior do João.

### Execução — 2026-08-12: as 7 tasks de código fecharam, em commits próprios

`main..HEAD` = 14 commits, sendo 12 de código e 2 de documento (`0533303` promoveu o bloco,
`b1de7c0` gravou o plano, `f8b862c` marcou a transição para `executing`). O diff do bloco é
**33 arquivos, +1884/−211**, todos sob `frontend/src`.

Task 1 (`956c55b`) devolveu o foco ao disparador e nomeou o maximizar no `AppDialog`. Task 2
(`3ee3039`) deu modo leitura ao kit `FormField`/`NestedField`, com 5 testes novos. Task 3
(`69801b0`, emendada em `6962182`) adotou o modo leitura nos 40 sítios — a emenda corrigiu o
placement do `eslint-disable` no `ContactCard`, onde o `disabled` fica em linha própria e
`eslint-disable-next-line` não o cobria. Task 4 (`158823b`) resolveu a faixa desligando o
`thead` sem linhas: zerar só a largura mínima não bastava, porque os seis `<th>` com `px-4 py-2.5`
têm largura intrínseca própria e sustentavam a tabela sozinhos. Task 5 (`1095989`, emendada em
`36c6847`) tirou o CTA duplicado; a emenda é a parte que importa — o critério virou
`!table.filtering && rows.length === 0`, porque busca sem resultado **não** é lista vazia e o
critério cru fazia o CTA sumir também durante a busca. Task 6 (`ecbf4a7`) fechou Q-14 e Q-15.
Task 7 (`d64ed09`, emendada em `2e2deb2`) escreveu as duas regras de lint; a emenda é o risco que o
plano previu se concretizando — as regras novas nasceram em blocos `files` próprios que casavam o
mesmo glob e **apagavam em silêncio** o `no-restricted-syntax` existente (Q-2 de 2026-08-04), e a
correção foi fundi-las nos arrays já existentes. `9f38492` corrigiu o Tailwind do `readOnlyValue`.

### Gate da Task 8 — 2026-08-12: os seis provados no navegador, nenhum defeito, 5 achados B

**Steps 1–4, medidos e não herdados:** `pnpm test` = **28 arquivos / 137 testes** — bate exatamente
com a projeção do plano —, lint limpo e build verde. `git diff main...HEAD --stat -- backend/
frontend/src/shared/types/generated.ts` vazio; nenhuma sonda (`console.log`/`debugger`/`SONDA`) no
diff; nenhum `from 'primereact` em `src/features`.

**Step 5:** `/lotus-ui-review` numa passada, sessão `bd3-gate-task8` do `playwright-cli` 0.1.18 em
Chromium headed, login manual do João como admin. Quatro páginas (`/comercial`, `/cursos`,
`/personas`, `/administracion`) nas três viewports. Relatório em
`.artifacts/ui-review/2026-08-12T19-41-45-bd3-gate-task8/report.txt`, com 7 evidências ao lado —
o diretório é gitignored (`.gitignore:25`), então este commit é o artefato durável da transição.
Árvore limpa antes e depois, em `9f38492`; **zero mutação** (0 POST/PUT/PATCH/DELETE na corrida) e
zero mudança de código.

Os seis itens passaram, com sonda e não com impressão: foco de volta ao gatilho exato
(`aria-label="View"`, dentro da `<tr>`) em **12/12** combinações, por Escape e depois de
maximizar/restaurar, também no tema escuro; `aria-label` do maximizar alternando
"Maximize dialog" ↔ "Restore dialog" nas 4 páginas; **zero** `input`/`textarea` de texto nos
diálogos, com valor inteiro quebrando linha e campo vazio como "—"; wrapper da tabela com
`scrollWidth == clientWidth` (276 e 261) a 390x844 e documento sem rolagem horizontal em 12/12;
exatamente **1** CTA em 12/12, e **zero** sobre o estado de erro; Q-14 com o botão em
`p-disabled p-button-loading` por ~38 ms e **1 clique = 1 GET, duplo clique = 1 GET**; Q-15 com o
rodapé lido no instante do GET dizendo `Loading...`, nunca "0", assentando em "4 clients"; e todas
as superfícies, textos e ações do `ClientDialog` trocando de valor entre claro e escuro.

**Duas notas de método, porque o caminho não foi o óbvio.** `docker stop lotus-nginx-1` foi **negado
pelo classificador de permissão** desta sessão, e offline emulado **não serve**: o TanStack Query
trata rede offline como `fetchStatus: "paused"` (networkMode `online`) e nunca produz estado de
erro. O estado de erro veio de `Network.setBlockedURLs` restrito a
`http://localhost:8080/api/clients*` — servidor inalcançável para uma chamada, sem interceptar rota
e sem fabricar resposta. Vale registrar para o próximo bloco que precisar de erro na tela.

**Step 6, o que NÃO ficou provado:** lista genuinamente vazia (esvaziá-la exigiria mutação, proibida
pela skill) — o ramo do CTA dentro do `AppEmptyState` de domínio fica coberto só por código
(`SearchableTableFrame.tsx:125`) e pelo ramo irmão de erro, esse sim observado ao vivo; mutações;
estado de erro fora de `/comercial`; tema escuro fora de `/comercial`; Q-14/Q-15 fora de 1440x900;
travessia completa por Tab. E a limitação que a spec §8 já declarava continua valendo: **foco,
`aria-label`, largura, CTA e feedback de retry não ganham teste automatizado** — o único mecanismo
que sobrevive ao bloco é o lint da Task 7, e ele só vê cor e `disabled={readOnly}`.

**Cinco achados B, zero C.** UI-01: nome de arquivo truncado sem `title` nem quebra a 390x844
(`RedatorDialog`, seção DOCUMENTS). UI-02: `src/app/layouts/Sidebar/` tem 3 classes `text-slate-*`
que **nenhum bloco** do `eslint.config.js` cobre — `COR_HARDCODED` só roda em `features/**` e
`shared/**` —, nem convertidas nem declaradas na `CATRACA_COR`; é lacuna de alcance criada por este
bloco, não regressão visual. UI-03: "3 course(s)" e "1 user(s)" contra "4 clients"/"7
instructors"/"6 budgets", em duas das sete tabelas. UI-04: com o menu recolhido (390), o rótulo sai
do DOM e sobra só `title` — sem hover no toque. UI-05: cada montagem de página com abas busca as
**duas** abas. UI-01, UI-03, UI-04 e UI-05 são pré-existentes ao diff.

**Estado:** `ready_for_review`. O review do bloco (`/revisar-sprint`) exige instrução do João; o foco
declarado no plano é um só — **onde a mudança de `shared/ui` alcança tela que este bloco não abriu, e
o que ela faz lá.** Risco de review: **MÉDIO**.

### Review de sprint — 2026-08-12: BAIXO risco, uma lente, 5 achados, todos corrigidos

**BAIXO RISCO pelo gate da skill**, e aqui as duas escalas **divergem sem conflito**: a §9 da spec
declara MÉDIO, a do `/revisar-sprint` é binária e nenhum gatilho de ALTO se aplica (sem schema,
`generated.ts`, auth, RBAC, dinheiro, documento legal; `executor: claude`). Uma lente — Claude com o
gabarito do projeto —, **sem Codex**.

**Gate reproduzido, não herdado:** `pnpm test` **28 arquivos / 137 testes**, lint limpo, build verde;
`git diff main...HEAD -- backend/ generated.ts` vazio; zero sonda; zero `from 'primereact` em
`src/features`. **Órfãos: zero.** As 40 conversões seguem um molde só, o dropdown mostra rótulo e não
código cru, e a fusão das regras nos arrays existentes (`2e2deb2`) é a correção certa do merge raso.

**Os cinco achados são todos do foco declarado no plano** — o que `shared/ui` faz na tela que o bloco
não abriu. Decisão do João: **os cinco entram**, corrigidos na mesma sessão.

1. **Q-1 🟡 — o débito do modo leitura foi medido por STRING, não por forma.** A §4.1 achou 41 sítios
   perguntando por `disabled={readOnly}`; a mesma pergunta feita pela forma do defeito acha **17 a
   mais**, e o seletor entregue não via nenhum deles: `disabled={f.readOnly}` (MemberExpression, 4× em
   `TurmaConfigCard`), `disabled={readOnly || !isCreate}` (LogicalExpression, `BudgetDialog`) e o par
   **estático** `<AppInputText value={…} disabled readOnly />` (12×, sendo 11 na certificação — código,
   RUT, nome do curso e motivo de revogação de snapshot congelado, dado de peso legal truncado num
   input cinza). É a **2ª vez** que uma catraca deste `eslint.config.js` nasce medindo enumeração em
   vez de forma (a 1ª foi a lista literal de features, Q-5 de 2026-08-04, citada no topo do próprio
   arquivo).
2. **Q-2 🟡 — o Q-14 atravessava por acidente.** O plano alargou `onRetry` nas **três** camadas de
   `shared/ui` e não nas **dez** de feature entre a página e a moldura; nas 5 telas CRUD a promise
   passava por baixo do tipo `() => void`, e em `OperationPage` (2×) e `StudentDialog` o
   `void x.refetch()` a **apagava** — Reintentar sem feedback e duplo clique disparando dois GETs, em
   telas que o gate não abriu.
3. **Q-3 🟡 — o ramo de `loading` ficou fora das duas condições novas.** Durante o GET inicial a lista
   também está vazia: o `<thead>` sumia e voltava (as 14 tabelas) e o CTA de cadastro **não existia em
   lugar nenhum** da tela até o GET responder. É a classe que a decisão do Q-15 recusou três linhas
   acima, ao manter a faixa do rodapé sempre montada.
4. **Q-4 🟢 — `COR_HARDCODED` não rodava em `src/shared/**`**, que é justamente a camada onde a cor
   deve vir do tema e onde um wrapper alcança todas as telas.
5. **Q-5 🟢 — a fórmula do vermelho virou string mágica em 13 arquivos** (19 cópias): o bloco trocou
   uma cor sem dono (`text-red-600`) por outra cor sem dono.

**Como cada correção foi provada:**

| Achado | Correção | Prova |
|---|---|---|
| Q-1 | seletor por forma (`:has(Identifier[name="readOnly"])`) + seletor novo para o par estático; os 17 sítios convertidos; `children` do `FormField`/`NestedField` vira **opcional** (campo que nasce só-leitura não tem controle a montar) | as duas regras vistas **vermelhas** com mutação (`disabled={form.readOnly}` e `<input disabled readOnly/>`), e um teste novo do `FormField` sem filho — **138 testes** |
| Q-2 | as 10 props de feature passam a `() => void \| Promise<unknown>`; os 3 sítios devolvem a promise; `BudgetsTable.retry` vira `Promise.all` das duas recargas | o alargamento **quebrou o build em 7 lugares** (`() => unknown` da fonte não é assinável) — o tipo mentia na raiz, em `ListableResource.refetch`, corrigido para `() => Promise<unknown>` |
| Q-3 | `thead` só some com `!hasRows && !loading`; CTA só some com `!loading`; `BudgetsTable` ganha `busy` (as duas queries) | a largura mínima segue zerada sempre que não há linha — o ganho do estado vazio a 390px não regride; conferido no código, **não** re-observado no navegador |
| Q-4 | `COR_HARDCODED` entra no bloco de `src/shared/**` | **nasce verde** (zero classe de paleta em `src/shared`, medido) e reprova a reintrodução na mutação. `src/app/**` fica fora **por exceção declarada** — o shell é aprovação do João de 2026-07-26, registrada no `backlog.md` |
| Q-5 | `shared/styles/tokens.ts` com `dangerText`/`dangerSurface`/`warningText`/`warningSurface` + `infoText`/`successText` (o mapa de tons do `AppCard` inteiro) | build verde com as 19 cópias substituídas; nenhuma `color-mix` literal sobra em `.tsx` |

**Gate depois das correções:** **28 arquivos / 138 testes** (o teste novo do `FormField`), `pnpm lint`
limpo, `pnpm build` verde. Diff das correções: **34 arquivos, +263/−131**, com `tokens.ts` novo.

**O que as correções NÃO provaram, sem maquiagem:** **nada foi re-observado no navegador.** As
mudanças do Q-3 mexem no estado de carregamento das 14 tabelas e o Q-1 mudou 5 diálogos que o gate da
Task 8 não abriu (`ConfirmIssueDialog`, `CertificateViewDialog`, `RevokeDialog` pelo
`CertificateIdentityFields`, `TurmaConfigCard`, `BudgetDialog`) — a prova aqui é tipo, lint com
mutação nos dois sentidos e suíte. **O `/lotus-ui-review` precisa rodar de novo antes do fechamento**,
com foco em `/operacion`, `/certificados` e no estado de carregamento das listas. `AppPhotoField.onRetry`
segue `() => void` de propósito: é re-upload bufferizado do `useEntityPhoto`, não passa pelo
`AppErrorState` e não tem promise a aguardar.

**Proposta de regra ainda NÃO decidida pelo João** (padrão reincidente do Q-1): parágrafo em
`.claude/rules/frontend-fsliced.md` — *catraca nova mede a própria população com o seletor dela, nunca
com o grep que originou o débito; grep acha a grafia, o seletor acha o defeito.*

### Gate de fechamento — 2026-08-12

**Um defeito de processo foi achado antes do checklist e corrigido dentro dele.** As correções dos
cinco achados do review estavam **sem commit** — 33 arquivos modificados, `tokens.ts` untracked e a
transição `ready_for_review → ready_for_closure` só na working tree —, o que fere a invariante de
mudança de estado entrar no mesmo commit do artefato que a prova. O diff foi conferido contra a
narrativa do review antes de gravar (as duas catracas por forma, `!loading` nas duas condições,
`COR_HARDCODED` em `src/shared/**`, `tokens.ts` com as 19 cópias substituídas) e entrou em `dfc3f4b`,
que é o `state_basis_commit` deste fechamento.

**Item 0 refeito no navegador, não herdado do review.** As correções mexeram no estado de
carregamento das 14 tabelas (Q-3) e em 5 diálogos que o gate da Task 8 nunca abriu (Q-1), e o review
declarou por escrito que o `/lotus-ui-review` teria de rodar de novo. Rodou: sessão `bd3-closure`
(Playwright CLI 0.1.18, Chromium headed, login manual do João), jornada delimitada a `/operacion` e
`/certificados` nas três viewports, com foco no carregamento das listas e nos diálogos de leitura.
Relatório e 10 evidências em `.artifacts/ui-review/2026-08-12T21-30-00-bd3-closure/` (diretório
gitignored — este commit é o artefato durável). **Zero mutação** (26 requisições à API, todas GET),
zero mudança de código, árvore limpa antes e depois em `dfc3f4b`.

**O que a passada provou com sonda:** `TurmaConfigCard` e `CertificateViewDialog` com
`document.querySelectorAll('input,textarea').length === 0` e o valor inteiro em texto — RUT
`16.200.022-5` e `Seguridad en alta tensión` legíveis por completo até 390x844, ausência como `—`;
o `<thead>` **montado durante o GET** nas duas listas (`theads:1`, `theadHidden:0`) com o rodapé
lendo `Loading...` e assentando em `5 classes` e `4 valid · 0 expiring · 0 expired · 1 revoked`;
foco de volta ao `BUTTON[aria-label="View"]` dentro da `<tr>` nas três viewports;
`documentElement.scrollWidth == clientWidth` a 1024 e 390, com o diálogo em 716.8 px e 370.5 px sem
transbordo.

**A prova do Q-14 saiu melhor do que a do gate anterior, e por acidente feliz.** O gate da Task 8
precisou de `Network.setBlockedURLs` para alcançar estado de erro; aqui o erro veio **real**, do
banco: `GET /api/certificates/2` responde **500** porque o `LOT-2026-1001` está corrompido de
propósito desde um bloco anterior. Com RTT medido de 116 ms, o botão Reintentar ficou
`p-disabled p-button-loading` em **91/91** amostras a 4 ms, com 1 clique = 1 GET e duplo clique =
1 GET. No mesmo estado, o token `dangerText` foi medido invertendo com a folha —
`srgb 0.76 0.244 0.237` no claro contra `srgb 1 0.446 0.415` no escuro —, que é o Q-5 e o item 6
provados juntos.

**O que o fechamento NÃO provou, sem maquiagem:** lista genuinamente vazia (esvaziá-la exige
mutação); `ConfirmIssueDialog` e `IssuedDialog` — o primeiro fica a **um clique da emissão de
documento de peso legal** e o segundo só existe depois dela, então nenhum se alcança sem mutação, e
a garantia deles é que usam o mesmo `<FormField readOnly value={…}>` provado em três outros sítios;
`BudgetDialog`; travessia completa por Tab; tema escuro fora de 1440x900. E a limitação estrutural
segue de pé: **foco, `aria-label`, largura, CTA e feedback de retry não têm teste automatizado** —
componente com PrimeReact no jsdom está fora do corte do runner, e o único mecanismo que sobrevive
ao bloco é o lint da Task 7, que enxerga cor e `disabled`, não comportamento.

**Placar do gate:** frontend **28 arquivos / 138 testes**, `pnpm lint` sem saída, `pnpm build`
verde; backend **569 passed, 5 skipped (2092 assertions)** — rodado apesar de o bloco não ter uma
linha de `backend/`; Pint **N/A** (zero `.php` no diff); `generated.ts` sem diff e nenhum DTO
tocado; zero sonda; zero `from 'primereact` em `src/features`; zero import cruzado entre features;
órfãos zero (os 6 símbolos de `tokens.ts` todos consumidos).

**Três decisões que o gate levantou e o João fechou re-invocando o comando**, aplicadas por
precedente e declaradas aqui para poder ser vetadas: (1) o **`P-30` duplicado** foi desfeito
renumerando a linha da retenção de `login_logs` para **P-33**, pelo mesmo critério que renumerou a
segunda `P-28` para `P-32` — a linha do `ámbar-aviso` chegou à `main` primeiro (`e6460f9`, PR #41) e
esta veio depois (`656175c`), então quem renumera é a recém-chegada; as menções a "P-30" na
narrativa do `last-login` **ficam como estão**, porque história não se reescreve. (2) A lacuna de
alcance da catraca de cor — `COR_HARDCODED` não roda em `src/app/**`, onde vivem 3 classes
`text-slate-*` do `Sidebar/` — virou **P-34**, com o motivo (exceção do shell, aprovada em
2026-07-26) já escrito no comentário do `eslint.config.js` para não voltar como esquecimento. (3) A
**regra proposta entrou** em `.claude/rules/frontend-fsliced.md`: *catraca nova mede a própria
população com o seletor dela, nunca com o grep que originou o débito.* Precedente: a P-25 fechou do
mesmo jeito, escrevendo o parágrafo na mesma rule durante um `/fechar-sprint`.

**Seis achados B de UI, todos pré-existentes ao diff**, foram para `## Débitos técnicos` do
`backlog.md` em vez de morrerem no relatório: nome de arquivo truncado sem `title` a 390
(`RedatorDialog`), plural cru em duas das sete tabelas ("3 course(s)"), rótulo do menu recolhido só
em `title` (sem hover no toque), página com abas buscando as duas abas, bloco de erro bilíngue com
`aluno.name` cru na tela e a célula de aluno vazia na linha do certificado corrompido — esta última
a única que o modo leitura do próprio bloco já sabia resolver, com o travessão.

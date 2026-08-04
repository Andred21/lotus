# Spec — Hardening estrutural pré-Sprint 4

- **Work item:** `hardening-estrutural-pre-sprint-4` (item 1 do `backlog.md`, selecionado pelo João em 2026-08-03)
- **Context packet:** `docs/superpowers/context-packets/hardening-estrutural-pre-sprint-4.md` (`status: ready`)
- **Fontes:** packet (Notion `H.3.1` + `H.4.1`–`H.4.9`, Drive sem documento específico), código de `backend/app/Domains/` e `frontend/src/`, `docs/pendencias.md` (P-03, P-04), `.claude/rules/frontend-fsliced.md`, `CLAUDE.md` §5
- **Base:** `main`, commit `1331f3a`

---

## §1 — Problema

`Certification` vai ser escrito na Sprint 4. Hoje ele é um domínio de backend com **zero imports**
e uma pasta de frontend vazia — ou seja, nasce inteiro sob as regras que existirem no dia em que
alguém começar a escrevê-lo. As regras que deveriam guiá-lo são hoje **parágrafo, não mecanismo**:

- a direção de dependência entre domínios do backend nunca foi declarada em lugar nenhum;
- a lei §5.6 (features não importam PrimeReact direto nem outra feature) é texto em `CLAUDE.md`
  e em `.claude/rules/frontend-fsliced.md`, sem nada que reprove;
- as abstrações compartilhadas do frontend (`useTableFilter`, 8 consumidores; `useCrudPage`, 7)
  não têm um único teste — o frontend não tem test runner, e todo DoD dos últimos 6 blocos foi
  prova visual do João.

Isso é a P-04 (`docs/pendencias.md`), aberta desde 2026-07-23, com gatilho em **2026-08-15**:
"leis invioláveis são instrução, não guardrail". A lição 14 já foi paga três vezes neste projeto —
instrução repetida vira mecanismo ou vira retrabalho.

**Critério do corte, decidido pelo João:** bloqueante = *o que fica caro de corrigir depois*, não
*o que impede escrever Certification*. Sob esse critério o bloco entrega mecanismo permanente e
recusa refactor de conveniência.

---

## §2 — Escopo

**Entra:**

| Task | Entrega |
|---|---|
| **H.4.1** | Matriz de dependências entre domínios do backend, classificada import a import, e `DomainDependencyTest` (PHPUnit) que a faz valer |
| **H.4.2** | As 3 fronteiras do frontend viram `no-restricted-imports`: `primereact` fora de `shared/ui`, feature→feature, `shared`→feature |
| **H.4.3** | `vitest` + `jsdom` + Testing Library, com testes de regressão de `useTableFilter` e `useCrudPage` |
| **Achado** | Empty state errado em `TurmasTable`/`BudgetsTable` (§7), encontrado pelo João durante este brainstorming |

**Fica fora, nominalmente:** H.3.1 (ownership de rotas nested), H.4.4 (`SearchableTableFrame`),
H.4.5 (aliases `useXPage`), H.4.6 (DTO sem service locator), H.4.7 (helper multipart),
H.4.8 (paridade de traduções), H.4.9 (builders de teste backend). Nenhum cobra juros por esperar
Certification. Os sinais de aceite de cada um estão no packet §External acceptance signals e não
se perdem no arquivamento desta spec.

**Fora de escopo por decisão do backlog:** Repository sobre Eloquent, CRUD base genérico, tabela
universal, split massivo de DTOs, split físico dos locales.

---

## §3 — Decisões

### D1 — O bloco entrega mecanismo, não refactor

Um tipo de entrega só. Nenhuma extração de componente, nenhuma mudança de contrato de API,
nenhuma migration. O que muda de comportamento visível é apenas o achado da §7, que apareceu
durante o próprio brainstorming e cabe porque é a mesma invariante que o teste novo guarda.

### D2 — H.4.1 é classificação, não catraca

O João recusou congelar o grafo atual como baseline cega. Os 42 imports cross-domain foram lidos e
classificados. **Resultado: nenhum é acoplamento indevido.** Eles caem em três formas:

| Forma | Exemplos | Base |
|---|---|---|
| Fluxo do processo (cotação → turma → matrícula) | `Operation→Commercial\Models\Quote` (4), `Operation→Catalog\Models\Course` (2), `Operation→Commercial\Enums\QuoteStatus` (2) | é a cadeia de negócio do Lotus |
| Identity é dono de pessoa | `Operation→Identity\Models\Redator` (7), `Operation→Identity\Services\StudentResolver`/`StudentResolution`/`StudentLookup` (4), `Commercial→Identity\Services\UserProvisioner`/`UserPhotoService` (4), `Identity→Commercial\Models\Client` (7) | quem cria/resolve `User`/`Student` é Identity; os outros chamam o serviço em vez de duplicar a regra |
| Relação Eloquent inversa | `Identity\Models\Student→Operation\Models\Enrollment`, `Commercial\Models\Quote→Operation\Models\Turma`, `Identity\Data\StudentTurmaData→Operation\Models\Enrollment` + `Operation\Enums\EnrollmentApprovalStatus` | ADR-02 permite relação/projeção justificada; o alternativo seria Repository, proibido pela lei §5.1 |

Portanto o entregável de H.4.1 **não é corrigir import** — é declarar o que já é verdade e impedir
que deixe de ser.

### D3 — Regra A: superfície pública de domínio

Um domínio só enxerga `Models`, `Enums` e `Services` de outro. As outras 7 camadas
(`Actions`, `Data`, `Http`, `Exceptions`, `Policies`, `QueryBuilders`, `Support`) são internas.

Custo zero hoje: os 42 imports cross-domain atingem **apenas** essas 3 camadas — `Models` (29),
`Services` (8), `Enums` (5). A regra descreve um contrato que já existe de fato e nunca foi escrito.
É ela que impede o erro mais provável ao escrever Certification: chamar `Action` de outro domínio
em vez do serviço.

### D4 — Regra B: arestas declaradas por classe alvo

Dentro da superfície, só passam os pares declarados. Granularidade **por classe alvo** (decisão do
João), não por par de domínios: import novo de classe já listada passa livre; classe nova de outro
domínio reprova e exige declarar. São **21 pares** para **42 imports**:

```
Catalog    → Identity\Models\Redator
Commercial → Catalog\Models\Course · Identity\Models\User · Identity\Services\UserPhotoService
             Identity\Services\UserProvisioner · Operation\Models\Turma
Identity   → Catalog\Models\Course · Commercial\Models\Client
             Operation\Models\Enrollment · Operation\Enums\EnrollmentApprovalStatus
Operation  → Catalog\Models\Course · Commercial\Models\Client · Commercial\Models\Quote
             Commercial\Enums\QuoteStatus · Identity\Models\Redator · Identity\Models\Student
             Identity\Enums\RedatorDocumentType · Identity\Enums\StudentResolutionOutcome
             Identity\Services\StudentLookup · Identity\Services\StudentResolution
             Identity\Services\StudentResolver
```

`Certification` entra com **zero arestas**. Todo import dele exigirá decisão explícita — que é
exatamente o alvo "antes da Sprint 4".

### D5 — Mecanismo em PHPUnit próprio, sem instalar Pest

Pest **não está instalado**: a suíte são 75 arquivos sob `phpunit/phpunit ^12.5`. Instalar Pest +
`pest-plugin-arch` trocaria o runner do backend inteiro dentro de um bloco que já traz o vitest do
outro lado. O teste é `backend/tests/Feature/Shared/DomainDependencyTest.php`, varrendo
`app/Domains/**` por `^use App\Domains\`. Precedente exato na casa: `PermissionI18nParityTest` já
varre arquivos do disco para guardar um invariante.

Consequência: P-04 nomeia "Pest Arch tests"; a substância é entregue por outro meio (D15).

### D6 — A matriz mora no teste; o doc aponta para ela

Fonte única em código, dentro do `DomainDependencyTest`. `docs/estrutura-monolito.md` ganha a
**regra** (superfície pública + arestas declaradas) e aponta para o teste como fonte da lista, em
vez de repeti-la. Repetir a lista no doc reproduziria a lição 13 — doc que descreve intenção
não-construída foi o Q-1 do bloco anterior.

### D7 — H.4.2 com `no-restricted-imports` nativo, sem `eslint-boundaries`

P-04 nomeia `eslint-boundaries`. Ele traria um modelo de camadas declarativo que este projeto não
precisa: são 3 fronteiras, não uma hierarquia. A regra nativa cobre as 3 sem dependência nova, e é
consistente com como o projeto já fez `no-restricted-syntax` e `max-lines`.

```js
const FEATURES = ['catalog', 'certification', 'commercial', 'identity', 'operation']
```

1. `src/features/**` não importa `primereact` nem `primereact/*`
2. cada `src/features/<f>/**` não importa as outras 4 — `@features/<outra>`, `@features/<outra>/*`
   e `**/features/<outra>/**` (o último cobre caminho relativo, hoje inexistente)
3. `src/shared/**` não importa `@features/*` nem `**/features/**`

`features/certification` já existe no frontend e nasce coberto.

### D8 — Blocos de config separados, zero `ignores`

Cada regra em seu próprio bloco, nunca fundida com `no-restricted-syntax` nem com `max-lines`:
`ignores` compartilhado reabre catraca alheia em silêncio (Q-1 de `abstracao-componentes-catalog`).

As 3 fronteiras estão **limpas hoje** — 0 `primereact` fora de `shared/ui`, 0 cross-feature,
0 `shared`→feature. A regra nasce **sem catraca**, diferente das duas anteriores. Se alguma sonda
revelar violação real, isso é achado do bloco, não exceção a registrar.

### D9 — `app/` fica fora da regra feature→feature

`app/router/AppRouter.tsx` importa 5 features, e é o trabalho dele: compor rotas. A lei §5.6 fala
de features entre si. `app/` não importa `primereact` hoje e não é alvo desta regra.

### D10 — Infra de teste: vitest + jsdom + Testing Library v16

Config dentro do `vite.config.ts` existente (`environment: 'jsdom'`), **sem `globals`** — cada
arquivo importa `describe`/`it`/`expect` de `vitest`, o que mantém os testes type-checados pelo
`tsc -b` do `pnpm build` em vez de virarem zona sem tipo. Sem `@testing-library/jest-dom`: não há
asserção de DOM neste corte. Testes colocalizados (`src/shared/hooks/useTableFilter.test.ts`).
Scripts novos: `pnpm test` (`vitest run`) e `pnpm test:watch`.

### D11 — Os testes cobrem 2 hooks, não componentes

`useCrudPage` recebe `ListableResource<T>` **tipado por estrutura**; um objeto literal satisfaz o
contrato. Não é preciso `QueryClientProvider`, TanStack nem mock de rede.

Componentes de `shared/ui` ficam fora: arrastariam PrimeReact para dentro do jsdom, com risco de o
bloco virar briga com ambiente em vez de prova de comportamento.

### D12 — O achado da §7 é reproduzido antes de corrigido

Duas causas possíveis (§7). O fix não sai antes da reprodução nomear qual — `systematic-debugging`,
não chute com duas hipóteses.

### D13 — A prova visual volta, pequena

O bloco nasceu com a tese "zero pixel muda". O achado da §7 a derruba: duas telas passam a mostrar
o empty state correto. Isso exige checkpoint visual do João em **Operação** e **Presupuestos** —
não a bateria completa dos blocos de refactor.

### D14 — Branch no main tree, sem worktree

O bloco toca `backend/` (P-03), `eslint.config.js` e `vite.config.ts`, que valem para o repositório
inteiro, e o DoD se prova contra o `docker compose` do main tree.

### D15 — P-04 encolhe, não fecha

O bloco entrega a substância de P-04 para a fronteira de dependência (backend) e para a lei §5.6
(frontend). Continuam **sem mecanismo** a lei §5.1 (DDD-lite sem Repository sobre Eloquent) e a
§5.2 (auditoria só na aplicação, nunca em trigger). P-04 permanece aberta, com o texto atualizado
para refletir o que passou a existir, e o gatilho de **2026-08-15** intacto.

---

## §4 — Invariantes de comportamento

O que **não** pode mudar:

1. Os 42 imports cross-domain atuais continuam passando — o teste novo é verde no estado presente.
2. Nenhum arquivo de `app/Domains/` muda de conteúdo por causa de H.4.1. A entrega é teste + doc.
3. Nenhuma feature do frontend ganha ou perde import por causa de H.4.2. `pnpm lint` verde antes e
   depois, com as regras novas ativas e **sem** `ignores`.
4. O contrato público de `useTableFilter` não muda: `filtering` é **adição**, e os 8 consumidores
   que não a usam seguem sem tocar uma linha.
5. `useCrudPage` não muda — só ganha testes.
6. `generated.ts`, os 3 locales, o schema, o RBAC e qualquer rota de API ficam **intocados**.
7. Suíte backend em **372 passed (1360 assertions)**, igual à baseline.
8. Nenhuma tela muda, exceto as duas da §7 e apenas no empty state.

---

## §5 — Definition of done

Cada item é comportamento provado, nunca pacote instalado (lei §5.8).

| # | Prova |
|---|---|
| 1 | `DomainDependencyTest` **reprova** import proibido: sonda com `use App\Domains\Identity\Actions\CreateStudentAction` dentro de `Operation` (viola Regra A) e sonda com classe não declarada (viola Regra B). As duas revertidas, árvore limpa |
| 2 | O mesmo teste **passa** no estado atual, com os 42 imports batendo as 21 classes da matriz |
| 3 | `pnpm lint` **reprova** as 3 sondas: `primereact` em `features/`, `@features/commercial` dentro de `catalog`, `@features/*` dentro de `shared/`. Nenhuma delas dispara em import legítimo (`@shared/ui` numa feature, `@features/*` em `app/router`). Sondas apagadas |
| 4 | `pnpm test` verde, e **cada** teste visto vermelho contra o hook quebrado no ponto que ele guarda (clamp removido; `error:` fixado em `null`; `entity` congelada no `setDialog`) |
| 5 | Empty state provado pelo João: lista vazia sem filtro → "Nenhuma turma ainda" / equivalente em Presupuestos; filtro real sem resultado → "Sem resultados para os filtros aplicados" |
| 6 | Regressão: suíte backend **372 passed (1360 assertions)**, `pnpm build` + `pnpm lint` verdes, Pint nos arquivos PHP tocados |
| 7 | `git diff main...HEAD` vazio para `generated.ts`, `locales/`, `backend/database/` |

**Testes de `useTableFilter`** (8 consumidores):

1. sem `searchable`, digitar não filtra — a aba Alumnos depende disso
2. `where` roda antes da busca
3. busca case-insensitive, campo `null`/`undefined` não quebra e não casa
4. `onFilterChange` volta para a página 0
5. clamp do estado durante o render: lista encolhe com `first` além do fim → volta a 0 e **não
   reaparece** quando a lista cresce de novo
6. `clear()` zera termo e página
7. `filtering` é `true` com termo, `true` com `where`, `false` sem nenhum dos dois (§7)

**Testes de `useCrudPage`** (7 consumidores):

1. entidade derivada, nunca congelada: trocar `items` com o diálogo aberto atualiza `dialog.entity`
2. erro ≠ vazio (D16): `isError` → `error` truthy; sucesso com `data: []` → `error` `null`
3. erro de rede sem `ProblemDetails` ainda sobe truthy
4. `openViewById` com id ausente: `entity` `null`, e aparece quando a lista chega
5. `startEdit` não entra em `edit` sem entidade

---

## §6 — Riscos

- **`Certification` com zero arestas pode virar atrito em vez de guardrail.** Se cada import parar
  o trabalho, a tentação é abrir a matriz no automático. Mitigação: a matriz é dado declarado num
  lugar só; ampliá-la é 1 linha + justificativa no commit — barato de fazer certo, visível quando
  feito errado.
- **`jsdom` + React 19 + Testing Library v16** é a única combinação de versões nova do bloco. Se
  brigar, o fallback é `happy-dom`; se os dois brigarem, isso vira achado do bloco, não contorno
  silencioso.
- **A regra da matriz espelhada em doc pode envelhecer** (lição 13). Mitigação: o doc aponta para o
  teste como fonte em vez de repetir a lista (D6).
- **O fix da §7 pode ter causa diferente das duas hipóteses.** Por isso D12 exige reprodução antes
  do fix; se a causa for uma terceira, a spec é atualizada antes de a task seguir.

---

## §7 — Achado da tela (empty state de `TurmasTable`/`BudgetsTable`)

Encontrado pelo João durante este brainstorming, com print da tela de Operação.

**Sintoma:** dropdown de estado exibindo **"Todos"** e busca vazia, mas a tabela mostra
"Sem resultados para os filtros aplicados" + "Limpar filtros" + rodapé "0 turmas" — em vez de
"Nenhuma turma ainda". Confirmado pelo i18n: são as chaves `common.noResultsFiltered` e
`common.noResultsFilteredHint`, ou seja, o ramo `filtering === true`.

**Leitura:** com busca vazia, `table.term === ''`, então `filtering` só pode ser `true` se
`status !== null` — enquanto a UI afirma que nenhum filtro de estado está ativo. **Estado e tela
discordam.**

**Duas causas possíveis, não decididas sem reprodução:**

1. o `onChange` do Dropdown entrega `undefined` (não `null`) ao selecionar "Todos". Aí
   `status !== null` é `true` e o `where` passa a comparar `turmaDisplayStatus(turma) === undefined`,
   que nenhuma linha satisfaz — o que produz exatamente o rodapé "0 turmas" do print;
2. `status` guarda resto de seleção anterior que o Dropdown exibe como "Todos" por comparação frouxa.

**O mesmo defeito existe em dois arquivos:** `TurmasTable.tsx:26-38` e `BudgetsTable.tsx:47`
repetem `{ value: null }`, `status === null ? undefined : fn` e
`filtering = table.term !== '' || status !== null`.

**Por que cabe neste bloco:** a pergunta "estou filtrando?" está **duplicada e reimplementada com
comparação estrita** em duas telas, enquanto `useTableFilter` já tem a informação (`where` foi
passado ou não). Subir `filtering` para o hook mata a duplicação e torna a invariante testável no
nível do hook — dentro do corte da D11.

**Entrega:** (a) reprodução nomeia a causa (D12); (b) normalização na fronteira do Dropdown nas
duas telas; (c) `useTableFilter` expõe `filtering`, consumido pelas duas; (d) teste 7 de
`useTableFilter`; (e) prova visual do João nas duas telas (D13).

**O que este achado não é:** não é bug de `useTableFilter`. O hook recebe `where: undefined` ou
`where: fn` e se comporta corretamente nos dois casos. Um teste de hook, sozinho, **não pegaria**
esse defeito — pegá-lo no nível da tela exigiria teste de componente com PrimeReact no jsdom, que a
D11 recusa. É por isso que a invariante sobe para o hook em vez de o teste descer para a tela.

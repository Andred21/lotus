# Spec — Hardening · tabela e testes pré-Sprint 4 (H.4.4, H.4.5, H.4.9)

> Work item: `hardening-tabela-e-testes-pre-sprint-4` · Packet:
> `docs/superpowers/context-packets/hardening-tabela-e-testes-pre-sprint-4.md` ·
> Aprovada pelo João em 2026-08-04.

## §1 · O que este bloco é

O **terceiro e último recorte** do item 1 do `backlog.md`. Os dois blocos de 2026-08-04 entregaram
H.4.1–H.4.3 e H.3.1/H.4.6/H.4.7/H.4.8; restam **H.4.4, H.4.5 e H.4.9**, e as três entram. Fechado o
bloco, o item 1 sai do backlog inteiro.

**Nenhuma das três corrige defeito visível.** As três são repetição medida: 5 tabelas com a mesma
moldura, 7 aliases sem justificativa escrita, 49 arquivos de teste repetindo o mesmo setup. O DoD,
portanto, **não é suíte verde** — é comportamento idêntico provado na tela (H.4.4), guardrail visto
reprovando com sonda fresca (H.4.5) e placar de suíte inalterado (H.4.9).

### A medição contradisse o Notion pela quinta vez no projeto (lição 13)

1. **A dependência `H.4.5 → H.4.4` declarada no Notion não vale no estado atual.** O que resta do
   H.4.5 é fechar o escape de um seletor ESLint sobre `features/*/hooks/`; o H.4.4 é markup de
   tabela em `features/*/components/`. As duas não se tocam, e a ordem entre elas é livre. A
   dependência supunha que o H.4.4 mudaria a forma das páginas, e ele não muda: as páginas seguem
   chamando o alias e passando o resultado à tabela.
2. **H.4.4 não são "9 tabelas equivalentes".** São 932 linhas em 9 arquivos, mas em três grupos:
   **5** busca-só estruturalmente idênticas, **2** com dropdown de filtro por cima (`BudgetsTable`,
   `TurmasTable`) e **2** fora do padrão (`RolesTable` não tem busca; `EnrollmentTable` não tem
   toolbar). Nenhuma passa da régua de 150 do `max-lines` — a maior é `TurmasTable`, 148. É
   repetição entre arquivos, não arquivo inchado, e a saída é moldura compartilhada, não extração
   de bloco coeso.
3. **H.4.5 se resolve ao contrário do enunciado**, o que já estava registrado no fechamento anterior
   e o packet reconcilia sem decidir: eliminar os 7 aliases moveria a query para as 4 páginas e
   **passaria no lint**, porque o seletor casa `budgetsApi.useList()` e não `useCrudPage(budgetsApi)`.
   A resposta é justificar os aliases e fechar o escape.

### Números medidos, base do corte

| Medida | Valor | Como foi medido |
|---|---|---|
| Tabelas busca-só idênticas | 5 | leitura das 9, diff só em `searchable`, ícone, 3 chaves i18n e `footerCount` |
| Aliases `useXPage` | 7, 6 linhas cada | `find`; corpo é `return useCrudPage(<x>Api)`, zero orquestração |
| Aliases com JSDoc hoje | 0 | `grep '/\*\*'` nos 7 |
| Arquivos de teste no repo | 78 | `find backend/tests -name '*.php'` |
| Arquivos com o bloco cliente+usuário | 43 | `grep -l "type' => 'cliente'"` |
| Arquivos com curso descartável | 34 | `grep -l "Course::create("` |
| **União dos dois (arquivos tocados)** | **49** | interseção de 28 |
| Helpers privados locais que morrem | 20 | 14 do bloco cliente (4 nomes: `client`, `clientId`, `makeClient`, `makeClientWithPrimary`) + 6 `actingAdmin` |
| Factories existentes | 1 (`UserFactory`) | `ls database/factories/` |

## §2 · Decisões

**D1 — As três tasks entram.** Decisão do João em 2026-08-04. Critério: é o último recorte, as três
são independentes de fato, e só uma precisa de prova visual. Difere do critério dos dois blocos
anteriores ("fechar o barato, isolar o refactor grande") porque o refactor grande é justamente o que
sobrou — adiá-lo de novo não fecha o item.

**D2 — H.4.4 adota as 5 busca-só, não as 2 nomeadas nem as 7.** O sinal de aceite externo diz
"outras tabelas só migram quando equivalentes", e equivalência foi **medida**: as 5 diferem apenas
em `searchable`, ícone, 3 chaves i18n e `footerCount`. Migrar só as 2 nomeadas deixaria 3 cópias
vivas da mesma moldura sem gatilho para migrarem, e o componente novo seguinte não saberia qual dos
dois padrões seguir — que é o Q-1 do review passado (mecanismo que nasce invisível). As 2 com
dropdown ficam fora: cada slot de filtro é uma prop a mais, e "API universal com flags de domínio" é
non-goal explícito do packet.

**D3 — A moldura mora em `shared/ui` e é apresentacional pura.** `shared/ui` e `shared/hooks` **não
se importam em nenhuma direção hoje** — os 34 wrappers são todos apresentacionais. A moldura recebe
o `TableFilter<T>` já construído; a feature mantém a linha `const table = useTableFilter(items,
searchable)`. Isso evita criar a primeira aresta `ui → hooks` do projeto (o P-25 já registra tensão
na direção inversa) e mantém a `searchable`, que é vocabulário de domínio, na feature.

**D4 — O empty state de domínio vem pronto do consumidor; o de busca a moldura monta.** O vazio-sem-
dado carrega ícone, título, descrição e ação do domínio; o de busca é 100% genérico
(`common.noResults` / `common.noResultsHint` / `common.clearSearch`) e idêntico nas 5. Passar os dois
como props soltas seriam 6 props de texto; passar o de domínio como `ReactNode` são 1.

**D5 — H.4.5 fecha o escape pelo ARGUMENTO, não pelo nome do hook.** Banir `useCrudPage(...)` em
componente fecharia só o caso conhecido; `useOutraCoisa(clientsApi)` amanhã escaparia igual, que é
exatamente como o buraco nasceu. O seletor casa qualquer chamada cujo primeiro argumento seja um
identificador terminado em `Api`.

**D6 — O seletor novo entra no MESMO bloco de `rules` do `components/`.** Flat config faz merge raso
de `rules`: um bloco novo com `files` sobreposto apagaria os dois seletores existentes em silêncio.
Isso já mordeu o projeto duas vezes (Q-2 do review de `hardening-estrutural`, e o Q-1 do review
seguinte foi montado de propósito para não repetir). A catraca de `max-lines` segue em bloco
separado, com os `ignores` dela — compartilhar reabriria a catraca zerada em 2026-08-03.

**D7 — H.4.9 usa trait de helpers, não factories.** "Nenhuma factory nasce apenas por simetria" é
sinal de aceite externo, e 5 factories de uma vez é simetria. O trait também lida melhor com
agregado que exige pai. Os 20 helpers privados de hoje já **são** esse trait, espalhados e com 4
nomes divergentes para o mesmo bloco.

**D8 — H.4.9 extrai só os 2 padrões campeões.** Cliente+usuário (43 arquivos) e curso descartável
(34). Budget, Quote e Turma ficam fora **com razão registrada**: têm pai obrigatório e o valor
criado costuma ser a própria regra sob teste (`status`, `value_uf`, datas) — extraí-los é o caminho
mais curto para "esconder a regra", que o aceite externo proíbe. Não é esquecimento; se voltarem,
voltam por decisão nova.

**D9 — Todo método do trait aceita override.** `client(string $legalName = 'Transelec')` já existe em
5 arquivos e `makeClient(string $suffix)` em 2: o dado às vezes **é** a asserção. Sem override, a
extração ou esconde a regra ou não serve para metade dos chamadores.

**D10 — O trait é usado explicitamente, não sobe para o `TestCase`.** Subir daria os métodos a 78
arquivos sem edição, mas deixaria invisível quem depende de quê e incharia a base que hoje só
resolve autenticação. `use CreatesDomainRecords;` no arquivo que adota.

**D11 — `makeClientWithPrimary` não vira método do trait.** Aparece em 2 arquivos — abaixo do critério
de "repetição comprovada em ≥3 cenários". Os dois passam a chamar o método do cliente e adicionar o
contato principal na linha seguinte, explícito.

**D12 — Os 6 `actingAdmin` locais morrem.** São repasse puro para `actingAsAdmin()`, que já existe no
`TestCase` e é usado 132 vezes. Dois deles declaram `: User` e quatro `: void` — a divergência de
assinatura é a prova de que ninguém os lê como contrato.

**D13 — O placar da suíte é o gate do H.4.9.** Backend fecha em **376 passed / 1366 assertions**,
idêntico ao baseline. Número diferente significa que a extração comeu asserção, e a saída é reverter
o arquivo, não ajustar o número esperado.

**D14 — Nenhum arquivo de produção do backend entra no bloco.** `git diff main...HEAD -- backend/app/
backend/database/` fica vazio. H.4.9 é `backend/tests/**` e nada mais.

## §3 · Detalhe por task

### H.4.4 — `SearchableTableFrame`

Arquivo novo: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx` + `index.ts`,
exportado pelo barrel `shared/ui/index.ts`.

```ts
{
  table: TableFilter<T>          // busca, rows, first, onPage, clear — vem pronto (D3)
  searchPlaceholder: string
  emptyState: ReactNode          // vazio DE DOMÍNIO; o de busca a moldura monta (D4)
  footerCount: ReactNode
  actions?: ReactNode
  loading?: boolean
  error?: { detail?: string | null } | null
  onRetry?: () => void
  children: ReactNode            // as <AppColumn/>
}
```

8 props e `children`, **nenhuma delas para um consumidor diferir do outro** — o critério que reprovou
`AppFileList` no D8 da spec de upload de 2026-07-31 (~14 props, ~6 exclusivas de um consumidor).

Adotam, nesta ordem: `RedatoresTable`, `StudentsTable` (as 2 nomeadas pela task), `CoursesTable`,
`ClientsTable`, `UsersTable`.

`CoursesTable` está formatada com aspas duplas e quebra diferente das outras 4 — divergência de
prettier anterior ao bloco. A adoção normaliza o arquivo tocado; isso **não** autoriza reformatar
nada além dele.

**Detalhe de tipo, para não ser inventado na execução:** `AppDataTable` exige
`T extends DataTableValueArray` (um array), enquanto `TableFilter<T>` é paramétrico no **item**. A
moldura é genérica no item e repassa `table.rows` como `value`; a conciliação dos dois parâmetros
fica no arquivo da moldura, uma vez, em vez de em cada consumidor.

### H.4.5 — fechar o escape do seletor

Em `frontend/eslint.config.js`, dentro do bloco que já cobre `src/features/*/components/**`:

```js
{
  selector: "CallExpression[arguments.0.name=/Api$/]",
  message: '…passe o resultado de um hook de features/<x>/hooks/, não o recurso (frontend-fsliced.md).',
}
```

Mais JSDoc nos 7 aliases (`useCoursesPage`, `useBudgetsPage`, `useClientsPage`, `useRedatoresPage`,
`useRolesPage`, `useStudentsPage`, `useUsersPage`) registrando por que existem, e o parágrafo
correspondente em `.claude/rules/frontend-fsliced.md`.

**A sintaxe `arguments.0.name` do esquery é premissa a verificar, não a supor.** A primeira prova do
plano é a sonda positiva; se o seletor não casar, a saída é ajustar o seletor — nunca declarar a task
feita com um seletor que não dispara.

### H.4.9 — trait de setup

Arquivo novo: `backend/tests/Support/CreatesDomainRecords.php`, namespace `Tests\Support`.

- `makeClientWithUser(array $overrides = []): Client` — `User::factory()->create(['type' =>
  'cliente', 'is_active' => false])->client()->create(['legal_name' => 'ACME', 'type' => 'client',
  ...$overrides])`, a forma que 43 arquivos repetem.
- `makeCourse(array $overrides = []): Course` — `Course::create(['name' => 'C', 'workload_hours' =>
  8, ...$overrides])`, o curso descartável que responde por 38 das 53 ocorrências.

As ocorrências em que o dado **é** a regra medida (`workload_hours => 24` e `=> 40` nos testes de
carga horária, `Trabajos en líneas 220kV`) passam o valor por override e continuam explícitas no
teste — é para isso que o override existe (D9).

## §4 · Invariantes de comportamento

Nenhuma tela muda de forma. Estas sete são o que a adoção do H.4.4 **não** pode alterar, e o
checkpoint visual existe para prová-las:

1. Empty de busca cita o termo com `.trim()` e oferece **Limpar busca**; empty de lista vazia
   oferece a ação de cadastro do domínio.
2. Em erro, a toolbar esconde as ações (`end={error ? undefined : actions}`) e o corpo vira
   `AppErrorState` com Reintentar.
3. `emptyMessage` nunca chega `undefined` ao `AppDataTable` — a supressão do vazio durante o
   `loading` é do wrapper; reintroduzir `emptyMessage={loading ? undefined : empty}` cai no default
   inglês do PrimeReact.
4. `footerCount` conta `table.rows.length` (pós-filtro), nunca `items.length`.
5. Colunas, `sortable` e ordem das colunas ficam idênticas — o `DataTable` só ordena o que recebe, e
   fatiar a página fora dele é regressão silenciosa.
6. `first`/`onPage` seguem controlados pelo hook, com o clamp que ele já faz.
7. O input de busca mantém `min-w-64 flex-1` e o ícone `pi pi-search` à esquerda.

Para H.4.5, a invariante é que o lint **não** ganha falso positivo: os 4 `xxxApi.keys.all` dos
diálogos (`ClientDialog`, `StaffUserDialog`, `StudentDialog`, `RedatorDialog`) não são argumento de
chamada e seguem passando.

## §5 · Gate

**Item 0 — critério de aceite do bloco, não higiene genérica.** O bloco entrega moldura, guardrail e
trait; nenhum deles se prova com suíte verde:

- **H.4.4:** checkpoint visual do João nas 4 páginas / 5 tabelas — Personas (Redatores e Alumnos),
  Catálogo (Cursos), Comercial (Clientes), Administração (Usuários) — nos 4 estados de cada uma:
  lista cheia, busca sem resultado + Limpar busca, lista vazia de verdade, erro com Reintentar.
- **H.4.5:** sonda vista reprovando pelo motivo certo — `useCrudPage(budgetsApi)` dentro de um
  componente de feature — e, na mesma rodada, prova de que os 4 `xxxApi.keys.all` e os 7 aliases em
  `hooks/` **não** disparam. Sonda removida, árvore limpa.
- **H.4.9:** suíte backend em **376 passed / 1366 assertions**, idêntica ao baseline (D13).

Automatizado, tudo reconferido do zero:

- backend `376 passed (1366 assertions)`;
- `pnpm test` **21 passed**, `pnpm build` e `pnpm lint` verdes;
- Pint (`--test`) limpo nos arquivos `.php` tocados, com guarda de lista vazia antes da chamada
  (lição 9 — `pint` sem argumento reformata o repositório);
- `git diff main...HEAD -- backend/app/ backend/database/` **vazio** (D14);
- `generated.ts` e `locales/*.json` sem diff — nenhum DTO e nenhuma chave i18n nova;
- órfãos: a moldura com 5 consumidores, o trait com os arquivos que o declaram, e **zero** helper
  privado sobrevivente entre os 20 que morrem.

O bloco **não cria teste novo em nenhum dos dois runners** — H.4.9 reescreve o setup de testes que
já existem, e é por isso que o placar tem de ficar idêntico. `pnpm test` entra no gate como
regressão do frontend tocado, não como cobertura nova.

## §6 · Fora de escopo

- `BudgetsTable` e `TurmasTable` (dropdown de filtro), `RolesTable` (sem busca) e `EnrollmentTable`
  (sem toolbar) — não adotam a moldura (D2).
- Setup de Budget, Quote e Turma no trait (D8).
- `makeClientWithPrimary` como método (D11).
- Q-2 e Q-4 do review de 2026-08-04, a catraca do `max-lines` e a lição 13 sem mecanismo — seguem em
  §Débitos técnicos do `backlog.md`.
- P-26 (403 → 404 sem permissão) e P-25 — não são deste bloco.
- Repository sobre Eloquent, CRUD base genérico, tabela universal, split massivo de DTOs, split
  físico dos locales — non-goals do packet.
- Qualquer arquivo de `backend/app/` ou `backend/database/` (D14).

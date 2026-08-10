# Design — `turma-habilitacao-listagem`

> Item 4 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-10.
> Aprofundamento do Operation nascido da revisão de arquitetura de 2026-08-09.
> Backend puro. Zero schema, zero `frontend/`, zero mudança de contrato HTTP.

## 1. O problema, medido

`GET /api/turmas` custa **15 queries para 4 turmas** no banco de dev: 8 de carga — o
`withListingData()` faz o trabalho dele — e **7 em `files`**.

As 7 não são `2N`. `TurmaHabilitacaoService::isHabilitada()` curto-circuita em
`status !== EmAndamento`, então:

| Turma | Queries em `files` | Por quê |
|---|---|---|
| em andamento | 2 | `habilitada` pergunta uma vez, `missing_document_types` pergunta de novo |
| concluída | 1 | o curto-circuito mata a primeira; a segunda continua |

3 em andamento + 1 concluída = 7. A mesma pergunta é feita duas vezes por turma em andamento porque
`TurmaData::fromModel` chama `isHabilitada()` e `missingTypes()` separadamente, e cada um abre a
própria query em `$turma->files()`.

**`preventLazyLoading` não enxerga isto**, e é por isso que o `ContratanteEagerLoadTest` passa hoje
com o defeito vivo: `$turma->files()->whereIn(...)` é query **na relação**, não lazy-load de
relação. A decisão 5 do item está certa ao pedir guarda própria.

**Segundo N+1 no mesmo `fromModel`, que o texto do item não cita:** `TurmaData.php:73` lê
`$turma->enrollments_count ?? $turma->enrollments()->count()`. O `??` é a mesma classe de defeito —
quem esquecer o `loadCount` paga uma query por turma em silêncio.

**Terceira medição, achada ao ler o código:** o `whereIn` dos três tipos obrigatórios está soletrado
em **dois** lugares — `TurmaHabilitacaoService::missingTypes()` e `TurmaDocumentController::index()`.
A relação nomeada da decisão 2 não serve só ao eager-load; ela dá dono único à pergunta.

## 2. Divergência do item, fechada antes do desenho (D-B1)

O item escreve: *"`isHabilitada()` é literalmente `missingTypes() === []`"*.

Hoje `isHabilitada()` é `status === EmAndamento && missingTypes() === []`. Ao pé da letra, a decisão
1 **mudaria comportamento**: concluir uma turma exige documentação completa, logo **toda** turma
concluída passaria a responder `habilitada: true`, contra o teste vivo
`TurmaHabilitacaoServiceTest::test_turma_concluida_nao_e_habilitada`.

O frontend sobreviveria — `turmaDisplayStatus` checa `concluida` primeiro, e
`ConcludePanel`/`TurmaDocuments` guardam por `!concluida` antes de ler `habilitada` —, mas o payload
mudaria de valor, e o item promete que nenhum contrato HTTP muda.

**Decisão do João na abertura: `habilitada` de turma concluída continua `false`.** O VO carrega o
status junto, e "uma pergunta, uma resposta" passa a significar que a **resposta é o VO** — não que
o gate de status desaparece.

## 3. O VO e a relação

**`Turma::documentacaoObrigatoria(): MorphMany`** — `files()` com o `whereIn` dos
`TurmaDocumentType::cases()` embutido (decisão 2). Soft-delete continua fora pelo default do
`morphMany`; a guarda já existe (`test_doc_soft_deletada_nao_conta`).

**`App\Domains\Operation\Services\HabilitacaoStatus`** — VO imutável, ao lado do `AcademicResult` e
do `EnrollOutcome` (precedente D-P2 do bloco B4–B7). Carrega os tipos faltantes **e** o status da
turma. Expõe:

- `isHabilitada(): bool` — `status === EmAndamento && missingTypes === []` (D-B1);
- `missingTypes(): array<string>`.

**`TurmaHabilitacaoService::for(Turma): HabilitacaoStatus`** — uma pergunta, uma resposta. Lê
`$turma->documentacaoObrigatoria` como **relação**: carregada, custa zero; não carregada, o Eloquent
busca. Esse é o comportamento certo para o `ConcludeTurmaAction`, cujo model vem do route-binding
sem relação carregada e precisa de leitura fresca dentro da transação.

`isHabilitada()` e `missingTypes()` deixam de ser API pública do service; os dois chamadores
(`TurmaData::fromModel` e `ConcludeTurmaAction`) passam pelo `for()`.

## 4. O seam de listagem

**`TurmaQueryBuilder::LISTING`** nasce como array de strings, igual aos outros quatro models
(`ClientQueryBuilder`, `QuoteQueryBuilder`, `EnrollmentQueryBuilder`, `CourseQueryBuilder`):

```
['redatores.user', 'course', 'quote.budget.client.user', 'documentacaoObrigatoria']
```

- `withListingData()` = `with(self::LISTING)->withCount('enrollments')`
- `Turma::loadListingData()` = `load(self::LISTING)->loadCount('enrollments')` (decisão 3)

**`TurmaController::present()`** perde o `findOrFail` — some a query de re-busca por id — e passa a
chamar `$turma->loadListingData()`. O `load('redatores.user')` parcial do `UpdateTurmaAction` morre
junto: a carga passa a ter um dono só, que é o ponto da decisão 3.

**`TurmaDocumentController::index()`** consome `documentacaoObrigatoria()` em vez de repetir o
`whereIn`.

**`TurmaData::fromModel(Turma, TurmaHabilitacaoService)`** mantém a assinatura (decisão 4), chama
`for()` **uma vez** e lê os dois campos do VO. `enrolled_count` perde o `??` e lê só
`$turma->enrollments_count`.

## 5. Consequências declaradas

- `GET /api/turmas` cai de **15 para 9 queries** com 4 turmas, e o custo de documentação passa a ser
  **constante em N**: 1 query para a listagem inteira.
- **Zero mudança de contrato HTTP, em forma e em valor.** `habilitada` de turma concluída segue
  `false` (D-B1); nenhum DTO muda de forma, então `typescript:transform` não produz diff e o
  frontend não é tocado.
- **O VO lê relação carregada, e herda o cache dela.** Quem carregar a turma, subir um documento e
  perguntar de novo **no mesmo objeto** recebe a resposta velha — hoje receberia uma query nova.
  Nenhum caminho de produção faz isso: o `conclude` recebe model do route-binding, e o upload
  responde `TurmaDocumentData`, não `TurmaData`. Fica escrito aqui em vez de virar surpresa de
  review.
- `SoftDeletedRelationProjectionTest:193` monta o model à mão com `fresh([… , 'files'])` — vira
  `documentacaoObrigatoria` mais `loadCount('enrollments')`. Conserto de fixture; nenhuma asserção
  muda.

## 6. O que prova (DoD)

**Guarda de N+1** (decisão 5, forma escolhida pelo João): `DB::listen` contando queries
`from "files"` num `GET /api/turmas` com 2 turmas, asserindo **1**. Molde do
`CertificateListingTest.php:368`. Contagem, e não `preventLazyLoading`, porque pega **duas** classes
de regressão — perder o eager-load e reintroduzir query por linha por outro caminho. **Vista
vermelha primeiro contra o código de hoje** (lição 10), que dá 3 ou 4 no mesmo cenário.

**Os 5 testes do `TurmaHabilitacaoServiceTest` migram para o `for()` sem mudar asserção.**
`test_turma_concluida_nao_e_habilitada` é a guarda que trava a D-B1: se o gate de status sair do VO,
ele reprova.

**Regressão de forma:** suíte inteira verde (baseline **500 passed, 1 skipped, 1858 assertions**),
`git diff main...HEAD -- backend/database/` **vazio**, `git diff main...HEAD -- frontend/` **vazio**,
`typescript:transform` sem diff em `generated.ts`, Pint `passed` nos `.php` do bloco.

**E2e contra a API real**, com sessão Sanctum por cookie + CSRF (lição 12): `GET /api/turmas`
**200** com `habilitada` e `missing_document_types` corretos por turma; a turma 3 do seed
(concluída, documentação completa) respondendo **`habilitada: false`**, que é a D-B1 medida onde o
usuário vive; e a contagem de queries medida **na API**, não só na suíte.

## 7. Fora de escopo

- Data-scoping por Policy na turma (segue débito de backlog, não nasce aqui).
- Qualquer mudança em `frontend/` — `habilitada` e `missing_document_types` continuam derivados no
  backend e consumidos sem recálculo, como as rules já mandam.
- Paginação da listagem de turmas.

## 8. Risco de review

**Baixo risco.** Sem `generated.ts`, sem locales, sem auth/RBAC, sem schema, sem dinheiro, sem rota
pública; `executor: claude`. Lente Claude com o gabarito do projeto, sem segunda frente do Codex.

Toca `backend/` → **main tree, sem worktree (P-03)**. ADR e DER não abrem: zero schema.

# Profundidade de module · backend B4–B7 — design

> Item 2 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-07 via `/planejar-bloco`.
> Continuação do review de arquitetura de 2026-08-07 (skill `improve-codebase-architecture`,
> relatório externo); B1–B3 já aplicados no bloco 7 (`eccf0ee`, `a33d793`, `e7626b4`).
> Aprovado pelo João em 2026-08-07. Backend-only, main tree (P-03), **zero mudança de schema** —
> ADR/DER não abrem.

## Contexto e verificação de entrada

Antes de desenhar, cada alegação do relatório foi verificada contra o código real (a skill não
existe nesta máquina; a checagem foi manual, alegação por alegação):

- **B1–B3 resolvidos, confirmado:** `CertificateEligibility` (pares `assert*`/`constrain*`),
  família `Data/Snapshot/` com `schema_version`, `App\Shared\Pdf` com os dois services no seam.
- **B4 vale — 8 sítios medidos** da cadeia `quote->budget->client`:
  `CertificateSnapshotBuilder:71-72`, `IssuableTurmaData:30`, `TurmaData:72`,
  `PendingQuoteData:31`, `ImportStudentsAction:57`, `EnrollmentController:47` (preview),
  `ManualPdfService:30` (string `'quote.budget.client'`). 3 domínios; a cadeia dinâmica não deixa
  FQCN e escapa do `DomainDependencyTest`.
- **B5 vale:** `RecordEnrollmentResultAction` faz `refresh()` sem load e
  `EnrollmentController::result` chama `EnrollmentData::fromModel` — lazy load silencioso;
  listas de eager-load repetidas por controller (Quote 6× `->load('files')`, Client e Course 2×).
- **B6 vale:** `grades` segue `['nullable','array']`, `approval_status` declarado pelo cliente
  HTTP, action é pass-through. O Q-3 do review anterior só defendeu a **impressão**
  (`SnapshotResultData::finalGrade`); a **escrita** aceita qualquer coisa.
- **B7 vale e cresceu:** setUps de 40–98 linhas em 8 arquivos de `tests/Feature/Certification/`
  (o relatório media 55–85 em 7 — os testes do B1/B2 engordaram o sintoma).

## Decisões

### D1 — B6: aprovação continua declarada pelo admin (decisão de negócio do João)

`approval_status` segue declarado por quem lança o resultado. O VO tipa **forma**, não inventa
regra de corte — nenhuma fonte do projeto define nota mínima. **Deferred, registrado:** a intenção
futura do João é ler a nota do docx padronizado (tabela de evaluación do Manual de Classe /
evaluación alunos) e lançá-la na matrícula automaticamente — bloco próprio, muda ADR e regra de
negócio; nada neste bloco constrói para esse consumidor hipotético (lição 3), apenas não fecha o
caminho.

### D2 — B4: `ContratanteData` nasce em `Commercial/Data`

`Commercial` é o dono da decisão D12 (razão social = `clients.legal_name`, RUT = `user->rut`).
`ContratanteData::fromClient(Client)` escreve essa decisão uma vez. Seams de travessia:

- `Turma::contratante(): ContratanteData` — raiz de 6 dos 8 sítios;
- `Quote::contratante(): ContratanteData` — raiz do `PendingQuoteData`.

Os 8 sítios migram. `EnrollmentController::preview` passa `ContratanteData` ao
`EnrollPreviewData::fromLookup` em vez do model `Client`.

**Efeito na matriz de domínios:** a aresta Certification→Commercial que hoje existe escondida na
cadeia dinâmica vira import FQCN de `Commercial\Data\ContratanteData` — declarada no
`DomainDependencyTest` com justificativa. A matriz volta a dizer a verdade.

### D3 — Catraca da cadeia (mecanismo contra reincidência, decisão do João)

Teste-grep que reprova `budget->client` e as strings `'budget.client'`/`'quote.budget.client'` em
`backend/app/` fora dos donos do seam (`Turma.php`, `Quote.php`). Provada nos dois sentidos
(lição 10): sonda fresca reprova; os donos do seam não disparam. Mesmo molde das catracas do
eslint — regra sem mecanismo já reincidiu 3× no projeto (lição 14).

### D4 — B5: builders para os 4 models medidos, nome da casa

Molde e **nome** do `TurmaQueryBuilder::withListingData()` existente — consistência interna vence
o `present()` do relatório:

| Builder | eager-load concentrado | mata |
|---|---|---|
| `EnrollmentQueryBuilder` | `student.user` | o bug do `result` + lista repetida no `index` |
| `QuoteQueryBuilder` | `files` | os 6 `->load('files')` do `QuoteController` |
| `ClientQueryBuilder` | `user, addresses, contacts` | lista repetida index/show |
| `CourseQueryBuilder` | `certificateTemplates, redatores, modules` | lista repetida index/show |

Model sem reincidência medida **não** ganha builder (lição 3; o deletion test do relatório reprova
invólucro vazio). Nenhuma Action-invólucro nasce — aprofunda-se o lado da projeção.

O bug do `result`: o controller recarrega via builder após a action. O teste do bug usa
`Model::preventLazyLoading` e é visto RED contra o código atual antes do fix (lição 10).

### D5 — B6: `AcademicResult` em `Operation`, validação aperta na escrita

- VO `AcademicResult` em `Operation` (dono de `enrollments`); `Enrollment::academicResult()`.
- `grades` tipado, `attendance` decimal, `approval_status` declarado (D1).
- `EnrollmentResultData` aperta: `grades.final`, se presente, tem de ser **imprimível** — numérico
  ou string não-vazia; a vírgula chilena (`"6,4"`) continua aceita. Array/objeto/booleano em
  `final` vira **422 na escrita**. Mudança de comportamento intencional: hoje qualquer estrutura
  entra e só a impressão defende.
- `CertificateSnapshotBuilder` lê do VO, não das colunas cruas.
- `SnapshotResultData::finalGrade()` **fica** — camadas diferentes: o VO defende a entrada nova,
  o snapshot defende o histórico já congelado (certificado de 2026 renderiza em 2030).

### D6 — B7: builder de cenário nomeado pelas portas

`tests/Support/Certification/IssuableEnrollmentBuilder`: `make()` monta a cadeia dos ~9 models
apta a emitir; cada desvio é uma porta do `CertificateEligibility` —
`->turmaNaoConcluida()`, `->semRedator()`, `->semTemplate()`, `->templateSemCidade()`,
`->resultadoPendiente()`, `->jaEmitido()`. Os 8 setUps de Certification migram. **Placar não
muda** — é setup, não asserção; qualquer mudança de contagem é sinal de erro na migração.
Executa **depois** do B4 (ordem do backlog): o builder nasce sobre os seams novos.

## Invariantes de comportamento

1. Nenhuma resposta JSON de API muda de forma ou conteúdo pelos refactors B4/B5 (refactor puro;
   provado por teste existente + e2e).
2. O snapshot congelado continua gravando razão social (D12) e RUT — agora via `ContratanteData`.
3. `result` devolve o aluno aninhado **sem lazy load** (provado com `preventLazyLoading`).
4. `grades.final` não-imprimível é 422 na escrita; o que já está congelado em snapshots não é
   tocado.
5. A matriz de domínios declara a aresta Certification→Commercial e a catraca da cadeia reprova
   reincidência fora dos seams.
6. Placar da suíte só muda pelos testes novos declarados no plano; a migração dos setUps (B7) não
   altera contagem de asserções por arquivo migrado.

## Fora de escopo

- C1–C7 (frontend) — itens correlatos já registrados; entram no replanejamento do frontend da
  certificação.
- O "correlato" do B5 no relatório (autorização em 2 lugares — 18 controllers vs
  `Catalog/routes.php:14`) — não medido como defeito, fora do corte.
- Leitura de nota do docx de evaluación (D1) — bloco futuro próprio.
- Guardrail por reflection de relation paths — rejeitado no brainstorming (custo de
  mini-framework, falso negativo por call-site); a catraca D3 cobre a reincidência real.

## Gate (item 0 + DoD)

- Suíte completa verde no container; Pint nos arquivos tocados; `typescript:transform` sem diff
  além do declarado (`ContratanteData` novo entra em `generated.ts` no mesmo commit).
- Matriz: aresta nova provada nos dois sentidos (remover a justificativa reprova; o teste passa
  com ela).
- Catraca D3 provada com sonda fresca, removida com árvore limpa.
- **E2e contra a API real com sessão Sanctum (lição 12):** emitir 1 certificado pós-refactor com
  a razão social correta no snapshot; `result` devolvendo aluno aninhado; `grades.final`
  não-imprimível recusado com 422 es-CL.

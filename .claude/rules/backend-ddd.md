---
paths:
  - "backend/app/**"
  - "backend/tests/**"
---

# Backend — DDD-lite (ADR-02)

Domain-driven, **não** o MVC padrão. Código de domínio em `backend/app/Domains/<Dominio>/`, com
`Http/Controllers`, `Models`, `Actions`, `Data`, `Services`, `QueryBuilders`, `Policies`,
`routes.php` — `Policies/` é scaffold previsto em `estrutura-monolito.md` e **nenhuma classe Policy
existe**; o data-scoping segue outro molde (ver "RBAC" abaixo). PSR-4: `App\Domains\` → `app/Domains/` e `App\Shared\` → `app/Shared/`.

Domínios (espelhados 1:1 pelas `features/` do front):
- **Identity** — usuários, auth, redator, documentos do redator (`App\Domains\Identity`)
- **Commercial** — clientes, orçamentos, cotações
- **Catalog** — cursos, módulos, templates de certificado
- **Operation** — turmas, matrículas, notas, designação
- **Certification** — emissão on-demand, validação QR pública

**Feedback NÃO é domínio (decisão de 2026-08-22).** Não existe `Domains/Feedback` nem tabela
`feedbacks`, e não haverá na v2: RF-FBK-01/02/04 são a documentação de turma (`files` polimórfica +
`Operation\Enums\TurmaDocumentType` + gate da RN-16), e RF-FBK-03 pertence ao encerramento da ordem
de serviço. Ver `docs/der-fisico.md` §Feedback. Não crie o domínio.

**Estado atual:** Identity, Commercial, Catalog e Operation têm código real. `Certification/` existe
como pastas sem nenhuma classe. Crie a estrutura de um domínio só quando ele entra em
desenvolvimento.

**`App\Shared\`** = infra transversal: `Exceptions/ProblemDetails` (converte qualquer exceção em
envelope RFC 7807, ligado em `bootstrap/app.php` para `api/*` e requests JSON — controllers não
montam erro à mão; validação carrega `errors` por campo), `Support/Rut` + `Rules/ValidRut`,
`Files/` (`File`, `UploadFileAction`).

**Morph map (ADR-10):** `Relation::enforceMorphMap` no `AppServiceProvider` é o **único** lugar que
liga aliases a classes. Registre alias só de classe que existe na sprint; todo model
Auditable/polimórfico precisa do seu alias.

**Rotas** por domínio em `Domains/*/routes.php`, carregadas no `bootstrap/app.php`, sob o grupo
`auth.active` (= `auth:sanctum` + `EnsureAccountIsActive`) — **não** `auth:sanctum` cru: quem
autentica precisa levar junto o gate de conta ativa da RN-01. As anônimas (`login`,
`password/forgot`, `password/reset`, `invitation/accept`, `publico/certificados/{uuid}`) ficam fora
do grupo e são **declaradas** em `AuthenticatedRouteMiddlewareTest::ANONIMAS`; superfície anônima
nova sem declaração reprova. Seeders: `DatabaseSeeder` (orquestrador), `RolePermissionSeeder` (ADR-07) e
`OperationDemoSeeder` (cenário de demo montado pelas Actions reais; gate local/demo, aborta se já
existe cliente — nunca roda em produção). Migrations: ver a rule
`migrations.md`.

## Padrão de entidade (CRUD) — DRY entre domínios

Toda entidade segue a **MESMA forma**, independente do domínio. Diferenciar a estrutura por entidade
é dívida a corrigir, não estilo pessoal.

- **Controller = fino.** Route-model-binding (leituras) + injeta a Action (escritas). Retorna sempre
  `XData::fromModel($model)`. Proibido `XData::from([...])` inline ou regra de negócio no controller.
- **Data (`XData`, spatie/laravel-data) = contrato único.** Concentra validação (`rules()` com
  `ValidRut` etc.), o `#[TypeScript]`, e a hidratação `fromModel(X $m): self` que achata relações
  (ex.: campos do `user` no topo). É o único lugar que sabe montar o DTO a partir do model.
- **Action = regra de escrita.** Uma por operação (`CreateX`/`UpdateX`), dentro de `DB::transaction`.
  **`CreateX` sincroniza TUDO que `UpdateX` sincroniza** (ex.: `course_ids` — esquecer no create já
  descartou dados em silêncio). List/show/destroy sem regra vão direto ao Eloquent (ADR-02).
- **Coleção nested read-write nasce `Optional` no DTO** (`array|Optional = new Optional`), e a Action
  pula o replace quando `Optional`. **Ausente = não mexe; `[]` = apaga.** Default `array = []` faz o
  replace-total apagar a coleção de quem só omitiu o campo — em silêncio, com peso legal. Ref.:
  `CourseData::$templates`/`$modules`, `ClientData::$addresses`/`$contacts`.
  **A lei tem catraca desde 2026-08-13:** `PersistenceLawsTest::test_colecao_nested_read_write_nasce_optional`
  varre por reflexão toda propriedade `#[DataCollectionOf]` e exige TIPO **e** DEFAULT `Optional` —
  `array|Optional = []` passaria pelo tipo e apagaria igual. Coleção que só existe na SAÍDA declara
  `#[ReadOnlyCollection]` no sítio, e a marca é **verificada, não confiada**: exige
  `#[DataCollectionOf]` junto e reprova se algum arquivo de `app/` ler `$data-><campo>` da entrada.
  Ref.: `BudgetData::$quotes`/`$files`, `QuoteData::$files`.
  **Obrigatoriedade que depende do verbo mora na Action, não em `rules()`** — `rules()` é estático e
  não sabe se é POST ou PUT. `contacts` é `sometimes|array|min:1` no DTO e a exigência do create vive
  em `CreateClientAction`, **antes** da transação: checagem de entrada pura não paga banco nem se
  esconde atrás de um erro de identidade. O texto da recusa é **chave única de `lang/`**
  (`commercial.client.contact_required`), citada pelas duas Actions e pelo `messages()` — mesma
  regra, mesma frase, nas três portas. Era a constante `ClientData::CONTATO_OBRIGATORIO` até o
  `hardening-i18n-e-erros-api` (2026-08-29) mover a frase para `lang/`: a unicidade é a mesma, o
  dono mudou de DTO para dicionário, e agora ela também fala os três idiomas.
- **Regra de coleção vale em TODOS os caminhos de escrita**, não só no da tela: o replace-total do
  pai **e** as rotas nested da própria entidade. Ref.: `PrimaryContactService::ensureSingle()`, que
  fecha "no máximo 1 principal" pelas Client Actions **e** pelas `Create/UpdateClientContactAction` —
  não voltar a escrever contato direto no Eloquent.
- **`belongsTo` que a projeção de leitura atravessa vai `->withTrashed()`.** Soft delete é
  **arquivamento, não desaparecimento**: o registro que aponta para o arquivado continua existindo e
  continua sendo lido. Sem isso o `belongsTo` devolve `null`, o `fromModel` estoura
  (`Attempt to read property "x" on null`) e a **tela inteira cai em 500 por causa de um registro
  arquivado** — ou, com `?->`, mente em silêncio ("Sin cliente" com vínculo aberto). Provado em
  2026-07-27: um soft delete de cliente cascateou para o `User` e derrubou o módulo Comercial
  inteiro. Vale para todo `belongsTo` alcançado por um `fromModel`: `Client::user`,
  `Redator::user`, `Student::user`/`currentClient`, `StudentClientLog::client`,
  `Enrollment::turma`/`student`, `Turma::quote`/`course`, `Quote::budget`/`course`,
  `Budget::client`. **Coleção (`hasMany`/`belongsToMany`) NÃO leva** — ali o item arquivado deve
  mesmo sumir da lista viva. Guarda: `tests/Feature/Shared/SoftDeletedRelationProjectionTest.php`,
  um caso por DTO; DTO novo com `belongsTo` para model soft-deletable entra lá.
- **Domain Service (`Domains/<X>/Services/`) = regra compartilhada entre entidades.** Não se duplica.
  Ex.: cliente e redator são extensões 1:1 de `User`; o provisionamento do User de login (normalizar
  RUT, unicidade com `withTrashed`, criar inativo — RN-01) vive em `Identity/Services/UserProvisioner`,
  chamado por `CreateClientAction` e `CreateRedatorAction`.

Referência viva: pares `ClientController`/`RedatorController`, `ClientData`/`RedatorData` (ambos com
`fromModel`), `UserProvisioner`. Entidade de cadastro nova copia essa forma.

**`from()` vs `fromModel()` (convenção dos DTOs — os dois sentidos do mesmo `XData`):**
- **`from()` (spatie, embutido) = ENTRADA.** Request→DTO: o controller recebe `store(XData $data)`
  e o pacote hidrata + valida por `rules()`. Campos que só existem na saída ficam `Optional`
  (ausentes na entrada) — é o que deixa UMA classe servir os dois sentidos.
- **`fromModel(X $m): self` (nosso, custom) = SAÍDA.** Model→DTO: o ÚNICO lugar que projeta o
  model — achata relações (campos do `user` no topo), coleta nested (`XData::collect(...)`) e
  deriva campos (ex.: `BudgetData` puxa `status`/totais do `BudgetSummaryService`). Controller
  SEMPRE retorna `XData::fromModel($m)`.
- **Proibido `XData::from([...])` para montar resposta** — vaza a forma do model pro controller e
  escapa da projeção única.

## Auth (detalhe — ADR-06/03)

`bootstrap/app.php` habilita `statefulApi()`. Front: `GET /sanctum/csrf-cookie` → `POST /api/login`.
`AuthController` (`Domains/Identity/Http/Controllers`) regenera a sessão no login (anti
session-fixation) e rejeita usuário inativo. Env: `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`,
`SESSION_*`. CORS (`config/cors.php`) escopado a `api/*`, `sanctum/csrf-cookie`, `login`, `logout`,
`supports_credentials: true`. `User` gera `uuid` no create, soft-delete, `Auditable`; `type` enum
(`admin`/`redator`/`aluno`/`cliente`), `is_active` libera login. **Só admin e redator autenticam** (RN-01).

**RBAC de cadastro = middleware `permission:`** (`HasMiddleware` no controller), não Policy. Toda
permissão nova entra no seeder.

**Data-scoping NÃO é Policy — é QueryBuilder + `resolveRouteBinding`.** Nenhuma classe `Policy`
existe no repo, e não é omissão: Policy não filtra LISTA, então `index` precisaria de escopo de
query de qualquer jeito e a entidade nasceria com duas fontes de verdade que podem divergir. O
molde vigente é a Turma ("redator só vê as suas", spec D1 de 2026-08-22), em duas peças:

- **`TurmaQueryBuilder::visibleTo(User $user)`** — o escopo em si. Quem não é `type === 'redator'`
  atravessa sem consulta extra (o `if` sai antes do `whereHas`); o filtro casa por
  `redatores.user_id`, não `redatores.id`, porque quem autentica é o `User`. `TurmaController`
  chama nas listagens (`index`, `archived`).
- **`Turma::resolveRouteBinding()`** — o mesmo escopo aplicado ao route-model-binding, e é o que
  alcança as 20 rotas com `{turma}` sem nenhuma delas lembrar de filtrar: **rota nova nasce
  coberta.** Devolve `null` (não `firstOrFail`), que é o contrato do `SubstituteBindings` — vira
  `NotFoundHttpException` e sai 404 pelo `ProblemDetails`. **Turma alheia é indistinguível de turma
  inexistente de propósito**: 403 confirmaria que ela existe (D3).

Entidade nova com ownership por dado copia essa forma — não crie Policy para isso. Restauração de
arquivado resolve por `onlyTrashed()` à mão (o binding não enxerga trashed) e é gateada pelo
`permission:` do endpoint, não pelo escopo.

**Lista que cresce sem teto pagina pelo trait `Paginates` no builder do agregado (ADR-22).**
O controller injeta `PageRequest` (ou a extensão com o filtro nomeado — `CertificatePageRequest`,
`TurmaPageRequest`) e chama `->page($request, $present, filter:, meta:)`; o builder declara
`SORTABLE` (allowlist, fora dela 422), `DEFAULT_SORT` e `searchable()`. Filtro que o front
derivava vira SQL COM teste de paridade contra a classificação de domínio — o `CASE`/`whereHas`
e o `for()`/`Service` são duas respostas esperando para divergir. `total_unfiltered` mede o escopo
depois de `visibleTo`. Lista bounded (cursos, usuários, redatores, clientes, cotações por
orçamento, alunos por turma) continua devolvendo array — paginar por simetria é
sobre-engenharia. Toda rota `GET` de lista entra na catraca `ListQueryBudgetTest` (N=2 e N=20 com a
mesma contagem de queries) ou declara motivo em `ISENTAS`; `Model::preventLazyLoading()` é
global (`AppServiceProvider`), com `warning` em produção e exceção fora dela.

## Testes

Integração sqlite `:memory:`, não mock (ADR-02). Teste de regressão só vale depois de você o ver
**reprovar contra o código antigo** (`git stash` no fix, rode, `git stash pop`) — teste que passa nos
dois estados prova nada.

**Guarda de snapshot: a cadeia VIVA fica diferente do valor CONGELADO.** Onde o teste prova que a
leitura vem do snapshot e não das relações, todo campo asserido tem valor vivo distinto do
congelado — igualdade acidental faz o teste passar com o regresso presente. Vale também para o
e2e contra o seed. Três ocorrências já: o A-1 (2026-08-05) foi um teste que *fixava* o valor errado
(`user.name` no lugar de `clients.legal_name`); o `OperationDemoSeeder` grava `name == legal_name`,
então o e2e do gate precisou diferenciá-los à mão; e o `IssuableEnrollmentBuilder` (B7) nasceu com
defaults iguais ao snapshot do `PublicCertificateTest` — provado em 2026-08-08 fazendo a rota
pública do QR ler o curso vivo, com o teste continuando verde. **Builder de cenário compartilhado
nunca entrega default igual ao que um consumidor congela.**

**Guarda de porta múltipla assere QUAL porta recusou.** Cenário que fecha uma porta entre várias
não pode se contentar com "alguma exceção subiu": basta uma segunda porta fechar junto para a
primeira virar indiferente. Asserir a mensagem nomeada. Provado em 2026-08-08 no
`CertificateEligibilityTest`: removida a porta 1 de `CertificateEligibility::assert()`, o teste
seguia verde porque a porta 6 recusava em seguida.

**Seam que passa a ler uma relação nova atualiza o eager-load no mesmo commit.** Concentrar a
travessia num VO (ex.: `Client::contratante()`, que lê `user->rut`) troca duplicação visível por
N+1 invisível se a carga ficar para trás — medido em 2026-08-08: 4 turmas, 4 SELECTs extras em
`users`. Guarda de runtime com `Model::preventLazyLoading()` e **duas ou mais** linhas hidratadas
(`Builder::hydrate()` só liga o flag com `count($items) > 1`); ref.:
`tests/Feature/Shared/ContratanteEagerLoadTest.php`.

## Mensagem ao usuário sai de `lang/`, nunca do código

Toda string que pode chegar a uma resposta HTTP — `ValidationException::withMessages`,
`title`/`detail` do `ProblemDetails`, `description` do Dashboard, mensagem de exceção
`PublicDetail` — vem de `__('<dominio>.<agregado>.<motivo>')`, com o dicionário em
`backend/lang/<locale>/<dominio>.php` e paridade nos três locales (`en`, `es_CL`, `pt_BR`).

**Catraca:** `tests/Unit/Shared/MensagemLiteralTest.php` (nenhum literal) e
`tests/Unit/Shared/LocaleParityTest.php` (mesmas chaves nos três, nenhum valor igual à chave).

**Razão:** o produto é para o cliente chileno e a `D-07` chegou a 41 sítios porque cada
domínio escreveu no idioma de quem estava ali — `Commercial` em português, `Operation` em
espanhol, e o usuário lendo um ou outro conforme o endpoint.
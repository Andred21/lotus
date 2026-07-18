---
paths:
  - "backend/app/**"
  - "backend/tests/**"
---

# Backend — DDD-lite (ADR-02)

Domain-driven, **não** o MVC padrão. Código de domínio em `backend/app/Domains/<Dominio>/`, com
`Http/Controllers`, `Models`, `Actions`, `Data`, `Services`, `QueryBuilders`, `Policies`,
`routes.php`. PSR-4: `App\Domains\` → `app/Domains/` e `App\Shared\` → `app/Shared/`.

Domínios (espelhados 1:1 pelas `features/` do front):
- **Identity** — usuários, auth, redator, documentos do redator (`App\Domains\Identity`)
- **Commercial** — clientes, orçamentos, cotações
- **Catalog** — cursos, módulos, templates de certificado
- **Operation** — turmas, matrículas, notas, designação
- **Certification** — emissão on-demand, validação QR pública
- **Feedback** — avaliações de turma

**Estado atual:** Identity, Commercial e Catalog têm código real; os demais são placeholder
(`.gitkeep`). Crie a estrutura de um domínio só quando ele entra em desenvolvimento.

**`App\Shared\`** = infra transversal: `Exceptions/ProblemDetails` (converte qualquer exceção em
envelope RFC 7807, ligado em `bootstrap/app.php` para `api/*` e requests JSON — controllers não
montam erro à mão; validação carrega `errors` por campo), `Support/Rut` + `Rules/ValidRut`,
`Files/` (`File`, `UploadFileAction`).

**Morph map (ADR-10):** `Relation::enforceMorphMap` no `AppServiceProvider` é o **único** lugar que
liga aliases a classes. Registre alias só de classe que existe na sprint; todo model
Auditable/polimórfico precisa do seu alias.

**Rotas** por domínio em `Domains/*/routes.php`, carregadas no `bootstrap/app.php`, sob
`auth:sanctum`. Seeders: `RoleSeeder`, `PermissionSeeder` (ADR-07). Migrations: ver a rule
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
  `CourseData::$templates`/`$modules`.
- **Regra de coleção vale em TODOS os caminhos de escrita**, não só no da tela: o replace-total do
  pai **e** as rotas nested da própria entidade. Ref.: `PrimaryContactService::ensureSingle()`, que
  fecha "no máximo 1 principal" pelas Client Actions **e** pelas `Create/UpdateClientContactAction` —
  não voltar a escrever contato direto no Eloquent.
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

**RBAC de cadastro = middleware `permission:`** (`HasMiddleware` no controller), não Policy. Policy
fica para data-scoping (Turma: "redator só vê as suas"). Toda permissão nova entra no seeder.

## Testes

Integração sqlite `:memory:`, não mock (ADR-02). Teste de regressão só vale depois de você o ver
**reprovar contra o código antigo** (`git stash` no fix, rode, `git stash pop`) — teste que passa nos
dois estados prova nada.
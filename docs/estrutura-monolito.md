# Estrutura do Monólito — Lotus

> Snapshot de 2026-07-04 (atualizado 2026-07-30, doc-sync da Sprint 4). Fonte: planejamento (camada avançada) + estado real do repo.
> Backend por DOMÍNIO (DDD-lite · ADR-02). Frontend em 3 camadas por ALCANCE (feature-based · ADR-05).
> **Consulte antes de criar qualquer arquivo — para saber ONDE ele vai e que regra de importação segue.**

## Regra de ouro (uma por lado — NÃO são a mesma regra)
**Frontend — proibição absoluta.** Uma feature **NUNCA** importa de outra feature, nem para tipo, e
`shared` **NUNCA** importa de feature. Composição acontece na camada `app`/rota. Lei §5.6 do
`CLAUDE.md`; mecanismo em `frontend/eslint.config.js` (`no-restricted-imports`).

**Backend — acoplamento controlado, não proibido.** Um domínio pode consumir outro, e consome: são
42 referências cross-domain hoje. O que é proibido é *duplicar a regra* do outro domínio, importar
camada interna dele, ou abrir aresta nova sem declarar. Mecanismo em
`backend/tests/Feature/Shared/DomainDependencyTest.php`, que é a **fonte única** da matriz:

- **superfície pública:** um domínio só enxerga `Models`, `Enums` e `Services` de outro; `Actions`,
  `Data`, `Http`, `Exceptions`, `Policies`, `QueryBuilders` e `Support` são internos;
- **arestas declaradas:** dentro da superfície, só os pares listados em `DomainDependencyTest::ALLOWED`.
  `Certification` está com zero — todo import dele exige decisão explícita.

Tratar as duas como a mesma regra foi o que fez este doc se contradizer até 2026-08-03: a regra de
ouro dizia "NUNCA", a regra acionável do backend dizia "não proibido", e o código seguia a segunda.

---

## BACKEND — Laravel por domínio

```
backend/app/
├── Domains/                    # eixo principal. Cada pasta = 1 contexto.
│   ├── Identity/               # usuários, auth, RBAC, redator/aluno/cliente como users
│   │   ├── Actions/            # regra de negócio single-action (ADR-02)
│   │   ├── Data/               # DTOs spatie/laravel-data (ADR-04) → geram tipos TS
│   │   ├── Enums/              # enums do domínio (QuoteStatus, RedatorDocumentType…)
│   │   ├── Models/             # User, ... Eloquent (ADR-10 enforceMorphMap)
│   │   ├── Services/           # Domain Services (regra entre agregados)
│   │   ├── QueryBuilders/      # Custom Query Builders (consultas complexas)
│   │   ├── Support/            # value object / helper específico do domínio, quando houver
│   │   │                       #   (ex.: Identity/Support/PermissionCatalog.php)
│   │   ├── Policies/           # autorização por modelo (casa com Spatie, ADR-07)
│   │   ├── Exceptions/         # exceção própria do domínio (só quando houver)
│   │   ├── Http/Controllers/   # CRUD simples mora aqui direto (ADR-02)
│   │   ├── Http/Requests/      # FormRequest, se não validar via Data
│   │   └── routes.php          # rotas do domínio (agregadas por glob() em routes/api.php)
│   ├── Commercial/             # cliente/endereço/contato, orçamento, cotação, aprovação, anexos
│   ├── Catalog/                # cursos, templates de certificado, habilitação redator-curso
│   ├── Operation/              # turma, matrícula, designação redator, conclusão  [código real]
│   └── Certification/          # emissão on-demand, validação QR pública          [scaffold vazio]
│   (Feedback NÃO entra: decisão de 2026-08-22 — é documentação de turma, ver der-fisico.md)
│   (cada domínio: mesma estrutura interna, conforme necessidade)
│
├── Shared/                     # transversal. NÃO é domínio. Usado por todos.
│   ├── Exceptions/             # ProblemDetails (RFC 7807, ADR-03) — ligado no bootstrap/app.php
│   ├── Files/                  # upload polimórfico S3/MinIO: File (model) + UploadFileAction (ADR-10/11)
│   ├── Rules/                  # ValidRut (regra de validação reusável)
│   ├── Support/                # value objects / helpers puros (Rut, ...)
│   ├── Retention/               # RetentionPolicy — janelas de retenção de `audits`/`login_logs` (ADR-08)
│   ├── Logging/                 # EventoDeSeguranca — ponto único de escrita do canal `seguranca` (ADR-21)
│   ├── Alerts/                  # AlertThresholds + DetectorDeAcessoSuspeito — acesso suspeito (RNF-SEC-07)
│   └── Http/Middleware/        # SetLocale (i18n, ADR-15)
│   (listagem parcial — Shared/ tem outras pastas transversais além das citadas acima; ver diretório real)
│
├── Http/Controllers/Controller.php  # classe base abstrata do framework; TODO controller de domínio
│                               #   estende ela (nada de regra de negócio aqui)
│
├── Providers/
│   ├── AppServiceProvider.php  # Relation::enforceMorphMap() vive aqui (ADR-10)
│   └── TypeScriptTransformerServiceProvider.php  # output do ADR-04 (config/typescript-transformer.php)
│       # AuthServiceProvider.php e RouteServiceProvider.php planejados aqui NÃO existem no repo.
│       # Nenhuma classe Policy foi criada ainda em nenhum domínio (pasta Policies/ é scaffold vazio
│       # onde existe); routes.php de cada domínio é agregado por glob() direto em routes/api.php
└── Console/Commands/           # PRIMEIROS comandos Artisan do projeto (nasceram no bloco de retenção):
                                #   PodarAuditoria (`lotus:podar-auditoria`) e PodarLogins
                                #   (`lotus:podar-logins`) — poda de `audits`/`login_logs` por
                                #   `RetentionPolicy` (ADR-08). Agendados em `routes/console.php`,
                                #   executados pelo serviço `scheduler` do `docker-compose.prod.yml`.

backend/database/
├── migrations/                 # FONTE ÚNICA — migrations são globais, NÃO por domínio
├── seeders/                    # DatabaseSeeder, RolePermissionSeeder (ADR-07),
│                               #   OperationDemoSeeder (demo — gate local/demo, aborta se há cliente)
└── factories/
backend/routes/api.php          # só o esqueleto; delega aos routes.php dos domínios
```

### Regras do backend (acionáveis)
- **PSR-4:** `App\Domains\` → `app/Domains/` no composer.json. Trade-off assumido: alguns `artisan make:*` precisam de stub custom.
- **Migrations NÃO por domínio:** ficam em `database/migrations/` único. Migration é cronológica/global; FK cruza domínios (ex: `turmas.quote_id` → Commercial).
- **routes.php por domínio:** cada domínio declara suas rotas; `routes/api.php` as agrega por `glob(app_path('Domains/*/routes.php'))` e fica só como esqueleto. Não existe `RouteServiceProvider` no repo — o `glob()` é o mecanismo real.
- **Cruzamento de domínio:** ex. Operation consome Quote (Commercial) via Service/Action do Commercial
  OU lendo o Model — **nunca duplicando a regra**. Acoplamento controlado, não proibido; o que vale é
  a superfície pública + as arestas de `backend/tests/Feature/Shared/DomainDependencyTest.php`. A
  lista de arestas **não** é repetida aqui de propósito: doc que copia lista envelhece calado
  (lição 13). Para saber o que é permitido, leia o teste — ele reprova.
- **Criar estrutura de domínio só quando ele entra em desenvolvimento.** Não criar pastas vazias especulativas.

---

## FRONTEND — React feature-based, 3 camadas (ADR-05)

```
frontend/src/
├── app/                        # MONTAGEM. Só orquestra, sem regra de domínio.
│   ├── router/                 # rotas + guards por role (ADR-07)
│   ├── providers/              # QueryClientProvider, tema, i18n, Zustand root
│   ├── layouts/                # AppLayout (sidebar admin / interface redator)
│   ├── pages/                  # página que NÃO é de domínio: DashboardPage, ModulePlaceholder
│   ├── SessionBootstrap.tsx    # hidrata a sessão antes de liberar as rotas
│   └── App.tsx
│
├── shared/                     # COMPARTILHADA. Não pertence a domínio.
│   ├── ui/                     # WRAPPERS PrimeReact — features NUNCA importam primereact direto
│   │   ├── AppButton/ AppDataTable/ AppDialog/ AppDropdown/ AppInputText/ …  # pasta-por-componente + index.ts
│   │   ├── ModulePage/ CrudDialog/ PageHeader/   # moldes reusáveis de página de módulo e diálogo de cadastro
│   │   ├── AppearanceControls/ LanguageMenu/ Clock/ AppLogo/  # chrome: tema (ADR-16), idioma (ADR-15)
│   │   ├── <Wrapper>/style.ts  # passthrough/variante nomeada SÓ quando há customização (senão nem existe)
│   │   └── index.ts            # barrel raiz: um `export * from './X'` por pasta; features importam SÓ daqui
│   ├── api/
│   │   ├── axios.ts            # cliente + interceptor RFC 7807 (ADR-03) · exporta ProblemDetails
│   │   ├── csrf.ts             # initCsrf() isolado (chamado antes de mutar)
│   │   ├── crud.ts  createCrudResource.ts  # fábrica genérica de recurso CRUD (list/get/create/update/delete)
│   │   └── clientsApi.ts  coursesApi.ts  redatoresApi.ts  budgetsApi.ts  # TODO cliente REST nasce aqui (ADR-18)
│   ├── stores/                 # Zustand TRANSVERSAL, não domínio: uiStore (tema/idioma), sessionStore (usuário)
│   ├── hooks/                  # useClock, useCrudPage, useEntityForm, usePermissions (can() é infra de UI)
│   ├── lib/                    # helpers puros: chileRegions, datetime, dialogMode, name, roles
│   ├── types/                  # tipos TS GERADOS do backend (ADR-04) — NÃO editar à mão
│   └── config/                 # brand, navigation, primeTheme (ADR-16), i18n + locales (ADR-15)
│
├── features/                   # DOMÍNIO. Espelha os Domains do backend.
│   ├── identity/               # auth (login), redator, alunos, admin — espelha Domains/Identity
│   │   ├── api/                # authApi (login/logout/me num arquivo), redator, documentos
│   │   ├── components/         # sub-pasta por entidade quando passa de ~3 arquivos:
│   │   │   ├── Login/          #   LoginPage, LoginForm
│   │   │   ├── Redator/        #   RedatorDialog, RedatoresTable
│   │   │   ├── Student/        #   StudentDialog, StudentsTable (Bloco Pessoas · Alunos)
│   │   │   ├── Admin/          #   RoleDialog, RolesTable, StaffUserDialog, UsersTable
│   │   │   ├── AdministracionPage.tsx  # página de Administração (roles/usuários)
│   │   │   └── PeoplePage.tsx  #   página do módulo (rota /personas)
│   │   ├── hooks/              # hooks locais (useRedatorForm, useRedatoresPage…)
│   │   └── lib/                # helpers de UI locais (redatorStatus devolve CHAVE de status, não texto)
│   ├── commercial/             # cliente + orçamento/cotação
│   │   ├── api/                # SÓ hooks de sub-recurso (useQuotes, useCommercialFiles) — o
│   │   │                       #   cliente REST (budgetsApi/clientsApi) vive em shared/api (ADR-18)
│   │   ├── components/         # Client/ (ClientDialog, ClientsTable) · Budget/ (BudgetsTable,
│   │   │                       #   BudgetDetailPage, BudgetDialog, QuoteWizard, QuotesList, FileList)
│   │   ├── hooks/              # useClientForm, useBudgetForm, useQuoteForm, useXPage
│   │   └── lib/                # helpers de UI locais (quoteStatusSeverity → severidade da AppTag;
│   │                           #   uf → formato chileno 1.234,5678)
│   ├── catalog/                # cursos + habilitação de redatores (código real)
│   ├── operation/              # turmas, matrícula, documentos, conclusão — código real
│   │   ├── api/ components/{Document,Enrollment,Turma}/ hooks/ lib/ stores/
│   ├── certification/          # scaffold vazio (.gitkeep) — entra na Sprint 4
│   │   (feedback/ NÃO entra — decisão de 2026-08-22)
│   (sessão foi extraída para shared/stores por ser infra transversal, não domínio de identity)
└── main.tsx                    # entrypoint — imports de CSS global (tema PrimeReact) aqui

frontend/vite.config.ts         # react + tailwind + aliases (@, @app, @shared, @features).
                                #   NÃO tem plugin de i18n nem de typescript-transformer: os tipos
                                #   são gerados por `php artisan typescript:transform` (ADR-04) e o
                                #   i18n é runtime (i18next em shared/config/i18n.ts, ADR-15).
frontend/tsconfig.app.json       # paths: @shared, @features, @app (tsconfig.json só referencia os sub-projetos)
```

### Regras do frontend (acionáveis)
- **3 camadas por alcance, não por tipo:** `app` (monta) > `features` (domínio) > `shared` (base). Feature usa shared; shared NUNCA usa feature.
- **Feature não importa de feature.** Composição acontece na camada `app`/rota, ou o dado vem via API.
- **PrimeReact SÓ em `shared/ui` (CRÍTICO):** features importam `AppButton`, nunca `Button` do pacote. Centraliza tema/defaults; troca de lib um dia = mexer só em shared/ui.
- **`shared/types` é gerado, não escrito à mão.** Editar quebra o sync. Tipo local de UI fica no `types.ts` da feature. Tipo à mão temporário = dívida marcada (ver ADR-04).
- **server state vs client state:** dado do servidor → `features/<x>/api` (TanStack Query). Estado de UI (tema, wizard, modais, sessão) → Zustand. Não misturar.
- **Validação QR pública** é rota Laravel pública (domínio Certification), **fora** desta SPA autenticada. Não criar `public/validate/` na SPA.
- **`style.ts` no wrapper quando houver variante nomeada ou customização de tema.** Não é cerimônia: wrapper sem customização não ganha `style.ts`.
- **Cor que acompanha o tema usa CSS var do Lara** (`--surface-section`, `--surface-card`, `--surface-border`), não par `bg-white dark:bg-slate-800` (ADR-16).
- **Um `export * from './X'` por pasta** no barrel `shared/ui/index.ts`. Nunca caminho fundo.
- **Sub-pasta por entidade** em `components/` quando a entidade passa de ~3 arquivos.
- **Vocabulário de domínio é o do backend.** `Redator`, não `Writer`. Nome de tela pode ser em inglês (`PeoplePage`); a rota fica em espanhol (`/personas`), é interface de usuário.
- **`can()` é conveniência de interface, não segurança.** A autorização é da API (ADR-07).

---

## Divergências entre planejamento e estado real (atenção ao criar arquivos)

Pequenos pontos onde o repo real difere do planejamento original — ambos aceitáveis, registrados para não confundir:

1. **Wrappers `shared/ui`:** o planejamento escreveu `AppButton.tsx` (arquivo); o repo adotou **pasta-por-componente** (`AppButton/AppButton.tsx` + `index.ts`). Padrão vigente = pasta. Manter uniforme: todo wrapper é pasta.
2. **`App.tsx`:** resolvido — o shell (task 2.4.1) foi entregue; o entrypoint e os providers vivem em `app/`. `main.tsx` na raiz de `src/` segue como ponto de montagem.
3. **Features com código real:** `identity`, `commercial`, `catalog` e, desde a Sprint 3, `operation`
   estão em desenvolvimento (código real — 38 arquivos PHP em `Domains/Operation/`, 32 em
   `features/operation/`). `certification` segue como **scaffold vazio** dos dois lados — no
   backend, pastas sob `Domains/Certification/` sem nenhuma classe; no front, pasta com
   `.gitkeep`/stores vazios. **`feedback` não existe e não vai existir** em nenhum dos dois: a decisão
   de 2026-08-22 absorveu RF-FBK na documentação de turma (`files` + `TurmaDocumentType` + RN-16).
   O scaffold vazio de `certification` contraria a regra "não criar pastas vazias especulativas"
   (dívida consciente, herdada do bootstrap do repo): quando a Sprint 4 abrir `certification`, ou se
   preenche, ou se enxuga. Não é bloqueante.
4. **Cliente REST em `shared/api`, não na feature (ADR-18):** a árvore original insinuava `features/<x>/api/` como casa do CRUD. Vigente: `createCrudResource` sempre em `shared/api`; `features/<x>/api/` guarda só hooks de sub-recurso (nested/upload) que invalidam a key do pai.

---

## `[A CONFIRMAR FASE 2]`
- `app/Domains/` vs `src/Domains/` (cosmético).
- Separar Auth de UserManagement se Identity crescer muito (só se doer).

**Resolvido:** *file-based routing (TanStack Router) vs `pages/` manual* — venceu o `pages/` manual.
`app/router/AppRouter.tsx` declara as rotas à mão; `app/pages/` guarda as páginas sem domínio e cada
feature expõe a sua (`PeoplePage`, `BudgetDetailPage`). Sem plugin de rota no build. Reabrir só se a
contagem de rotas passar a doer.

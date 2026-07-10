# Estrutura do Monólito — Lotus

> Snapshot de 2026-07-04. Fonte: planejamento (camada avançada) + estado real do repo.
> Backend por DOMÍNIO (DDD-lite · ADR-02). Frontend em 3 camadas por ALCANCE (feature-based · ADR-05).
> **Consulte antes de criar qualquer arquivo — para saber ONDE ele vai e que regra de importação segue.**

## Regra de ouro (vale dos dois lados)
Dependência só aponta **para baixo / para o compartilhado**. Um domínio (ou feature) **NUNCA** importa de outro domínio direto — sobe para a camada de cima ou usa a API. Violar isto é o "espaguete do feature-based ingênuo" — não fazer.

---

## BACKEND — Laravel por domínio

```
backend/app/
├── Domains/                    # eixo principal. Cada pasta = 1 contexto.
│   ├── Identity/               # usuários, auth, RBAC, redator/aluno/cliente como users
│   │   ├── Actions/            # regra de negócio single-action (ADR-02)
│   │   ├── Data/               # DTOs spatie/laravel-data (ADR-04) → geram tipos TS
│   │   ├── Models/             # User, ... Eloquent (ADR-10 enforceMorphMap)
│   │   ├── Services/           # Domain Services (regra entre agregados)
│   │   ├── QueryBuilders/      # Custom Query Builders (consultas complexas)
│   │   ├── Policies/           # autorização por modelo (casa com Spatie, ADR-07)
│   │   ├── Http/Controllers/   # CRUD simples mora aqui direto (ADR-02)
│   │   ├── Http/Requests/      # FormRequest, se não validar via Data
│   │   └── routes.php          # rotas do domínio (agregadas pelo RouteServiceProvider)
│   ├── Commercial/             # orçamento, cotação, aprovação, cliente-contato
│   ├── Catalog/                # cursos, templates de certificado, habilitação redator-curso
│   ├── Operation/              # turma, matrícula, designação redator, conclusão
│   ├── Certification/          # emissão on-demand, validação QR pública
│   └── Feedback/               # avaliações, pré-condição de conclusão
│   (cada domínio: mesma estrutura interna, conforme necessidade)
│
├── Shared/                     # transversal. NÃO é domínio. Usado por todos.
│   ├── Concerns/               # traits (ex: auditoria owen-it, ADR-08)
│   ├── Casts/  Data/  Support/ # casts, DTOs base, helpers/value objects (Rut, UF)
│   └── Files/                  # upload polimórfico S3 (ADR-10/11) - transversal
│
├── Providers/
│   ├── AppServiceProvider.php  # Relation::enforceMorphMap() vive aqui (ADR-10)
│   ├── AuthServiceProvider.php # registra Policies dos domínios
│   └── RouteServiceProvider.php# carrega os routes.php de cada domínio
└── Console/                    # comandos (ex: pruning da auditoria, ADR-08)

backend/database/
├── migrations/                 # FONTE ÚNICA — migrations são globais, NÃO por domínio
├── seeders/                    # RoleSeeder, PermissionSeeder (ADR-07)
└── factories/
backend/routes/api.php          # só o esqueleto; delega aos routes.php dos domínios
```

### Regras do backend (acionáveis)
- **PSR-4:** `App\Domains\` → `app/Domains/` no composer.json. Trade-off assumido: alguns `artisan make:*` precisam de stub custom.
- **Migrations NÃO por domínio:** ficam em `database/migrations/` único. Migration é cronológica/global; FK cruza domínios (ex: `turmas.quote_id` → Commercial).
- **routes.php por domínio:** cada domínio declara suas rotas; RouteServiceProvider agrega. `routes/api.php` fica limpo.
- **Cruzamento de domínio:** ex. Operation consome Quote (Commercial) via Service/Action do Commercial OU lendo o Model — **nunca duplicando a regra**. Acoplamento controlado, não proibido.
- **Criar estrutura de domínio só quando ele entra em desenvolvimento.** Não criar pastas vazias especulativas.

---

## FRONTEND — React feature-based, 3 camadas (ADR-05)

```
frontend/src/
├── app/                        # MONTAGEM. Só orquestra, sem regra de domínio.
│   ├── router/                 # rotas + guards por role (ADR-07)
│   ├── providers/              # QueryClientProvider, tema, i18n, Zustand root
│   ├── layouts/                # AppLayout (sidebar admin / interface redator)
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
│   │   └── coursesApi.ts       # recurso compartilhado (mais de uma feature usa; feature não importa feature)
│   ├── stores/                 # Zustand TRANSVERSAL, não domínio: uiStore (tema/idioma), sessionStore (usuário)
│   ├── hooks/                  # useClock, useCrudPage, useEntityForm, usePermissions (can() é infra de UI)
│   ├── lib/                    # helpers puros (Rut, UF, datas)
│   ├── types/                  # tipos TS GERADOS do backend (ADR-04) — NÃO editar à mão
│   └── config/                 # brand, navigation, primeTheme (ADR-16), i18n + locales (ADR-15)
│
├── features/                   # DOMÍNIO. Espelha os Domains do backend.
│   ├── identity/               # auth (login) E redator — espelha Domains/Identity do backend
│   │   ├── api/                # authApi (login/logout/me num arquivo), redator, documentos
│   │   ├── components/         # sub-pasta por entidade quando passa de ~3 arquivos:
│   │   │   ├── Login/          #   LoginPage, LoginForm
│   │   │   ├── Redator/        #   RedatorDialog, RedatoresTable
│   │   │   └── PeoplePage.tsx  #   página do módulo (rota /personas)
│   │   ├── hooks/              # hooks locais (useRedatorForm, useRedatoresPage…)
│   │   └── lib/                # helpers de UI locais (redatorStatus devolve CHAVE de status, não texto)
│   ├── commercial/             # cliente + orçamento — components/Client/ (ClientDialog, ClientsTable)
│   │   └── (mesma estrutura interna: api/ components/ hooks/)
│   ├── catalog/ operation/ certification/ feedback/   # (criadas quando entrarem em desenvolvimento)
│   (sessão foi extraída para shared/stores por ser infra transversal, não domínio de identity)
└── main.tsx                    # entrypoint — imports de CSS global (tema PrimeReact) aqui

frontend/vite.config.ts         # plugin typescript-transformer (ADR-04) + i18n
frontend/tsconfig.json          # paths: @shared, @features, @app
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
2. **`App.tsx`:** planejamento coloca em `app/App.tsx`; o repo tem em `src/App.tsx` (default Vite). Mover para `app/` fica para a task 2.4.1 (shell) — não mover isoladamente agora.
3. **Features criadas antecipadamente:** `commercial` e `identity` estão em desenvolvimento (com código real); `catalog/operation/certification/feedback` seguem vazias. A regra "criar só quando entra em desenvolvimento" vale para as que ainda não têm código — completar ou enxugar quando entrarem. Não é bloqueante.

---

## `[A CONFIRMAR FASE 2]`
- `app/Domains/` vs `src/Domains/` (cosmético).
- File-based routing (TanStack Router) vs `pages/` manual.
- Separar Auth de UserManagement se Identity crescer muito (só se doer).

# INSTRUÇÕES DO PROJETO — Lotus Platform

> Arquitetura e padrões de código do Lotus. O `CLAUDE.md` traz o mapa da sessão (leis, fluxo,
> comandos) e aponta para cá na hora de implementar. **A mecânica de código vive aqui, em um lugar
> só** — o CLAUDE.md não a repete. Planejamento datado em `/docs` (tabela de consulta no CLAUDE.md §3).

---

## PARTE 0 — CLÁUSULAS DE EXCEÇÃO (leia antes de "obedecer cego")

Estas regras são o **padrão, não a prisão**. Dois níveis:

- **Convenções e padrões de código** (tudo nas Partes II e III): são o default. Se o caso de uso
  for especial e o padrão não servir, **desvie — desde que justifique o trade-off no
  `.superpowers/sdd/progress.md`** antes/junto da implementação. A regra vale; o bom senso sobrevive.
  Todo desvio da história do projeto foi registrado assim (ver progress.md) — é o mecanismo já em uso.
- **Leis invioláveis** (CLAUDE.md §5, de peso legal ou de ADR fechado: auditoria só na aplicação,
  `generated.ts` gerado, Sanctum cookie+CSRF, features não cruzam, RN-01): **não se desviam por
  conta própria.** Aqui o escape não é "documentar e seguir" — é **PARAR e confirmar com o João
  Victor.** Ex.: `generated.ts` nunca se edita à mão; se o gerador falha, corrige-se o DTO fonte —
  não o arquivo gerado.

Na dúvida sobre em qual nível uma regra cai: trate como inviolável e pergunte.

---

## PARTE I — POSTURA

Esta instrução não fixa soluções: o software evolui. O que ela fixa é **como Claude atua** diante
de qualquer ideia/decisão do João Victor — planejamento, stack, dev, arquitetura, infra ou produção.
Objetivo: **oferecer o melhor possível dentro do contexto**, elevando a qualidade das decisões.

Para toda ideia/decisão, responder por um dos três casos:
- **Caso A — ideal:** confirmar o caminho; apontar o que refinar/fortalecer.
- **Caso B — parcial:** reconhecer o que está bem pensado; apontar o que melhorar e como aplicar.
- **Caso C — equivocada:** apontar direto o que há de errado e por quê; apresentar a solução ideal.

Base: conhecimento de Claude + padrão de mercado + maturidade de arquiteto/dev sênior. Honestidade
técnica (não validar ideia fraca para agradar), trade-offs explícitos (a decisão final é do João),
pragmatismo (evitar over-engineering), clareza executiva (abstrair por padrão, detalhar quando
pedido), disciplina de escopo (não derivar para fora do Lotus).

---

## PARTE II — BACKEND (DDD-lite)

Domain-driven, **não** o MVC padrão. Código de domínio em `backend/app/Domains/<Dominio>/`, com
`Http/Controllers`, `Models`, `Actions`, `Data`, `Services`, `QueryBuilders`, `Policies`,
`routes.php`. PSR-4: `App\Domains\` → `app/Domains/` e `App\Shared\` → `app/Shared/`.

Domínios (espelhados 1:1 pelas `features/` do front):
- **Identity** — usuários, auth, redator, documentos do redator (`App\Domains\Identity`)
- **Commercial** — clientes, orçamentos, cotações
- **Catalog** — cursos, templates de certificado
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

**Migrations** globais e cronológicas em `database/migrations/` (FK cruza domínios, ex.
`turmas.quote_id` → Commercial). **Rotas** por domínio em `Domains/*/routes.php`, carregadas no
`bootstrap/app.php`, sob `auth:sanctum`. Seeders: `RoleSeeder`, `PermissionSeeder` (ADR-07).

### Padrão de entidade (CRUD) — DRY entre domínios

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
- **Domain Service (`Domains/<X>/Services/`) = regra compartilhada entre entidades.** Não se duplica.
  Ex.: cliente e redator são extensões 1:1 de `User`; o provisionamento do User de login (normalizar
  RUT, unicidade com `withTrashed`, criar inativo — RN-01) vive em `Identity/Services/UserProvisioner`,
  chamado por `CreateClientAction` e `CreateRedatorAction`.

Referência viva: pares `ClientController`/`RedatorController`, `ClientData`/`RedatorData` (ambos com
`fromModel`), `UserProvisioner`. Entidade de cadastro nova copia essa forma.

### Convenções de schema e domínio (decididas — não re-decidir sozinho)

- **Schema em inglês** (colunas descritivas). Exceção: **`redator` é nome próprio do domínio** (como
  "RUT") — tabela `redatores`, model `Redator`, FK `redator_id` ficam em PT (casam com morph map,
  pasta Identity, Notion). *Divergência aberta: o `docs/der-fisico.md` ainda está em PT/ES — ver Parte IV.*
- **Extensão 1:1 de User** (Client, Redator): `extends Model` + `belongsTo(User)`, `user_id`
  **unique** FK cascade. NÃO `extends User`.
- **RUT vive em `users.rut`** (já `unique`) — sem coluna duplicada nas extensões. Validação =
  `ValidRut` (dígito verificador, módulo 11) **separada** da unicidade (`unique:users,rut`, checada
  com `withTrashed` — RUT soft-deletado senão colide e retorna 500 no lugar de 422).
- **Enums carregam `other`** (ex.: `clients.type = enum('client','provider','other') default 'client'`).
- **Soft-delete de Client/Redator cascateia** até o User + nested (evento `deleting`, guard
  `isForceDeleting`). Padrão para toda tabela futura com `client_id`/`redator_id`.
- **Documentos:** enum por domínio (`RedatorDocumentType`), não global; `files` fica polimórfica
  genérica (`type` string). Delete de doc = soft-delete do metadado; **o arquivo permanece no bucket**
  (rastreável — peso legal). `File` é `Auditable`. Upload polimórfico: valide cada **folha** com
  `instanceof UploadedFile` (não só o nível de cima), senão `documents[CV][]` vira TypeError/500.
- **RBAC de cadastro = middleware `permission:`** (`HasMiddleware` no controller), não Policy. Policy
  fica para data-scoping (Turma: "redator só vê as suas"). Toda permissão nova entra no seeder.

### Auth (detalhe)

`bootstrap/app.php` habilita `statefulApi()`. Front: `GET /sanctum/csrf-cookie` → `POST /api/login`.
`AuthController` (`Domains/Identity/Http/Controllers`) regenera a sessão no login (anti
session-fixation) e rejeita usuário inativo. Env: `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`,
`SESSION_*`. CORS (`config/cors.php`) escopado a `api/*`, `sanctum/csrf-cookie`, `login`, `logout`,
`supports_credentials: true`. `User` gera `uuid` no create, soft-delete, `Auditable`; `type` enum
(`admin`/`redator`/`aluno`/`cliente`), `is_active` libera login. **Só admin e redator autenticam** (RN-01).

### Contratos de tipo (backend → frontend)

DTOs em `app/Data` com `#[TypeScript]`; o transformer varre `app/Data` e escreve um módulo flat em
`frontend/src/shared/types/generated.ts`. Mudou a forma de uma resposta → crie/atualize a classe
`Data` (nunca array ad-hoc) e regenere (`php artisan typescript:transform`). Nunca editar `generated.ts`
à mão (ADR-04).

---

## PARTE III — FRONTEND (feature-sliced)

`frontend/src/` em 3 camadas por alcance:
- **`app/`** — shell: `router/` (rotas + guards por role), `layouts/`, `providers/` (QueryClient,
  tema, i18n, stores raiz), `App.tsx`.
- **`features/<dominio>/`** — 1:1 com o backend (`identity` cobre auth **e** redator/pessoas;
  `commercial`; `catalog`; etc.). Cada uma: `api/` (hooks TanStack Query), `components/` (sub-pasta
  por entidade quando passa de ~3 arquivos: `Login/`, `Redator/`, `Client/`), `hooks/`, `lib/`.
- **`shared/`** — `api/` (axios + csrf + `createCrudResource`), `stores/` (Zustand transversal:
  `uiStore` tema/idioma, `sessionStore` usuário), `types/` (GERADO), `ui/` (wrappers PrimeReact +
  moldes `ModulePage`/`CrudDialog` + barrel), `hooks/` (`useCrudPage`, `useEntityForm`,
  `usePermissions`, `useClock`), `lib/` (`CHILE_REGIONS`, datetime, roles, `DialogMode`), `config/`
  (tema em runtime — ADR-16, i18n — ADR-15).

Aliases (`@`, `@app`, `@features`, `@shared`) em `vite.config.ts` **e** `tsconfig.app.json` —
sincronizados.

**Regra de dependência:** só aponta para baixo. Feature usa shared; shared NUNCA usa feature;
feature NÃO importa outra feature — **nem para tipo** (union compartilhado vai para `shared/lib`).
Composição cruzada acontece na camada `app`/rota ou via API (ex.: `coursesApi` read-only em
`shared/api` para o redator consumir sem importar `catalog`). **Validação QR pública** é rota Laravel
(domínio Certification), fora desta SPA — não criar `public/validate/` no front.

**server vs client state (ADR-05):** dado de servidor → `features/<x>/api` (TanStack Query).
UI/sessão → Zustand. Não misturar. Estado que **cruza componentes** (tema, sessão, wizard
multi-tela compartilhado) → Zustand; estado local de um form/passo que vive num só componente
fica em `useState` (ref.: passo do `QuoteWizard` em `useQuoteForm`). Não promover a Zustand o
que não cruza fronteira — é over-engineering.

### Padrões de código (crystalizados — ver Parte 0 para desviar)

- **Fábrica CRUD:** `createCrudResource<T>(resource)` = os 5 verbos REST (`api.post<T>` etc.,
  **sempre com generic**, senão `r.data` vira `any`). Sub-recursos nested (contatos, endereços,
  documentos, sync de cursos) = hooks pequenos por feature, **fora** da fábrica, invalidando a key
  do pai.
- **Axios (`shared/api/axios.ts`):** a instância **não** fixa `Content-Type` (exporta `api` com
  `withCredentials`/`withXSRFToken`; interceptor normaliza todo erro para `ProblemDetails`). Deixe o
  axios derivar: objeto → JSON; `FormData` → multipart+boundary. Fixar json faz todo `FormData`
  virar JSON e cada `File` virar `{}` — upload chega vazio, 201 silencioso (peso legal). `initCsrf()`
  (`shared/api/csrf.ts`) roda uma vez antes da 1ª mutação.
- **Wrappers `shared/ui`:** features importam `AppButton`, nunca `Button` do pacote.
  Pasta-por-componente (`AppButton/AppButton.tsx` + `index.ts`), `forwardRef`, reexporta `AppXProps`
  (fecha a fronteira de tipo — a feature importa `AppButtonProps`, nunca `ButtonProps`). Barrel raiz
  `shared/ui/index.ts` é a única porta. Customização de componente Prime vive aqui, nunca com Tailwind
  na feature. Em wrappers com handler embutido (upload), **pine o override após o spread**
  (`customUpload` não pode ser desligado pelo caller).
- **Tailwind = layout** (grid/espaçamento); cor via variável CSS do tema (ADR-16). Utility não vence
  a especificidade do tema — ao depurar estilo, cheque o **seletor completo do markup**, não a classe
  isolada.
- **Componente de feature = declarativo.** Estado, mutations/queries, navegação e derivação vão para
  um hook da feature (`features/<x>/hooks/useAlgo.ts`, ex. `useLoginForm`); o componente só consome e
  renderiza JSX. Wrappers `shared/ui` são a exceção (puro apresentacional).
- **Reset de form = "adjust state during render"** (compara `id+mode` em `useState` + `setForm`
  condicional no corpo do render), **não** `useEffect` (lint `react-hooks/set-state-in-effect`).
  Referência: `useClientForm`.
- **Página CRUD:** `useCrudPage` guarda o ID e deriva a entidade da **lista viva** (não congela
  objeto); `useEntityForm` cuida de form + reset por prop + erros de mutação; moldes
  `ModulePage`/`CrudDialog`. Dialog unificado view=edit=create (campos vazios = cadastro); prop
  `onEdit` abre a edição a partir do view.
- **Derivação de apresentação no front, não no DTO:** status de documento e idoneidade se calculam
  no front. `valid_until` inparseável → tratar como **vencido** (direção conservadora, peso legal).
  Sem documento obrigatório → `no_idoneo`.
- **i18n:** 3 locales (`pt-BR`, `es-CL`, `en`) com chaves **idênticas**; `es-CL` é a referência de
  rótulo (cliente chileno). `generated.ts` fica no `globalIgnores` do eslint.

---

## PARTE IV — ÍNDICE DE CONTEXTO (`/docs`)

Snapshots datados. **Fonte canônica é o Google Drive** (`V2/Planejamento/`); se um doc divergir, o
Drive vence — sinalize. Consulte o doc relevante antes de assumir; dúvida não coberta → pergunte.

| Arquivo | O que é | Consulte quando |
|---|---|---|
| `docs/adrs.md` | As decisões de arquitetura (ADRs) com regra acionável + porquê | Antes de QUALQUER decisão de stack, padrão, estrutura ou infra |
| `docs/der-fisico.md` | DER físico MySQL — tabelas, PK/FK, relações | Antes de criar migration, model ou mexer em schema |
| `docs/estrutura-monolito.md` | Esqueleto back+front, regras de dependência, divergências reais | Antes de criar arquivo novo — para saber ONDE ele vai |
| `docs/README.md` | Índice + lições institucionalizadas (erros que já custaram caro) | Para localizar contexto e não repetir erro conhecido |

**Divergências abertas (não resolver sozinho):**
- `docs/der-fisico.md` está em PT/ES; o schema implementado está em inglês (decisão do João) —
  alinhar o DER + o canônico do Drive é follow-up pendente de autorização (write externo).
- ADR-15 decidido: i18n = **i18next + react-i18next** (com `i18next-browser-languagedetector`),
  config em `shared/config/i18n.ts`, locales em `shared/config/locales`. Falta só formalizar o
  texto do ADR em `docs/adrs.md` (follow-up).
- ADR-08 (estratégia de pruning/poda da auditoria — volume de registros do `laravel-auditing`)
  segue **aberto**: definir política de retenção antes que a tabela `audits` cresça demais.

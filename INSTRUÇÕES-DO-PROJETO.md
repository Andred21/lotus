# INSTRUÇÕES DO PROJETO — Lotus Platform

> Detalhe de arquitetura e comportamento para o projeto Lotus. O `CLAUDE.md` na raiz traz o essencial de cada sessão (regras, disciplina, comandos) e aponta para cá quando é hora de implementar em profundidade. O contexto de planejamento (ADRs, DER, estrutura) está em `/docs` — índice no fim deste arquivo.

---

## PARTE I — PROPÓSITO E COMPORTAMENTO

### 1. Propósito

Esta instrução não fixa soluções técnicas. O software vai evoluir e ganhar novas funcionalidades ao longo da refatoração. O que ela define é **como Claude atua** diante de qualquer ideia ou decisão do João Victor — em qualquer âmbito: planejamento, tech stack, desenvolvimento, arquitetura, infra ou produção. O objetivo é sempre **oferecer o melhor possível dentro do contexto apresentado**, elevando a qualidade das ideias e decisões.

### 2. Contexto do produto

**Lotus** é uma plataforma corporativa para gerenciar o ciclo completo de capacitação profissional da empresa Lotus (cursos, alunos, professores/redatores, turmas, certificados com QR, histórico, feedback e pagamento de professores). Existe uma 1ª versão incompleta; a meta é uma **refatoração completa**, aplicando a maturidade técnica adquirida desde então. Stack definida: PHP + Laravel · React + TypeScript · MySQL. Funcionalidades específicas se definem ao longo do projeto — esta instrução é abstrata quanto a elas de propósito.

### 3. Escopo

**Dentro:** tudo da refatoração e evolução do Lotus — planejamento, decisões técnicas, desenvolvimento, produção. **Fora:** a metodologia de planejamento/workflow de software (projeto futuro separado). Se o assunto surgir, Claude registra que pertence ao outro projeto e volta ao Lotus.

### 4. Comportamento esperado (Caso A/B/C)

Para toda ideia ou decisão do João Victor, Claude busca **o melhor possível dentro do contexto** e responde conforme um dos três casos:

- **Caso A — a ideia é boa e ideal:** confirmar que está no caminho mais correto; apontar o que ainda pode ser refinado ou fortalecido.
- **Caso B — boa, mas com pontos a melhorar:** reconhecer o que está bem pensado; apontar com clareza o que melhorar e como aplicar.
- **Caso C — foge dos padrões ou está equivocada:** apontar diretamente o que há de precipitado ou errado, e por quê; apresentar a **solução ideal dentro do contexto**.

Base da recomendação em todos os casos: conhecimento de Claude, padrão de mercado, e maturidade técnica de arquiteto/dev sênior.

### 5. Postura

- **Honestidade técnica:** não validar ideia fraca só para agradar — apontar o erro é parte de oferecer o melhor.
- **Pragmatismo de sênior:** a melhor solução nem sempre é a mais avançada — considerar o estágio do projeto, evitar over-engineering.
- **Trade-offs explícitos:** expor o custo (complexidade, manutenção, prazo); a decisão final é do João Victor.
- **Clareza executiva:** abstrair e simplificar por padrão; detalhar quando pedido.
- **Disciplina de escopo:** não derivar para fora do Lotus.

Em resumo, Claude atua como **arquiteto de software / dev sênior parceiro**: confirma quando está certo, refina quando dá para melhorar, corrige com a solução ideal quando há equívoco.

---

## PARTE II — ARQUITETURA DO BACKEND

Domain-driven, **não** o MVC padrão do Laravel. Código de domínio em `backend/app/Domains/<Dominio>/`; dentro de cada um reaparecem `Http/Controllers`, `Models`, além de `Actions`, `Data`, `Services`, `QueryBuilders`, `Policies`, `routes.php`. Dois PSR-4 no `composer.json`: `App\Domains\` → `app/Domains/` e `App\Shared\` → `app/Shared/`.

Domínios (espelhados 1:1 pelas `features/` do front):
- **Identity** — usuários, auth, redatores (`App\Domains\Identity`)
- **Commercial** — clientes, orçamentos, cotações
- **Catalog** — cursos, templates de certificado
- **Operation** — turmas, matrículas, notas, designação
- **Certification** — emissão on-demand, validação QR pública
- **Feedback** — avaliações de turma

**Estado atual:** só `Identity` tem código real (`User` + `AuthController`). Os demais são estrutura placeholder (`.gitkeep`), já referenciados no morph map. Regra: criar a estrutura de um domínio só quando ele entra em desenvolvimento.

**`App\Shared\`** = infra transversal. Ex: `App\Shared\Exceptions\ProblemDetails` converte qualquer exceção em envelope RFC 7807, ligado globalmente em `bootstrap/app.php` (todo `api/*` e requests que esperam JSON). Controllers deixam exceções subirem — não montam resposta de erro à mão. Erros de validação carregam `errors` por campo.

**Morph map (ADR-10):** `Relation::enforceMorphMap` no `AppServiceProvider` é o único lugar que liga aliases (`user`, `client`, `redator`, `course`, `turma`, `budget`, `quote`) às classes. Atualize sempre que adicionar um model auditável/polimórfico.

**Migrations são globais** (`database/migrations/`), NÃO por domínio — cronológicas, e FK cruza domínios (ex: `turmas.quote_id` → Commercial). Seeders: `RoleSeeder`, `PermissionSeeder` (ADR-07).

### Padrão de entidade (CRUD) — DRY entre domínios

Toda entidade segue a **MESMA forma**, independente do domínio. Não se coda cliente diferente de redator diferente de curso — é padronizado. Diferenciar a estrutura por entidade é dívida a corrigir, não estilo pessoal.

- **Controller = fino.** Só orquestra: injeta a Action (escritas) e recebe o model por route binding (leituras). Retorna sempre `XData::fromModel($model)`. NUNCA monta o payload à mão — `XData::from([...])` inline no controller é proibido — nem carrega regra de negócio.
- **Data (`XData`, spatie/laravel-data) = contrato único.** Concentra validação (`rules()` com `ValidRut` etc.), o `#[TypeScript]`, e a hidratação canônica `public static function fromModel(X $m): self` que achata as relações (ex.: campos do `user` no topo). É o único lugar que sabe montar o DTO a partir do model.
- **Action = regra de escrita.** Uma por operação (`CreateXAction`, `UpdateXAction`), dentro de `DB::transaction`. CRUD sem regra (list/show/destroy) vai direto ao Eloquent no controller (ADR-02).
- **Domain Service (`Domains/<X>/Services/`) = regra entre agregados / lógica compartilhada entre entidades.** Quando duas entidades precisam da mesma regra, ela vira Service e as Actions o chamam — não se duplica. Ex.: cliente e redator são extensões 1:1 de `User`; o provisionamento do User de login (normalizar RUT, unicidade incl. soft-deletados, criar inativo — RN-01) vive em `Identity/Services/UserProvisioner`, chamado por `CreateClientAction` e `CreateRedatorAction`.

Referência viva do padrão: os pares `ClientController`/`RedatorController` (estrutura idêntica), `ClientData`/`RedatorData` (ambos com `fromModel`) e `UserProvisioner`. Entidade de cadastro nova copia essa forma.

### Auth (detalhe)
`bootstrap/app.php` habilita `statefulApi()`. Fluxo: front chama `GET /sanctum/csrf-cookie`, depois `POST /api/login`. `AuthController` (`Domains/Identity/Http/Controllers`) regenera a sessão no login (anti session-fixation) e rejeita usuário inativo pós-auth. Env: `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`, `SESSION_*`. CORS (`config/cors.php`) escopado a `api/*`, `sanctum/csrf-cookie`, `login`, `logout`, com `supports_credentials: true`. O `User` gera `uuid` no create, faz soft-delete e é `Auditable` (campos em `$auditInclude`, `config/audit.php`). `type` é enum (`admin`, `redator`, `aluno`, `cliente`); `is_active` libera o login. **Só admin e redator autenticam** (RN-01).

### Contratos de tipo (backend → frontend)
DTOs em `app/Data/` com `#[TypeScript]`; o transformer (`TypeScriptTransformerServiceProvider`) varre `app/Data` e escreve um módulo flat em `frontend/src/shared/types/generated.ts`. Ao adicionar/mudar a forma de uma resposta: crie/atualize a classe `Data` — não retorne array ad-hoc — e regenere os tipos (comando artisan do typescript-transformer) para o front ficar em sync.

---

## PARTE III — ARQUITETURA DO FRONTEND

Feature-sliced em `frontend/src/`, 3 camadas por alcance:
- **`app/`** — shell: `router/` (rotas + guards por role), `layouts/`, `providers/` (QueryClient, tema, i18n), `App.tsx`
- **`features/<dominio>/`** — uma por domínio do backend (`identity`, `commercial`, `catalog`, `operation`, `certification`, `feedback`), cada uma com `api/` (hooks TanStack Query), `components/`, `hooks/`, `stores/` (Zustand local), `types.ts` (tipos locais de UI)
- **`shared/`** — `api/` (axios + csrf), `types/` (GERADO), `ui/` (wrappers PrimeReact + barrel), `hooks/`, `config/`, `lib/`

Aliases (`@`, `@app`, `@features`, `@shared`) em `vite.config.ts` **e** `tsconfig.app.json` — mantenha sincronizados.

**Regra de dependência:** só aponta para baixo — feature usa shared, shared NUNCA usa feature; feature NÃO importa outra feature (composição na camada `app`/rota, ou via API). Evita o espaguete do feature-based ingênuo.

**`shared/api/axios.ts`** exporta a instância `api` (`withCredentials`, `withXSRFToken`) + a interface `ProblemDetails`; o interceptor normaliza todo erro (inclusive falha de rede) para esse formato — o chamador sempre pode esperar rejeição no formato `ProblemDetails`. **`shared/api/csrf.ts`** expõe `initCsrf()` (roda uma vez antes da primeira mutação autenticada).

**Wrappers `shared/ui` (CRÍTICO):** features importam `AppButton`, nunca `Button` do pacote. Padrão pasta-por-componente (`AppButton/AppButton.tsx` + `index.ts`), `forwardRef`, herda a API do Prime e fecha a fronteira de tipo (a feature importa `AppButtonProps`, nunca `ButtonProps`). Barrel raiz `shared/ui/index.ts` é a única porta. Customização de componente vive aqui, não com Tailwind na feature.

**server state vs client state (ADR-05):** dado do servidor → `features/<x>/api` (TanStack Query). UI/sessão/wizard → Zustand. Não misturar. **Validação QR pública** é rota Laravel (domínio Certification), fora desta SPA — não criar `public/validate/` na SPA.

**Lógica fora da renderização (componentes de feature):** todo componente de feature (tudo fora de `shared/ui`) separa lógica de apresentação. Estado, mutations/queries, navegação e derivação de dados vão para um hook da feature (`features/<x>/hooks/useAlgo.ts`); o componente só consome o hook e renderiza JSX. Wrappers `shared/ui` são a exceção — são puramente apresentacionais. Conforme o código cresce, lógica comum entre entidades vira hooks reutilizáveis aplicados onde são usados (ex.: `useLoginForm` para o `LoginForm`).

**Estado atual:** Sprint 0 (scaffolding). `App.tsx` ainda tem template Vite + chamada de login hardcoded para smoke-test do auth — será substituído.



---

## PARTE IV — ÍNDICE DE CONTEXTO (`/docs`)

Snapshots datados do planejamento. **Fonte canônica é o Google Drive** (`V2/Planejamento/`); se um doc divergir, o Drive vence — sinalize. Consulte o doc relevante antes de assumir; se a dúvida não estiver coberta, pergunte ao João Victor.

| Arquivo | O que é | Consulte quando |
|---|---|---|
| `docs/adrs.md` | As 15 decisões de arquitetura (ADRs) com regra acionável + porquê | Antes de QUALQUER decisão de stack, padrão, estrutura ou infra |
| `docs/der-fisico.md` | DER físico MySQL — 24 tabelas, PK/FK, relações | Antes de criar migration, model ou mexer em schema |
| `docs/estrutura-monolito.md` | Esqueleto back+front detalhado, regras de dependência, divergências reais | Antes de criar arquivo novo — para saber ONDE ele vai |
| `docs/README.md` | Índice + lições institucionalizadas (erros que já custaram caro) | Para localizar contexto e não repetir erro conhecido |

**Pendências abertas (não decidir sozinho):** ADR-16 formal do Tailwind; biblioteca exata de i18n (ADR-15); estratégia de pruning da auditoria (ADR-08).

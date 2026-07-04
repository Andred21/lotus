# Design — Fluxo de login no front + store de sessão

- **Task (Notion):** 2.2.4 — Fundação · Frontend · Tela/UI — "Implementar fluxo de login no front + store de sessão"
- **Depende de:** 2.2.3 (axios client + CSRF) — entregue: `shared/api/axios.ts`, `shared/api/csrf.ts`
- **Data:** 2026-07-04
- **ADRs relacionados:** ADR-03/06 (auth Sanctum cookie/CSRF), ADR-04 (tipos gerados do backend), ADR-05 (server state TanStack Query vs client state Zustand)

---

## 1. Objetivo e escopo

Implementar o fluxo de autenticação completo do frontend: tela de login fiel ao
protótipo, store de sessão, hooks de auth, hidratação da sessão no boot e guard
de rota. Ao fim, é possível logar como `admin`/`redator`, permanecer logado
após refresh, e deslogar — comprovado rodando o app (não há test runner de
front).

**Dentro do escopo:**
- Session store (Zustand) — `user` + `status`
- Hooks de auth (TanStack Query): `useLogin`, `useLogout`, `useMe`
- Bootstrap de sessão no boot (chama `GET /api/me`)
- `ProtectedRoute` (guard auth-vs-não) + roteamento base (react-router v7)
- `LoginPage` + `LoginForm` fiéis ao Figma
- Wrappers `shared/ui`: `AppInputText`, `AppPassword` (além do `AppButton` existente)
- `HomePage` placeholder (destino pós-login, descartável)
- Provider do TanStack Query (`QueryClientProvider`) — ainda não existe
- **Backend (pré-requisito pequeno):** DTO `SessionUserData` com `#[TypeScript]` + regenerar `generated.ts`

**Fora do escopo (adiado, não decidir aqui):**
- i18n / seletor de idioma PT-ES → **ADR-15 aberto**. Renderizado só visualmente (stub), texto estático `es_CL`.
- Dark mode / toggle de tema → **ADR-16 aberto**. Renderizado só visualmente (stub), tema claro fixo.
- Recuperação de senha ("¿Olvidaste tu contraseña?") → sem endpoint no backend. Link renderizado como stub sem ação.
- Guard por **role** (admin vs redator) → não há página role-específica ainda. Guard só distingue autenticado vs não.
- Reforma do tema PrimeReact → cor de marca aplicada via CSS var/constante, sem tocar o tema.

---

## 2. Decisões travadas

| # | Decisão | Escolha | Porquê |
|---|---------|---------|--------|
| 1 | Divisão de estado da auth | **Zustand é fonte da sessão; hooks TanStack Query escrevem nela** | Respeita ADR-05 literal: sessão transversal → Zustand; idas ao servidor → TanStack Query. Ponto único de escrita no `onSuccess`. |
| 2 | Sessão no refresh | **`GET /api/me` no boot** | Fonte de verdade = cookie Sanctum. Nada em localStorage (ADR-06). |
| 3 | Contrato de tipo do usuário | **Expandir DTO no backend** (`SessionUserData` + regenerar tipos) | ADR-04: tipo vem do DTO. O `UserData` atual (`id/name/email`) não cobre `uuid/type/is_active` do payload de login. |
| 4 | Destino pós-login | **`HomePage` placeholder mínima** | Torna o fluxo verificável ponta-a-ponta (DoD, regra 8). Descartada quando a dashboard real chegar. |
| 5 | Elementos idioma/dark/senha do protótipo | **Só visual (stubs), sem funcionamento** | Fidelidade ao Figma sem forçar ADR-15/16 nem fluxo de senha. |

---

## 3. Arquitetura de estado

Auth fica na fronteira do ADR-05. Reconciliação escolhida (abordagem A):

- **`features/identity/api/`** — interações com servidor via TanStack Query:
  - `useLogin` (mutation): `initCsrf()` → `POST /api/login` → `onSuccess` grava user no store
  - `useLogout` (mutation): `POST /api/logout` → `onSuccess` limpa store
  - `useMe` (query): `GET /api/me` — usado no boot para hidratar
- **`features/identity/stores/sessionStore.ts`** — Zustand, fonte de verdade da sessão que guard/layout/features leem:
  ```
  user: SessionUser | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  setUser(user)   // status → 'authenticated'
  clear()         // user → null, status → 'unauthenticated'
  ```
  `isAuthenticated` derivado de `status === 'authenticated'`.

Rejeitadas: (B) TanStack Query como fonte única — colide com ADR-05 e espalha
`useQuery(['me'])`; (C) só Zustand chamando `api` na mão — descarta o TanStack
Query onde ele ajuda (estados de mutation) e cria padrão de fetch paralelo.

---

## 4. Estrutura de arquivos

```
frontend/src/
├─ app/
│  ├─ App.tsx                    # substitui template Vite: <AppProviders><AppRouter/></AppProviders>
│  ├─ providers/
│  │  └─ AppProviders.tsx        # QueryClientProvider (novo)
│  ├─ router/
│  │  ├─ AppRouter.tsx           # rotas react-router v7 + <SessionBootstrap>
│  │  └─ ProtectedRoute.tsx      # guard: lê sessionStore, redirect /login se não-auth
│  └─ SessionBootstrap.tsx       # no mount dispara useMe; segura render até resolver
├─ features/identity/
│  ├─ api/
│  │  ├─ authApi.ts              # login(), logout(), fetchMe() sobre `api`
│  │  ├─ useLogin.ts
│  │  ├─ useLogout.ts
│  │  └─ useMe.ts
│  ├─ stores/
│  │  └─ sessionStore.ts
│  ├─ components/
│  │  ├─ LoginPage.tsx           # layout split (composição)
│  │  └─ LoginForm.tsx           # form controlado + erros
│  └─ types.ts                   # re-export/alias SessionUser a partir do tipo gerado
├─ shared/
│  ├─ ui/
│  │  ├─ AppInputText/           # wrapper novo (InputText + ícone à esquerda)
│  │  ├─ AppPassword/            # wrapper novo (Password toggleMask, feedback=false)
│  │  └─ index.ts                # barrel (porta única)
│  └─ config/
│     └─ brand.ts                # constante da cor #25A5E4 / CSS var
└─ app/
   └─ HomePage.tsx              # placeholder pós-login (nível app). Stand-in da futura dashboard;
                                #   decidir depois se vira feature própria ou outra estratégia.
```

Backend:
```
backend/app/Data/SessionUserData.php   # id, uuid, name, email, type, is_active + #[TypeScript]
backend/app/Domains/Identity/Http/Controllers/AuthController.php  # retorna SessionUserData::from(...)
frontend/src/shared/types/generated.ts # regenerado via `php artisan typescript:transform`
```

---

## 5. Fluxo e comportamento

**Boot (refresh):** `SessionBootstrap` monta → `status='loading'`, chama `GET /api/me`.
- `200` → `setUser`, `status='authenticated'`
- `401` → `status='unauthenticated'`
- Enquanto `loading`: segura o render (spinner) para não piscar a tela de login.

**Login:** submit no `LoginForm` → `useLogin`:
- `initCsrf()` → `POST /api/login {email, password}`
- `onSuccess` → grava user no store → redireciona para rota pretendida (`state.from`) ou `/`
- `onError` (formato `ProblemDetails`): `422` → erros por campo; `401`/inativo → mensagem no topo do form

**Logout:** botão na `HomePage` → `useLogout`: `POST /api/logout` → `onSuccess` `clear()` → redireciona `/login`.

**Guard (`ProtectedRoute`):** lê `status`.
- `unauthenticated` → `<Navigate to="/login" state={{ from }} />`
- em `/login`, se já `authenticated` → redireciona `/`

**Rotas:** `/login` (pública) · `/` (protegida → `HomePage`) · catch-all → `/`.

**Erros:** todo erro chega no formato `ProblemDetails` (interceptor do axios já normaliza).
O form distingue 422 (por campo) de 401/inativo (mensagem geral). Falha de rede →
mensagem geral "Erro de conexão".

---

## 6. UI (fiel ao Figma)

Protótipo: https://piece-desert-35638359.figma.site/

**Layout split 2 colunas (responsivo — empilha no mobile):**
- **Esquerda:** painel gradiente `#25A5E4`, círculos decorativos, logo Lotus
  (`src/assets/Logo.png`) centralizada, tagline "Plataforma de capacitación
  profesional / Sector eléctrico de alta tensión", versão no rodapé (`v0.1.0`).
- **Direita:** fundo branco, form centralizado — título "Iniciar sesión",
  subtítulo "Ingresa con tus credenciales", campo email (ícone envelope,
  placeholder `correo@empresa.cl`), campo senha (ícone cadeado + olho toggle),
  botão azul "Iniciar sesión", link stub "¿Olvidaste tu contraseña?", divisor.
- **Topo-direito:** seletor de idioma (PT/ES) e toggle dark mode — **ambos stubs visuais**.

**Wrappers `shared/ui` necessários:**
- `AppInputText` — `InputText` do Prime com ícone à esquerda (`IconField`/`InputIcon`)
- `AppPassword` — `Password` do Prime com `toggleMask` (olho), `feedback={false}`, ícone cadeado
- `AppButton` — já existe

**Cor de marca `#25A5E4`:** CSS var / constante em `shared/config/brand.ts`
(gradiente do painel + botão). Sem reformar o tema PrimeReact (evita ADR-16).

Texto todo estático em `es_CL` (locale real do produto).

---

## 7. Verificação (critério de aceite)

Não há test runner de front — prova rodando o app (`pnpm dev` + backend up).

1. Login com `admin@lotus.cl` (usuário `is_active`) → cai na `HomePage`.
2. Refresh na `HomePage` → permanece logado (hidratação via `GET /api/me`).
3. Logout → volta para `/login` e `HomePage` fica inacessível (guard redireciona).
4. Credencial errada → mensagem de erro visível no form (não trava a UI).
5. Usuário inativo → bloqueado com mensagem (backend já rejeita pós-auth).
6. Tela bate visualmente com o protótipo (layout split, logo, campos, cor de marca).
7. `pnpm build` (tsc) passa sem erro de tipo; features importam só de `shared/ui` (nunca `primereact/*` direto).

---

## 8. Riscos / notas

- **Provider TanStack Query ausente:** `main.tsx`/`App.tsx` ainda não montam `QueryClientProvider`. Entra nesta task (senão os hooks quebram).
- **`App.tsx` template Vite + login hardcoded:** será removido/substituído.
- **DTO no backend:** `SessionUserData` deve espelhar exatamente o payload do `AuthController`; regenerar tipos após criá-lo. Manter `userPayload()` e o DTO em sincronia (idealmente o controller passa a usar o DTO como única fonte).
- **Stubs visuais:** idioma/dark/senha não têm ação — documentar no código com `// stub: ADR-15` / `// stub: ADR-16` / `// stub: fluxo de senha` para não parecerem bugs.

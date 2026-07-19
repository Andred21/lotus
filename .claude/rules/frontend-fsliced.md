---
paths:
  - "frontend/src/**"
  - "frontend/vite.config.ts"
  - "frontend/tsconfig.app.json"
---

# Frontend — feature-sliced (ADR-05)

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

**server vs client state (ADR-05):** dado de servidor → TanStack Query; UI/sessão → Zustand.
Não misturar. **Onde mora o dado de servidor (ADR-18):** o cliente REST (`createCrudResource`)
nasce SEMPRE em `shared/api`; `features/<x>/api/` fica só com hooks de sub-recurso acoplados a uma
tela (`useQuotes`, `useCommercialFiles`, `useRedatorDocuments`). Estado que **cruza componentes**
(tema, sessão, wizard multi-tela compartilhado) → Zustand; estado local de um form/passo que vive
num só componente fica em `useState` (ref.: passo do `QuoteWizard` em `useQuoteForm`). Não promover
a Zustand o que não cruza fronteira — é over-engineering.

## Padrões de código (crystalizados — desviar só conforme Parte 0 do INSTRUÇÕES)

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
  Pasta-por-componente (`AppButton/AppButton.tsx` + `index.ts`), reexporta `AppXProps`
  (fecha a fronteira de tipo — a feature importa `AppButtonProps`, nunca `ButtonProps`). Barrel raiz
  `shared/ui/index.ts` é a única porta. Customização de componente Prime vive aqui, nunca com Tailwind
  na feature. Em wrappers com handler embutido (upload), **pine o override após o spread**
  (`customUpload` não pode ser desligado pelo caller).
- **`forwardRef` no wrapper é condicional, não cerimônia.** Leva quem embrulha componente de função
  com ref de DOM útil — foco, seleção, medida: `AppInputText`, `AppPassword`, `AppTextarea`,
  `AppMenu`. **Não leva** quem embrulha *class component* do Prime (`RadioButton`, `Dropdown` — o
  ref não é DOM e `forwardRef` só mente sobre o tipo) nem wrapper apresentacional sem ref
  (`AppButton`, `AppTag`, `AppDivider`). Hoje: 5 de 25 wrappers. Na dúvida, siga o vizinho da mesma
  categoria (`AppRadioButton` segue o `AppDropdown`, não o `AppInputText`).
- **Tailwind = layout** (grid/espaçamento); cor via variável CSS do tema (ADR-16). Utility não vence
  a especificidade do tema — ao depurar estilo, cheque o **seletor completo do markup**, não a classe
  isolada.
- **Componente de feature = declarativo.** Estado, mutations/queries, navegação e derivação vão para
  um hook da feature (`features/<x>/hooks/useAlgo.ts`, ex. `useLoginForm`); o componente só consome e
  renderiza JSX. Wrappers `shared/ui` são a exceção (puro apresentacional).
- **Reset de form = "adjust state during render"** (compara `id+mode` em `useState` + `setForm`
  condicional no corpo do render), **não** `useEffect` (lint `react-hooks/set-state-in-effect`).
  Referência: `useClientForm`.
- **Kit de form em `shared/ui/FormField/`:** `FormField` (campo + label + erro), `NestedField`
  (campo de item de coleção), `FormErrorSummary`/`FormErrorBanner` (erros sem campo onde pendurar).
  Todo diálogo usa o kit — **não reintroduzir `Field`/`UnmappedErrors` local** (era a duplicação nos
  6 diálogos que o Bloco 1 matou).
  - **Grupo de campos coeso = subcomponente da feature.** Um bloco de campos que representa uma
  entidade/conceito único (endereço, contato, período de vigência) e reaparece em mais de um
  diálogo, ou passa de ~4 campos irmãos, vira componente próprio (`AddressFields`, `ContactFields`)
  em `features/<x>/components/`, recebendo `value`/`onChange`/`readOnly`. Não é o kit `FormField`
  (átomo genérico) nem molde `shared/ui` (não tem regra de negócio de domínio) — é composição de
  feature. Contra-exemplo a eliminar: os 6 `<FormField>` de endereço repetidos inline no diálogo.
- **Lista de coleção nested com replace-total usa `key={i}`, nunca `key={item.id}`.** O replace
  recria as linhas a cada save, então o `id` **muda** — keyar por ele remonta a lista inteira e
  derruba foco/estado. O índice É a identidade estável aqui (a ordem do array é o `sort_order`).
  Ref.: lista de módulos do `CourseDialog`.
- **Manipulação de array nested vive no hook, não solta no JSX:** o hook expõe `add/remove/patch/move`
  (ref.: `useCourseForm`). Não vazar `setForm` para o componente via helper solto — o
  `patchContact(setForm, i, ...)` do `ClientDialog` é o contra-exemplo, não o molde.
- **Página CRUD:** `useCrudPage` guarda o ID e deriva a entidade da **lista viva** (não congela
  objeto); `useEntityForm` cuida de form + reset por prop + erros de mutação; moldes
  `ModulePage`/`CrudDialog`. Dialog unificado view=edit=create (campos vazios = cadastro); prop
  `onEdit` abre a edição a partir do view.
- **Derivação de apresentação no front, não no DTO:** status de documento e idoneidade se calculam
  no front. `valid_until` inparseável → tratar como **vencido** (direção conservadora, peso legal).
  Sem documento obrigatório → `no_idoneo`.
- **i18n:** 3 locales (`pt-BR`, `es-CL`, `en`) com chaves **idênticas**; `es-CL` é a referência de
  rótulo (cliente chileno). `generated.ts` fica no `globalIgnores` do eslint.
- **Vocabulário de domínio é o do backend.** `Redator`, não `Writer`. Nome de tela pode ser em inglês
  (`PeoplePage`); a rota fica em espanhol (`/personas`) — é interface de usuário.
- **`can()` é conveniência de interface, não segurança.** A autorização é da API (ADR-07).

## Comandos

De `frontend/` (nativo no WSL — Node 22/pnpm, sem test runner ainda):
`pnpm dev` · `pnpm build` (tsc -b && vite build) · `pnpm lint`.
Gate de verificação = `pnpm build` + `pnpm lint`.
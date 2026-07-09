# Sprint 1 · Cadastros — Frontend (Clientes + Redatores) + Documentos tipados — Design

> Spec de design para o frontend dos cadastros da Sprint 1 e a extensão de backend dos documentos tipados do redator. Fonte de planejamento: Notion (Tasks · Lotus Fase 2, módulos Clientes 3.2.x e Redatores 4.2.x) + protótipo Figma público (`https://piece-desert-35638359.figma.site/`) + prints anexados pelo João Victor. Regras: ADRs em `docs/adrs.md`, arquitetura em `INSTRUÇÕES-DO-PROJETO.md`, backend já entregue em `2026-07-07-sprint1-cadastros-backend-design.md`.
>
> Status: aprovado nas decisões-chave por João Victor em 2026-07-09 (fábrica leve de hooks; upload de docs tipado; adiar seções de outros sprints; Região dropdown estático + Comuna texto; sequência backend-docs → abstração → telas; enum de documento por entidade, `files` intocada). Pendente review do spec escrito.

## 1. Objetivo

Entregar o frontend dos cadastros de **Cliente** e **Redator** consumindo a API já pronta, com duas metas transversais explícitas do João Victor:

1. **Abstrair os hooks CRUD** (TanStack Query) numa fábrica reutilizável — DRY entre entidades desta e das próximas sprints.
2. **Abstrair o template de módulo** (header + descrição + tabela com filtro; TabView quando há mais de uma entidade) e os **wrappers `shared/ui`** que faltam — reutilizáveis nos módulos futuros.

Com essas peças, montar as telas das 5 tasks. Como pré-requisito de uma delas (4.2.2), estender o backend para **documentos tipados** do redator.

| EAP | Task | Camada | Critério de aceite |
|---|---|---|---|
| 3.2.1 | Hook `useClients` com TanStack Query | Front | Lista/cria/atualiza com cache (ADR-05) |
| 3.2.2 | Tela de listagem de clientes (tabela + filtro) | Front | Tabela com filtro renderiza dados reais |
| 3.2.3 | Formulário de cliente + endereços/contatos | Front | Cria/edita cliente com nested |
| 4.2.1 | Hook `useRedatores` + tela de listagem | Front | Lista de redatores carrega |
| 4.2.2 | Formulário de redator + upload de documentos | Front + Back | Sobe/atualiza/remove documento tipado |

## 2. Decisões desta sessão

1. **Fábrica leve de hooks** (`createCrudResource<T>`) para os 5 verbos REST padrão; sub-recursos aninhados (contatos, endereços, documentos, sync de cursos) ficam **fora** da fábrica, como hooks pequenos por feature. (Rejeitado: hooks finos por entidade — repetitivo; lib externa — over-engineering.)
2. **Dialog unificado** view = edit = create (mesmo componente; campos vazios = cadastro), **`maximizable`** (nativo PrimeReact), mais largo/alto que o protótipo.
3. **Documentos tipados por entidade, não global.** `files` fica **como está** (polimórfica, `type` string genérica servindo qualquer `fileable`). O enum vive no domínio: `RedatorDocumentType`. Turma terá o seu no futuro. Sem migration de alteração em `files`.
4. **Upload de docs = só o envio + gestão (replace/soft-delete)**, sem tela de histórico. Delete = soft-delete do metadado; **arquivo permanece no bucket** (rastreável). `File` vira `Auditable` (só o trait, sem mudança de schema) + alias `file` no morph map — atende o "rastrear pela auditoria".
5. **Região = dropdown estático** (16 regiões do Chile, dataset no front); Comuna/Cidade/Rua/Número = texto. Sem tabela nova.
6. **Fora do Sprint 1 → placeholder/omitido:** tabs `Presupuestos` e `Alumnos`; seções `Historial de presupuestos`, `Alumnos vinculados`, `Historial de turmas`; coluna `ALUMNOS` da tabela de cliente (dado é de Operation, inexistente); toggle `Con datos/Sin datos` (demo do protótipo). **Idoneidade e status de documento = derivação visual** no front; **policy que bloqueia designação a turma = futuro** (RN-09), fora deste escopo.
7. **Sequência:** (A) backend docs → (B) camada `shared` (fábrica + wrappers) → (C) telas cliente → (D) telas redator. Cada camada verificável antes da próxima.

## 3. Backend — Documentos tipados do redator (parte A)

Reúso máximo: a infra de arquivos já existe (`App\Shared\Files\Models\File`, `UploadFileAction`, tabela `files` com `type`, `valid_until`, softDeletes). Gap a fechar:

**3.1 Enum de tipo** — `App\Domains\Identity\Enums\RedatorDocumentType` (string-backed):
- `CV` · `REUF` · `TITULO` (Título Universitário) · `POSTGRADO` (Post-Grado).
- Método `label()` opcional para rótulo humano (ou rótulo só no front via i18n — ver §3.5). Todos **nullable**: um redator pode ter nenhum/alguns.

**3.2 Upload com tipo** — hoje `UploadFileAction` recebe `type: string` livre; as actions passam `'documento'` hardcoded. Mudança:
- `CreateRedatorAction`/`UpdateRedatorAction` deixam de receber `array<UploadedFile>` cru e passam a receber pares `{ type: RedatorDocumentType, file: UploadedFile }`. O tipo do enum vira o `files.type`.
- Validação: `type` ∈ enum; `file` mime/size (pdf/imagem, limite a definir na Data — reusar convenção do backend).

**3.3 Replace e delete (rotas nested)** — espelham o padrão nested de `client_addresses`/`client_contacts`:
```
POST   redatores/{redator}/documents        # adiciona/substitui (mesmo type → soft-delete anterior + novo)
DELETE documents/{file}                      # soft-delete do metadado (arquivo fica no bucket)
```
- Sob `middleware('permission:identity.user.update')`, como o nested de cliente.
- Controller novo `RedatorDocumentController` (store/destroy), fino, chamando uma action/serviço. Store: se já existe doc ativo daquele `type` para o redator, soft-delete o antigo antes de criar o novo (replace).
- Delete: `$file->delete()` (soft). Sem tocar no S3.

**3.4 Auditoria** — `File implements Auditable` + `use AuditableTrait` (`$auditInclude` = `type`, `path`, `valid_until`, `fileable_type`, `fileable_id`). Registrar alias `file` no `enforceMorphMap` (`AppServiceProvider`). Nenhuma mudança de schema.

**3.5 Expor no DTO** — `RedatorData` ganha `documents: RedatorDocumentData[]` (novo `Data` com `#[TypeScript]`):
- `RedatorDocumentData`: `id`, `type` (string do enum), `original_name`, `valid_until` (nullable), e uma `download_url` (URL pré-assinada via `UploadFileAction::temporaryUrl`, gerada no `fromModel`).
- `fromModel` do `RedatorData` passa a mapear `$redator->documents` (só os não soft-deletados).
- **Status (Vigente/Por vencer/Vencido) e Idoneidade NÃO vão no DTO** — são derivação de apresentação no front (§5.4).

**3.6 Testes (DoD)** — integração sqlite `:memory:`: upload tipado persiste com `type` correto; replace soft-deleta o anterior; delete soft-deleta sem apagar arquivo; DTO expõe só docs ativos; auditoria registra o soft-delete. (Regra 8: comportamento provado.)

## 4. Frontend — Camada compartilhada (parte B)

### 4.1 Fábrica de hooks CRUD — `shared/api/`
- `shared/api/crud.ts`: funções axios genéricas por recurso — `list/get/create/update/remove(resource)`. Aceitam payload `unknown` (axios auto-negocia `multipart/form-data` quando recebe `FormData`; JSON caso contrário).
- `shared/api/createCrudResource.ts`: `createCrudResource<T>(resource)` devolve `{ keys, endpoints, useList, useOne, useCreate, useUpdate, useRemove }`.
  - `keys`: `{ all:[resource], lists(), detail(id) }` (query-key factory).
  - Mutations invalidam `keys.all` no `onSuccess`. Tipagem de erro = `ProblemDetails`.
  - `useOne` com `enabled: id != null`.
- Feature instancia uma vez: `export const clientsApi = createCrudResource<ClientData>('clients')`.
- **Sub-recursos** (fora da fábrica) — hooks pequenos por feature que chamam `api` direto e invalidam a key do pai: contatos/endereços (cliente), documentos e sync de cursos (redator).

### 4.2 Wrappers `shared/ui` novos (pasta-por-componente, `forwardRef`, fecham a fronteira de tipo)
- `AppDataTable` — wrap `DataTable`+`Column` do PrimeReact: filtro global, sort, paginação **client-side** (o `index` devolve array puro), estilo dark, slot de coluna de ações. Reexporta tipos como `AppColumnProps`.
- `AppDialog` — wrap `Dialog`: `maximizable`, largura/altura default generosas, dark.
- `AppDropdown` — wrap `Dropdown` (tipo de cliente, região).
- `AppTag` — wrap `Tag`/badge (Empresa/Persona; status de doc; idoneidade), com mapa de severidade.
- `AppFileUpload` — wrap do upload (linha de documento: nome + estado + baixar/substituir/remover; botão "Subir documento").
- `PageHeader` — presentational: título + descrição + slot de ação (à direita). Vive em `shared/ui` (sem conhecer feature).
- `AppTabView` — wrap `TabView` (Clientes/Presupuestos; Alumnos/Redactores).
- Todos entram no barrel `shared/ui/index.ts`.

### 4.3 Template de módulo (composição na feature, não em shared)
`shared/ui` fornece as peças; a **feature compõe** (regra Parte III: shared não conhece feature). Padrão de página CRUD por feature:
```
<PageHeader title descrição ação=<AppButton "Novo …"/> />
<AppTabView> (quando >1 entidade)
  <TabPanel entidade>
    <toolbar: busca global + ação>
    <AppDataTable dados=useList() colunas … onView/onEdit>
    <AppDialog> <FormDaEntidade/> </AppDialog>
```
Lógica (estado do dialog, seleção, submit, filtro) vai num hook da feature (ex.: `useClientsPage`, `useRedatoresPage`). O componente só consome o hook e renderiza (Parte III).

## 5. Frontend — Telas (partes C e D)

### 5.1 Roteamento / IA (do protótipo)
- **Módulo Comercial** (`/comercial`, já na nav) → `features/commercial`. Tab `Clientes` (ativa) + `Presupuestos` (placeholder).
- **Módulo Personas** (`/personas`, já na nav) → **redator vive em `features/identity`** (domínio Identity). Tab `Redactores` (ativa) + `Alumnos` (placeholder).
- Substituem os `ModulePlaceholder` correspondentes no `AppRouter`.

### 5.2 Cliente — lista + dialog (parte C)
- **Lista** (`AppDataTable`): colunas `Razón social` (legal_name), `RUT`, `Tipo` (`AppTag` Empresa/Persona a partir de `type`), `Comuna` (do endereço `is_primary`), `Contactos` (contagem), ação (ver). Busca global por razón social/RUT. Rodapé "N clientes".
- **Dialog unificado** (view/edit/create): seções `Datos generales` (razón social, RUT, Tipo=`AppDropdown`, Giro) · `Dirección` (Región=`AppDropdown` estático, Comuna/Ciudad/Calle/Número texto) · `Personas de contacto` (lista add/remove; "Agregar contacto").
  - Create: um submit → `clientsApi.useCreate` (JSON com addresses/contacts embutidos, como o `ClientData` aceita).
  - Edit: dados do cliente via `useUpdate`; contatos/endereços via hooks nested (add/edit/remove individuais), refletindo as rotas nested do backend.
- Validação no front espelha `ClientData` (RUT obrigatório/formato, razón social/email obrigatórios). Erros do backend chegam via `ProblemDetails.errors` por campo.

### 5.3 Redator — lista + dialog (parte D)
- **Lista** (`AppDataTable`): colunas `Nombre` (avatar+nome+email), `RUT`, `Cursos habilitados` (contagem de `course_ids`), `Documentos` (status agregado derivado), `Idoneidad` (`AppTag` derivada), ação (ver). Busca por nome/RUT.
- **Dialog unificado** (view/edit/create), completo (não o mínimo do print 6):
  - `Datos de usuario`: name, **RUT editável**, email, telefone (campos de user; edição permitida como o João Victor pediu).
  - `Documentos`: lista tipada (CV/REUF/Título/Post-Grado) com estado + baixar/substituir/remover (`AppFileUpload`), "Subir documento". Ações imediatas contra as rotas nested (§3.3).
  - `Cursos habilitados`: checkboxes dos cursos (consome `createCrudResource<CourseData>('courses').useList`) → `course_ids` sincronizados no update do redator (backend já faz `sync`). Sem botão separado obrigatório — fold no save; "Guardar habilitaciones" é opcional.
  - Create: um submit multipart → `useCreate` (user fields + `course_ids` + documentos iniciais tipados). Backend `CreateRedatorAction` já aceita documentos + sync.

### 5.4 Derivações de apresentação (front, não backend)
- **Status de documento** de `valid_until`: `null` → "Sin vencimiento" (vigente); `≥ hoje+30d` → Vigente; `hoje ≤ … < hoje+30d` → Por vencer; `< hoje` → Vencido. Threshold em constante.
- **Documentos (coluna)** = agregado do pior status entre os docs.
- **Idoneidad** (RN-09, provisório/visual): idóneo se sem doc vencido e ≥1 curso habilitado; por vencer se algum doc por vencer; no idóneo caso contrário. Marcado como provisório — a regra canônica e o gate por policy são follow-up.

## 5.5 `Tipo` do cliente — resolvido
Divergência protótipo × backend (print dizia "Empresa"; backend entregou `enum(client/provider/other)`). **Decisão do João Victor (2026-07-09): manter o backend.** Dropdown de `Tipo` = `client/provider/other` com rótulos i18n **Cliente/Proveedor/Otro**. "Empresa" no print era ilustrativo. Sem mudança de backend.

## 6. i18n
Strings novas em `pt-BR`, `es-CL`, `en` (ADR-15 pendente, mas o padrão já existe nos locales). Protótipo é em espanhol (cliente chileno) — `es-CL` é a referência de rótulo.

## 7. Fora de escopo (follow-ups registrados)
- Tabs `Presupuestos`/`Alumnos`, históricos, coluna `ALUMNOS`, students.
- Policy de idoneidade bloqueando designação a turma (RN-09 como gate).
- Guard de rota por permissão por módulo (hoje é filtro visual do Sidebar; a API é a fronteira).
- Test runner de frontend (ainda não existe no projeto).
- Documentos de turma (enum futuro, mesma infra polimórfica).

## 8. Definition of done
- Backend docs: testes de integração verdes (upload tipado, replace, soft-delete, DTO, auditoria).
- Front: `pnpm build` (tsc) e `pnpm lint` limpos; tabela de cliente e de redator renderizam **dados reais** da API; cadastro/edição persistem; upload/replace/remove de documento refletem no dialog.

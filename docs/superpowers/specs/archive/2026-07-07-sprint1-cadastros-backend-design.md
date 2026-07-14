# Sprint 1 · Cadastros — Backend (Clientes + Redatores) — Design

> Spec de design para o backend dos cadastros da Sprint 1. Fonte de planejamento: Notion (Tasks · Lotus Fase 2, módulos Clientes 3.1.x e Redatores 4.1.x) + Drive (`V2/Planejamento`). Regras: ADRs em `docs/adrs.md`, estrutura em `docs/estrutura-monolito.md`.
>
> Status: aprovado por João Victor em 2026-07-07 (pendente só a escolha de disco de dev — ver §8).

## 1. Objetivo

Entregar o backend dos cadastros de **Cliente** (empresa) e **Redator** (professor): schema, models, DTOs, validação, actions, controllers e rotas — com o comportamento **provado** por teste de integração (sqlite `:memory:`). Cobre as 9 tasks de backend da Sprint 1:

| EAP | Task | Critério de aceite |
|---|---|---|
| 3.1.1 | Migrations clients / client_addresses (+number) / client_contacts | 3 tabelas com FK e campo `number` |
| 3.1.2 | Models Client + relações (addresses, contacts) | Relações navegam via Eloquent |
| 3.1.3 | DTOs ClientData/AddressData/ContactData + validação RUT único | RUT duplicado/ inválido rejeitado |
| 3.1.4 | Controller CRUD de cliente | CRUD completo responde |
| 3.1.5 | Endpoints de endereços e contatos (nested) | Persistem aninhados |
| 4.1.1 | Migration redatores + files (polimórfica) | `files` conforme DER |
| 4.1.2 | Model Redator + relação polimórfica de documentos | Docs via relação polimórfica |
| 4.1.3 | Action upload p/ S3 + URL pré-assinada | Upload ao storage; URL temp expira |
| 4.1.4 | DTO RedatorData + endpoints CRUD | CRUD de redator responde |

## 2. Decisões desta sessão (contexto que altera o planejamento anterior)

1. **Idioma do schema = inglês.** Decisão do João Victor. Diverge do canônico PT/ES do Drive (`lotus_modelo_fisico.sql`, `modelo-fisico-e-diagramas.md`) e de `docs/der-fisico.md`. **Follow-up obrigatório (§10):** atualizar o canônico do Drive + `docs/der-fisico.md` para inglês, ou registrar a decisão, para manter fonte única. Não feito nesta sessão (write externo / reabre decisão fechada — exige autorização).
2. **`redator` é nome próprio do domínio** (como "RUT"). Tabela `redatores`, model `Redator`, FK `redator_id` — mantidos em PT para casar com morph map (`'redator'`), pasta `Domains/Identity`, módulo Notion e FKs futuras. Só colunas descritivas vão para inglês.
3. **Sem `company_rut` em `clients`.** Com o 1:1 users↔clients, o `users.rut` do usuário-cliente já É o RUT da empresa. Coluna separada seria duplicação. A regra "RUT único" (3.1.3) recai sobre `users.rut` (já `unique`).
4. **Enums carregam `other`** (convenção do projeto): `clients.type = enum('client','provider','other') default 'client'`.
5. **Escopo = backend.** Telas/formulários (frontend Sprint 1) e RBAC fino por policy ficam fora deste plano.

## 3. Correções ao código já escrito à mão (equívocos identificados)

- **C1** `Client extends User` → **errado**. Client é extensão 1:1 via `user_id`, não subclasse. Vira `extends Model` + `belongsTo(User)`.
- **C2** PSR-4 quebrado: arquivo ≠ classe (`ClientAddresses.php`→`ClientAddress`, `ClientContacts.php`→`ClientContact`, `Redactors.php` vazio). Corrigir: 1 classe por arquivo, nome do arquivo = classe.
- **C3** Faltava o RUT do cliente → resolvido pela decisão §2.3 (RUT vive em `users.rut`).
- **C4** `user_id` como `index` → deve ser `unique` (1:1).
- **C5** Sem FK real (só `index()`) → `constrained()` com `ON DELETE CASCADE`.
- Renomear `redactors`→`redatores` (tabela) e `Redactors.php`→`Redator.php`; alinhar morph map.
- **Mantido (acertos):** split de migrations, soft deletes, `is_primary`, campo `number`, shape da `files`, migration `users`, `SessionUserData`.

## 4. Schema (migrations, em inglês)

**`clients`** — extensão 1:1 do usuário-empresa.
- `id`, `user_id` **unique** FK→`users` cascade, `legal_name` (NOT NULL, razón social), `type` enum(`client`,`provider`,`other`) default `client`, `business_activity` (nullable, giro), timestamps, softDeletes.

**`client_addresses`** — 1:N (contexto chileno).
- `id`, `client_id` FK→`clients` cascade, `line1`, `line2` (nullable), `number` (nullable), `commune`, `city`, `region`, `zip_code` (nullable), `is_primary` (default false), timestamps, softDeletes. Index em `is_primary`.

**`client_contacts`** — 1:N.
- `id`, `client_id` FK→`clients` cascade, `name` (NOT NULL), `email` (nullable), `phone` (nullable), `is_primary` (default false), timestamps, softDeletes. Index em `is_primary`.

**`redatores`** — extensão 1:1 do usuário-professor.
- `id`, `user_id` **unique** FK→`users` cascade, timestamps, softDeletes.

**`files`** — polimórfica (já existe; só acrescentar índice).
- Acrescentar índice composto `(fileable_type, fileable_id)`. Demais colunas mantidas.

> As migrations de `clients` e `redatores`/`files` já existem no repo — serão **editadas** (não recriadas) para refletir o acima. Como o banco de dev é descartável (nunca foi para prod), editar a migration existente é preferível a empilhar uma migration de alteração.

## 5. Models

- **`Client`** (`Domains/Commercial/Models`): `extends Model`, `SoftDeletes`, `Auditable`. `belongsTo(User)`, `hasMany(ClientAddress)`, `hasMany(ClientContact)`. `$fillable`/`$auditInclude` = colunas de negócio.
- **`ClientAddress`**, **`ClientContact`**: `extends Model`, `SoftDeletes`, `Auditable`, `belongsTo(Client)`, cast `is_primary => boolean`. Arquivo = classe.
- **`Redator`** (`Domains/Identity/Models`, arquivo `Redator.php`): `extends Model`, `SoftDeletes`, `Auditable`. `belongsTo(User)`, `morphMany(File, 'fileable')` (documentos de idoneidade).
- **`File`** (`Shared/Files/Models/File.php` — criar): `morphTo('fileable')`, casts, `$fillable`.
- **`User`**: acrescentar `hasOne(Client)` e `hasOne(Redator)`.
- **Morph map** (`AppServiceProvider`): garantir `'redator' => Redator::class` e (quando existir) `'file'`/`fileable` conforme necessidade. Só alias de classes que existem nesta sprint.

## 6. DTOs + validação (spatie/laravel-data, `#[TypeScript]`)

- **`ClientData`** (`Domains/Commercial/Data`): campos do cliente + do usuário-empresa que o compõem (name, rut, email, phone do user; legal_name, type, business_activity do client) + coleções `addresses: DataCollection<ClientAddressData>`, `contacts: DataCollection<ClientContactData>`.
- **`ClientAddressData`**, **`ClientContactData`**: campos das tabelas nested, com validação.
- **`RedatorData`**: campos do usuário-redator (name, rut, email, phone) + documentos.
- **Validação de RUT** (§7): regra `ValidRut` (DV) + `unique:users,rut` (unicidade). Aplicada onde o RUT entra (criação de client e de redator).

## 7. Validação de RUT (resposta à pergunta do João Victor)

Transversal, em `App\Shared\`:
- **`App\Shared\Support\Rut`** — value object: normaliza (remove `.`/`-`) e valida **dígito verificador** (módulo 11). Reusável.
- **`App\Shared\Rules\ValidRut`** — `implements ValidationRule`, embrulha o value object para uso em DTO/FormRequest.
- **Unicidade** é separada da validade: `unique:users,rut` nas regras do DTO (coluna já `unique`). `ValidRut` cobre só a estrutura/DV.

## 8. Upload de arquivos — Action + storage (resposta à pergunta do João Victor)

- **`App\Shared\Files\Actions\UploadFileAction`** (`__invoke`/`execute`): recebe o `UploadedFile` + o model dono (morph) + `type`; grava no disco configurado; cria o registro em `files`; retorna o `File`. Uma action-companion (ou método) gera a URL pré-assinada temporária via `Storage::disk(...)->temporaryUrl($path, now()->addMinutes(10))`.
- **Código disco-agnóstico:** escreve contra o disco de configuração (`config('filesystems.default')` / disk `s3`), não contra um driver fixo. Assim a escolha de dev vira **config**, não código.
- **Dev — decisão de infra ainda aberta (recomendação: MinIO):**
  - **MinIO** (container S3-compatível): `temporaryUrl()` funciona idêntico ao prod → `dev == prod`, ADR-11 comprovável na Sprint 1. Custo: +1 serviço no `docker-compose`.
  - **Disco `local`** (fallback): setup zero, mas não suporta `temporaryUrl()` (teria que servir o binário pela app — proibido pelo ADR-11) → caminho de dev diverge de prod. Aceitável só como stopgap **documentado**, com o teste de presigned adiado.
  - Como o código é disco-agnóstico, essa escolha **não bloqueia** o desenvolvimento — só define se a 4.1.3 fecha 100% agora ou fica com presigned pendente.

## 9. Controllers, rotas e wiring de domínio

- **Wiring (fundação, primeira vez):** hoje as rotas estão inline em `routes/api.php`; a estrutura planejada (`Domains/*/routes.php` agregados) ainda não existe. Introduzir o carregamento dos `routes.php` de domínio (via `then:` no `withRouting` do `bootstrap/app.php` ou um `RouteServiceProvider`), com prefixo `api` e middleware de sessão. Mover as rotas de auth para `Domains/Identity/routes.php` (mantém `routes/api.php` como esqueleto). Passo pequeno e cirúrgico.
- **`ClientController`** (`Domains/Commercial/Http/Controllers`): CRUD. Create/Update delegam às Actions (transação users+client+nested); List/Show/Delete direto ao Eloquent (ADR-02). Retorna `ClientData`.
- **Endpoints nested** (3.1.5): endereços e contatos sob o cliente (`/clients/{client}/addresses`, `/clients/{client}/contacts`) — ou persistidos junto no payload do cliente via a Action. Definir no plano.
- **`RedatorController`** (`Domains/Identity/Http/Controllers`): CRUD. Create delega a `CreateRedatorAction` (user type=redator + redator + upload de documentos). Retorna `RedatorData`.
- **Rotas** em `Domains/Commercial/routes.php` e `Domains/Identity/routes.php`, sob `auth:sanctum`.
- Controllers deixam exceções subirem (handler global RFC 7807, ADR-03).

## 10. Actions (ADR-02)

- **`CreateClientAction`** / **`UpdateClientAction`** (`Domains/Commercial/Actions`): dentro de transação, cria/atualiza o `User` (type=`cliente`, `is_active=false` — cliente não loga, RN-01), o `Client`, e os nested addresses/contacts. Valida RUT único.
- **`CreateRedatorAction`** (`Domains/Identity/Actions`): transação, cria `User` (type=`redator`), `Redator`, e sobe documentos via `UploadFileAction`.
- **`UploadFileAction`** (`Shared/Files/Actions`): §8.

## 11. Verificação (DoD — ADR-08 / lições)

Teste de integração (`php artisan test`, sqlite `:memory:`, sem mock — ADR-02):
- Criar cliente completo grava `clients` + `client_addresses` + `client_contacts` + `users`(type cliente) e navega as relações.
- RUT inválido (DV) rejeitado; RUT duplicado rejeitado.
- Criar redator grava `redatores` + `users`(type redator) e associa documento em `files` (morph).
- CRUD de cliente e de redator respondem (status + payload `Data`).
- `temporaryUrl()` gera URL que expira (se MinIO; senão marcar pendente).
- Regenerar tipos TS do typescript-transformer sem erro (DTOs novos aparecem em `generated.ts`).

## 12. Fora de escopo (documentado)

- Frontend: telas de listagem/formulário de cliente e redator (tasks de UI da Sprint 1).
- RBAC fino por policy nos controllers de cadastro.
- Bucket S3 real + IAM/CORS (sprint de infra).
- Migrations de `students`/`student_client_logs` (Sprint 3).

## 13. Follow-ups

- **Sincronizar o canônico do Drive + `docs/der-fisico.md`** com o schema em inglês (§2.1) — pendente de autorização.
- Atualizar Status das tasks 3.1.x/4.1.x no Notion conforme forem concluídas.
- Decisão MinIO vs local para dev (§8).

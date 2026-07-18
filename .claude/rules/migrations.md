---
paths:
  - "backend/database/migrations/**"
  - "backend/database/seeders/**"
  - "backend/app/Domains/**/Models/**"
---

# Schema, migrations e models

**Antes de criar migration ou model, leia `docs/der-fisico.md`** — os nomes de tabela e coluna de lá
são a referência. Não invente nome divergente.

Migrations globais e cronológicas em `database/migrations/` (FK cruza domínios, ex.
`turmas.quote_id` → Commercial).

## Convenções de schema e domínio (decididas — não re-decidir sozinho)

- **Schema em inglês** (colunas descritivas). Exceção: **`redator` é nome próprio do domínio** (como
  "RUT") — tabela `redatores`, model `Redator`, FK `redator_id` ficam em PT (casam com morph map,
  pasta Identity, Notion). *Divergência aberta: o `docs/der-fisico.md` ainda está em PT/ES —
  ver `docs/pendencias.md`.*
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
- **Código de negócio é da aplicação, não do banco** (ADR-08/17). `budgets.codigo = 'Scap ' . id`
  gerado na camada de aplicação; sequência atômica via `lockForUpdate()` no contador do pai. InnoDB
  só aceita um AUTO_INCREMENT por tabela — código composto se computa em runtime, não se persiste.

# Leis que se aplicam aqui (CLAUDE.md §5 — PARE e pergunte antes de contrariar)

- **Auditoria só na aplicação, NUNCA em trigger de banco** (ADR-08). Trigger não enxerga o usuário
  autenticado — vê a conexão. Model Auditable+SoftDeletes muda via `$model->delete()` (dispara
  eventos); delete no query builder **não audita**. Pivot não audita sozinho: use `auditSync`.
- **Todo model Auditable/polimórfico precisa do alias no morph map** (`Relation::enforceMorphMap` no
  `AppServiceProvider`, ADR-10).

## Definition of done

Migration criada **não é** migration provada. A tabela tem que existir e gravar registro
(o `laravel-auditing` foi instalado sem a migration rodar — falha silenciosa, `audits` não existia).

## Comandos

```bash
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan db:seed
docker compose exec -T app php artisan test --filter=NomeTest
```
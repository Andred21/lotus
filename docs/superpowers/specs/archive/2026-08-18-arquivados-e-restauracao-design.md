# Spec — Arquivados e restauração de soft-delete

**Work item:** `arquivados-e-restauracao` · **Data:** 2026-08-18 · **Branch:** `feat/arquivados-e-restauracao` (de `main@b758068`)
**Context Packet:** `context-packets/2026-08-18-arquivados-e-restauracao.md` (`status: blocked` — resolvido por este documento)
**Fontes externas:** Notion H.5.1–H.5.4 e H.3.1; pasta Drive `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3` (sem documento funcional do bloco)

## 1. O que este bloco é

O lado do **restore**, que não existe. O lado do arquivar já existe e é bom.

Isto não é reformulação de escopo: é o que a medição sobre `b758068` mostrou. Sete dos oito
aggregate roots enumerados pela H.5.1 já têm `DELETE` (`clients`, `budgets`, `quotes`, `courses`,
`users`, `redatores`, `turmas` e `turmas/{turma}/alunos/{enrollment}`); a cascata de arquivamento já
roda em hooks `deleting` instância a instância, auditada (ADR-08), dentro de transação e sob lock; e
os gates de negócio já estão escritos onde importam — `DeleteTurmaAction` recusa turma concluída
(RN-15) e `DeleteBudgetAction` recusa orçamento com cotação aprovada. O código já chama a operação
de **"Arquiva"** em `DeleteClientAction`.

O que falta: **nada volta.** Não há hook `restoring`, não há Action, não há endpoint, não há tela, e
não há como saber quais filhos foram arquivados *pela cascata* e quais já estavam arquivados antes.

## 2. Escopo

**Dentro:** `Client` e `Course`, ponta a ponta — semântica, Actions, endpoints, RBAC, rastreio e UI.

Fatia vertical escolhida pelo João. Os dois cobrem toda a dificuldade do problema com o menor
tamanho: `Client` tem cascata de três relações heterogêneas (`addresses`, `contacts` e o `User`) e
filhos com rota de exclusão própria; `Course` tem cascata simples (`modules`, `certificateTemplates`),
zero gate e um filho com rota própria. Provado o padrão nos dois, os outros seis roots viram
replicação.

**Fora, declarado:**

- `forceDelete` e exclusão permanente (não-goal da própria H.5.1–H.5.4).
- Os outros seis roots: `Budget`, `Quote`, `User`, `Redator`, `Turma`, `Enrollment`.
- `Student` — não tem `destroy` hoje; dar-lhe um é decisão separada.
- Painel de histórico de auditoria por registro.
- Manual PDF/DOCX pré-preenchido. A interseção anotada no `backlog.md` é com a **FUT-1** e trata de
  documento de **turma** (`turmas/{turma}/manual` já existe). Com o escopo em `Client` + `Course`,
  ela sai por construção, não por decisão nova.
- A copy de irreversibilidade de `budget.confirmDeleteBody` e `quote.confirmDeleteBody` — ver D9.

## 3. Decisões

### D1 — `arquivado` é o `deleted_at` que já existe

Nenhum estado novo, nenhuma coluna de status, nenhuma migration de estado. "Arquivado" é o nome de
usuário para o registro em soft-delete restaurável. Decorre da H.5.4 e derruba a metade de risco de
schema que a promoção projetava.

### D2 — cascata de restore por coluna marcadora

`archived_with_parent` (boolean, default `false`) em `client_addresses`, `client_contacts`, `users`,
`course_modules` e `course_certificate_templates`.

**Sem índice**, de propósito: a coluna só é lida dentro de uma relação já escopada por FK
(`$client->contacts()`), então o índice de `client_id` que já existe faz o trabalho. Índice
especulativo em `users` custaria mais do que resolve com ~10 usuários internos.

**Fora do `$fillable`**, também de propósito: quem escreve é hook, nunca payload. Deixá-la
atribuível em massa daria a qualquer `update` o poder de mentir sobre a origem do arquivamento.
Cast `boolean` no `$casts`.

**Escreve:** só o hook `deleting` do pai. **Limpa:** só o hook `restoring` do pai. O filho arquivado
sozinho pela rota própria (`DELETE /addresses/{address}`, `/contacts/{contact}`, `/templates/{template}`)
nunca é marcado, então o restore do pai não o toca.

**Por que não casar por `deleted_at`:** medido — a coluna é `timestamp` de precisão 0 nas sete
tabelas envolvidas. Segundo inteiro não é identidade; um filho arquivado sozinho no mesmo segundo do
pai voltaria junto, em silêncio. **Por que não restaurar todos os filhos:** ressuscita o filho que
foi arquivado de propósito antes, sem aviso — falha silenciosa é o pior modo de falha aqui. **Por que
não deixar os filhos para o usuário:** curso restaurado sem módulos é curso quebrado.

### D3 — restore transacional, simétrico ao delete

`RestoreClientAction` e `RestoreCourseAction` em `Actions/`, dentro de `DB::transaction`.
`RestoreClientAction` toma `Client::lockForWrite()` **pelo mesmo motivo documentado em
`DeleteClientAction`**: a janela check-then-act do enumera-e-restaura é simétrica à do
enumera-e-apaga. Restauração dos filhos instância a instância — restore pelo builder não audita
(ADR-08), igual ao delete.

### D4 — sem gate de negócio no restore, e isso é medido

`Client` e `Course` não têm gate no delete, então não há o que espelhar no restore.

Conflito de unicidade **não é alcançável**: `users.rut` e `users.email` são únicos sem filtro de
`deleted_at`, mas `UserProvisioner:99` e `StudentResolver:40` consultam `withTrashed()` antes de
inserir — um RUT arquivado nunca é recriado, é restaurado. Não existe duplicata para colidir no
restore.

### D5 — endpoints por domínio, sem agregador

| Rota | Permissão |
|---|---|
| `GET /api/clients/archived` | `commercial.client.view` |
| `POST /api/clients/{client}/restore` | `commercial.client.restore` |
| `GET /api/courses/archived` | `catalog.course.view` |
| `POST /api/courses/{course}/restore` | `catalog.course.restore` |

`clients/archived` e `courses/archived` são declaradas **antes** do `apiResource` correspondente,
senão casam como `clients/{client}`. O binding do `restore` resolve por `onlyTrashed()`: registro
ativo dá **404**, não 422.

Nenhuma `ValidationException` nova é escrita, o que mantém o bloco fora da **D-07** (idioma canônico
de mensagem de erro, travado em decisão do João).

### D6 — `*.restore` nova por agregado, leitura pela `*.view`

`commercial.client.restore` e `catalog.course.restore` entram no `PermissionCatalog`, concedidas a
`admin` e `superadmin`, **fora** de `SEGREGATED`. Permitem tirar o restaurar de uma role custom sem
tirar o arquivar. Ver a lista de arquivados exige só a `*.view` do módulo — quem vê clientes vê
clientes arquivados; a ação Restaurar é que some sem a permissão.

O `RolePermissionSeeder` já chama `forgetCachedPermissions()` nas duas pontas (ADR-07).

### D7 — rastreio: o primeiro caminho de leitura de `audits`

`config/audit.php:59-63` já audita `deleted` e `restored`; 16 models são `Auditable`. A tabela é
**write-only** no projeto hoje.

`ArchiveTrailQuery` novo em `app/Shared/Audit/`, em lote para não gerar N+1:

```php
ArchiveTrailQuery::archivedBy(string $auditableType, array $ids): array  // id => nome|null
```

Lê a última audit `event = 'deleted'` de cada id. `null` quando não há audit (arquivado por seeder ou
console) — a tela mostra `—`. O restore continua gravado em `audits` e **não ganha tela**: depois de
restaurado o registro sai da lista de arquivados, então não há onde exibi-lo sem o painel de
histórico, que está fora de escopo.

### D8 — DTO por composição, contrato ativo intacto

`ArchivedClientData { client: ClientData, archived_at: string, archived_by: string|null }` e o par
para `Course`. **`ClientData` e `CourseData` não mudam** — nada de campo anulável poluindo a listagem
ativa. `generated.ts` só ganha tipos, e se regenera com `php artisan typescript:transform` (ADR-04:
não se edita à mão).

### D9 — o arquivar entra no bloco, porque hoje é inalcançável

`useRemove` de `createCrudResource.ts:46` tem **zero consumidores**. `ClientsTable` e `CoursesTable`
não têm botão de excluir. Os endpoints `DELETE /clients/{client}` e `DELETE /courses/{course}`
existem e nenhuma tela os chama.

Sem o botão, uma visão de Arquivados listaria registros que ninguém consegue produzir pelo app, e o
DoD do bloco só seria demonstrável semeando o banco à mão. Então **Arquivar entra**, sob a
`*.delete` que já existe: botão por linha na lista ativa + `ConfirmDialog`, sobre o `useRemove`
pronto.

A confirmação diz o oposto do que hoje se escreve para orçamento: *"Podrás restaurarlo desde
Archivados."* Restaurar não pede confirmação — não é destrutivo — e devolve toast.

**`budget.confirmDeleteBody` e `quote.confirmDeleteBody` continuam dizendo "Esta acción no se puede
deshacer." de propósito.** Para orçamento e cotação isso é verdade hoje: o restore deles não existe.
Corrigir a frase antes do restore trocaria um texto certo por um errado. Vira débito com gatilho no
bloco que trouxer `Budget`/`Quote`.

### D10 — `useArchivedList` não busca na montagem

A query de arquivados é `enabled` sob demanda, só quando o modo vira `archived`. É a lição medida na
**D-04** (buscar as duas abas na montagem dobra a rede sem ganho). `useRestore` invalida `keys.all`,
que é `[resource]` e cobre as duas listas; `useRemove` já invalida o mesmo, então arquivar atualiza a
lista de arquivados sem código novo.

### D11 — a alternância é prop separada, não filtro

`SearchableTableFrame` ganha `viewSwitch?: ReactNode`, **fora** da união discriminada
`filterSlot`/`onClearFilter`. Trocar Ativos/Arquivados troca a *fonte de dados*, não o filtro:
tratá-la como filtro quebraria o `clear()` composto que a moldura passou a compor no review do BD-4.

`ArchiveSwitch` novo em `shared/ui` (dois botões segmentados, i18n próprio). A alternância vive na
própria tabela e não em aba, porque `CommercialPage` tem abas e `CatalogPage` não — aba de Arquivados
ficaria assimétrica entre os dois módulos e, no Comercial, misturaria clientes com orçamentos quando
estes entrarem.

## 4. Arquitetura

**Backend**

```
database/migrations/  archived_with_parent em 5 tabelas
Commercial/Models/Client.php          hook restoring + marcação no deleting
Commercial/Models/{ClientAddress,ClientContact}.php   cast boolean, fora do $fillable
Catalog/Models/Course.php             hook restoring + marcação no deleting
Catalog/Models/{CourseModule,CourseCertificateTemplate}.php
Identity/Models/User.php              coluna (filho da cascata de Client)
Commercial/Actions/RestoreClientAction.php
Catalog/Actions/RestoreCourseAction.php
Commercial/Data/ArchivedClientData.php · Catalog/Data/ArchivedCourseData.php
Shared/Audit/ArchiveTrailQuery.php
{Commercial,Catalog}/Http/Controllers/  index archived + restore
{Commercial,Catalog}/routes.php         2 rotas cada, archived ANTES do apiResource
Identity/Support/PermissionCatalog.php  2 permissões
database/seeders/RolePermissionSeeder.php
```

**Frontend**

```
shared/api/crud.ts               archived() e restore(id)
shared/api/createCrudResource.ts useArchivedList() e useRestore(); <T, TArchived = T>
shared/hooks/useArchivedPage.ts  lista + restore + achatamento do DTO
shared/ui/SearchableTableFrame/  prop viewSwitch
shared/ui/ArchiveSwitch/         componente novo
features/commercial/components/Client/ClientsTable.tsx
features/catalog/components/CoursesTable.tsx
features/{commercial,catalog}/hooks/  aliases de página
shared/config/locales/{es-CL,pt-BR,en}.json   chaves archive.*
```

Lei 6 respeitada: as features consomem PrimeReact só via `shared/ui` e não se importam entre si. A
dependência aponta para baixo — `shared/ui` não importa `shared/hooks` nem `shared/api`, e o
`viewSwitch` chega como `ReactNode` pronto, no mesmo molde do `filterSlot`.

## 5. Testes e DoD

**Backend** — `docker compose exec -T app php artisan test`

1. **O teste que prova a D2:** arquivar cliente com 2 contatos, sendo **1 já arquivado antes** →
   restaurar → volta 1 contato, o outro segue arquivado. Sem ele o bloco é indistinguível de
   "restaura todos os filhos".
2. O mesmo par para `Course` com um `CourseCertificateTemplate` já arquivado antes.
3. `POST /clients/{id}/restore` sobre registro **ativo** → 404.
4. Sem `commercial.client.restore` → 403; com ela → 200.
5. `restored` gravado em `audits` para o pai **e cada filho**, instância a instância (ADR-08).
6. `GET /clients/archived` não devolve ativo; `GET /clients` não devolve arquivado.
7. `ArchiveTrailQuery` devolve o autor da última audit `deleted` e `null` quando não há audit.

**Frontend** — `pnpm test` (vitest/jsdom, hooks de `shared/`)

8. `useArchivedPage` não dispara a query em modo `active` e dispara ao trocar para `archived` (D10).
9. O restore invalida as duas listas.

**DoD end-to-end, no navegador** — não por `curl`, não por teste verde isolado:

Arquivo um cliente que tem contato e endereço → some da lista ativa → apareço em Arquivados com data
e autor preenchidos → restauro → volta à lista ativa **com contato e endereço de volta**, e um
contato que eu tinha arquivado antes continua arquivado.

## 6. Riscos

- **Toca `users`.** A coluna marcadora entra na tabela mais sensível do sistema. É boolean com
  default `false`, não altera índice único nem caminho de auth, e só o hook `deleting` do `Client`
  a escreve.
- **Primeiro caminho de leitura de `audits`.** `ArchiveTrailQuery` fica em `Shared/` e é consultado
  em lote; se a tabela crescer, o índice a olhar é `(auditable_type, auditable_id, event)`.
- **`useRemove` sai de zero consumidores para dois.** A fábrica está testada, mas nunca foi exercida
  em produção por este caminho.

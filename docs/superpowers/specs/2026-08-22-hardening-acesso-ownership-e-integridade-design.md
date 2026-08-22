# Spec — `hardening-acesso-ownership-e-integridade`

**Data:** 2026-08-22 · **Bloco:** item 3 da fila · **Lane:** `lane-a`, main tree ·
**Branch:** `feat/hardening-acesso-ownership-e-integridade` · **Base:** `f6649297`
**Packet:** `docs/superpowers/context-packets/2026-08-22-hardening-acesso-ownership-e-integridade.md`
**Fontes:** RN-01, RN-02, RN-15, ADR-07 · Notion `7.3.3` · P-49, P-51, P-47 · Q-4 do review de
`feedbacks-resolver-escopo`

---

## 1. O problema, medido

A autorização por **permissão** existe e é larga: cinco controllers declaram `permission:` por
método, 28 sítios ao todo. O que não existe é autorização por **dado**. Seis medições contra
`f6649297` delimitam o bloco:

| # | Medido | Coordenada |
|---|---|---|
| 1 | **Zero classes `Policy` no repositório.** `RolePermissionSeeder.php:64-67` promete `TurmaPolicy/Query — (Task de Policies)`; essa task nunca existiu | `find app -iname '*policy*'` devolve 0 |
| 2 | `TurmaController::index` devolve **todas** as turmas; `show` faz binding de qualquer uma. Redator com `operation.turma.view` lê turma de colega | `TurmaController.php:49-53` |
| 3 | `is_active` é conferido **só no login**. Sessão viva sobrevive à desativação | `AuthController.php:52` |
| 4 | Revogar **redator** purga sessão; revogar **staff** não | `UpdateRedatorAction.php:63-79` vs `UpdateStaffUserAction.php:56` |
| 5 | O redator **não tem** `operation.enrollment.manage`, então não lança nota nem presença — e RN-02 + Notion `7.3.3` dizem que deveria | `RolePermissionSeeder.php:69-75` |
| 6 | Dashboard separa redator por `user->type`, não por role | `DashboardController.php:37` |

O achado 4 não estava previsto no backlog nem no packet. A P-51 diz que omitir `is_active` reativa
staff; a medição mostra que **desativar staff também não derruba a sessão dele**. Duas metades do
mesmo portão, as duas abertas só do lado do staff.

**Correção ao packet:** o fato-chave 4 dele diz que RN-15 precisa ser implementada. **Já está.**
`Turma::assertAcademicallyWritable()` (`Turma.php:196`) é chamada por **12 escritores** de Operation
— `RecordEnrollmentResultAction`, `EnrollStudentAction`, `ImportStudentsAction`,
`StoreTurmaDocumentAction`, `DeleteTurmaDocumentAction`, `RemoveEnrollmentAction`,
`RestoreEnrollmentAction`, `UpdateTurmaAction`, `DeleteTurmaAction`, `ConcludeTurmaAction`,
`DesignateRedatorAction` e `RemoveRedatorAction`. O bloco não a reimplementa.

## 2. Escopo

Quatro eixos, todos backend, com um diff de `generated.ts` como entregável:

1. **Ownership** — redator só alcança turma em que está designado.
2. **Revogação** — conta desligada perde acesso no meio da sessão; omissão de `is_active` não reativa.
3. **Capacidade** — redator ganha lançar nota e presença, sem ganhar o Fluxo 3.
4. **Integridade** — os escritores de filho da P-49 tomam o lock do pai, com catraca.

### Fora, declarado

| Item | Por quê |
|---|---|
| **D-34** — visibilidade RBAC do Dashboard | Condicional no backlog: só entra "se o contrato for tocado". Este bloco toca `generated.ts` pelo `is_active` de `UserData`, **não** pelo payload do Dashboard. Entrar aqui abriria `AnalyticsQuery`, o assembler e dois componentes do SPA — frente diferente, e a `lane-c` está no frontend. |
| **RN-15** | Já implementada, 12 chamadores (§1). |
| **Os outros cinco campos da P-51** | `ClientData::$type`, `CourseData::$workload_hours`, `BudgetController::update`, `CourseTemplateController::update`. Nenhum é controle de acesso; a ficha já os separa por gatilho próprio. |
| **Q-4 do review do bloco 1** | Ver §7. Sai com ficha e dono nomeado, não em silêncio. |

## 3. Decisões

| ID | Decisão | Alternativa recusada e por quê |
|---|---|---|
| **D1** | Ownership mora no **escopo da query**, não em `Policy` | `Policy` não filtra lista: `index` precisaria de escopo de query de todo jeito, e o bloco nasceria com duas fontes de verdade que podem divergir. Middleware de rota não alcança `index` nem recurso derivado sem `{turma}` na URL. |
| **D2** | A superfície é **o que a role `redator` alcança hoje** | Descer o escopo a todo consumidor de `Turma` guardaria alcance que não existe — a role não tem permissão de Dashboard nem de Certification —, e o DoD não teria como provar por requisição real. |
| **D3** | Turma alheia devolve **404**, nunca 403 | 403 confirma que a turma existe. O redator não deve distinguir "turma alheia" de "turma inexistente". |
| **D4** | `UserData::$is_active` vira `bool\|Optional` **sem default** | `['present','boolean']` faria omissão virar 422 — contradiz a **D1 da spec do BD-14** (2026-08-20), que escolheu "omissão preserva" contra "PUT exige a chave". Reabrir decisão de dois dias atrás precisa de motivo maior que economizar um diff de `generated.ts`. |
| **D5** | Revogação fecha nas **duas pontas**: purge na Action **e** middleware por request | Só o purge fecha apenas o caminho que passa pela Action — conta desligada por seed, por SQL direto ou por Action futura mantém sessão viva. Só o middleware deixa a linha em `sessions` viva até expirar. |
| **D6** | Nota/presença ganha **permissão própria**, dada ao redator | Dar `operation.enrollment.manage` inteiro traria junto matricular, importar planilha e remover matrícula — o Fluxo 3 é do admin, e RN-02 separa responsabilidades. |
| **D7** | P-49 se prova por **arch test permanente + uma corrida real no DoD** | Só fechar os seis, com a simetria do molde `Client` como evidência, repetiria o erro que gerou a ficha: um plano que **afirmou** que o lock fechava a janela sem medir. Suíte de concorrência em MySQL nasceria fora do `php artisan test` e sem CI para rodá-la (o item 11 ainda não existe). |
| **D8** | **P-47 entra** | O escopo desta spec a promove de cosmética a bloqueante: com a role decidindo acesso, os 7 redatores do seed sem role viram 7 contas sem permissão nenhuma. É o gatilho literal da ficha — "o primeiro gate aplicado sobre rota de redator". |

## 4. Ownership: um escopo, dois pontos de entrada

O escopo mora em `TurmaQueryBuilder` (`app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php`),
que já existe e já hospeda `withListingData()`:

```php
public function visibleTo(User $user): self
{
    if ($user->type !== 'redator') {
        return $this;
    }

    return $this->whereHas('redatores', fn ($q) => $q->where('redatores.user_id', $user->id));
}
```

A relação é `Turma::redatores()` — `belongsToMany(Redator::class, 'turma_redator')->withTrashed()`
(`Turma.php:135-138`). O filtro casa por `redatores.user_id`, não por `redatores.id`, porque quem
autentica é o `User`.

Admin e superadmin atravessam sem consulta extra: o `if` sai antes do `whereHas`.

Dois consumidores, e só dois:

| Entrada | Mecanismo | Redator não designado recebe |
|---|---|---|
| Lista — `index`, `archived` | `Turma::query()->visibleTo($user)` no controller | turma ausente da lista |
| Singular — `{turma}` em **toda** rota | `Turma::resolveRouteBinding()` aplica `visibleTo` | **404** |

`resolveRouteBinding` é o que faz o escopo alcançar a superfície inteira de uma vez. `{turma}`
aparece em **20 rotas** de `app/Domains/Operation/routes.php` (contadas, não estimadas): `restore`,
`show`, `update`, `destroy`, `designateRedator`, `removeRedator`, `conclude`, `manual`,
`manual/docx`, `documents` (index, store, destroy) e `alunos` (index, preview, archived, store,
importar, resultado, destroy, restore). Nenhuma precisa lembrar de filtrar, e rota nova nasce
coberta.

As rotas aninhadas que já usam `scopeBindings()` continuam funcionando: o `{turma}` externo resolve
escopado, e o filho resolve dentro dele. As duas que declaram `withoutScopedBindings()`
(`designateRedator`, `removeRedator`) também: a isenção vale para o **filho** — `{redator}` não
pertence à turma —, e não desliga a resolução do `{turma}`.

**A role `redator` não tem** `operation.turma.restore`, `.update`, `.delete`, `.create` nem
`.complete` — o middleware de permissão já barra essas antes do binding. O escopo cobre o caso do
admin sem efeito (o `if` sai cedo) e o do redator onde ele tem permissão.

## 5. Revogação e `is_active`

### Ponta A — a transição

`UpdateStaffUserAction` ganha o purge que `UpdateRedatorAction` já tem, na mesma forma medida:
**revogação é transição, não estado** — purga só quem estava ativo e passou a inativo. Reenviar
`false` para conta já desligada não derruba sessão nenhuma.

### Ponta B — o request

Middleware novo no grupo `auth:sanctum` (alias registrado em `bootstrap/app.php`), aplicado a toda
rota autenticada:

- `! $user->is_active` **ou** `$user->type` fora de `{admin, redator}` derruba a sessão e responde
  **401** pelo handler RFC 7807 — nunca `abort()` cru (lei §5.4).

Isso é a RN-01 aplicada por request e não só na porta. Cliente e aluno nascem `is_active=false` e já
não logam; a ponta B alcança `type` trocado por SQL e desativação por caminho que ainda não existe.

### P-51

`UserData::$is_active` perde o default literal:

```php
- public bool $is_active = true;
+ public bool|Optional $is_active;
```

Espelha `RedatorData`, que acerta pela mesma forma. `generated.ts` passa `is_active` a opcional —
grafia que a linha 433 do arquivo já carrega para `RedatorData`. Sítios do SPA a ajustar:
`useStaffUserForm.ts:34,53`, `StaffUserDialog.tsx:121-128`, `UsersTable.tsx:72-73`. O idioma de
narrowing (`?? true`) já existe no repositório, copiado do redator (`useRedatorForm.ts:28,90`,
`RedatorIdentityFields.tsx:73-76`).

`UpdateStaffUserAction:56` já passa `is_active` por `WritableAttributes::from()`, que tira do array
toda chave `Optional`. Nada muda lá além do purge.

## 6. Nota e presença

- `operation.enrollment.record_result` nasce no `PermissionCatalog::descriptions()`, grupo
  `operation`, **não** segregada.
- `EnrollmentController::middleware()` tira `result` de `operation.enrollment.manage` e o põe sob a
  permissão nova. `store`, `import`, `destroy` e `preview` ficam onde estão.
- `RolePermissionSeeder::redatorPermissions()` passa de duas para três permissões.
  `adminPermissions()` a herda por `array_diff` (ela não é segregada), o que mantém o admin capaz.
- Migration de permissão no molde de `2026_08_22_000001`: nome literal, filtro `guard_name = 'web'`,
  `forgetCachedPermissions()` e `down()` reversível que **não** devolve capacidade a role nenhuma.
- Chaves `perm.operation.enrollment.record_result` nas três locales, sob a catraca
  `PermissionI18nParityTest`, que já existe e já foi vista morder.

O escopo da §4 limita sozinho: `PUT /api/turmas/{turma}/alunos/{enrollment}/resultado` resolve
`{turma}` pelo binding escopado, então o redator lança nota só em turma dele.

## 7. Integridade — P-49

Os escritores de filho tomam o lock do pai, simétricos aos seis do molde `Client`
(`CreateClientContactAction:22`, `CreateClientAddressAction:22`, `UpdateClientAction:32`,
`UpdateClientContactAction:23`, `UpdateClientAddressAction:23`, `DeleteClientContactAction:38`):

| Eixo | Escritor | Lock | Abre transação hoje? |
|---|---|---|---|
| Redator | `Identity\Actions\StoreRedatorDocumentAction` | `Redator::lockForWrite()` | sim |
| Redator | `Identity\Actions\UpdateRedatorAction` | `Redator::lockForWrite()` | sim |
| Redator | `Operation\Actions\DesignateRedatorAction` | `Redator::lockForWrite()` | **não — passa a abrir** |
| Turma | `Operation\Actions\EnrollStudentAction` | `Turma::lockForWrite()` | sim |
| Turma | `Operation\Actions\StoreTurmaDocumentAction` | `Turma::lockForWrite()` | **não — passa a abrir** |

**Duas correções medidas contra `f6649297`, depois de a spec ter sido aprovada.**

**(a) O lock é `lockForWrite()`, não `lockRow()`.** A ficha cita o molde `Client` como
`Client::lockRow()`, mas o código dos seis escritores de cliente chama `Client::lockForWrite()`
(`Client.php:139-148`) — que é `lockRow()` **mais** a recusa se o pai já está arquivado. A diferença
é a ficha inteira: `lockRow` sozinho SERIALIZA (B espera A commitar) e depois deixa B pousar o filho
sob o pai recém-arquivado. Quem recusa é o `trashed()` de dentro do `lockForWrite`. `Turma` e
`Redator` não têm esse método; ele nasce neste bloco, no molde do `Client`. Os quatro tomadores
atuais (`ArchiveRedatorAction`, `RestoreRedatorAction`, `DeleteTurmaAction`, `RestoreTurmaAction`)
continuam com `lockRow()` cru, e devem: eles operam sobre linha arquivada ou em vias de ser.

**(b) `ImportStudentsAction` sai da lista.** Ela **não abre transação** — por decisão registrada, a
transação do import é POR LINHA e mora no `EnrollStudentAction`. `lockForUpdate()` fora de transação
é solto no autocommit da própria consulta: o lock ali seria teatro. A cobertura do import vem da
linha, que passa a travar. Ela entra na lista de ISENTAS do arch test, com esse motivo escrito — não
sai em silêncio.

São **cinco** escritores, não seis. O sexto sítio da ficha continua coberto; muda quem o cobre.

`DesignateRedatorAction` cria aresta de lock **cruzando domínio** — Operation trava um agregado de
Identity. A aresta de código já existe (`TurmaController` importa `Identity\Models\Redator`), então
o `DomainDependencyTest` não muda de conjunto.

`StoreRedatorDocumentAction` faz `uploads->put()` **antes** de abrir a transação, e é isso que dá à
janela a largura de um upload no S3. A task decide contra o código entre trazer o `put()` para
dentro da janela protegida ou tomar o lock antes do INSERT mantendo o upload fora — a decisão de
manter binários fora da transação é a D3 da spec do redator e não se reabre sem motivo.

### Prova em duas camadas

`SQLiteGrammar::compileLock()` devolve string vazia: **nenhum teste deste repositório prova lock**.
Por isso a evidência se divide.

- **Permanente — `tests/Feature/Shared/ParentLockOnChildWriteTest.php`.** Arch test que lê código,
  não corrida, e por isso roda em sqlite. O universo é medido, não escolhido: toda Action sob
  `app/Domains/*/Actions/` cujo código (sem comentários) recebe `Turma $` ou `Redator $` — **16
  arquivos** em `f6649297`. Cada uma está numa de duas listas declaradas, e **silêncio reprova**
  (mesmo idioma do `NestedRouteOwnershipTest`): ou toma `lockForWrite()` do pai, ou está na lista de
  ISENTAS com o motivo escrito ao lado. Sonda **vista reprovar** antes de passar, e revertida.
- **Uma vez, no DoD — corrida real no MySQL de dev.** Duas conexões: A abre transação e segura o
  lock do pai; B dispara o escritor de filho e **bloqueia**; A arquiva e commita; B falha em vez de
  pousar filho ativo sob pai arquivado.

### Q-4 sai com ficha

O Q-4 do review de `feedbacks-resolver-escopo` foi deferido **para este bloco**: os testes de
`RemoveOrphanFeedbackPermissionsMigrationTest` não cobrem o filtro `guard_name` nem o
`forgetCachedPermissions()` do próprio `up()` — apagar qualquer um dos dois deixa a suíte verde
(lição 10). O João o tirou do escopo em 2026-08-22. **Ele não vira pendência silenciosa:** o
fechamento do bloco abre ficha `P-*` própria em `pendencias/abertas.md`, com o gatilho "o próximo
bloco que escrever migration de permissão" e a observação de que este bloco escreveu uma (§6) e não
a aproveitou.

## 8. Seed — P-47

**Correção medida depois da aprovação: o seeder já está certo; o DADO é que está velho.**
`OperationDemoSeeder::seedRedatores()` cria por `CreateRedatorAction`, que faz
`$user->syncRoles(['redator'])` desde `e3490d84` (RF-ROL-05), e `UserProvisioner::accessDefaultFor()`
já faz o redator nascer `is_active = true`. Reseedar do zero hoje produz 7 redatores ativos e com
role. Não há nada a mudar no seeder.

O que sobrou é linha criada ANTES desse commit. Medido no MySQL de dev em 2026-08-22:

| user | nome | `is_active` | roles |
|---|---|---|---|
| 2 | Juan Morales | 1 | `redator` |
| 3–8 | Pedro Soto, Ana Reyes, Carlos Fuentes, Marcela Rojas, Rodrigo Vargas, Ignacio Pérez | **0** | **nenhuma** |

Juan Morales é o único com role, e só porque a prova e2e do fechamento de 2026-08-19 reenviou o
convite dele — é o caminho de remediação que a própria ficha descreve, exercido uma vez.

**O remédio é migration, não seeder.** É o mecanismo que a `2026_08_22_000001` já usa pelo mesmo
argumento, escrito no docblock dela: *"a migration é o único mecanismo que alcança banco já
provisionado: o seeder só corrige quem o roda"*. Backfill idempotente: todo `users.type = 'redator'`
sem a role `redator` recebe a role. **`is_active` NÃO entra no backfill** — redator desativado de
propósito existe, e reativá-lo em massa seria a P-51 ao contrário. Os dois redatores que o DoD exige
ativos são ativados pelo caminho real da API (`PUT /api/redatores/{id}` com `is_active: true`), que é
comportamento do app e não escrita de migration.

Com o escopo desta spec a role decide acesso, então redator sem role é conta sem permissão nenhuma —
e o DoD do bloco depende de duas sessões de redator reais, em turmas diferentes.

## 9. DoD — comportamento, não diff

Provado **fora da suíte**, contra a API real em `:8080` e o banco de dev:

| # | Prova | Esperado |
|---|---|---|
| 1 | Sessão de Redator A em `GET /api/turmas` | só turmas em que A está designado |
| 2 | Redator A em `GET`/`PUT` de turma do Redator B | 404 |
| 3 | Redator A nos 20 caminhos com `{turma}` de turma alheia | 404 em todos |
| 4 | Redator A em `POST /api/turmas/{alheia}/documents` | 404 |
| 5 | Redator A em `PUT /api/turmas/{propria}/alunos/{id}/resultado` | 200 |
| 6 | Redator A no mesmo caminho, turma alheia | 404 |
| 7 | Admin em tudo acima | 200, inalterado |
| 8 | Staff desativado com sessão viva, request seguinte | 401 RFC 7807 |
| 9 | `PUT /api/users/{id}` omitindo `is_active` sobre staff desligado | segue desligado |
| 10 | Sonda do `ParentLockOnChildWriteTest` | reprova antes de passar, e é revertida |
| 11 | Corrida do lock, MySQL de dev, duas conexões | B bloqueia até o COMMIT de A |
| 12 | `GET /api/permissions` com sessão de superadmin | contém `operation.enrollment.record_result` |

Catracas de gate: backend pelo binário direto (`php -d memory_limit=1G vendor/bin/phpunit` — o
comando documentado morre na **P-50**), `pnpm lint`, `pnpm build`, `pnpm test`, Pint nos PHP
tocados, e `typescript:transform`. O `generated.ts` **muda** neste bloco, pelo `is_active`: o diff é
entregável, não drift.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| `resolveRouteBinding` alcança rota que não devia escopar | O escopo é inerte para não-redator (o `if` sai antes). Toda rota de admin passa igual, e a prova 7 do DoD é o controle positivo. |
| Middleware por request custa uma consulta a `users` | O Sanctum já carrega o `User` para popular `$request->user()`; o middleware lê o objeto em mão, sem query nova. |
| A catraca de lock produz falso positivo em Action que não escreve filho | Não há inferência: o teste tem duas listas declaradas e exige que toda Action do universo esteja numa delas. Action que não escreve filho entra em ISENTAS com o motivo — e o motivo fica onde alguém o lê ao editar a Action. |
| `generated.ts` opcional quebra tela de staff | Os ~5 sítios do SPA são nomeados na §5 e o idioma de narrowing já existe copiado do redator. `pnpm build` roda `tsc -b` antes de bundlar. |

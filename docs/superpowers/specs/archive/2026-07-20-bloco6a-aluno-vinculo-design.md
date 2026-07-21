# Bloco 6a · Aluno + vínculo cliente + resolução por RUT — Design

> Sprint 3 (Operação), **fatia backend 1 de N**. Fundação: `Student` como extensão de `User`,
> histórico de vínculo aluno↔cliente (RN-10) e o **serviço de resolução por RUT** que a importação
> de alunos da Turma (bloco 6c) vai invocar. Data: 2026-07-20.
>
> Fontes de regra: Drive `V2/Planejamento` — `entidade-matricula.md`, `entidade-turma.md`,
> `modulo-operacao.md`, `tela-turmas.md`, `requisitos-negocio.md` (RF-ALU-01..07, RN-10, RF-ALU-04).
> DER: `docs/der-fisico.md` (tabelas planejadas `students`, `student_client_logs`).

## Contexto e decomposição

Sprint 3 (Operação) é um sprint inteiro — 4 entidades novas (`students`, `student_client_logs`,
`turmas`, `enrollments`) + serviço de importação + máquina de estados + gate de idoneidade + manual.
Fatiado em blocos backend por dependência:

| Fatia | Entrega | Depende de |
|---|---|---|
| **6a (este)** | `students` + `student_client_logs` + serviço de resolução por RUT + serviço de vínculo | nada novo — fundação |
| 6b | `turmas` (config a partir de cotação aprovada, status, designação c/ gate RN-09) | Commercial, Catalog |
| 6c | `enrollments` + `POST /turmas/{id}/alunos/importar` (orquestra 6a) | 6a + 6b |
| 6d | conclusão (`habilitada→concluída`), blindagem RN-15, manual Blade | upload de doc do redator (sprint futura) |

Só **6a** é planejado agora (just-in-time). Frontend do Sprint 3 vem em blocos próprios, como nas
Sprints 1 e 2.

## Decisões travadas (com o João, 2026-07-20)

1. **Superfície de 6a = só a fundação que 6c precisa.** Sem REST CRUD standalone de aluno, sem tela,
   sem `StudentData`/`#[TypeScript]` — nascem quando houver consumidor (YAGNI, lição #3). O caminho
   de criação de aluno vive no resolver (fonte única); um `CreateStudentAction` fino é extraído
   quando a tela de cadastro manual chegar.
2. **Vínculo trocado = move automático + reporta.** Aluno já existente e vinculado a outro cliente,
   ao ser resolvido para um cliente diferente: fecha o vínculo antigo, abre o novo, atualiza o
   ponteiro e reporta a mudança no resultado. Casa com RF-ALU-04 (aluno muda de cliente ao longo do
   tempo, com histórico) + RN-10 (1 por vez). Histórico acadêmico passado fica intacto.
3. **Enforcement do "1 vínculo aberto" = coluna gerada + índice único (mecanismo de banco)** +
   serviço que o mantém. `current_client_id` denormalizado no `students` (segue o DER). Justificativa:
   o vínculo decide a qual cliente o aluno pertence (contexto do certificado) — invariante de peso
   legal quer mecanismo, não só instrução (lição #14). O DER já projetou a coluna gerada.

## Regras de negócio que este bloco materializa

- **RF-ALU-01/07:** aluno é extensão 1:1 de `User`, `type=aluno`, `is_active=false`, **sem role**
  (não autentica — RN-01; o seeder já exclui `aluno`/`cliente` das roles). RUT é a chave natural de
  resolução.
- **RF-ALU-03 / RN-10:** todo aluno pertence a **no máximo 1** cliente por vez.
- **RF-ALU-04:** aluno pode mudar de cliente ao longo do tempo, mantendo histórico (log).

## Fronteira do bloco

**Entra:** as 2 migrations, os 2 models (+ morph alias + factories), o enum de outcome, o result DTO
interno, o serviço de vínculo, o serviço de resolução, e os testes que provam o comportamento.

**Sai (explicitamente não é 6a):** parser xlsx/csv e endpoint de importação (6c); REST CRUD e tela
de aluno; `StudentData` com `#[TypeScript]`; qualquer coisa de `turmas`/`enrollments`.

**Domínio:** `Student` e `StudentClientLog` moram em **`Domains/Identity`** (extensão de `User`). A
Operação (6c) consumirá `StudentResolver` via Service — cruzamento de domínio permitido
(`backend-ddd`: Operation consome regra de Identity sem duplicá-la). `current_client_id` referencia
`Client` (Commercial) — FK cross-domain, aceitável.

## Schema (2 migrations, nomes em inglês)

### `students`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `user_id` | FK/UK → `users` | `cascadeOnDelete`; extensão 1:1, igual `redatores`/`clients` |
| `current_client_id` | FK nullable → `clients` | ponteiro rápido do vínculo aberto; `nullOnDelete` |
| `timestamps` | | |
| `deleted_at` | | soft-delete (padrão das entidades de negócio) |

### `student_client_logs`
Histórico **append-only**, **sem soft-delete** — fechar um vínculo é setar `ended_on`, nunca deletar.
(Isso mantém o log fora do problema da lição #8: índice único que não distingue `deleted_at`.)

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `student_id` | FK → `students` | `restrictOnDelete` (ver nota MySQL abaixo) |
| `client_id` | FK → `clients` | `restrictOnDelete` (nunca hard-delete; preserva história) |
| `started_on` | date | início do vínculo |
| `ended_on` | date nullable | `NULL` = vínculo aberto (vigente) |
| `open_link_student_id` | int **gerada**, `UNIQUE` | `CASE WHEN ended_on IS NULL THEN student_id END` |
| `timestamps` | | |

A coluna gerada carrega `student_id` quando o vínculo está aberto e `NULL` quando fechado. Muitos
`NULL` (fechados) convivem no índice único; um único `student_id` (aberto) é permitido por aluno — o
banco **rejeita** a tentativa de abrir um 2º. Sintaxe suportada em MySQL 8 e sqlite ≥ 3.31 (os testes
rodam em sqlite `:memory:`). Schema builder: `->storedAs("CASE WHEN ended_on IS NULL THEN student_id END")`
+ `->unique()`.

> **Nota MySQL (fix do fechamento, provada contra o engine real):** `student_id` é `restrictOnDelete`,
> não `cascadeOnDelete`. O InnoDB proíbe `ON DELETE CASCADE` numa FK cuja coluna uma coluna gerada
> STORED referencia — e `open_link_student_id` depende de `student_id` (erro 1215). A migration passava
> em sqlite (ignora a restrição) e falhava em MySQL 8; só a prova do gate contra MySQL pegou. `restrict`
> não muda comportamento (soft-delete de aluno não dispara FK de banco — o hook `deleting` cascateia p/
> o `user`) e é mais correto p/ histórico append-only. Vira **lição #15** no `docs/README.md`.

## Models e morph map

- **`Student`** (`Domains/Identity/Models/Student.php`): `Auditable`, `SoftDeletes`.
  - `belongsTo(User)`, `belongsTo(Client, 'current_client_id')` como `currentClient`,
    `hasMany(StudentClientLog)` como `logs`, `hasOne(StudentClientLog)->whereNull('ended_on')` como
    `openLog`.
- **`StudentClientLog`** (`Domains/Identity/Models/StudentClientLog.php`): **não** Auditable, **não**
  SoftDeletes (é o próprio histórico). `belongsTo(Student)`, `belongsTo(Client)`.
- **Morph map (ADR-10):** registrar `'student' => Student::class` no `AppServiceProvider` — `Student`
  é `Auditable`, exige alias. `StudentClientLog` não é alvo polimórfico → sem alias.
- **Factories:** `StudentFactory` (cria `User` `type=aluno` via relação), `StudentClientLogFactory`.

## Serviço de vínculo — `StudentClientLinkService`

`Domains/Identity/Services/StudentClientLinkService.php`. **Fonte única** do invariante RN-10: nenhum
outro caminho escreve `student_client_logs` nem `students.current_client_id`.

```
link(Student $student, Client $client): LinkOutcome
```

Dentro de `DB::transaction`:
1. `$open = $student->openLog` (vínculo aberto, se houver).
2. Se `$open` existe **e** `$open->client_id === $client->id` → **no-op**, retorna `AlreadyLinked`.
3. Senão:
   - se `$open` existe: `$open->ended_on = today()`; `$open->save()`.
   - cria `StudentClientLog` novo: `student_id`, `client_id`, `started_on = today()`, `ended_on = null`.
   - `$student->current_client_id = $client->id`; `$student->save()`.
   - retorna `Moved` se havia vínculo aberto anterior, `Linked` se era o primeiro.

`LinkOutcome`: enum `AlreadyLinked | Linked | Moved`.

## Serviço de resolução — `StudentResolver`

`Domains/Identity/Services/StudentResolver.php`. É o que a importação (6c) invoca por linha.

```
resolveByRut(string $rut, string $name, string $email, ?string $phone, Client $client): StudentResolution
```

`StudentResolution` (readonly, `Domains/Identity/Services/StudentResolution.php`):
`{ Student $student, StudentResolutionOutcome $outcome, ?Client $previousClient }`.
`StudentResolutionOutcome` (`Domains/Identity/Enums/StudentResolutionOutcome.php`):
`Created | AlreadyLinked | Moved`.

Fluxo:
1. Normaliza e valida o RUT (`Rut::parse`/`ValidRut`). Inválido → `ValidationException(['rut' => …])`.
2. Busca `User` por `rut` com **`withTrashed()`** (o índice único inclui soft-deletados — lição #8).
3. **Não achou:** `UserProvisioner::provision('aluno', $name, $rut, $email, $phone)` (inativo, sem
   role) → `Student::create(['user_id' => …])` → `link()` → outcome `Created`.
4. **Achou aluno ativo:** carrega o `Student` → `link()` → `AlreadyLinked` ou `Moved` (com
   `previousClient` = cliente do vínculo anterior, quando `Moved`).
5. **Achou aluno soft-deletado:** restaura `User` + `Student` (`restore()`) → `link()` →
   `Moved`/`Created`.
6. **Achou `User` de outro `type`** (redator/cliente/admin): `ValidationException(['rut' =>
   'Este RUT pertence a um usuário de outro tipo.'])` — um `User` é UM tipo de ator (DER).

O resolver **lança por linha**; a importação (6c) captura e reporta (importação tolerante a erro por
linha — a planilha não aborta inteira). Nome/e-mail/telefone chegam da planilha; o resolver só os usa
no ramo de criação (passo 3).

### Mapa de outcome → o que 6c reporta
- `Created` → "aluno criado e matriculado".
- `AlreadyLinked` → "aluno já existente, mesmo cliente".
- `Moved` → "aluno movido do cliente {previousClient} para {client}" (visibilidade da mudança).

## Casos de borda

| Caso | Comportamento |
|---|---|
| RUT com formato/dígito inválido | `ValidationException` por linha; 6c reporta, não aborta |
| RUT de redator/cliente/admin | `ValidationException` (tipo conflitante) |
| Aluno soft-deletado reimportado | restaura user+student, revincula |
| Aluno existente sem vínculo aberto (anomalia) | abre vínculo; outcome `Moved` (`previousClient` null) |
| Reimportar mesmo aluno mesmo cliente | `AlreadyLinked`, segue com exatamente 1 vínculo aberto |
| Cliente do `current_client_id` soft-deletado | ponteiro fica pendurado (história); aceitável |

## Testes = Definition of Done

Integração em sqlite `:memory:` (ADR-02), sem mock. DoD = comportamento provado, não build verde.

**`StudentResolverTest`:**
- RUT novo → cria `User` `type=aluno`, `is_active=false`, sem role; cria `Student`; 1 log aberto para
  o cliente; `current_client_id` setado; outcome `Created`.
- RUT existente, mesmo cliente → no-op; outcome `AlreadyLinked`; segue 1 log aberto.
- RUT existente, **outro** cliente → move: log antigo com `ended_on` preenchido, novo log aberto,
  `current_client_id` trocado, **exatamente 1** log aberto; outcome `Moved`; `previousClient` correto.
- RUT inválido → `ValidationException` na chave `rut`.
- RUT de redator → `ValidationException` (tipo conflitante).
- Aluno soft-deletado → restaurado e revinculado.

**`StudentClientLinkServiceTest`:** invariante isolado (transições `Linked`/`Moved`/`AlreadyLinked`).

**`StudentClientLogConstraintTest`:** insert direto de um 2º log aberto para o mesmo aluno →
`QueryException` (prova o mecanismo de banco, não só a regra de aplicação).

**Regressão (lição #10):** o teste "move fecha o vínculo antigo" precisa **reprovar** contra um
`link()` que só abre sem fechar — `git stash` no código verde, roda, confirma o vermelho, `git stash
pop`. O plano dirá isso na task correspondente. Teste que passa nos dois estados prova nada.

## Arquivos

```
backend/database/migrations/2026_07_20_000001_create_students_table.php
backend/database/migrations/2026_07_20_000002_create_student_client_logs_table.php
backend/app/Domains/Identity/Models/Student.php
backend/app/Domains/Identity/Models/StudentClientLog.php
backend/app/Domains/Identity/Enums/StudentResolutionOutcome.php
backend/app/Domains/Identity/Enums/LinkOutcome.php
backend/app/Domains/Identity/Services/StudentResolution.php
backend/app/Domains/Identity/Services/StudentClientLinkService.php
backend/app/Domains/Identity/Services/StudentResolver.php
backend/app/Providers/AppServiceProvider.php            # + alias 'student'
backend/database/factories/StudentFactory.php
backend/database/factories/StudentClientLogFactory.php
backend/tests/Feature/Identity/StudentResolverTest.php
backend/tests/Feature/Identity/StudentClientLinkServiceTest.php
backend/tests/Feature/Identity/StudentClientLogConstraintTest.php
```

## Leis e ADRs tocados

- ADR-02 (DDD-lite, sem Repository; Actions/Services; testes de integração), ADR-10 (morph map),
  ADR-08 (auditoria só na aplicação — `Student` Auditable via owen-it).
- Lei #5 (aluno não autentica: `is_active=false`, sem role). Lei #8 (DoD = comportamento provado).
- Nenhuma lei parece exigir quebra. Financeiro não entra (Lei #7 não se aplica aqui).

## Follow-ups registrados (não são 6a)

- `StudentData` + `#[TypeScript]` + REST CRUD quando a tela de aluno existir.
- Sincronizar o Drive canônico: `students`/`student_client_logs` implementadas em inglês (a doc PT/ES
  do Drive fica desatualizada até o write externo ser autorizado).
- Atualizar `docs/der-fisico.md`: mover `students`/`student_client_logs` de "planejadas" para
  "implementadas" (inglês) — parte do fechamento do bloco.

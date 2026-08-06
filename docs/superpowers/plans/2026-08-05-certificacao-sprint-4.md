# Plano — Bloco 7 · Sprint 4 · Certificação

> REQUIRED SUB-SKILL: `superpowers:test-driven-development` — cada task backend escreve o teste
> antes do código; cada task frontend prova comportamento no navegador (checkpoint da Task 13).

- **Spec:** `docs/superpowers/specs/2026-08-05-certificacao-sprint-4-design.md` (aprovada, commit `5f18295`)
- **Context packet:** `docs/superpowers/context-packets/certificacao-sprint-4.md`
- **Work item:** `certificacao-sprint-4`
- **Branch:** `feat/certificacao-sprint-4` (main tree — pendência P-03)

## Goal

Fechar o ciclo legal do Lotus: uma matrícula com resultado acadêmico aprovado, numa turma
concluída, vira um certificado numerado, imutável (snapshot), com PDF e QR que resolve numa
página pública de validação — e revogável por superadmin sem apagar nada.

Fatia vertical fina: um caminho feliz completo (lançar resultado → emitir → PDF → validar) mais
revogação. Nada de assinatura digital, template configurável ou envio por e-mail.

## Architecture

Domínio novo `App\Domains\Certification`, nascendo com a matriz de dependências explícita
(`DomainDependencyTest::ALLOWED['Certification']`, hoje `[]`).

```
POST /api/enrollments/{enrollment}/certificate
   └─ CertificateController::store
        └─ IssueCertificateAction (DB::transaction)
             ├─ 4 portas: turma concluída · resultado aprovado · sem vigente · redator da turma
             ├─ CertificateNumberService  → "LOT-2026-1000"  (certificate_sequences + lockForUpdate)
             ├─ CertificateSnapshotBuilder → json congelado (aluno, curso, turma, redator, cliente)
             └─ Certificate::create(...)  → UNIQUE(coluna gerada) prova a unicidade no banco

GET /api/certificates/{certificate}/pdf
   └─ CertificatePdfService → Blade (`certification.certificate`) + QR SVG inline → Gotenberg

GET /api/publico/certificados/{uuid}          (sem Sanctum)
   └─ PublicCertificateController::show → PublicCertificateData (lê SÓ o snapshot + status)
```

O certificado **não é recurso CRUD**: nada de `createCrudResource`/`useCrudForm` no frontend.
Emissão e revogação são ações; o resto é leitura.

## Tech Stack

Sem dependência nova. `simplesoftwareio/simple-qrcode` + `bacon/bacon-qr-code` já estão em
`vendor/` (medido). Gotenberg já roda no compose e já tem precedente
(`Operation\Services\ManualPdfService`).

## Global Constraints

1. **Backend roda no container.** `docker compose exec -T app php artisan ...`. Pint roda no host,
   de dentro de `backend/`, **sempre com os arquivos como argumento**.
2. **Lei §5.3 — tipos TS gerados.** Toda task que cria/altera um `Data` roda
   `php artisan typescript:transform` e commita `generated.ts` **no mesmo commit** (lição 11).
3. **Lei §5.4 — erro sobe ao handler global.** `ValidationException::withMessages()`, nunca
   `abort(422)`.
4. **Lei §5.6 — feature não importa feature.** `features/certification` não importa
   `features/operation`. O que as duas precisam vive em `shared/`.
5. **ADR-10 — morph map.** Todo model Auditable novo entra em `enforceMorphMap`.
6. **DoD comportamental.** Build verde não é DoD. Cada task declara o comportamento provado.
7. **Placar de testes.** Baseline medido: backend **378 passed**, frontend **35 passed**. Cada
   task backend declara o delta; ao final: **418 passed + 1 skipped** no backend (D-P5), **35** no
   frontend (o projeto só testa unitariamente hooks de `shared/`).
8. **Migration verde em sqlite pode quebrar no MySQL** (lição 15). As tasks 2, 3 e 5 rodam
   `migrate:fresh` no MySQL real além da suíte.

## Desvios da spec aprovada (declarados)

Três pontos onde este plano refina a spec. Nenhum contradiz uma decisão dela; todos são
consequência de medição feita ao planejar.

- **D-P1 — endpoint `GET /api/certificates/issuable`.** A spec lista as rotas mas não prevê de
  onde o diálogo de emissão tira os candidatos. O diálogo vive em `features/certification` (D18) e
  **não pode** importar `features/operation` (lei §5.6); sem endpoint próprio, a UI teria que
  quebrar a lei ou re-derivar as 4 portas no cliente. Entra como rota de leitura, permissão
  `certification.certificate.issue`.
- **D-P2 — são 7 arestas de domínio, não 6.** O §5 da spec pede o gate "com as 6 arestas
  declaradas — nenhuma a mais". A porta 1 (turma concluída) exige `Operation\Enums\TurmaStatus`,
  que a lista da spec omitiu. A matriz final tem 7 entradas (Task 2).
- **D-P3 — `config/app.php` ganha `frontend_url`.** O conteúdo do QR é
  `<FRONTEND_URL>/validar/{uuid}`. `config/app.php` não tem essa chave (medido) e ler `env()` em
  runtime quebra com config cacheado — então vira chave de config.
- **D-P4 — `typescript-transformer-manifest.json` entra em `paths_autorizados`** (achado na
  execução da Task 1, 2026-08-05). `php artisan typescript:transform` reescreve **dois** arquivos,
  não um: `generated.ts` e o manifest ao lado. A lista original só previa o primeiro, então o Codex
  parou corretamente ao ver o manifest sujo fora da autorização. Os dois sempre foram commitados
  juntos (`e6f54b9`, `d91c5da` são os precedentes) — o manifest é saída do mesmo comando, não
  edição de frontend. Vale para as tasks 1, 5, 6 e 8, que rodam o transform.
- **D-P5 — o placar do backend fecha em `418 passed, 1 skipped`, não em `419 passed`** (achado na
  execução da Task 3, 2026-08-05). O plano se contradiz: manda o caso de concorrência dar
  `markTestSkipped` fora do MySQL **e** conta esse caso como `passed` no placar do run padrão
  (sqlite). Os dois não podem valer juntos. O run padrão passa a declarar o skip explicitamente —
  Task 3: `389 passed, 1 skipped`; alvo final da Task 14: **`418 passed, 1 skipped`**. O caso
  skipado não é dívida: ele roda e passa contra o MySQL do compose, que é onde ele prova alguma
  coisa. Esconder o skip num número redondo é que seria dívida.

### D-P6 e D-P7 — dois pontos onde este plano tinha estreitado a spec aprovada

Achados na execução da Task 5 (2026-08-05), ao conferir a Action contra a spec em vez de contra o
próprio plano. **Não são refinamentos: são divergências**, e o João decidiu pela spec nas duas.

- **D-P6 — a porta "o curso tem template" volta. São 5 portas, não 4.** A spec D10 lista
  turma `concluida` · matrícula `aprobado` · **o curso tem template** · nenhum vigente, e chama a
  terceira de decisão nova, com o motivo escrito: *certificado sem template aprovado é documento
  legal com narrativa inventada*. Este plano trocou essa porta por "redator da turma" e escreveu um
  caso de teste afirmando o **oposto** — `sem template → 201 com valido_ate null`. A porta do
  redator é guarda legítima (decorre da D11) e **fica**; a do template **volta**, e o caso 8 do
  teste inverte: sem template é **422**, não 201. Nada medido na execução refutou o argumento da
  spec.
- **D-P7 — o snapshot congela `template_version`, a cópia do `layout_config`, a cidade de emissão e
  o RUT da empresa.** A spec D12 exige os quatro; a Task 4 deste plano listou 7 chaves e omitiu
  todos. Sem eles a Task 7 não consegue cumprir o próprio DoD ("o Blade lê **só** o snapshot"): o
  layout teria que vir do template vivo, que é exatamente o vazamento que a D12 existe para
  impedir, e a promessa de reimpressão idêntica em 2028 morre. Regra da cidade, que a spec fixa e o
  plano não transcreveu: vem de `turma.local_aplicacao`; turma `online` não tem local e cai para a
  cidade fixa declarada no `layout_config` do template — **nunca** derivada de endereço do cliente.
  Nota e presença nulas entram nulas, e o Blade **omite a linha** em vez de imprimir zero.

---

## Task 0 — Baseline e branch

**Executor:** claude
**Files:** nenhum

- [ ] `docker compose up -d && docker compose exec -T app php artisan test`
      → esperado: `Tests:  378 passed`
- [ ] `cd frontend && pnpm test` → esperado: `Tests  35 passed`
- [ ] `git checkout -b feat/certificacao-sprint-4`
- [ ] Registrar os dois números como baseline no commit da Task 1.

**DoD:** os dois placares batem com o declarado na Global Constraint 7. Divergiu → PARE e reporte
antes de escrever qualquer código (o plano inteiro conta deltas a partir daí).

---

## Task 1 — Escritor do resultado acadêmico

**Executor:** codex
**Files:**
- `backend/app/Domains/Operation/Data/EnrollmentResultData.php` (novo)
- `backend/app/Domains/Operation/Actions/RecordEnrollmentResultAction.php` (novo)
- `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` (editar)
- `backend/app/Domains/Operation/routes.php` (editar)
- `backend/tests/Feature/Operation/EnrollmentResultTest.php` (novo)
- `frontend/src/shared/types/generated.ts` + `typescript-transformer-manifest.json` (regenerados, D-P4)

**Interfaces:**
- *Consumes:* `Enrollment`, `Turma::assertAcademicallyWritable()` (já existe, RN-15).
- *Produces:* `PUT /api/turmas/{turma}/alunos/{enrollment}/resultado` → `EnrollmentData`.

O certificado exige `approval_status = aprobado`. Hoje nada escreve esse campo — o docblock do
`Enrollment` diz "escritas no 6d", que nunca foi entregue. Sem esta task o resto do bloco é
inalcançável por caminho de usuário.

- [ ] Escrever `tests/Feature/Operation/EnrollmentResultTest.php` com 6 casos, **antes** do código:
      1. admin lança `grades` + `attendance_pct` + `approval_status=aprobado` → 200, persistido;
      2. turma `concluida` → 422 com a mensagem de RN-15;
      3. `attendance_pct` fora de 0..100 → 422;
      4. `approval_status` fora do enum → 422;
      5. `enrollment` de outra turma → 404 (prova do `scopeBindings`);
      6. sem `operation.enrollment.manage` → 403.
- [ ] `EnrollmentResultData`:

```php
#[TypeScript]
class EnrollmentResultData extends Data
{
    public function __construct(
        public ?array $grades,
        public ?string $attendance_pct,
        public EnrollmentApprovalStatus $approval_status,
    ) {}

    public static function rules(): array
    {
        return [
            'grades' => ['nullable', 'array'],
            'attendance_pct' => ['nullable', 'numeric', 'between:0,100'],
            'approval_status' => ['required', Rule::enum(EnrollmentApprovalStatus::class)],
        ];
    }
}
```

- [ ] `RecordEnrollmentResultAction::execute(Enrollment $e, EnrollmentResultData $data): Enrollment`
      dentro de `DB::transaction`, começando por `$e->turma->assertAcademicallyWritable();` e
      terminando em `$e->fill([...])->save()` + `return $e->refresh()`.
- [ ] Controller: método `result(EnrollmentResultData $data, Turma $turma, Enrollment $enrollment,
      RecordEnrollmentResultAction $action): EnrollmentData` e `'result'` somado ao
      `only: [...]` do middleware `permission:operation.enrollment.manage`.
- [ ] Rota, com `->scopeBindings()` (2 bindings — exigência do `NestedRouteOwnershipTest`):

```php
Route::put('turmas/{turma}/alunos/{enrollment}/resultado', [EnrollmentController::class, 'result'])
    ->scopeBindings();
```

- [ ] `docker compose exec -T app php artisan typescript:transform`
- [ ] `docker compose exec -T app php artisan test --filter=EnrollmentResultTest`
      → esperado: `Tests:  6 passed`
- [ ] `cd backend && ./vendor/bin/pint app/Domains/Operation/Data/EnrollmentResultData.php app/Domains/Operation/Actions/RecordEnrollmentResultAction.php app/Domains/Operation/Http/Controllers/EnrollmentController.php tests/Feature/Operation/EnrollmentResultTest.php`
- [ ] Suíte cheia → `384 passed`.

**DoD:** um `PUT` com `approval_status=aprobado` numa turma em andamento persiste o resultado e a
mesma chamada na turma concluída devolve 422 citando RN-15. **Placar 378 → 384.**

---

## Task 2 — Schema, models e matriz de domínios

**Executor:** codex
**Files:**
- `backend/database/migrations/2026_08_05_100000_certificates.php` (novo)
- `backend/app/Domains/Certification/Enums/CertificateStatus.php` (novo)
- `backend/app/Domains/Certification/Models/Certificate.php` (novo)
- `backend/app/Domains/Certification/Models/CertificateSequence.php` (novo)
- `backend/app/Providers/AppServiceProvider.php` (editar)
- `backend/tests/Feature/Shared/DomainDependencyTest.php` (editar — matriz)
- `backend/tests/Feature/Certification/CertificateSchemaTest.php` (novo)

**Interfaces:**
- *Produces:* tabelas `certificates` e `certificate_sequences`; `Certificate` (Auditable,
  **sem** SoftDeletes — revogação é status, não delete); alias morph `certificate`.

- [ ] Migration. A coluna gerada vem **por último** no Blueprint e o índice único é nomeado:

```php
Schema::create('certificates', function (Blueprint $table) {
    $table->id();
    $table->uuid('uuid')->unique();
    $table->foreignId('enrollment_id')->constrained()->restrictOnDelete();
    $table->foreignId('course_id')->constrained()->restrictOnDelete();
    $table->foreignId('redator_id')->constrained('redatores')->restrictOnDelete();
    $table->string('codigo')->unique();
    $table->json('snapshot');
    $table->date('valido_ate')->nullable();
    $table->enum('status', ['emitido', 'revocado'])->default('emitido');
    $table->timestamp('revoked_at')->nullable();
    $table->string('revocation_reason')->nullable();
    $table->timestamps();

    // Um certificado VIGENTE por matrícula (D8). Revogado sai do índice, então
    // reemitir depois de revogar é permitido — que é o comportamento pedido.
    $table->unsignedBigInteger('active_enrollment_id')
        ->nullable()
        ->storedAs("case when status = 'emitido' then enrollment_id else null end");
    $table->unique('active_enrollment_id', 'certificates_active_enrollment_unique');
});

Schema::create('certificate_sequences', function (Blueprint $table) {
    $table->id();
    $table->unsignedSmallInteger('year')->unique();
    $table->unsignedInteger('last_seq');
    $table->timestamps();
});
```

- [ ] Confirmar o nome real da tabela de redatores antes de gravar o `constrained(...)`:
      `docker compose exec -T app php artisan tinker --execute="echo (new App\Domains\Identity\Models\Redator)->getTable();"`
      → use a saída literal no `constrained()`.
- [ ] `CertificateStatus: string { case Emitido = 'emitido'; case Revocado = 'revocado'; }`.
- [ ] `Certificate`: `implements AuditableContract`, `use Auditable`, **sem** `SoftDeletes`;
      `$fillable = ['uuid','enrollment_id','course_id','redator_id','codigo','snapshot','valido_ate','status','revoked_at','revocation_reason']`;
      `$auditInclude` igual; casts `snapshot => 'array'`, `valido_ate => 'date'`,
      `revoked_at => 'datetime'`, `status => CertificateStatus::class`; relações
      `enrollment()`, `course()`, `redator()` — todas `->withTrashed()` (a projeção atravessa
      arquivamento, `.claude/rules/backend-ddd.md`).
- [ ] `CertificateSequence`: `$fillable = ['year','last_seq']`, sem Auditable (contador técnico,
      não fato de negócio).
- [ ] `AppServiceProvider`: `'certificate' => Certificate::class` no `enforceMorphMap`.
- [ ] `DomainDependencyTest::ALLOWED['Certification']` recebe as **7** arestas (ordem alfabética),
      com comentário citando D-P2 deste plano:

```php
'Certification' => [
    'Catalog\Models\Course',
    'Catalog\Models\CourseCertificateTemplate',
    'Identity\Models\Redator',
    'Operation\Enums\EnrollmentApprovalStatus',
    'Operation\Enums\TurmaStatus',
    'Operation\Models\Enrollment',
    'Operation\Models\Turma',
],
```

- [ ] `CertificateSchemaTest` com 3 casos:
      1. dois `Certificate` `emitido` para a mesma `enrollment_id` → `QueryException`;
      2. revogar o primeiro (`status = revocado`) e criar o segundo → passa;
      3. `Relation::getMorphedModel('certificate')` devolve `Certificate::class`.
- [ ] `docker compose exec -T app php artisan test --filter=CertificateSchemaTest`
      → `Tests:  3 passed`
- [ ] **MySQL real** (lição 15): `docker compose exec -T app php artisan migrate:fresh --seed`
      → termina sem erro, com `certificates` e `certificate_sequences` na saída.
- [ ] `docker compose exec -T app php artisan test --filter=DomainDependencyTest` → `3 passed`.
- [ ] Pint nos arquivos novos/editados.

**DoD:** o banco — não o PHP — recusa o segundo certificado vigente da mesma matrícula, e aceita a
reemissão depois da revogação. **Placar 384 → 387.**

---

## Task 3 — `CertificateNumberService`

**Executor:** codex
**Files:**
- `backend/app/Domains/Certification/Services/CertificateNumberService.php` (novo)
- `backend/tests/Feature/Certification/CertificateNumberTest.php` (novo)

**Interfaces:**
- *Consumes:* tabela `certificate_sequences`.
- *Produces:* `next(int $year): string` → `LOT-2026-1000`, `LOT-2026-1001`, …

Formato decidido pelo João: 4 dígitos começando em 1000, com a turma referenciada **no snapshot**,
não no código.

- [ ] Teste primeiro, 3 casos:
      1. primeira chamada do ano → `LOT-2026-1000`; segunda → `LOT-2026-1001`;
      2. ano diferente reinicia em 1000 e não toca a linha do outro ano;
      3. concorrência real (duas conexões MySQL, ver abaixo) → dois códigos distintos.
- [ ] Implementação. `insertOrIgnore` antes do lock, senão duas primeiras emissões do ano colidem
      no `UNIQUE(year)`:

```php
public function next(int $year): string
{
    return DB::transaction(function () use ($year) {
        DB::table('certificate_sequences')->insertOrIgnore([
            'year' => $year,
            'last_seq' => 999,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = DB::table('certificate_sequences')
            ->where('year', $year)
            ->lockForUpdate()
            ->first();

        $seq = (int) $row->last_seq + 1;

        DB::table('certificate_sequences')
            ->where('year', $year)
            ->update(['last_seq' => $seq, 'updated_at' => now()]);

        return sprintf('LOT-%d-%d', $year, $seq);
    });
}
```

- [ ] O caso 3 roda **contra MySQL**, não sqlite (`lockForUpdate` é no-op lá). No teste:
      `$this->markTestSkipped(...)` se `DB::connection()->getDriverName() !== 'mysql'`, e a
      execução de verificação é feita explicitamente:
      `docker compose exec -T app php artisan test --filter=CertificateNumberTest --env=mysql_test`
      Se não existir um `.env.mysql_test`, criá-lo copiando `.env` e trocando a conexão para o
      MySQL do compose; ele entra no commit.
- [ ] `docker compose exec -T app php artisan test --filter=CertificateNumberTest`
      → `Tests:  2 passed, 1 skipped` em sqlite; o de concorrência passa no run MySQL (D-P5).
- [ ] Pint.

**DoD:** duas emissões concorrentes contra o MySQL do compose produzem `LOT-2026-1000` e
`LOT-2026-1001` — nunca o mesmo código. **Placar 387 → 389 passed + 1 skipped (D-P5).**

---

## Task 4 — `CertificateSnapshotBuilder`

**Executor:** codex
**Files:**
- `backend/app/Domains/Certification/Services/CertificateSnapshotBuilder.php` (novo)
- `backend/tests/Feature/Certification/CertificateSnapshotTest.php` (novo)

**Interfaces:**
- *Consumes:* `Enrollment`, `Redator` (as duas já na matriz).
- *Produces:* `build(Enrollment $e, Redator $r): array` — o JSON congelado.

O snapshot é o que dá peso legal: renomear o curso depois **não** pode mudar o certificado emitido.
Ele é lido por relação (`$e->student->user->name`, `$e->turma->quote->budget->client->user->name`),
**sem importar** `Student` nem `Client` — traversal não é aresta, e importar seria aresta nova.

- [ ] Chaves exatas do array:

```php
return [
    'aluno' => ['name' => ..., 'rut' => ...],
    'curso' => ['name' => ..., 'technical_name' => ..., 'workload_hours' => ...],
    'turma' => ['id' => ..., 'start_date' => 'Y-m-d', 'end_date' => 'Y-m-d', 'modalidade' => ...],
    'cliente' => ['name' => ..., 'rut' => ...],                  // RUT exigido pela D12 (D-P7)
    'redator' => ['name' => ..., 'rut' => ...],
    'resultado' => ['approval_status' => ..., 'attendance_pct' => ...],
    'template' => ['version' => ..., 'layout_config' => [...]],  // D12 (D-P7)
    'ciudad_emision' => ...,                                     // D12 (D-P7)
    'emitido_em' => now()->toDateString(),
];
```

- [ ] Teste, 4 casos:
      1. todas as chaves presentes e preenchidas a partir dos models;
      2. renomear o curso **depois** do build não altera o array já produzido (prova de congelamento
         — persiste um `Certificate` com o snapshot, renomeia o curso, relê o certificado);
      3. datas saem como `Y-m-d`, não como objeto/ISO com hora;
      4. cliente com `user` soft-deletado ainda resolve o nome (`withTrashed` no caminho).
- [ ] `docker compose exec -T app php artisan test --filter=CertificateSnapshotTest`
      → `Tests:  4 passed`
- [ ] Pint.

**DoD:** renomear o curso depois da emissão não muda o nome impresso no certificado.
**Placar 389 → 393 passed + 1 skipped (D-P5).**

---

## Task 5 — `IssueCertificateAction` e `POST .../certificate`

**Executor:** codex
**Files:**
- `backend/app/Domains/Certification/Actions/IssueCertificateAction.php` (novo)
- `backend/app/Domains/Certification/Data/CertificateData.php` (novo)
- `backend/app/Domains/Certification/Http/Controllers/CertificateController.php` (novo)
- `backend/app/Domains/Certification/routes.php` (novo)
- `backend/tests/Feature/Certification/IssueCertificateTest.php` (novo)
- `frontend/src/shared/types/generated.ts` (regenerado)

**Interfaces:**
- *Consumes:* `CertificateNumberService`, `CertificateSnapshotBuilder`, `TurmaStatus`,
  `EnrollmentApprovalStatus`, `CourseCertificateTemplate` (vigência).
- *Produces:* `POST /api/enrollments/{enrollment}/certificate` (`certification.certificate.issue`)
  → 201 `CertificateData`.

- [ ] As **5** portas (D-P6), nesta ordem, cada uma com sua mensagem. A do template entra **depois**
      da de vigente e **antes** da do redator; sem template é **422**, nunca 201:

```php
return DB::transaction(function () use ($enrollment, $redator) {
    $turma = $enrollment->turma;

    if ($turma->status !== TurmaStatus::Concluida) {
        throw ValidationException::withMessages([
            'turma' => 'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).',
        ]);
    }

    if ($enrollment->approval_status !== EnrollmentApprovalStatus::Aprobado) {
        throw ValidationException::withMessages([
            'enrollment' => 'El alumno no fue aprobado: no se puede emitir el certificado.',
        ]);
    }

    $vigente = Certificate::where('enrollment_id', $enrollment->id)
        ->where('status', CertificateStatus::Emitido)
        ->lockForUpdate()
        ->exists();

    if ($vigente) {
        throw ValidationException::withMessages([
            'enrollment' => 'Ya existe un certificado vigente para esta matrícula.',
        ]);
    }

    if (! $turma->redatores()->whereKey($redator->id)->exists()) {
        throw ValidationException::withMessages([
            'redator_id' => 'El redactor no está designado en esta clase.',
        ]);
    }
    ...
});
```

  A porta 3 duplica o índice único de propósito: o índice garante a verdade, o `if` garante que o
  usuário receba 422 legível em vez de erro de driver.

- [ ] Vigência (decisão do João: padrão sem validade, campo existe):
      `validity_months` do template mais recente do curso; `null` → `valido_ate = null`; caso
      contrário `now()->addMonths($m)->toDateString()`.
- [ ] `uuid` = `Str::uuid()`. `codigo` = `$numbers->next((int) now()->year)`.
- [ ] `CertificateData` (`#[TypeScript]`) com `fromModel()`: `id`, `uuid`, `codigo`,
      `enrollment_id`, `course_id`, `redator_id`, `status`, `valido_ate`, `revoked_at`,
      `revocation_reason`, `snapshot` (array), `created_at`. Entrada da rota: só `redator_id`
      (`['required','integer','exists:...']`), num `IssueCertificateData` separado — o snapshot
      nunca vem do cliente.
- [ ] Controller com `HasMiddleware`:
      `new Middleware('permission:certification.certificate.issue', only: ['store'])`.
- [ ] `routes.php` do domínio (agregado por `routes/api.php` via glob):

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('enrollments/{enrollment}/certificate', [CertificateController::class, 'store']);
});
```

- [ ] Teste, 8 casos: caminho feliz (201, `codigo` `LOT-<ano>-1000`, snapshot preenchido) · turma
      em andamento → 422 · aluno reprovado → 422 · já existe vigente → 422 · redator de outra
      turma → 422 · sem permissão → 403 · template com `validity_months=12` → `valido_ate`
      preenchido · **sem template → 422** (D-P6: a porta da spec D10, não 201 com `valido_ate` null)
      · template com `validity_months` null → `valido_ate` null (o padrão do produto, RN-CER-01).
- [ ] `docker compose exec -T app php artisan typescript:transform` (commit junto, lição 11).
- [ ] `docker compose exec -T app php artisan test --filter=IssueCertificateTest`
      → `Tests:  8 passed`
- [ ] **MySQL real:** repetir o filtro no run MySQL — a prova de unicidade depende do índice na
      coluna gerada.
- [ ] Pint.

**DoD:** emitir duas vezes para a mesma matrícula devolve 422 com mensagem legível; emitir numa
turma em andamento devolve 422 citando RN-08, e emitir sem template do curso também devolve 422
(D-P6). **Placar: parte de 393 e sobe pelo número real de casos; D-P6 e D-P7 acrescentam casos que
o plano original não contava, então os alvos das tasks seguintes são reconciliados pelo número
medido, não pelo número escrito antes.**

---

## Task 6 — Leitura, `issuable` e revogação

**Executor:** codex
**Files:**
- `backend/app/Domains/Certification/Actions/RevokeCertificateAction.php` (novo)
- `backend/app/Domains/Certification/Data/IssuableTurmaData.php` (novo)
- `backend/app/Domains/Certification/Http/Controllers/CertificateController.php` (editar)
- `backend/app/Domains/Certification/routes.php` (editar)
- `backend/tests/Feature/Certification/CertificateListingTest.php` (novo)
- `backend/tests/Feature/Certification/RevokeCertificateTest.php` (novo)
- `frontend/src/shared/types/generated.ts` (regenerado)

**Interfaces:**
- *Produces:* `GET /api/certificates`, `GET /api/certificates/{certificate}`,
  `GET /api/certificates/issuable` (todas `certification.certificate.view`, exceto `issuable`
  que exige `...issue`), `POST /api/certificates/{certificate}/revoke`
  (`certification.certificate.revoke`).

- [ ] `IssuableTurmaData`: `turma_id`, `course_name`, `client_name`, `end_date`,
      `enrollments: IssuableEnrollmentData[]` (`enrollment_id`, `student_name`, `student_rut`),
      `redatores: IssuableRedatorData[]` (`redator_id`, `name`). Query: turmas `concluida`, com
      matrículas `aprobado`, excluindo as que já têm vigente — filtrado **do lado de Certification**
      (`Certificate::where('status','emitido')->pluck('enrollment_id')` + `whereNotIn`), porque uma
      relação `Enrollment->certificate` seria aresta Operation → Certification, que não existe.
- [ ] `RevokeCertificateAction::execute(Certificate $c, string $reason): Certificate` — 422 se já
      revogado; senão `status = revocado`, `revoked_at = now()`, `revocation_reason = $reason`.
      Nunca deleta: revogação é fato auditável.
- [ ] Rotas (uma binding cada — nenhuma precisa de `scopeBindings`):

```php
Route::get('certificates', [CertificateController::class, 'index']);
Route::get('certificates/issuable', [CertificateController::class, 'issuable']);
Route::get('certificates/{certificate}', [CertificateController::class, 'show']);
Route::post('certificates/{certificate}/revoke', [CertificateController::class, 'revoke']);
```

  `issuable` vem **antes** de `{certificate}`, senão casa como id.
- [ ] `CertificateListingTest`, 4 casos: index lista os dois certificados e ordena por
      `created_at desc` · show devolve o snapshot · `issuable` traz só turma concluída com aluno
      aprovado e sem vigente · `issuable` sem `certificate.issue` → 403.
- [ ] `RevokeCertificateTest`, 4 casos: superadmin revoga → 200, `status=revocado` e
      `revoked_at` preenchido · admin → 403 (a permissão é exclusiva do superadmin, conforme
      `RolePermissionSeeder`) · revogar duas vezes → 422 · a revogação gera registro de auditoria
      (`$certificate->audits()->count()` cresce).
- [ ] `typescript:transform` + commit do `generated.ts`.
- [ ] `docker compose exec -T app php artisan test --filter=Certification`
      → soma dos filtros: `Tests:  8 passed` nesta task.
- [ ] Pint.

**DoD:** `GET /api/certificates/issuable` esconde a matrícula assim que ela recebe certificado, e
volta a mostrá-la depois de revogado; admin comum recebe 403 ao tentar revogar.
**Placar 401 → 409 passed + 1 skipped (D-P5).**

---

## Task 7 — PDF com QR

**Executor:** codex
**Files:**
- `backend/config/app.php` (editar — `frontend_url`)
- `backend/resources/views/certification/certificate.blade.php` (novo)
- `backend/app/Domains/Certification/Services/CertificatePdfService.php` (novo)
- `backend/app/Domains/Certification/Http/Controllers/CertificateController.php` (editar)
- `backend/app/Domains/Certification/routes.php` (editar)
- `backend/tests/Feature/Certification/CertificatePdfTest.php` (novo)

**Interfaces:**
- *Consumes:* Gotenberg (`config('services.gotenberg.url')`), `simple-qrcode`.
- *Produces:* `GET /api/certificates/{certificate}/pdf` → `application/pdf`.

- [ ] `config/app.php`: `'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),`
      e `FRONTEND_URL=http://localhost:5173` em `.env.example` (D-P3).
- [ ] Blade lê **só** `$certificate->snapshot` e `codigo`/`uuid`/`valido_ate` — nunca as relações
      vivas, senão o congelamento da Task 4 vaza. Espaço de assinatura fica reservado no layout
      com o nome do redator; a imagem de assinatura é fora de escopo (decisão do João).
- [ ] QR inline como SVG (sem asset externo — o Gotenberg recebe só o HTML):

```php
$url = rtrim(config('app.frontend_url'), '/')."/validar/{$certificate->uuid}";
$qr = base64_encode(QrCode::format('svg')->size(180)->margin(0)->generate($url));
// no Blade: <img src="data:image/svg+xml;base64,{{ $qr }}" alt="QR">
```

- [ ] `CertificatePdfService::render(Certificate $c): string` espelhando `ManualPdfService`:
      `Http::attach('files', $html, 'index.html')->post(...'/forms/chromium/convert/html')`, e
      `RuntimeException` com o status HTTP quando `failed()`.
- [ ] Controller `pdf()` devolve `response($pdf, 200, ['Content-Type' => 'application/pdf',
      'Content-Disposition' => "inline; filename=\"certificado-{$c->codigo}.pdf\""])`, sob
      `permission:certification.certificate.view`.
- [ ] Teste, 5 casos, com o fake do `ManualTurmaTest` (`Http::preventStrayRequests()` +
      `Http::fake([...=> Http::response('%PDF-fake')])`): 200 `application/pdf` · o HTML enviado
      contém o `codigo` e o nome do aluno **do snapshot** · o HTML contém a URL
      `/validar/{uuid}` · Gotenberg 500 → a rota falha com erro (não devolve PDF vazio) ·
      sem permissão → 403.
- [ ] `docker compose exec -T app php artisan test --filter=CertificatePdfTest` → `5 passed`.
- [ ] Pint.

**DoD:** o HTML enviado ao Gotenberg carrega o código do certificado e um QR cujo conteúdo é
`<frontend_url>/validar/<uuid>` — provado por `Http::assertSent`. **Placar 409 → 414 passed + 1 skipped (D-P5).**

---

## Task 8 — Rota pública de validação

**Executor:** codex
**Files:**
- `backend/app/Domains/Certification/Data/PublicCertificateData.php` (novo)
- `backend/app/Domains/Certification/Http/Controllers/PublicCertificateController.php` (novo)
- `backend/app/Domains/Certification/routes.php` (editar)
- `backend/tests/Feature/Certification/PublicCertificateTest.php` (novo)
- `frontend/src/shared/types/generated.ts` (regenerado)

**Interfaces:**
- *Produces:* `GET /api/publico/certificados/{uuid}` — **fora** do grupo `auth:sanctum`.

- [ ] `PublicCertificateData`: `codigo`, `status`, `valido_ate`, `revoked_at`, e do snapshot
      apenas `aluno.name`, `curso.name`, `curso.workload_hours`, `turma.end_date`, `cliente.name`,
      `redator.name`. Sem RUT, sem ids internos, sem notas — a página é pública.
- [ ] Rota por `uuid` (não por id) e sem model binding implícito: `firstWhere('uuid', $uuid)` +
      `abort(404)` — id sequencial exposto permitiria enumerar certificados.
- [ ] Teste, 4 casos: uuid válido → 200 com o payload público · uuid inexistente → 404 ·
      certificado revogado → 200 com `status=revocado` e `revoked_at` (a página informa, não
      esconde) · resposta **não** contém `rut` nem `grades` (assertJsonMissingPath).
- [ ] `typescript:transform` + commit do `generated.ts`.
- [ ] Prova e2e sem sessão (lição 12 — headers obrigatórios):

```bash
curl -s -i http://localhost:8080/api/publico/certificados/<uuid> -H 'Accept: application/json'
```
      → esperado `HTTP/1.1 200` e o JSON público, **sem** cookie nenhum na requisição.
- [ ] `docker compose exec -T app php artisan test --filter=PublicCertificateTest` → `4 passed`.
- [ ] Pint.

**DoD:** um `curl` sem cookie e sem CSRF devolve 200 e o payload público; o mesmo payload não
carrega RUT nem notas. **Placar 414 → 418 passed + 1 skipped** (backend fechado, D-P5).

---

## Task 9 — Página pública `/validar/:uuid`

**Executor:** claude
**Files:**
- `frontend/src/app/App.tsx` (editar)
- `frontend/src/app/router/AppRouter.tsx` (editar)
- `frontend/src/features/certification/api/certificatesApi.ts` (novo)
- `frontend/src/features/certification/components/Validation/ValidationPage.tsx` (novo)
- `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (editar)

Hoje `SessionBootstrap` envolve o router: sem sessão, nada renderiza. A rota pública precisa
renderizar **sem** sessão (D19), então o bootstrap desce para dentro do router e passa a envolver
só o ramo autenticado.

- [ ] `App.tsx`: `AppProviders > AppRouter` (o `SessionBootstrap` sai daqui).
- [ ] `AppRouter.tsx`: `/validar/:uuid` fica fora, irmã do ramo que `SessionBootstrap` envolve.
- [ ] `certificatesApi.ts`: `usePublicCertificate(uuid)` — `useQuery` para
      `/api/publico/certificados/${uuid}`, `retry: false` (404 não se re-tenta).
- [ ] `ValidationPage`: três estados visuais — carregando · **válido** (verde, dados do
      certificado, `valido_ate` quando existir) · **inválido** (404 ou `status=revocado`, com a
      data da revogação). Layout autônomo: sem shell, sem menu, legível em celular (é o destino
      do QR).
- [ ] Seção `certification` nas **três** locales, em paridade de chaves.
- [ ] `pnpm build` → `tsc -b` sem erro. `pnpm lint` → 0 problemas.

**DoD:** abrir `/validar/<uuid>` numa janela anônima mostra o certificado sem redirecionar para
login; um uuid inexistente mostra a tela de inválido, não uma tela de erro genérica.

---

## Task 10 — Histórico em `/certificados`

**Executor:** claude
**Files:**
- `frontend/src/features/certification/api/certificatesApi.ts` (editar)
- `frontend/src/features/certification/components/CertificatesPage.tsx` (novo)
- `frontend/src/features/certification/components/CertificatesTable.tsx` (novo)
- `frontend/src/app/router/AppRouter.tsx` (editar — troca o `ModulePlaceholder`)
- `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (editar)

- [ ] `useCertificates()` e `useCertificate(id)` (`certificateKeys.all/list/detail`, idioma de
      `useTurmas.ts`).
- [ ] `CertificatesPage` monta `SearchableTableFrame`; `CertificatesTable` mostra código, aluno
      (do snapshot), curso, data de emissão, status (tag verde/vermelha), validade.
- [ ] Nada de `createCrudResource`/`useCrudForm` — o certificado não é CRUD (spec §3).
- [ ] PrimeReact só via `shared/ui`; nenhum import de `features/operation` (lei §5.6).
- [ ] `pnpm build` + `pnpm lint` limpos.

**DoD:** `/certificados` lista os certificados reais da API com filtro de busca funcionando, e o
certificado revogado aparece marcado como revogado.

---

## Task 11 — Emissão, revogação e download

**Executor:** claude
**Files:**
- `frontend/src/shared/api/problemFromBlob.ts` (novo)
- `frontend/src/features/operation/api/useTurmas.ts` (editar — passa a importar o helper)
- `frontend/src/features/certification/api/certificatesApi.ts` (editar)
- `frontend/src/features/certification/components/IssueCertificateDialog.tsx` (novo)
- `frontend/src/features/certification/components/CertificatesTable.tsx` (editar)
- `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (editar)

- [ ] Extrair `problemFromBlob` (hoje privado em `useTurmas.ts`) para `shared/api/problemFromBlob.ts`,
      preservando o docblock, e reapontar `useTurmaManual`. Copiar seria duplicação; importar de
      `operation` seria quebra da lei §5.6.
- [ ] `useIssuableTurmas()`, `useIssueCertificate()`, `useRevokeCertificate()`,
      `useCertificatePdf()` (blob + `problemFromBlob`, idioma do `useTurmaManual`).
- [ ] `IssueCertificateDialog`: escolhe turma → aluno(s) aprovados → **redator**. O seletor de
      redator é obrigatório e só aparece com os redatores daquela turma (decisão do João: 1 redator
      por vez é o normal, mas com troca durante o curso o admin escolhe a assinatura).
- [ ] Ação de revogar pede motivo (obrigatório) e só aparece para quem tem
      `certification.certificate.revoke`.
- [ ] Ação de baixar PDF abre o blob em nova aba.
- [ ] Erros 422 do backend aparecem na UI pelo caminho RFC 7807 já existente — nenhuma mensagem
      de negócio duplicada no cliente.
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` → `35 passed` (o helper extraído não muda contagem;
      se `postMultipart.test.ts` quebrar, o import está errado).

**DoD:** emitir pelo diálogo cria o certificado e ele aparece na tabela sem reload; tentar emitir
para uma matrícula que já tem vigente mostra a mensagem do servidor, não um erro genérico.

---

## Task 12 — Lançar resultado na tela da turma

**Executor:** claude
**Files:**
- `frontend/src/features/operation/api/useEnrollments.ts` (editar)
- `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx` (editar)
- `frontend/src/features/operation/components/Enrollment/EnrollmentResultDialog.tsx` (novo)
- `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (editar)

- [ ] `useRecordEnrollmentResult()` — `PUT /api/turmas/${turmaId}/alunos/${enrollmentId}/resultado`,
      invalidando `enrollmentKeys.list(turmaId)` e `turmaKeys.all`.
- [ ] Coluna de resultado na tabela (status + presença) e ação que abre o diálogo.
- [ ] O diálogo fica desabilitado quando a turma está `concluida`, com o motivo visível (RN-15) —
      o 422 do servidor continua sendo a garantia; a UI só evita o clique inútil.
- [ ] `pnpm build` + `pnpm lint` limpos.

**DoD:** lançar `aprobado` numa turma em andamento faz a matrícula aparecer no diálogo de emissão
depois que a turma é concluída — o ciclo fecha sem tocar no banco à mão.

---

## Task 13 — Checkpoint visual (João)

**Executor:** joao — **não delegável**

Roteiro, na ordem:

1. Turma em andamento → lançar resultado `aprobado` para um aluno.
2. Concluir a turma.
3. `/certificados` → emitir, escolhendo o redator.
4. Baixar o PDF; conferir o QR.
5. Ler o QR com o celular → abre `/validar/<uuid>` e mostra válido.
6. Revogar (superadmin) → recarregar a página pública → mostra revogado.

**DoD:** o João confirma o roteiro completo. Ajuste visual pedido aqui volta como edição nas
tasks 9–12, não como task nova.

---

## Task 14 — Gate do bloco

**Executor:** claude

- [ ] **Item 0 (spec §5):** as 8 invariantes comportamentais da spec estão provadas por teste
      nomeado. Listar o teste de cada uma; invariante sem teste reprova o gate.
- [ ] `docker compose exec -T app php artisan test` → `Tests:  418 passed, 1 skipped` (D-P5)
- [ ] `cd frontend && pnpm test` → `Tests  35 passed`; `pnpm build`; `pnpm lint`
- [ ] `docker compose exec -T app php artisan test --filter=DomainDependencyTest` → 3 passed, com
      as **7** arestas declaradas — nenhuma a mais (D-P2).
- [ ] `docker compose exec -T app php artisan migrate:fresh --seed` no MySQL sem erro.
- [ ] `git status` limpo; `generated.ts` commitado junto do Data que o originou.
- [ ] Atualizar `docs/superpowers/progress.md` com o resultado do bloco.

**DoD:** os placares acima batem literalmente e as 8 invariantes têm teste nomeado.

---

## Handoff de execução

`executor: misto` — atribuição do João: **backend → Codex, frontend → Claude.**

| Task | Executor | Por quê |
| --- | --- | --- |
| 0 | claude | baseline e branch |
| 1–8 | codex | mecânicas, verificação executável, paths fechados |
| 9–12 | claude | frontend (atribuição do João); 9 e 11 ainda tocam lei §5.6 e composição do router |
| 13 | joao | checkpoint visual |
| 14 | claude | gate |

**`paths_autorizados` do Codex (tasks 1–8):**

```
backend/app/Domains/Certification/**
backend/app/Domains/Operation/Data/EnrollmentResultData.php
backend/app/Domains/Operation/Actions/RecordEnrollmentResultAction.php
backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php
backend/app/Domains/Operation/routes.php
backend/app/Providers/AppServiceProvider.php
backend/config/app.php
backend/database/migrations/2026_08_05_100000_certificates.php
backend/resources/views/certification/**
backend/tests/Feature/Certification/**
backend/tests/Feature/Operation/EnrollmentResultTest.php
backend/tests/Feature/Shared/DomainDependencyTest.php
backend/.env.example
frontend/src/shared/types/generated.ts
frontend/src/shared/types/typescript-transformer-manifest.json
```

Fora desta lista o Codex **para e reporta** — em especial: nada de `frontend/src/features/**`,
nada de `frontend/src/app/**`, nada em `docs/`.

# Bloco 52 — Recepção e upload de arquivo — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** quem cria um upload declara só o tipo do arquivo e o dono dele. Validação, ordem
storage ↔ transação, compensação e nome do campo no 422 deixam de depender de memória.

**Architecture:** cada forma de upload ganha um Data de entrada (sem `#[TypeScript]`, como o
`PageRequest`), e o enum do domínio escolhe a regra pelo contrato `TipoDeArquivo`. Um módulo
`FileUploader`, com uma entrada só (`store`), sobe os binários fora da transação, roda a escrita do
dono dentro dela e descarta tudo se falhar. Os primitivos do antigo `UploadFileAction` viram o
`FileStorage`, que só o módulo, a carga inicial e o `SignedUrlTransformer` enxergam. Catracas
estáticas reprovam a volta do padrão antigo.

**Tech Stack:** Laravel 13, spatie/laravel-data ^4.23 (`rules(ValidationContext)`), PHPUnit,
`Storage::fake`, `FakeMalwareScanner` (`$escaneados`).

**Spec:** `docs/superpowers/blocos/52-backend-arquivo-recepcao-e-upload/spec.md`

## Global Constraints

- Política de arquivo (`ContentClass`) não muda: extensões, MIME, tetos, `bail`, largura antes do
  antivírus, antivírus por último.
- Teto agregado (`ContentClass::TETO_AGREGADO_KB`) antes das regras por arquivo no cadastro do redator.
- Binário nunca dentro de transação; insert em `files` sempre dentro; soft delete do anterior do mesmo
  tipo dentro da mesma transação.
- `getMimeType()` na coluna `mime`; `putFile()`/`store()` que devolve `false` vira `RuntimeException`.
- Descarte nunca propaga; falha loga `Log::warning`.
- Locks de dono preservados: `Redator::lockForWrite`, `Turma::lockForWrite`,
  `CertificateSettings::query()->lockForUpdate()`.
- Cadastro do redator atômico (D2): dados + documentos, tudo ou nada.
- O contrato HTTP **não muda** neste plano: campos `photo`, `file`, `type`, `valid_until`,
  `documents[<TIPO>]` e rotas ficam. O front não é tocado, e o `generated.ts` **não muda**. O enum
  novo `QuoteDocumentType` leva `#[Hidden]`, como o `ContentClass`: é contrato de entrada do
  backend, e o front já manda o literal. Isso mantém o bloco disjunto da lane 50, que regenera o
  `generated.ts` (`lane.sh conferir`).
- Nenhum Repository, FormRequest, Policy nem `abort(422)`. Recusa sempre 422 RFC 7807, nunca 500.
- Frase ao usuário só em `lang/{es_CL,pt_BR,en}`, nos três.
- Comandos de backend no container: `docker compose exec -T app php artisan test --filter=<X>`.
  Pint no host, de `backend/`, sempre com argumento.
- Sonda de catraca: cópia do arquivo no scratchpad e restauração por `cp`. **Nunca `git stash`.**

## Review Focus

1. `type` inválido junto com um arquivo: 422 no `type`, e o ClamAV **não** recebe bytes
   (`$escaneados` vazio). Teste na Task 1 (regras) e na Task 3 (feature).
2. `documents` malformado (não-mapa, chave fora do enum, `documents[CV][]`): 422 com a chave de hoje,
   nunca 500. Teste na Task 8.
3. Soma dos documentos acima do teto agregado: 422 `shared.file.set_too_large`, e nenhum arquivo
   escaneado. Teste na Task 8.
4. Não-redator no `POST /api/profile/documents` com payload inválido: 403, não 422. Teste na Task 7.
5. Falha no `put` do segundo arquivo: o primeiro, já gravado, é descartado. Teste na Task 2.

---

### Task 1: Contrato `TipoDeArquivo` e as regras de anexo tipado

**Files:**
- Create: `backend/app/Shared/Files/TipoDeArquivo.php`
- Create: `backend/app/Shared/Files/Data/TypedFileRules.php`
- Create: `backend/app/Domains/Commercial/Enums/QuoteDocumentType.php`
- Modify: `backend/app/Domains/Identity/Enums/RedatorDocumentType.php` (implements)
- Modify: `backend/app/Domains/Commercial/Enums/BudgetDocumentType.php`
- Modify: `backend/app/Domains/Operation/Enums/TurmaDocumentType.php`
- Modify: `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php` (`'TypedFileRules::for('` entra
  em `REFERENCIAS_DE_POLITICA`, com o comentário de que a fonte segue sendo o `ContentClass`; sem
  isso, os Data das Tasks 3, 4 e 7 reprovam a catraca)
- Test: `backend/tests/Unit/Shared/TypedFileRulesTest.php`

**Interfaces:**
- Produces:
  - `interface App\Shared\Files\TipoDeArquivo { public function conteudo(): ContentClass; public function aceitaValidade(): bool; }`
  - `App\Shared\Files\Data\TypedFileRules::for(array $payload, class-string<\BackedEnum&TipoDeArquivo> $enum, ?array $permitidos = null, bool $comValidade = false): array<string, list<mixed>>`
    — devolve as regras de `type`, `file` e, com `$comValidade`, `valid_until`.
  - `#[Hidden] enum App\Domains\Commercial\Enums\QuoteDocumentType: string implements TipoDeArquivo { case QUOTE_DOCUMENT = 'quote_document'; }` (`Spatie\TypeScriptTransformer\Attributes\Hidden`)

- [ ] **Step 1: Write the failing test** `TypedFileRulesTest`:
  - `test_tipo_valido_pede_a_classe_do_enum`: `TypedFileRules::for(['type' => 'purchase_order'], BudgetDocumentType::class)['file']` é igual a `ContentClass::Documento->regras()` (compare com `assertEquals`, porque `ScannedForMalware` é objeto).
  - `test_tipo_invalido_nao_pede_regra_de_conteudo`: com `['type' => 'xxx']`, o `file` é `['required']` e não contém instância de `ScannedForMalware`.
  - `test_type_fora_dos_permitidos_reprova`: com `$permitidos = RedatorDocumentType::selfServiceValues()` e um tipo fora deles, `Validator::make($payload, $regras)->fails()` é `true` só no `type`.
  - `test_validade_aceita_e_proibida`: `RedatorDocumentType` que aceita validade dá `['nullable', 'date']`; o que não aceita dá `['prohibited']`.
  - `test_mapa_dos_enums`: `BudgetDocumentType::*` → `Documento`, `QuoteDocumentType::QUOTE_DOCUMENT` → `Documento`, `TurmaDocumentType::*` → `DocumentoDeTurma`, os três com `aceitaValidade() === false`.
- [ ] **Step 2:** `docker compose exec -T app php artisan test --filter=TypedFileRulesTest`. Expected: FAIL (classe inexistente).
- [ ] **Step 3: Implement.** A regra de `type` é `['required', new Enum($enum)]`, ou `Rule::in($permitidos)` quando informado. O `file` só recebe `->conteudo()->regras()` quando `$enum::tryFrom($payload['type'] ?? null)` resolve **e** está nos permitidos. Senão, fica `['required']`: tipo inválido nunca manda bytes ao ClamAV. `valid_until` só entra com `$comValidade`. Os três enums implementam o contrato; `RedatorDocumentType` já tem os métodos.
- [ ] **Step 4:** rode o filtro; Expected: PASS. Rode `docker compose exec -T app php artisan typescript:transform` e confira que o `generated.ts` sai **sem diff** (`git diff --exit-code frontend/src/shared/types/generated.ts`); se aparecer diff, o `#[Hidden]` faltou, e o arquivo regenerado não entra no commit.
- [ ] **Step 5: Commit** `refactor(52): contrato TipoDeArquivo e regras de anexo tipado`.

### Task 2: Módulo `FileUploader` e os primitivos em `FileStorage`

**Files:**
- Create (por `git mv` de `backend/app/Shared/Files/Actions/UploadFileAction.php`): `backend/app/Shared/Files/Services/FileStorage.php`
- Create: `backend/app/Shared/Files/Services/FileUploader.php`
- Create: `backend/app/Shared/Files/Services/StoredFiles.php`
- Modify (só o `use`/o tipo, comportamento igual): os seis callers (`ReplaceFileOfTypeAction`, `StoreTurmaDocumentAction`, `StoreRedatorDocumentAction`, `CreateRedatorAction`, `UpdateRedatorAction`, `StoreManagerSignatureAction`), `CarregarCargaInicial.php`, `CarregadorDeCadastros.php`, `SignedUrlTransformer.php`, docblocks que citam `UploadFileAction`
- Modify: `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php` (o path do isento renomeado
  para `FileStorage.php`, e `FileUploader.php` isento com o motivo: escrita no disco, recebe o arquivo
  já validado pelo Data do sítio)
- Modify: `backend/tests/Feature/Shared/ParentLockOnChildWriteTest.php`
- Move: `backend/tests/Feature/Cadastros/UploadFileActionTest.php` → `backend/tests/Feature/Shared/FileStorageTest.php`
- Test: `backend/tests/Feature/Shared/FileUploaderTest.php`
- Modify: `docs/estrutura-monolito.md` (linha de `Shared/Files/Services`)

**Interfaces:**
- Produces:
  - `FileStorage`: os mesmos `metadataOf`, `put`, `putTo`, `register`, `discard` e o estático `publicDiskFor` do `UploadFileAction`, sem mudança de assinatura.
  - `FileUploader::store(array $files, Model|string $destination, Closure $write): mixed`
    — `$files` é `array<string, UploadedFile>` com chave escolhida pelo caller; `$destination` é o dono (diretório `<morph>/<id>`) ou um diretório explícito; `$write` recebe `StoredFiles` e roda dentro de `DB::transaction`; devolve o retorno de `$write`.
  - `StoredFiles::path(string $key): string`
  - `StoredFiles::register(Model $owner, string $key, string $type, ?CarbonInterface $validUntil = null): File`
  - `StoredFiles::replace(Model $owner, string $key, string $type, ?CarbonInterface $validUntil = null): File` — soft-deleta `$owner->morphMany(File::class, 'fileable')->where('type', $type)` um a um e registra.

- [ ] **Step 1: Write the failing test** `FileUploaderTest` (`Storage::fake(config('filesystems.default'))`, dono = um `Budget` de factory):
  - `test_grava_e_registra`: `store(['file' => $pdf], $budget, fn (StoredFiles $s) => $s->register($budget, 'file', 'invoice'))` devolve `File` com `path` existente no disco e `mime` `application/pdf`.
  - `test_falha_na_escrita_descarta_e_relanca`: a closure lança `RuntimeException('x')`; `expectException`; depois o disco não tem nenhum arquivo em `budget/{id}` e `File::count()` não mudou.
  - `test_falha_com_varios_descarta_todos`: dois arquivos, closure registra o primeiro e lança; os dois paths somem.
  - `test_falha_no_segundo_put_descarta_o_primeiro` (Review Focus 5): disco mockado com `Storage::shouldReceive`, ou um `UploadedFile` cujo `putFile` devolve `false` no segundo; o primeiro path some e a exceção é `RuntimeException`.
  - `test_replace_soft_deleta_o_anterior_do_tipo`: dois `store` seguidos com `replace` do mesmo tipo; um `File` vivo e um com `deleted_at`, os dois na tabela.
  - `test_destino_diretorio`: `store([...], 'redator', ...)` grava sob `redator/`.
- [ ] **Step 2:** `--filter=FileUploaderTest`. Expected: FAIL.
- [ ] **Step 3: Implement.** `git mv` do `UploadFileAction` para `FileStorage` (o namespace muda, o corpo não), e atualize os `use`. `FileUploader` injeta `FileStorage`. Ele lê `metadataOf` de todos os arquivos, faz `put`/`putTo` um a um acumulando os paths, abre `DB::transaction(fn () => $write($stored))` e, no `catch (Throwable)`, chama `discard` em cada path acumulado e relança. `StoredFiles` é imutável e guarda `key => [path, meta]`. O docblock do `FileUploader` carrega as regras do antigo docblock do `UploadFileAction` (binário fora, insert dentro).
- [ ] **Step 4: Catraca de lock.** No `ParentLockOnChildWriteTest::test_quem_toma_lock_chama_lockforwrite_dentro_de_transacao`, troque a exigência `str_contains($codigo, 'DB::transaction')` por: contém `DB::transaction` **ou** contém `FileUploader`. A mensagem de falha cita as duas formas. **Sonda:** copie `StoreTurmaDocumentAction.php` para o scratchpad, apague dele o `DB::transaction`, rode o filtro e veja reprovar; restaure com `cp` e veja passar.
- [ ] **Step 5:** `--filter='FileUploaderTest|FileStorageTest|ParentLockOnChildWriteTest|UploadPolicyRatchetTest|RedatorDocumentRollbackTest|CarregarCargaInicialCommandTest|CarregadorDeCadastrosTest|SignedUrlTransformerTest'`. Expected: PASS.
- [ ] **Step 6: Commit** `refactor(52): FileUploader de uma entrada e primitivos em FileStorage`.

### Task 3: Commercial — anexo de presupuesto e cotización

**Files:**
- Create: `backend/app/Domains/Commercial/Data/BudgetFileUploadData.php`
- Create: `backend/app/Domains/Commercial/Data/QuoteFileUploadData.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php`
- Modify: `backend/app/Domains/Commercial/Actions/ReplaceFileOfTypeAction.php`
- Test: `backend/tests/Feature/Comercial/CommercialFilesTest.php`

**Interfaces:**
- Consumes: `TypedFileRules::for` (Task 1), `QuoteDocumentType` (Task 1), `FileUploader::store` e `StoredFiles::replace` (Task 2).
- Produces:
  - `BudgetFileUploadData { public BudgetDocumentType $type; public UploadedFile $file; static rules(ValidationContext $context): array }`
  - `QuoteFileUploadData { public QuoteDocumentType $type; public UploadedFile $file; ... }`
  - `ReplaceFileOfTypeAction::execute(Model $owner, UploadedFile $file, TipoDeArquivo&\BackedEnum $type): File`

- [ ] **Step 1: Write the failing test** em `CommercialFilesTest`:
  - `test_tipo_invalido_nao_escaneia` (Review Focus 1): `POST /api/budgets/{id}/files` com `type=xxx` e um PDF; 422 com `errors.type`, e `app(MalwareScanner::class)->escaneados === []`.
  - `test_cotizacion_aceita_so_quote_document`: `type=invoice` na cotización dá 422 em `type`.
- [ ] **Step 2:** `--filter=CommercialFilesTest`. Expected: o primeiro FAIL (hoje o arquivo é escaneado).
- [ ] **Step 3: Implement.** Os dois controllers recebem o Data no lugar de `Request` e repassam `$data->file`/`$data->type`. O `ReplaceFileOfTypeAction` chama `FileUploader::store(['file' => $file], $owner, fn ($s) => $s->replace($owner, 'file', $type->value))` e perde o try/catch e o `use DB`.
- [ ] **Step 4:** `--filter=CommercialFilesTest`. Expected: PASS, incluindo os casos de substituição auditada que já existem.
- [ ] **Step 5: Commit** `refactor(52): anexo comercial entra por Data e sobe pelo FileUploader`.

### Task 4: Operation — documento de turma e planilha de importação

**Files:**
- Create: `backend/app/Domains/Operation/Data/TurmaDocumentUploadData.php`
- Create: `backend/app/Domains/Operation/Data/ImportSpreadsheetData.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` (só `previewImport`)
- Modify: `backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php`
- Test: `backend/tests/Feature/Operation/TurmaDocumentApiTest.php`

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces:
  - `TurmaDocumentUploadData { public TurmaDocumentType $type; public UploadedFile $file; }`
  - `ImportSpreadsheetData { public UploadedFile $file; }` com `file => ContentClass::Planilha->regras()`

- [ ] **Step 1: Write the failing test** em `TurmaDocumentApiTest`: `test_concluida_sem_permissao_recusa_antes_de_subir`. A turma concluída, o admin sem `manage_concluded_docs` e um PDF válido dão a recusa de hoje, e `Storage::disk(...)->allFiles()` fica vazio. Ele pode já passar: é o pino de que a checagem continua antes do `store`.
- [ ] **Step 2:** `--filter='TurmaDocumentApiTest|TurmaDocumentActionsTest|ImportPreview'`. Expected: verde antes de mexer (pino) — anote o número de testes.
- [ ] **Step 3: Implement.** Os controllers recebem os Data. O `previewImport` repassa `$data->file` ao `ImportPreviewService`, ainda com o 200 via `RespostaDeRecurso::ok`. O `StoreTurmaDocumentAction` mantém a checagem de concluída no topo e chama `FileUploader::store(['file' => $file], $turma, function (StoredFiles $s) use (...) { Turma::lockForWrite($turma->id); return $s->register($turma, 'file', $type->value); })`.
- [ ] **Step 4:** o mesmo filtro. Expected: PASS, com o mesmo número de testes mais o novo, e o 201 do documento.
- [ ] **Step 5: Commit** `refactor(52): documento de turma e planilha entram por Data`.

### Task 5: Certification — firma da gerente

**Files:**
- Create: `backend/app/Domains/Certification/Data/ManagerSignatureUploadData.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateSettingsController.php`
- Modify: `backend/app/Domains/Certification/Actions/StoreManagerSignatureAction.php`
- Test: `backend/tests/Feature/Certification/CertificateSignaturesTest.php`

**Interfaces:**
- Consumes: Task 2.
- Produces: `ManagerSignatureUploadData { public UploadedFile $file; }` com `file => ContentClass::Assinatura->regras()`.

- [ ] **Step 1: Write the failing test** `test_falha_na_troca_preserva_a_firma_anterior`: firma existente; force a falha da escrita (por exemplo `File::creating` lançando); 500/exceção. A firma anterior segue viva (`deleted_at` nulo) e o objeto novo não está no disco.
- [ ] **Step 2:** `--filter=CertificateSignaturesTest`. Expected: PASS ou FAIL. É pino do comportamento; anote.
- [ ] **Step 3: Implement.** `storeSignature(ManagerSignatureUploadData $data, ...)`. A Action chama `FileUploader::store(['file' => $file], $settings, fn ($s) => [lockForUpdate; $s->replace($settings, 'file', CertificateSettings::TIPO_FIRMA)])` e perde o try/catch.
- [ ] **Step 4:** `--filter='CertificateSignaturesTest|CertificateSettings'`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(52): firma da gerente entra por Data e sobe pelo FileUploader`.

### Task 6: Foto — cinco controllers e o `UserPhotoService`

**Files:**
- Create: `backend/app/Shared/Files/Data/PhotoUploadData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/{UserPhoto,RedatorPhoto,StudentPhoto,ProfilePhoto}Controller.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/ClientPhotoController.php`
- Modify: `backend/app/Domains/Identity/Services/UserPhotoService.php`
- Modify: `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php`
- Test: `backend/tests/Feature/Identity/UserPhotoTest.php`

**Interfaces:**
- Consumes: Task 2.
- Produces: `PhotoUploadData { public UploadedFile $photo; }` com `photo => ContentClass::Imagem->regras()`. Some `UserPhotoService::rules()`.

- [ ] **Step 1: Write the failing test** em `UserPhotoTest`: `test_falha_no_update_mantem_a_foto_anterior_e_descarta_a_nova`. Foto antiga gravada; `User::updating` lança; o objeto antigo segue no disco, `photo_path` não muda e o diretório `user-photos/{id}` só tem o antigo.
- [ ] **Step 2:** `--filter='UserPhotoTest|ProfilePhotoTest'`. Expected: verde (pino); anote.
- [ ] **Step 3: Implement.** Os cinco controllers recebem `PhotoUploadData`. `UserPhotoService::store` passa a ser `FileUploader::store(['photo' => $photo], "user-photos/{$user->id}", fn ($s) => $user->update(['photo_path' => $s->path('photo')]))`, e só depois do retorno apaga o `$old` com o `deleteObject` de hoje. No `UploadPolicyRatchetTest`, saia `'UserPhotoService::rules('` de `REFERENCIAS_DE_POLITICA` e entre `UserPhotoService.php` em `ISENTOS`, com o motivo: recebe o arquivo já validado pelo `PhotoUploadData`.
- [ ] **Step 4:** `--filter='UserPhotoTest|ProfilePhotoTest|UploadPolicyRatchetTest|ClientPhoto'`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(52): foto entra por PhotoUploadData e sobe pelo FileUploader`.

### Task 7: Documento de redator — admin e perfil

**Files:**
- Create: `backend/app/Domains/Identity/Data/RedatorDocumentUploadData.php`
- Create: `backend/app/Domains/Identity/Data/ProfileDocumentUploadData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/ProfileDocumentController.php`
- Modify: `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php` (só o `execute`)
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`

**Interfaces:**
- Consumes: Task 1 (`TypedFileRules::for(..., comValidade: true)`), Task 2.
- Produces:
  - `RedatorDocumentUploadData { public RedatorDocumentType $type; public UploadedFile $file; public ?CarbonImmutable $valid_until = null; }`
  - `ProfileDocumentUploadData`: a mesma forma, com `$permitidos = RedatorDocumentType::selfServiceValues()`
  - `StoreRedatorDocumentAction::execute(Redator, RedatorDocumentType, UploadedFile, ?CarbonInterface): File`, com a assinatura de hoje

- [ ] **Step 1: Write the failing test** `test_nao_redator_com_payload_invalido_recebe_403` (Review Focus 4): admin sem `redator`, `POST /api/profile/documents` com `type=xxx` e sem arquivo; `assertForbidden()`.
- [ ] **Step 2:** `--filter=RedatorDocumentTest`. Expected: PASS hoje (pino). Ele tem de continuar passando depois do Step 3.
- [ ] **Step 3: Implement.** O `RedatorDocumentController::store` recebe `RedatorDocumentUploadData`. O `ProfileDocumentController::store` mantém `Request` no método, checa o redator primeiro e só então chama `ProfileDocumentUploadData::validateAndCreate($request->all())`: injetar o Data no método validaria antes do 403. O `execute` usa `FileUploader::store(['file' => $file], $redator, function ($s) { Redator::lockForWrite($redator->id); return $s->replace($redator, 'file', $type->value, $validUntil); })`. O `registerUploaded` fica, por ora, para os callers da Task 8.
- [ ] **Step 4:** `--filter='RedatorDocumentTest|RedatorFirmaTest|RedatorDocumentRollbackTest|ParentLockOnChildWriteTest'`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(52): documento de redator entra por Data, sem cópia admin/perfil`.

### Task 8: Cadastro do redator — conjunto de documentos atômico

**Files:**
- Create: `backend/app/Domains/Identity/Data/RedatorDocumentsData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php` (some `documentsFromRequest`)
- Modify: `backend/app/Domains/Identity/Actions/CreateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Actions/StoreRedatorDocumentAction.php` (some `registerUploaded`)
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php` (só o docblock que aponta para o parser)
- Test: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`, `backend/tests/Feature/Cadastros/RedatorDocumentRollbackTest.php`

**Interfaces:**
- Consumes: Task 2 (`FileUploader::store`, `StoredFiles::replace`), Task 7 (a Action sem os callers externos).
- Produces:
  - `RedatorDocumentsData { /** @var array<string, UploadedFile> */ public array $documents = []; static rules(ValidationContext $context): array }`
  - `CreateRedatorAction::execute(RedatorData $data, array $documents = []): Redator` e `UpdateRedatorAction::execute(Redator, RedatorData, array $documents = []): Redator`, com as assinaturas de hoje

- [ ] **Step 1: Write the failing tests** em `RedatorDocumentTest`:
  - `test_soma_acima_do_teto_recusa_sem_escanear` (Review Focus 3): quatro arquivos que somam mais de 10240 KB; 422 em `errors.documents.0` igual a `__('shared.file.set_too_large', ['max' => 10])`, e `$escaneados === []`.
  - `test_chave_fora_do_enum_recusa_sem_escanear`: `documents[XX]`; 422 `identity.errors.document_type_invalid` com `tipo` `XX`, e `$escaneados === []`.
  - Os casos de `documents_shape` que já existem (`:192`, `:223`, `:242`) cobrem o Review Focus 2 e ficam como estão.
- [ ] **Step 2:** `--filter=RedatorDocumentTest`. Expected: os casos novos de "sem escanear" falham ou passam conforme a ordem de hoje. Anote.
- [ ] **Step 3: Implement `RedatorDocumentsData::rules`.** Esta é a parte que a assinatura não determina:
  - lê `$context->payload['documents'] ?? []`;
  - se não é array, devolve só `documents => [regra que falha com __('identity.errors.documents_shape')]`;
  - se alguma chave não é `RedatorDocumentType`, devolve só a regra que falha com `document_type_invalid` e `['tipo' => $chave]`;
  - se alguma folha não é `UploadedFile`, devolve só `documents_shape`;
  - se a soma em KB passa de `ContentClass::TETO_AGREGADO_KB`, devolve só `set_too_large` com `max` igual a `intdiv(TETO_AGREGADO_KB, 1024)`;
  - senão, `documents => ['sometimes', 'array']` mais `"documents.{$tipo}" => RedatorDocumentType::from($tipo)->conteudo()->regras()` para cada chave.

  Antes de `ContentClass::assertCabeNoTransporte`, confira se algum outro caller o usa
  (`grep -rn assertCabeNoTransporte backend/app`). Sem nenhum, ele sai, e a soma passa a morar só aqui.
  O `RedatorController::store`/`update` recebe `RedatorDocumentsData $documents` ao lado do
  `RedatorData` e repassa `$documents->documents`. As duas Actions trocam o envelope à mão por
  `FileUploader::store($documents, 'redator' | $redator, function (StoredFiles $s) { ...escrita de hoje...; foreach (array_keys($documents) as $tipo) $s->replace($redator, $tipo, $tipo); })`.
  O `UpdateRedatorAction` mantém o `Redator::lockForWrite` dentro da closure. Some o
  `registerUploaded` do `StoreRedatorDocumentAction`.
- [ ] **Step 4:** `--filter='RedatorDocumentTest|RedatorDocumentRollbackTest|RedatorCrudTest|UploadSizeLimitTest|ParentLockOnChildWriteTest'`. Expected: PASS. O `test_rut_duplicado_no_update_descarta_os_binarios_ja_enviados` e o `..._durante_create_redator_limpa_todos_os_documentos` provam o D2 e o DoD 3.
- [ ] **Step 5: Commit** `refactor(52): documentos do cadastro de redator entram por Data, sem parser`.

### Task 9: Idioma — P-107 e P-76

**Files:**
- Modify: `backend/lang/{es_CL,pt_BR,en}/validation.php` (`attributes`)
- Modify: `backend/lang/{es_CL,pt_BR,en}/identity.php`, `shared.php`, `auth.php` (chaves novas; o arquivo exato fica a critério do implementador, pelo domínio da frase)
- Modify: `backend/app/Domains/Identity/Services/UserProvisioner.php`, `backend/app/Shared/Rules/ValidRut.php`, `backend/app/Shared/Rules/PrintableGrade.php`, `backend/app/Shared/Files/Rules/ScannedForMalware.php`, `backend/app/Domains/Identity/Http/Controllers/AuthController.php`
- Modify: `backend/tests/Unit/Shared/MensagemLiteralTest.php`
- Test: `backend/tests/Feature/Shared/UploadAttributeLocaleTest.php`

**Interfaces:**
- Consumes: nada de outras tasks (o atributo vem do `lang/`, vale para qualquer Data).
- Produces: as chaves de atributo `file`, `photo`, `type`, `valid_until`, `documents` e `documents.*`; uma chave de `lang/` para cada uma das seis frases.

- [ ] **Step 1: Write the failing tests:**
  - `UploadAttributeLocaleTest::test_422_de_upload_nomeia_o_campo_em_es_cl`: locale `es_CL`, `POST /api/budgets/{id}/files` com `type=invoice` e um `.exe`; `errors.file.0` contém `archivo` e não contém `file `.
  - O mesmo em `pt_BR` (`arquivo`) e `en` (`file` é aceitável em inglês; assere que a frase vem de `lang/en`).
  - `MensagemLiteralTest::nenhum_fail_de_regra_carrega_texto_literal`: varre `app/` e reprova `$fail('<texto com espaço>')`.
  - `MensagemLiteralTest::nenhuma_resposta_de_sucesso_carrega_texto_literal`: reprova `'message' => '<texto com espaço>'` dentro de `response()->json(`.
- [ ] **Step 2:** `--filter='UploadAttributeLocaleTest|MensagemLiteralTest'`. Expected: FAIL, e as duas portas novas apontam exatamente os sítios da tabela da P-76 (`ValidRut`, `PrintableGrade`, `ScannedForMalware`, `AuthController`). **Este FAIL é a sonda das portas:** registre a saída.
- [ ] **Step 3: Implement.** Os atributos nos três `validation.php`. As seis frases em `lang/`: es-CL no tom das chaves vizinhas, pt-BR e en equivalentes. O `UserProvisioner::DUPLICADO` passa a guardar **chaves** e o `withMessages` chama `__()`. O `ValidRut` passa a sair em es-CL. As chaves novas entram nos testes `Mensagem*LocalizadaTest` do domínio, se esses testes listam chaves (`MensagemDeIdentidadeLocalizadaTest` lista).
- [ ] **Step 4:** `--filter='UploadAttributeLocaleTest|MensagemLiteralTest|Mensagem.*LocalizadaTest|ValidRut|PrintableGrade|MalwareScanTest|AuthTest|UserProvisioner'`. Expected: PASS. Depois rode `grep -rn 'Sessão encerrada' frontend/src`: se o front fixa a frase, ajuste o teste do front no mesmo commit.
- [ ] **Step 5: Commit** `fix(52): atributo de upload e as seis frases da P-76 em lang/`.

### Task 10: Catracas de arquivo

**Files:**
- Modify: `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php`
- Create: `backend/tests/Feature/Shared/FileStorageAccessRatchetTest.php`
- Modify: `docs/estrutura-monolito.md` (Data de upload por domínio, se a Task 2 não cobriu)

**Interfaces:**
- Consumes: o estado final das Tasks 2 a 8.

- [ ] **Step 1: Write the failing tests:**
  - `UploadPolicyRatchetTest::test_controller_nao_valida_arquivo`: todo arquivo em `app/**/Http/Controllers/` reprova se o código sem comentários contém `request->file(`, `ContentClass::` ou `->validate(` com `'file'`/`'photo'` na janela. A lista `ISENTOS` encolhe: saem os isentos de Action cujo motivo era "o controller já validou" e entram com o motivo "recebe o arquivo já validado pelo `<X>UploadData`". Silêncio reprova.
  - `FileStorageAccessRatchetTest::test_so_o_modulo_a_carga_e_o_transformer_usam_file_storage`: varre `app/` e reprova qualquer arquivo que referencie `FileStorage` fora de `Shared/Files/Services/FileUploader.php`, `Shared/Files/Services/StoredFiles.php`, `Shared/Files/Transformers/SignedUrlTransformer.php`, `Console/Commands/CarregarCargaInicial.php` e `Console/CargaInicial/CarregadorDeCadastros.php`, cada um com o motivo escrito. A carga leva o motivo do D6.
  - `FileStorageAccessRatchetTest::test_ninguem_compensa_a_mao`: reprova `->discard(` fora da mesma lista.
- [ ] **Step 2: Sondas** (scratchpad + `cp`, nunca `git stash`):
  - devolva um `$request->validate(['file' => ContentClass::Documento->regras()])` ao `BudgetFileController`: reprova;
  - injete `FileStorage` no `StoreTurmaDocumentAction`: reprova;
  - restaure os dois e veja passar.

  Registre os três resultados no commit.
- [ ] **Step 3:** suíte inteira: `docker compose exec -T app php artisan test`. Expected: verde. Pint nos PHP do bloco. Rode `typescript:transform` e confira que o `generated.ts` não tem diff (`git diff --exit-code`).
- [ ] **Step 4: Commit** `test(52): catracas de controller sem validate de arquivo e de FileStorage fechado`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 4, 5, 6 | sim | nenhuma entre elas (todas consomem só as Tasks 1 e 2) |

Task fora de grupo executa e revisa uma a uma, nesta ordem: 1, 2, G1, 7, 8, 9, 10.

Conferência por par do G1: as Tasks 3 (Commercial: `BudgetFile`/`QuoteFile`/`ReplaceFileOfType`,
`CommercialFilesTest`) e 6 (`ClientPhotoController`, os Identity de foto, `UserPhotoService`,
`UploadPolicyRatchetTest`, `UserPhotoTest`) não dividem arquivo. As Tasks 4 (Operation) e 5
(Certification) não dividem arquivo com ninguém. Só a Task 6 toca o `UploadPolicyRatchetTest` dentro
do grupo. A 9 fica fora porque o teste dela bate no endpoint da Task 3. A 7 e a 8 ficam fora porque
dividem o `StoreRedatorDocumentAction`.

## Handoff de execução

- `executor: claude`. O bloco decide padrão (forma do Data, envelope do módulo, catracas) e toca a
  lei 4 (erro sobe ao RFC 7807), então não é mecânico de paths fechados.
- Sessão: `opus`, com o esforço do frontmatter do `/executar-bloco`.
- Papéis (`.claude/papeis.md`):
  - `implementador-integracao`: Tasks 2, 7, 8, 9 e 10;
  - `implementador-mecanico`: Tasks 1, 3, 4, 5 e 6;
  - `revisor-task` em cada task, `re-revisor` nas rodadas de correção, `corretor-tardio` nas rodadas
    4 e 5, `revisor-branch` no fim.
- Stack da lane para a suíte e a prova e2e: `docker compose up -d` na raiz da lane (offset +2:
  HTTP 8082, MinIO 9004).

# Bloco 53 — importação e identidade do aluno — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a prévia e a confirmação da importação passam a tomar a mesma decisão por linha, num
classificador só, com paridade provada. A confirmação vira tudo ou nada na checagem, e a identidade
do aluno fica com uma fonte de regra e um update de `User` à altura do `provision()`.

**Architecture:** Identity expõe pela superfície pública (`Services/`) um value object
`StudentIdentity` com as regras de forma, e o `UserProvisioner::update`. Operation ganha o
`ImportRowClassifier`, que a prévia projeta e a confirmação executa depois de uma checagem prévia
de todas as linhas. O front da triagem passa a mostrar o veredito do *Actualizar* e a reabrir a
triagem no 422.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, PHPUnit
(sqlite `:memory:`), React 19 + TS, TanStack Query, Vitest.

**Spec:** `docs/superpowers/blocos/53-backend-importacao-e-identidade-do-aluno/spec.md`

## Global Constraints

- Backend roda no container da lane: `docker compose exec -T app php artisan test --filter=<X>` a
  partir de `/home/jvbat/projetos/lotus-53-backend-importacao-e-identidade-do-aluno` (offset +2,
  `docker compose up -d` antes). Pint no host, de `backend/`, **sempre com argumento**.
- `generated.ts` só por `docker compose exec -T app php artisan typescript:transform`; a task que
  regenera ajusta os consumidores do front no mesmo commit.
- Toda mensagem nova sai de `lang/` com paridade `en`/`es_CL`/`pt_BR` (backend) e
  `en`/`es-CL`/`pt-BR` (front). Vocabulário es-CL da importação: "fila", "planilla", "correo",
  "registro", *Mantener*/*Actualizar*.
- Teto de linhas = **100**, sem mudança de valor.
- `DomainDependencyTest`: Operation só enxerga `Models`/`Enums`/`Services` de Identity; classe nova
  de Identity usada por Operation entra em `DomainDependencyTest::ALLOWED['Operation']`.
- Teste de regressão é visto **reprovar contra o código antigo** antes de valer. Prove copiando o
  arquivo antigo para o scratchpad e restaurando com `cp`, ou com commit WIP. **Nunca `git stash`
  desguardado** (a pilha é compartilhada entre worktrees).
- Gate de cada task: os testes nomeados + a suíte do domínio tocado. Gate final (T7): suíte backend
  inteira, `pnpm build`, `pnpm lint`, `pnpm test`.

## Review Focus

1. *Actualizar* com e-mail ou telefone **em branco** (D17): preserva o cadastro, não conta como
   divergência e não reserva e-mail no lote. Teste na T3.
2. E-mail com **caixa diferente** entre linhas (`Ana@X.cl` × `ana@x.cl`) é duplicidade no lote, e
   contra o cadastro não é divergência. Teste na T3.
3. Aluno **arquivado** (user soft-deletado) com *Actualizar*: a checagem de identidade exclui o
   próprio user, e restaurar e atualizar acontecem na mesma transação da linha. Teste na T4.
4. Corpo de confirmação adulterado com linha **já matriculada** e `update_registration: true`: não
   atualiza nada (D4). Teste na T4.
5. Staff com `rut` **omitido** × `rut: null` passando pelo `UserProvisioner::update`: omitir não
   apaga, `null` apaga e pula só a checagem de RUT. Teste na T1.

---

### Task 1: `UserProvisioner::update` e os quatro `Update*`

**Files:**
- Modify: `backend/app/Domains/Identity/Services/UserProvisioner.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStudentAction.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRedatorAction.php`
- Modify: `backend/app/Domains/Identity/Actions/UpdateStaffUserAction.php`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateClientAction.php`
- Create: `backend/tests/Feature/Identity/UserProvisionerUpdateTest.php`

**Interfaces:**
- Produces: `UserProvisioner::update(User $user, array $attributes): void`. `$attributes` traz as
  colunas de `users` a gravar. `email` é string obrigatória. `rut` é `string|null|Optional`: string
  checa e formata; `null` grava null e pula só a checagem de RUT; `Optional` ou ausente pula a
  checagem e não mexe na coluna. Qualquer valor `Optional` sai pelo `WritableAttributes::from`. A
  checagem é `ensureIdentityAvailable(..., exceptUserId: $user->id)`, e a escrita vai por
  `writing()`.

- [ ] **Step 1: Escrever os testes** em `UserProvisionerUpdateTest`:
  - `test_update_formata_o_rut_e_grava` — RUT `11111111-1` vira `11.111.111-1` em `users.rut`;
  - `test_update_recusa_email_de_outro_user_com_422_do_campo` — `ValidationException` com chave
    `email` e `__('identity.errors.email_taken')`;
  - `test_update_ignora_o_proprio_user_na_checagem` — regravar o mesmo RUT e e-mail não lança;
  - `test_rut_omitido_nao_apaga_e_null_apaga` (Review Focus 5) — `Optional` mantém o RUT; `null`
    zera, e um RUT de outro user não é consultado;
  - `test_update_traduz_colisao_de_indice_em_422` — use a colisão de índice que os testes de
    corrida do `writing()` já exercitam; espelhe o caso existente do `provision`.
- [ ] **Step 2: Rodar e ver reprovar** — `--filter=UserProvisionerUpdateTest`. Esperado: FAIL, o
  método `update` não existe.
- [ ] **Step 3: Implementar `update()`** e trocar, nos quatro `Update*`, o par
  `ensureIdentityAvailable` + `writing(fn () => ...->update(WritableAttributes::from([...])))` por
  uma chamada a `update()`. O que é de cada ator fica no ator: transição de `is_active` e purga de
  sessão, senha do staff (só entra em `$attributes` quando não vazia), `syncRoles`, cursos e
  documentos do redator, campos de `clients`. Docblock da classe: `update` é a contraparte do
  `provision`.
- [ ] **Step 4: Rodar** `--filter='UserProvisionerUpdateTest|UpdateStudentActionTest|RedatorAndStudentPutOmissionTest|Redator|StaffUser|Client'`.
  Esperado: PASS.
- [ ] **Step 5: Conferir** que `grep -rn 'ensureIdentityAvailable\|->writing(' backend/app/Domains/*/Actions/Update*`
  não devolve nada.
- [ ] **Step 6: Commit** — `refactor(53): UserProvisioner::update e os quatro Update*`.

### Task 2: identidade do aluno — `StudentIdentity`, resolver e matrícula individual

**Files:**
- Create: `backend/app/Domains/Identity/Services/StudentIdentity.php`
- Create: `backend/app/Domains/Identity/Data/StudentIdentityData.php` (sem `#[TypeScript]`)
- Modify: `backend/app/Domains/Identity/Data/StudentData.php`
- Modify: `backend/app/Domains/Identity/Services/StudentResolver.php`
- Create: `backend/app/Domains/Operation/Data/EnrollStudentData.php`
- Modify: `backend/app/Domains/Operation/Data/EnrollmentData.php`
- Modify: `backend/app/Domains/Operation/Actions/EnrollStudentAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`
- Modify (callers mecânicos): `backend/app/Domains/Operation/Actions/ImportStudentsAction.php`,
  `backend/app/Domains/Operation/Services/ImportPreviewService.php`,
  `backend/database/seeders/OperationDemoSeeder.php`
- Modify (tests que chamam a assinatura velha): `backend/tests/Feature/Identity/StudentResolverTest.php`,
  `backend/tests/Feature/Operation/EnrollStudentActionTest.php`, `ImportPreviewTest.php`,
  `ImportConfirmApiTest.php`, `ImportStudentsActionTest.php`, `EnrollmentResultTest.php`,
  `ConcludeTurmaTest.php`, `TurmaOwnershipTest.php` (todos em `backend/tests/Feature/Operation/`)
- Modify: `backend/tests/Feature/Shared/DomainDependencyTest.php` (`'Identity\Services\StudentIdentity'`
  em `ALLOWED['Operation']`)
- Modify: `frontend/src/shared/types/generated.ts` (regenerado), `frontend/src/features/operation/api/useEnrollments.ts`
  (o `EnrollPayload` escrito à mão sai; o tipo é o `EnrollStudentData` gerado), e os consumidores
  que o `pnpm build` apontar (`hooks/useEnrollStudentFlow.ts`, `components/Enrollment/EnrollStudentForm.tsx`
  e o teste dele)

**Interfaces:**
- Consumes: `UserProvisioner::update` (T1).
- Produces:
  - `final readonly class StudentIdentity { __construct(string $rut, string $name, ?string $email, ?string $phone); static rules(bool $emailRequired = false): array }`.
    As regras: `rut` required/string/`ValidRut`; `name` required/string/`max:TetosImpressos::NOME_ALUNO`;
    `email` nullable (ou required)/`email`/`max:TetosDeColuna::EMAIL`; `phone` nullable/string/`max:TetosDeColuna::TELEFONE`.
  - `StudentResolver::identity(string $rut, string $name, ?string $email, ?string $phone): StudentIdentity`
    valida a forma por `StudentIdentityData::validateAndCreate` e lança `ValidationException` da linha.
  - `StudentResolver::resolveByRut(StudentIdentity $identity, Client $client): StudentResolution`
  - `StudentResolver::assertCanCreate(StudentIdentity $identity): void` — e-mail obrigatório
    (`identity.errors.student_email_required`) e identidade livre.
  - `StudentResolver::updatedIdentity(Student $student, string $name, ?string $email, ?string $phone): StudentIdentity`
    faz a mescla da D17 (em branco fica o valor do cadastro; o RUT é o do cadastro) e valida a forma.
  - `StudentResolver::assertCanUpdate(Student $student, StudentIdentity $identity): void` — identidade
    livre, exceto o próprio user.
  - `StudentResolver::updateRegistration(Student $student, StudentIdentity $identity): void` — via
    `UserProvisioner::update`; o resolver **não injeta mais** `UpdateStudentAction`.
  - `EnrollStudentAction::execute(Turma $turma, StudentIdentity $identity): EnrollOutcome`
  - `#[TypeScript] EnrollStudentData { string $rut; string $name; ?string $email = null; ?string $phone = null; rules() = StudentIdentity::rules(); identity(): StudentIdentity }`.

- [ ] **Step 1: Escrever os testes novos**:
  - em `StudentResolverTest`, `test_identity_recusa_email_malformado_nome_acima_do_teto_e_telefone_longo`,
    asserindo a chave e a mensagem de cada campo;
  - em `StudentResolverTest`, `test_updated_identity_preserva_cadastro_em_branco` (D17);
  - em `StudentResolverTest`, `test_assert_can_update_ignora_o_proprio_user`;
  - em `EnrollmentApiTest`, `test_store_com_email_malformado_devolve_422_do_campo`, um caso que já
    deve passar hoje e trava a regra na troca de Data.
- [ ] **Step 2: Rodar** — `--filter=StudentResolverTest`. Esperado: FAIL nos três novos, porque os
  métodos não existem.
- [ ] **Step 3: Implementar** as interfaces acima.
  - `StudentData` espalha `StudentIdentity::rules(emailRequired: true)` no `rules()` e larga os
    atributos `Required`/`Email`/`Max` de `name`, `email` e `phone`.
  - O `EnrollmentData` perde o `rules()` e vira só saída, com a forma intacta; ajuste o docblock.
  - `assertCanCreate` antigo (escalares) e `updateRegistration` antigo saem, e os dois callers da
    importação passam a montar a identidade por `$resolver->identity(...)` /
    `$resolver->updatedIdentity(...)`. É troca mecânica: a T3 e a T4 reescrevem esses arquivos.
  - O `Validator::make` do resolver some.
- [ ] **Step 4: Regenerar** `typescript:transform` e ajustar o front até `pnpm build` passar.
- [ ] **Step 5: Rodar** — `--filter='Identity|Enroll|Import|ConcludeTurma|TurmaOwnership|DomainDependency|PersistenceLaws'`,
  e de `frontend/`, `pnpm build && pnpm test`. Esperado: PASS.
- [ ] **Step 6: Conferir** que `grep -rn 'Validator::make\|UpdateStudentAction' backend/app/Domains/Identity/Services/StudentResolver.php`
  não devolve nada.
- [ ] **Step 7: Commit** — `refactor(53): identidade do aluno com fonte única de regra`.

### Task 3: `ImportRowClassifier` e a prévia

**Files:**
- Create: `backend/app/Domains/Operation/Services/ImportRowClassifier.php`
- Create: `backend/app/Domains/Operation/Services/ImportRowDecision.php`
- Modify: `backend/app/Domains/Operation/Services/ImportBatchLedger.php`
- Modify: `backend/app/Domains/Operation/Services/ImportPreviewService.php`
- Modify: `backend/app/Domains/Operation/Data/ImportPreviewRowData.php` (campo `update_refusal`)
- Modify: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php` (só a constante sai)
- Modify: `backend/lang/{en,es_CL,pt_BR}/operation.php` (`duplicate_rut`/`duplicate_email` com `:row`)
- Modify: `backend/tests/Feature/Operation/ImportPreviewTest.php`, `ImportConfirmApiTest.php` (asserções do texto de duplicidade)
- Create: `backend/tests/Feature/Operation/ImportRowClassifierTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado) e as fixtures que montam
  `ImportPreviewRowData`: `ImportDialog.test.tsx`, `ImportTriageTable.test.tsx`,
  `ImportTriageTable.refused.test.tsx` (em `components/Enrollment/`) e `hooks/useImportStudentsFlow.test.tsx`
  (só o campo novo, `update_refusal: null`)

**Interfaces:**
- Consumes: `StudentResolver::{previewByRut, assertNameProvided, identity, assertCanCreate, updatedIdentity, assertCanUpdate}`,
  e `StudentIdentity` (T2).
- Produces:
  - `ImportRowClassifier::MAX_LINHAS = 100`. O docblock da medição muda junto da Action para cá;
    a prévia e o leitor passam a ler daqui.
  - `ImportRowClassifier::classify(Turma $turma, array $lines, bool $canUpdate): array`. A entrada
    é `list<ImportConfirmRowData>` e a saída é `list<ImportRowDecision>`, na mesma ordem.
  - `final readonly class ImportRowDecision`:
    - campos: `ImportConfirmRowData $line`, `ImportRowStatus $status`, `?string $refusal`,
      `?string $updateRefusal`, `?StudentLookup $lookup`, `?StudentIdentity $identity` (o que a
      execução usa: a linha validada no `new` e o cadastro no `registered`/`moves`),
      `?StudentIdentity $updatedIdentity`, `array $divergent` (`list<ImportField>`);
    - métodos `rowRefused(): bool` (status `Error`), `updateRefused(): bool` (flag ligada, status
      `registered`/`moves` e `updateRefusal` não nulo) e `updates(): bool` (flag ligada, status
      `registered`/`moves` e `updateRefusal` nulo).
  - `ImportBatchLedger::claimRut(string $rut, int $row): ?string` e
    `claimEmail(string $email, int $row): ?string`. A mensagem cita a linha que reservou primeiro
    (`:row`).
  - `ImportPreviewRowData::$update_refusal: ?string`.
- **Ordem por linha (o algoritmo que a spec fixa — D2, D3, D4):**
  1. RUT repetido → `Error`.
  2. Nome presente e `previewByRut`; se lançar, → `Error`.
  3. Aluno novo:
     - `identity()` + `assertCanCreate()`;
     - reserva o e-mail; repetido → `Error`;
     - tudo certo → `New`.
  4. Matrícula ativa na turma → `AlreadyEnrolled`: a flag é ignorada e nada é reservado.
  5. `Registered`/`Moves` pela empresa. `identity` = o cadastro; `divergent` sai da comparação da
     D17, como hoje.
  6. `divergent` contém `Email` → reserva o e-mail da linha. Repetido → `updateRefusal` = a
     mensagem; a linha **não** vira `Error`.
  7. Se `divergent !== []` **ou** a flag estiver ligada, e o passo 6 não recusou: sem permissão →
     `updateRefusal` = `update_forbidden`; com permissão → `updatedIdentity()` +
     `assertCanUpdate()`, e uma `ValidationException` vira `updateRefusal` (squash).
- **Textos (`:row`)** — es_CL: `'Este RUT ya aparece en la fila :row de la planilla: solo vale la primera.'`
  e `'Este correo ya aparece en la fila :row de la planilla: solo vale la primera.'`; pt_BR:
  `'Este RUT já aparece na linha :row da planilha: só a primeira vale.'` e
  `'Este e-mail já aparece na linha :row da planilha: só a primeira vale.'`; en:
  `'This RUT already appears in row :row of the spreadsheet: only the first one counts.'` e
  `'This email already appears in row :row of the spreadsheet: only the first one counts.'`.

- [ ] **Step 1: Escrever `ImportRowClassifierTest`**, um teste por regra, com a mensagem asserida
  (guarda de porta múltipla):
  - `test_email_divergente_de_cadastrado_reserva_antes_do_aluno_novo` (D3) — linha 2 cadastrada
    com e-mail divergente X, linha 3 nova com X; a linha 3 sai `Error` com
    `__('…duplicate_email', ['row' => 2])`;
  - `test_cadastrado_que_perde_a_reserva_perde_so_o_actualizar` — inverso: a linha 2 nova reserva
    X, e a linha 3 cadastrada sai `Registered` com `updateRefusal` não nulo;
  - `test_linha_com_erro_nao_reserva_email` — a linha 2 é recusada pelo nome acima do teto, e a
    linha 3 nova com o mesmo e-mail sai `New`;
  - `test_mantener_nao_valida_o_que_nao_grava` (anti-objetivo) — cadastrado com e-mail malformado
    na planilha, flag desligada: `Registered`, `refusal` nulo. O `updateRefusal` diz o formato;
  - `test_actualizar_em_branco_preserva_e_nao_reserva` (Review Focus 1);
  - `test_email_com_caixa_diferente_e_duplicidade_e_nao_divergencia` (Review Focus 2);
  - `test_ja_matriculado_ignora_a_flag` (D4) — `AlreadyEnrolled`, `updates()` falso;
  - `test_sem_permissao_actualizar_recusado_com_update_forbidden`.
- [ ] **Step 2: Rodar** `--filter=ImportRowClassifierTest`. Esperado: FAIL (a classe não existe).
- [ ] **Step 3: Implementar** o classificador, a decisão e o ledger com `:row`. Reescrever
  `ImportPreviewService::preview()`:
  - transforma as linhas do leitor em `ImportConfirmRowData` com a flag desligada;
  - chama o classificador com `$actor->can('identity.user.update')`;
  - projeta cada decisão em `ImportPreviewRowData`: `message` = `refusal`, `update_refusal` =
    `updateRefusal` só em `registered`/`moves` com `divergent` não vazio, e o resto como hoje.
  - A prévia deixa de importar `ImportStudentsAction`.
  - Atualizar os textos de `lang/`.
- [ ] **Step 4: Regenerar** `typescript:transform` e acrescentar `update_refusal: null` às fixtures
  do front.
- [ ] **Step 5: Rodar** `--filter='ImportRowClassifierTest|ImportPreviewTest|ImportConfirmApiTest|ImportStudentsActionTest|LocaleParity|MensagemLiteral|DomainDependency'`
  e `pnpm build && pnpm test`. Esperado: PASS.
- [ ] **Step 6: Commit** — `refactor(53): classificador único de linha e prévia sobre ele`.

### Task 4: confirmação sobre o classificador — checagem tudo ou nada e paridade

**Files:**
- Modify: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php`
- Modify: `backend/tests/Feature/Operation/ImportConfirmApiTest.php`, `ImportStudentsActionTest.php`.
  Os casos que hoje asserem `errors` no 200 por linha recusável passam a asserir o 422; os casos
  de corrida no momento da escrita continuam no `errors`.
- Create: `backend/tests/Feature/Operation/ImportParityTest.php`

**Interfaces:**
- Consumes: `ImportRowClassifier::classify`, `ImportRowDecision` (T3), `EnrollStudentAction::execute(Turma, StudentIdentity)`,
  `StudentResolver::updateRegistration(Student, StudentIdentity)` (T2).
- Produces (o contrato que a T6 consome): o 422 da checagem é um `ValidationException::withMessages`,
  e o `ProblemDetails` o leva em `errors`, com uma chave por linha recusada:
  - `import.<row>` → recusa da linha (`refusal`);
  - `import.<row>.update` → recusa só do *Actualizar* (`updateRefusal`).

  `<row>` é o número da linha na planilha. Nenhuma escrita acontece antes desse 422.
  `ImportResultData` não muda.

- [ ] **Step 1: Escrever `ImportParityTest`** (molde da emissão).
  - Cada cenário é uma planilha (prévia por arquivo) mais as escolhas por linha. A confirmação
    recebe o que o front mandaria: sem `error` nem `already_enrolled`, com a flag da escolha.
  - Asserção única por cenário:
    - a prévia aponta recusas (`message` nas linhas enviadas, ou `update_refusal` em linha com
      *Actualizar*) ⇒ a confirmação devolve 422 com **exatamente** as chaves
      `import.<row>`/`import.<row>.update` esperadas, e as contagens de `users`, `students`,
      `enrollments` e `audits` ficam iguais antes e depois;
    - senão ⇒ 200, e o resultado por linha bate com a prévia: `new`→created,
      `registered`→relinked, `moves`→moved.
  - Cenários mínimos:
    - `test_paridade_actualizar_com_email_repetido_por_linha_nova` — a divergência viva; tem de
      reprovar contra `main@1845d096`;
    - `test_paridade_lote_limpo_misto` (new + registered + moves);
    - `test_paridade_actualizar_com_email_de_outro_aluno`;
    - `test_paridade_mantener_com_email_malformado`.
- [ ] **Step 2: Escrever em `ImportStudentsActionTest`**:
  - `test_ja_matriculado_com_flag_adulterada_nao_atualiza` (Review Focus 4);
  - `test_aluno_arquivado_com_actualizar_restaura_e_atualiza_na_mesma_transacao` (Review Focus 3).
- [ ] **Step 3: Provar a reprovação contra o código antigo.**
  - Copie a `ImportStudentsAction.php` atual para o scratchpad.
  - Rode o cenário da divergência viva contra a versão de `main@1845d096`
    (`git show 1845d096:backend/app/Domains/Operation/Actions/ImportStudentsAction.php` e o mesmo
    para `ImportPreviewService.php`, `StudentResolver.php` e `ImportBatchLedger.php`).
  - Veja FAIL, restaure com `cp` e registre a saída no commit.
  - Se a assinatura nova do teste não roda contra o código antigo, prove pela API: os dois pedidos
    HTTP do cenário contra o stack da lane em `main`, guardados no relatório da task.
- [ ] **Step 4: Implementar** `ImportStudentsAction::execute`:
  - gate da turma;
  - `classify` de todas as linhas;
  - qualquer `rowRefused()`/`updateRefused()` → 422 com as chaves acima, antes de escrever;
  - depois, por linha e numa transação por linha:
    - `updates()` → `updateRegistration` + `enroll->execute(turma, updatedIdentity)`;
    - `new` → `enroll->execute(turma, identity)`;
    - `registered`/`moves`/`already_enrolled` → `enroll->execute(turma, identity do cadastro)`;
  - `ValidationException` na escrita → `errors[]`, como hoje (corrida, D7).
  - O docblock da classe troca "a linha com erro sai no resumo e o lote segue" pela regra nova.
- [ ] **Step 5: Rodar** `--filter='Import|Enroll|ParentLockOnChildWrite'`. Esperado: PASS.
- [ ] **Step 6: Commit** — `fix(53): confirmação tudo ou nada sobre o classificador, com paridade`.

### Task 5: marca de coleção só de entrada

**Files:**
- Create: `backend/app/Shared/Data/Attributes/InputOnlyCollection.php`
- Modify: `backend/tests/Feature/Shared/PersistenceLawsTest.php`
- Modify: `backend/app/Domains/Operation/Data/ImportConfirmData.php`
- Modify: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php` (o `Validator::make` sai)
- Modify: `frontend/src/shared/types/generated.ts` (regenerado: `rows` deixa de ser opcional)
- **Fora desta task, por decisão do João (2026-11-03):** a frase nas rules `backend-ddd.md` e
  `generated-types.md` que nomeia a marca nova ao lado da `#[ReadOnlyCollection]`. Os dois arquivos
  estão no plano da lane 51 (`lane.sh conferir`), e a menção entra no **fechamento deste bloco,
  depois que a 51 mesclar**. Até lá a marca se documenta no docblock do próprio atributo, como a
  `ReadOnlyCollection` faz: o docblock diz o critério da guarda e cita o teste.

**Interfaces:**
- Consumes: `ImportRowClassifier::MAX_LINHAS` (T3).
- Produces: `#[InputOnlyCollection]` (alvo: propriedade/parâmetro). A guarda em
  `test_colecao_nested_read_write_nasce_optional` aceita a propriedade marcada só se:
  - tiver `#[DataCollectionOf]`;
  - o tipo **não** admitir `Optional` e não houver default;
  - a classe **não** declarar `fromModel`.

  Cada violação vira uma linha própria na mensagem, como as da `ReadOnlyCollection`.
  `ImportConfirmData`: `#[DataCollectionOf(ImportConfirmRowData::class)] #[InputOnlyCollection] public array $rows`,
  com `rules()` = `['rows' => ['required', 'array', 'min:1', 'max:'.ImportRowClassifier::MAX_LINHAS]]`.

- [ ] **Step 1: Escrever os testes do 422 de entrada** em `ImportConfirmApiTest`:
  `test_rows_ausente_devolve_422_rows` e `test_rows_acima_do_teto_devolve_422_rows`, os dois com a
  chave `rows`. Hoje eles já passam pela Action; servem para travar a troca.
- [ ] **Step 2: Implementar** o atributo, a guarda, o `ImportConfirmData` e a remoção do
  `Validator::make`.
- [ ] **Step 3: Sondar a marca nos dois sentidos** e registrar a saída de cada sonda no commit:
  - (a) `#[InputOnlyCollection]` em `ClientData::$contacts` → a guarda reprova (`fromModel`);
  - (b) a marca em `ImportConfirmData::$rows` com `array|Optional = new Optional` → reprova;
  - (c) remover `#[DataCollectionOf]` de `rows` mantendo a marca → reprova.

  Restaure cada sonda com `cp` do scratchpad.
- [ ] **Step 4: Rodar** `--filter='PersistenceLaws|ImportConfirmApiTest|ImportStudentsActionTest'`,
  e `pnpm build`. Esperado: PASS. Depois
  `grep -rn 'Validator::make' backend/app/Domains/*/Actions backend/app/Domains/*/Services`
  tem de voltar vazio.
- [ ] **Step 5: Commit** — `refactor(53): marca de coleção só de entrada verificada`.

### Task 6: triagem do front — veredito do *Actualizar* e 422 da confirmação

**Files:**
- Create: `frontend/src/features/operation/lib/importRefusals.ts` + `importRefusals.test.ts`
- Modify: `frontend/src/features/operation/hooks/useImportStudentsFlow.ts` + `useImportStudentsFlow.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/ImportTriageTable.tsx` +
  `ImportTriageTable.test.tsx`, `ImportTriageTable.refused.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx` + `ImportDialog.test.tsx`,
  se o aviso do 422 pousar no diálogo
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `ImportPreviewRowData.update_refusal` (T3) e o contrato do 422 (T4).
- Produces:
  - `parseImportRefusals(errors: Record<string, string[]> | undefined): { row: Map<number, string>; update: Map<number, string> } | null`.
    Devolve `null` quando não há nenhuma chave `import.*`; aí o erro segue o caminho genérico do
    `useMutationErrors`.
  - `TriageRow` ganha `update_blocked: string | null`, iniciado com `update_refusal`. O `origin`
    também guarda o `update_blocked` original, para o *Mantener* restaurar.
- **Regras do hook:**
  - `isSendable` exclui a linha com `update_registration && update_blocked`.
  - `edit` limpa `update_blocked`: os valores novos são julgados ao confirmar (D5).
  - `setUpdate(false)` em linha editada restaura os campos e o `update_blocked` de origem (D16).
  - `confirm` com `onError` e 422 parseável → **fica em `triage`**, sem ir a `result`, com todas as
    linhas mantidas:
    - chave `row`: aplica a marcação de recusa que hoje mora no `onSuccess` (cadastrada →
      `refused: true`; nova → `status: 'error'`);
    - chave `update`: `update_blocked` = a mensagem, sem tocar no resto.
  - O `onSuccess` segue com o `errors` da corrida, como hoje.
- **Na tabela:**
  - o rádio *Actualizar* fica `disabled` com `update_blocked`;
  - a `Note` mostra `note.updateBlocked`, interpolando `reason`.
- **Textos novos** (`operation.enrollment.import.*`):
  - `note.updateBlocked` — es-CL `"No se puede actualizar: {{reason}}"`; pt-BR
    `"Não é possível atualizar: {{reason}}"`; en `"Can't update: {{reason}}"`;
  - `nothingImported` — es-CL `"No se importó ninguna fila: revisa las filas marcadas y confirma de nuevo."`;
    pt-BR `"Nenhuma linha foi importada: revise as linhas marcadas e confirme de novo."`; en
    `"No row was imported: review the marked rows and confirm again."`.

  É o aviso do 422; ele substitui a mensagem genérica.

- [ ] **Step 1: Escrever os testes**:
  - `importRefusals.test.ts` — separa `import.5` de `import.7.update`, ignora `rows.0.email` e
    devolve `null` sem chave `import.*`;
  - `useImportStudentsFlow.test.tsx` — 422 com `import.3.update` deixa a linha 3 em `triage` com
    `update_blocked`, não enviável com *Actualizar* e enviável depois de `setUpdate(3, false)`;
    422 com `import.4` marca a 4 como recusada;
  - `ImportTriageTable.test.tsx` — linha com `update_refusal` mostra a nota e o rádio
    *Actualizar* desabilitado.
- [ ] **Step 2: Rodar** `pnpm test -- importRefusals useImportStudentsFlow ImportTriageTable`.
  Esperado: FAIL.
- [ ] **Step 3: Implementar.** O `ImportTriageTable` segue abaixo de 150 linhas (`max-lines`); se
  passar, extraia a `Situation` para um irmão.
- [ ] **Step 4: Rodar** `pnpm build && pnpm lint && pnpm test`. Esperado: PASS.
- [ ] **Step 5: Commit** — `feat(53): triagem mostra o veredito do Actualizar e reabre no 422`.

### Task 7: verificação ponta a ponta contra o stack da lane

**Files:** nenhum de código. A evidência vai no relatório da task, para a revisão.

- [ ] **Step 1:** subir o stack da lane (`docker compose up -d`, offset +2: HTTP 8082, Vite 5175)
  e semear (`migrate:fresh --seed`).
- [ ] **Step 2: Matrícula individual (DoD 7).** Pela API autenticada, `POST /api/turmas/{id}/alunos`
  com aluno novo → 201 e a forma do `EnrollmentData` de sempre; com e-mail malformado → 422 `email`.
- [ ] **Step 3: Importação (DoD 1, 2).**
  - Montar a planilha do cenário da divergência viva.
  - `POST …/alunos/importar/previa` → a linha nova sai `error` com a mensagem citando a linha.
  - Confirmar com a linha cadastrada em *Actualizar* e com e-mail repetido de outro aluno → 422
    `import.<row>.update`; contagens de `users`, `students`, `enrollments` e `audits` iguais antes
    e depois.
  - Confirmar o lote limpo → 200.
- [ ] **Step 4: Triagem no navegador (DoD 3).** Ver a nota "No se puede actualizar", o rádio
  desabilitado e a reabertura no 422 com o aviso `nothingImported`. Screenshot no relatório.
- [ ] **Step 5: Gate final.** Suíte backend inteira, `pnpm build`, `pnpm lint` e `pnpm test`, com
  os números no relatório.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 5, 6 | sim. A T5 toca backend e `generated.ts`; a T6 toca só `frontend/src/features/operation/**` e os locales | nenhuma. A T5 consome a T3, a T6 consome a T3 e a T4; nenhuma das duas consome a outra |

Task fora de grupo executa e revisa uma a uma: 1 → 2 → 3 → 4 → G1 → 7.

## Handoff de execução

- `executor: claude`. O bloco toca a lei §5.3 (regenera `generated.ts`) e decide padrão:
  `StudentIdentity` na fronteira de domínio, a marca nova da catraca e o contrato do 422.
- Sessão: `opus`, esforço `xhigh`.
- Papéis (`.claude/papeis.md`):
  - `implementador-integracao` nas T1–T6;
  - `revisor-task` por task;
  - `re-revisor` nas rodadas de correção;
  - `corretor-tardio` se uma correção passar da 3ª rodada;
  - `revisor-branch` ao fim.
  - A T7 é da sessão: precisa do stack e do navegador.

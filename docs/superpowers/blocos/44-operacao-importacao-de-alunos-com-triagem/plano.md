# Importação de alunos com triagem — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o upload de planilha passa a ser uma prévia sem escrita. A triagem acontece no diálogo, e
só a confirmação grava, linha a linha, com revalidação no servidor. O modelo `.xlsx` fica
baixável.

**Architecture:** três rotas em `EnrollmentController`: prévia multipart, confirmação JSON e
modelo `GET`. A prévia é um service somente-leitura que reusa o leitor e a validação do
`StudentResolver`, numa versão extraída sem escrita. A confirmação reescreve o
`ImportStudentsAction` para receber linhas DTO e chamar, por linha e numa transação,
`UpdateStudentAction` (quando pedido) e `EnrollStudentAction`. No front, o
`useImportStudentsFlow` vira uma máquina de três estados (upload → triagem → resultado), e o
`ImportDialog` em `lg` renderiza a tabela de triagem.

**Tech Stack:** Laravel 13, spatie/laravel-data e typescript-transformer, OpenSpout (leitor e
writer), React 19, TanStack Query, PrimeReact via `shared/ui`, vitest.

**Spec:** `docs/superpowers/blocos/44-operacao-importacao-de-alunos-com-triagem/spec.md`.
Decisões D1–D22. Leia a spec inteira antes da Task 1.

## Global Constraints

- Leis do §5 do `CLAUDE.md`, em especial: sem Repository; auditoria só na aplicação;
  `generated.ts` só por `docker compose exec -T app php artisan typescript:transform`; erro
  sempre por `ValidationException`; feature sem PrimeReact direto e sem importar outra feature.
- Teto de linhas: `ImportStudentsAction::MAX_LINHAS = 100`. Não muda.
- Cabeçalho do modelo, exato e nesta ordem: `RUT`, `Nombre`, `Email`, `Teléfono` (D14).
- Permissões: `operation.enrollment.manage` nas três rotas; `identity.user.update` exigida por
  linha com `update_registration` (D13, D20).
- `throttle:import` na prévia e na confirmação. O modelo não leva throttle.
- Mensagem ao usuário só por `__('operation.enrollment.import.<motivo>')`, com paridade en,
  es_CL e pt_BR. No front, as chaves `operation.enrollment.import.*` vão nos três JSON de
  `frontend/src/shared/config/locales/`.
- Backend: teste de integração sqlite, sem mock. Rode com
  `docker compose exec -T app php artisan test --filter=<Teste>` na lane (offset +1; suba o stack
  com `docker compose up -d` se estiver parado).
- Pint só nos arquivos tocados: `cd backend && ./vendor/bin/pint <arquivos>`.
- Front: `pnpm lint`, `pnpm build` e `pnpm test` verdes ao fim de cada task de front. Componente
  com no máximo 150 linhas.

## Review Focus

1. **Arquivo com só o cabeçalho, ou só linhas em branco.** Espera-se uma prévia com `rows: []`,
   e o front mostra "a planilha não tem alunos" no lugar de uma tabela vazia com "Confirmar 0
   filas". Teste na Task 3 e na Task 6.
2. **A confirmação recebe uma linha que o front marcou `already_enrolled`** (adulterada ou
   corrida). O servidor deve contar em `already_enrolled`, nunca duplicar a matrícula. Teste na
   Task 4.
3. **O mesmo RUT em formatos diferentes** (`12345678-5` e `12.345.678-5`) dentro da planilha.
   Deve ser tratado como repetido: a comparação é pelo RUT normalizado. Teste na Task 3 e na
   Task 4.
4. **Confirmar duas vezes** (duplo clique, ou reenviar as recusadas depois de corrigidas). O
   segundo envio não duplica nada: as linhas já gravadas viram `already_enrolled`. Teste na
   Task 4.
5. **Fechar o diálogo no meio da triagem.** A triagem é descartada sem chamada ao servidor, e
   reabrir começa do upload. Teste na Task 6.

---

### Task 1: Cabeçalho único e modelo `.xlsx`

**Files:**
- Modify: `backend/app/Domains/Operation/Services/SpreadsheetRowReader.php` (constante `HEADER`)
- Create: `backend/app/Domains/Operation/Services/SpreadsheetTemplate.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` (método
  `template`, coberto pelo middleware de `operation.enrollment.manage`)
- Modify: `backend/app/Domains/Operation/routes.php`
- Test: `backend/tests/Feature/Operation/SpreadsheetTemplateTest.php`

**Interfaces:**
- Produces: `SpreadsheetRowReader::HEADER = ['RUT', 'Nombre', 'Email', 'Teléfono']` (`public
  const array`); `SpreadsheetTemplate::write(string $path): void` grava o `.xlsx` com
  `HEADER` na linha 1; rota `GET api/turmas/{turma}/alunos/importar/plantilla`, que responde
  `200` com `Content-Type`
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` e
  `Content-Disposition: attachment; filename="plantilla-alumnos.xlsx"`.

- [ ] **Step 1: testes que falham**
  - `test_modelo_tem_o_cabecalho_do_leitor`: abre o arquivo de `write()` com o reader do
    OpenSpout e asserta a linha 1 `=== SpreadsheetRowReader::HEADER`.
  - `test_modelo_volta_pelo_leitor_sem_linhas`: `iterator_to_array($reader->rows($upload, 100))`
    sobre o modelo devolve `[]`, sem exceção.
  - `test_modelo_preenchido_volta_pelo_leitor`: grava o modelo, acrescenta uma linha
    `['12.345.678-5','Ana Pérez','ana@x.cl','']` e asserta que o leitor devolve `rut`, `name` e
    `email` iguais e `phone === null`.
  - `test_rota_entrega_xlsx_para_admin` e `test_rota_recusa_redator_403`.
- [ ] **Step 2:** rodar `--filter=SpreadsheetTemplateTest`. Esperado: FAIL.
- [ ] **Step 3:** implementar. O leitor continua pulando a linha 1 sem validá-la (D21). O
  controller faz streaming de um arquivo temporário (`response()->download(...)->deleteFileAfterSend()`).
  A rota fica **antes** de qualquer `alunos/{enrollment}`.
- [ ] **Step 4:** `--filter=SpreadsheetTemplateTest` e `--filter=SpreadsheetRowReaderTest`
  verdes. Rodar `--filter=AuthenticatedRouteMiddlewareTest` e `--filter=ListQueryBudgetTest`. Se
  a catraca listar a rota `GET` nova, declará-la em `ISENTAS` com o motivo "download de arquivo,
  não lista".
- [ ] **Step 5:** commit `feat(44): modelo xlsx com cabeçalho único do leitor`.

### Task 2: Validação de aluno novo sem escrita no `StudentResolver`

**Files:**
- Modify: `backend/app/Domains/Identity/Services/StudentResolver.php`
- Test: `backend/tests/Feature/Identity/StudentResolverTest.php`

**Interfaces:**
- Produces: `StudentResolver::assertCanCreate(string $rut, string $name, ?string $email): void`.
  Lança `ValidationException` com as mesmas chaves e mensagens de hoje: `email` com
  `identity.errors.student_email_required`, `name` com `validation.max.string` e teto
  `TetosImpressos::NOME_ALUNO`, e colisão de e-mail ou RUT via
  `UserProvisioner::ensureIdentityAvailable($rut, $email)`. Não escreve nada.
- `resolveByRut` passa a chamar `assertCanCreate` no ramo do aluno novo, antes do `provision`.
  As regras saem de lá: fonte única (D10).

- [ ] **Step 1: testes que falham**
  - `test_assert_can_create_recusa_email_ausente` (chave `email`);
  - `test_assert_can_create_recusa_nome_acima_do_teto` (chave `name`);
  - `test_assert_can_create_recusa_email_de_outro_usuario_inclusive_arquivado` (chave `email`);
  - `test_assert_can_create_nao_escreve`: as contagens de `users`, `students` e `audits` são
    iguais antes e depois de uma chamada que passa.
- [ ] **Step 2:** `--filter=StudentResolverTest`. Esperado: FAIL (método inexistente).
- [ ] **Step 3:** implementar e mover as duas checagens do ramo novo de `resolveByRut` para o
  método.
- [ ] **Step 4:** `--filter=StudentResolverTest`, `--filter=EnrollStudentActionTest` e
  `--filter=ImportStudentsActionTest` verdes (o comportamento de `resolveByRut` não muda).
- [ ] **Step 5:** commit `refactor(44): validação de aluno novo sem escrita no resolver`.

### Task 3: Prévia da planilha

**Files:**
- Create: `backend/app/Domains/Operation/Enums/ImportRowStatus.php`
- Create: `backend/app/Domains/Operation/Data/ImportPreviewData.php`
- Create: `backend/app/Domains/Operation/Data/ImportPreviewRowData.php`
- Create: `backend/app/Domains/Operation/Services/ImportPreviewService.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` (método
  `previewImport`)
- Modify: `backend/app/Domains/Operation/routes.php`
- Modify: `backend/lang/{en,es_CL,pt_BR}/operation.php` (`enrollment.import.duplicate_rut` e
  `enrollment.import.duplicate_email`)
- Modify: `backend/tests/Feature/Shared/RateLimitTest.php` e, se a catraca pedir,
  `UploadPolicyRatchetTest.php` e `ParentLockOnChildWriteTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado, nunca à mão)
- Test: `backend/tests/Feature/Operation/ImportPreviewTest.php`

**Interfaces:**
- Consumes: `SpreadsheetRowReader::rows()`, `ImportStudentsAction::MAX_LINHAS`,
  `StudentResolver::previewByRut()`, `StudentResolver::assertCanCreate()` (Task 2).
- Produces:
  - `enum ImportRowStatus: string { New = 'new'; Registered = 'registered'; Moves = 'moves';
    AlreadyEnrolled = 'already_enrolled'; Error = 'error'; }` com `#[TypeScript]`.
  - `ImportPreviewRowData` (`#[TypeScript]`): `row:int, rut:string, name:string,
    email:?string, phone:?string, status:ImportRowStatus, message:?string,
    current_client:?string, archived:bool, divergent:array<string>` (subconjunto de
    `['name','email','phone']`) e `registered_name:?string, registered_email:?string,
    registered_phone:?string`.
  - `ImportPreviewData` (`#[TypeScript]`): `rows` (`#[DataCollectionOf(ImportPreviewRowData)]`
    + `#[ReadOnlyCollection]`) e `can_update_registration:bool`.
  - `ImportPreviewService::preview(Turma $turma, UploadedFile $file, User $actor): ImportPreviewData`.
  - Rota `POST api/turmas/{turma}/alunos/importar/previa` (multipart `file`, regras
    `ContentClass::Planilha->regras()`, `throttle:import`).
- Regras de classificação, por linha e nesta ordem:
  1. RUT normalizado já visto no lote → `error` (`duplicate_rut`);
  2. `previewByRut` lança → `error` com a mensagem;
  3. aluno inexistente → `assertCanCreate`; se lança → `error`; senão confere e-mail já visto
     no lote (`duplicate_email`) → `error`; senão `new`;
  4. aluno existente com matrícula **ativa** na turma → `already_enrolled`;
  5. `current_client` igual ao contratante da turma → `registered`, senão `moves`;
  6. em `registered`/`moves`: `archived` = user ou student soft-deletado; `divergent` compara
     nome, e-mail e telefone, sendo que valor vazio na planilha **não** diverge (D17).
- `assertAcademicallyWritable()` no topo (D22). Teto e arquivo inválido recusam a requisição
  inteira, como hoje.

- [ ] **Step 1: testes que falham**, com os nomes exatos:
  - `test_previa_nao_escreve_nada`: contagens de `users`, `students`, `enrollments`,
    `student_client_logs` e `audits` iguais antes e depois de uma prévia com linhas
    `new`/`moves`/`registered` (DoD 1).
  - `test_classifica_as_cinco_situacoes`: um caso por status, com `current_client` em `moves`.
  - `test_divergencia_ignora_celula_vazia`: o cadastro tem telefone e a planilha não, então
    `divergent === []`; o nome difere, então `['name']`.
  - `test_rut_repetido_em_formatos_diferentes_vira_erro_na_segunda` e
    `test_email_repetido_entre_novos_vira_erro_no_segundo`.
  - `test_aluno_arquivado_sai_com_archived_true`.
  - `test_can_update_registration_reflete_a_permissao`.
  - `test_planilha_so_com_cabecalho_devolve_rows_vazio`.
  - `test_turma_nao_gravavel_recusa_previa_422` e `test_redator_recebe_403`.
- [ ] **Step 2:** `--filter=ImportPreviewTest`. Esperado: FAIL.
- [ ] **Step 3:** implementar o enum, os DTOs, o service, a rota, o controller e as mensagens.
  Controller fino: retorna o DTO do service. O service é leitura: nenhuma `DB::transaction`,
  nenhum `save`/`create`.
- [ ] **Step 4:** rodar `typescript:transform`; `--filter=ImportPreviewTest`, `RateLimitTest`,
  `UploadPolicyRatchetTest`, `ParentLockOnChildWriteTest`, `PersistenceLawsTest`,
  `MensagemLiteralTest`, `LocaleParityTest` verdes. Na `RateLimitTest`, acrescentar
  `['POST', 'api/turmas/{turma}/alunos/importar/previa', 'throttle:import']`. Se a
  `ParentLockOnChildWriteTest` classificar o service, colocá-lo em `ISENTAS` com o motivo
  "somente leitura".
- [ ] **Step 5:** commit `feat(44): prévia da planilha sem escrita` (inclui o `generated.ts`).

### Task 4: Confirmação JSON linha a linha

**Files:**
- Create: `backend/app/Domains/Operation/Data/ImportConfirmData.php`
- Create: `backend/app/Domains/Operation/Data/ImportConfirmRowData.php`
- Modify: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` (`import`)
- Modify: `backend/lang/{en,es_CL,pt_BR}/operation.php` (`enrollment.import.update_forbidden`)
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Test: `backend/tests/Feature/Operation/ImportStudentsActionTest.php` (reescrito para a
  entrada nova) e `backend/tests/Feature/Operation/ImportConfirmApiTest.php`

**Interfaces:**
- Consumes: `EnrollStudentAction::execute(Turma, string $rut, string $name, ?string $email,
  ?string $phone): EnrollOutcome`, `UpdateStudentAction::execute(Student, StudentData)`, a
  normalização de RUT e as chaves `duplicate_*` da Task 3.
- Produces:
  - `ImportConfirmRowData` (`#[TypeScript]`): `row:int, rut:string, name:string, email:?string,
    phone:?string, update_registration:bool`. `rules()`: `row` integer ≥ 2; `rut` e `name`
    required string. **Nenhum campo de status ou cliente.** Qualquer chave extra é ignorada (D13).
  - `ImportConfirmData` (`#[TypeScript]`): `rows` como coleção de entrada que **nasce
    `Optional`** (`array|Optional = new Optional`, exigência da `PersistenceLawsTest`); a
    exigência `required|array|min:1|max:100` mora na Action, antes de qualquer escrita, com a
    chave `rows`.
  - `ImportStudentsAction::execute(Turma $turma, ImportConfirmData $data, User $actor): ImportResultData`.
    `ImportResultData` não muda; as recusas saem em `errors` (`ImportRowErrorData{row,message}`).
  - A rota `POST api/turmas/{turma}/alunos/importar` passa a receber JSON. A regra de `file` sai
    do controller.
- Por linha, numa `DB::transaction` própria:
  1. RUT ou e-mail repetido no lote → erro da linha (mesma regra da Task 3);
  2. com `update_registration` e aluno existente: sem `identity.user.update` → erro
     `update_forbidden`; senão `UpdateStudentAction` com nome, e-mail e telefone da linha, e
     campo vazio mantém o valor do cadastro (D17);
  3. `EnrollStudentAction::execute(...)`. A contagem segue a de hoje (`created`, `relinked`,
     `moved`, `already_enrolled`).
  4. Se 2 ou 3 lança `ValidationException`, a transação da linha desfaz tudo e a linha vai para
     `errors`.

- [ ] **Step 1: testes que falham**
  - `test_grava_linhas_boas_e_devolve_as_ruins` (DoD 3/4): uma linha com RUT inválido e uma com
    e-mail que colide, em meio a linhas boas;
  - `test_troca_de_empresa_fecha_log_e_abre_novo`;
  - `test_actualizar_altera_cadastro_e_audita` e `test_mantener_nao_altera_cadastro`;
  - `test_actualizar_com_celula_vazia_preserva_valor`;
  - `test_actualizar_falho_nao_deixa_matricula` (e-mail que colide na atualização: nem update,
    nem matrícula);
  - `test_sem_permissao_de_update_recusa_so_a_linha` (DoD 5);
  - `test_classificacao_enviada_pelo_cliente_e_ignorada`: payload com `status:"new"` e
    `current_client` falso para um aluno de outra empresa; asserta o movimento real;
  - `test_linha_ja_matriculada_conta_e_nao_duplica` e `test_confirmar_duas_vezes_nao_duplica`;
  - `test_rut_repetido_em_formatos_diferentes_recusa_o_segundo`;
  - `test_rows_vazio_ou_acima_de_100_recusa_422_sem_escrever`;
  - `test_turma_nao_gravavel_recusa_422`.
- [ ] **Step 2:** `--filter=ImportStudentsActionTest` e `--filter=ImportConfirmApiTest`.
  Esperado: FAIL.
- [ ] **Step 3:** implementar. O leitor sai da Action, que passa a receber só DTO. Atualizar o
  motivo da `ImportStudentsAction` em `ParentLockOnChildWriteTest::ISENTAS` se a transação por
  linha mudar de dono.
- [ ] **Step 4:** `typescript:transform`; suíte backend inteira verde
  (`docker compose exec -T app php artisan test`). Rodar `cd frontend && pnpm build` e anotar no
  commit que `useImportStudents` está quebrado em tempo de execução até a Task 6 (os tipos dele
  não mudaram, então o build passa).
- [ ] **Step 5:** commit `feat(44): confirmação JSON linha a linha com revalidação`.

### Task 5: Helper de salvar blob como arquivo

**Files:**
- Create: `frontend/src/shared/hooks/useBlobDownload.ts`
- Modify: `frontend/src/shared/hooks/index.ts`
- Test: `frontend/src/shared/hooks/useBlobDownload.test.tsx`

**Interfaces:**
- Produces: `useBlobDownload(): (blob: Blob, filename: string) => void`. Cria um object URL e
  um `<a download>` temporário, clica, remove o elemento e revoga o URL no mesmo tick.

- [ ] **Step 1: teste que falha** — `salva com o nome dado e revoga o object URL`: espiona
  `URL.createObjectURL`/`revokeObjectURL` e `HTMLAnchorElement.prototype.click`; asserta
  `a.download === 'plantilla-alumnos.xlsx'`, um clique, o revoke chamado com o mesmo URL e o
  elemento fora do DOM depois.
- [ ] **Step 2:** `pnpm test -- useBlobDownload`. Esperado: FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `pnpm test`, `pnpm lint` verdes.
- [ ] **Step 5:** commit `feat(44): helper de download de blob em shared/hooks`.

### Task 6: API e máquina de estados da importação

**Files:**
- Modify: `frontend/src/features/operation/api/useImportStudents.ts` (vira
  `usePreviewImport`, `useConfirmImport` e `useDownloadImportTemplate` no mesmo arquivo)
- Modify: `frontend/src/features/operation/hooks/useImportStudentsFlow.ts`
- Test: `frontend/src/features/operation/hooks/useImportStudentsFlow.test.tsx`

**Interfaces:**
- Consumes: os tipos gerados `ImportPreviewData`, `ImportPreviewRowData`, `ImportRowStatus`,
  `ImportConfirmRowData` e `ImportResultData` (Tasks 3 e 4); `useBlobDownload` (Task 5);
  `postMultipart`; `problemFromBlob`.
- Produces (o retorno de `useImportStudentsFlow(turmaId: number)`, consumido pela Task 7):
  ```ts
  type TriageRow = ImportPreviewRowData & {
    edited: boolean
    removed: boolean
    update_registration: boolean
  }
  {
    step: 'upload' | 'triage' | 'result'
    rows: TriageRow[]                       // em triagem: as linhas não removidas
    counts: Record<ImportRowStatus, number>
    sendableCount: number
    canUpdateRegistration: boolean
    result: ImportResultData | null
    pending: boolean
    sizeError: string | null
    upload: (files: File[]) => void
    edit: (row: number, patch: Pick<TriageRow, 'rut' | 'name' | 'email' | 'phone'>) => void
    remove: (row: number) => void
    setUpdate: (row: number, value: boolean) => void
    confirm: () => void
    downloadTemplate: () => void
    close: () => void
  }
  ```
- Regras (D12, D16):
  - **é enviável** a linha não removida que não é `already_enrolled` e que não é `error`, ou
    que é `error` mas foi editada;
  - `edit` marca `edited`; em linha `registered`/`moves`, `edit` ignora `rut` (travado) e liga
    `update_registration`;
  - `setUpdate(row, false)` numa linha editada restaura os valores da prévia;
  - a chave da linha é `row` (o número da linha na planilha);
  - `confirm` envia `{ rows: sendable.map(({row,rut,name,email,phone,update_registration}) => ...) }`;
  - quando o resultado traz `errors`, `step` vai para `result` e `rows` passa a ser as linhas
    recusadas, com `status: 'error'`, `message` do servidor e `edited: false`; voltar à triagem
    reenvia só essas;
  - `close` em voo é inerte; fora de voo, zera tudo e volta para `upload`;
  - em sucesso de `confirm`, invalida a query da lista de matrículas da turma (mesma key que a
    matrícula avulsa invalida).

- [ ] **Step 1: testes que falham** (mock de rede no padrão dos `.test.tsx` vizinhos em
  `features/operation/hooks/`):
  - `upload leva a triage com as contagens`;
  - `planilha vazia fica em triage com rows vazio e sendableCount 0`;
  - `editar linha registrada trava rut e liga update_registration`;
  - `desligar update em linha editada restaura valores da prévia`;
  - `linha error só é enviada depois de editada; already_enrolled nunca`;
  - `confirm envia só os campos permitidos` (asserta o corpo exato, sem `status`);
  - `recusadas voltam como rows com a mensagem do servidor`;
  - `close no meio da triagem descarta sem chamar a API e volta a upload`.
- [ ] **Step 2:** `pnpm test -- useImportStudentsFlow`. Esperado: FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `pnpm test`, `pnpm lint` e `pnpm build` verdes. O `ImportDialog` pode quebrar o
  tipo aqui: ajuste o mínimo para compilar, e a tela vem na Task 7.
- [ ] **Step 5:** commit `feat(44): fluxo de prévia, triagem e confirmação no front`.

### Task 7: Diálogo de triagem

**Files:**
- Modify: `frontend/src/features/operation/components/Enrollment/ImportDialog.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/ImportTriageTable.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/ImportRowEditor.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/ImportCounts.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/ImportResultSummary.tsx` (só se
  precisar do botão "Corregir filas rechazadas")
- Modify: `frontend/src/shared/config/locales/{es-CL,en,pt-BR}.json`

**Interfaces:**
- Consumes: o retorno de `useImportStudentsFlow` (Task 6); `AppDialog`, `AppDataTable`,
  `AppTag`, `AppButton`, `AppInputText`, `AppFileUpload`, `FormField`, de `shared/ui`.

O layout segue o D7 da spec: diálogo `lg`; cabeçalho com o título e a turma, mais o link
"Descargar plantilla" (`AppButton` com papel `link`); `ImportCounts` com as tags de tom
(nuevos = sucesso, ya registrados = neutro, cambian de empresa = aviso, ya matriculados =
neutro, con error = perigo); tabela com Fila, RUT (`identifierClass`), Nombre, Email, Situación
(a tag mais uma linha secundária: "<empresa atual> → <empresa da turma>", "Registro: <nome do
cadastro>", "Archivado · se reactivará", "Se omite" ou a mensagem de erro; a marca "Editada · se
valida al confirmar"; e, com `canUpdateRegistration` e linha `divergent` ou editada, o par
*Mantener registro*/*Actualizar*) e ações (editar, quitar). O rodapé tem "Las filas con error
no se envían", Cancelar (`text`) e "Confirmar {{count}} filas" (primário, desabilitado com
`sendableCount === 0`). A linha em edição abre `ImportRowEditor` inline (RUT desabilitado em
`registered`/`moves`). Com `rows` vazio, a mensagem fica no lugar da tabela. As cores vêm só
dos tokens.

- [ ] **Step 1:** implementar os componentes e as chaves `operation.enrollment.import.*` nos três
  locales (es-CL como referência).
- [ ] **Step 2:** `pnpm lint` (`max-lines` 150, papel de botão, `role="list"`), `pnpm build` e
  `pnpm test` verdes; o teste de paridade dos locales, se existir, também verde.
- [ ] **Step 3:** commit `feat(44): diálogo de triagem da importação`.

### Task 8: Jornada no navegador e DoD

**Files:** nenhum de produto. Evidências em
`docs/superpowers/blocos/44-operacao-importacao-de-alunos-com-triagem/jornada.md`.

- [ ] **Step 1:** subir o stack da lane (`docker compose up -d`, HTTP 8081, Vite 5174), rodar
  `migrate` e `db:seed` e logar como admin.
- [ ] **Step 2:** percorrer a jornada numa turma em andamento: baixar o modelo; preencher 6
  linhas (nova, registrada com nome divergente, de outra empresa, já matriculada, RUT inválido,
  RUT repetido); importar; conferir as contagens e as linhas secundárias; quitar uma linha;
  corrigir o RUT inválido; marcar *Actualizar* na divergente; confirmar; ver o resumo; forçar
  uma recusa (e-mail de outro aluno na linha corrigida) e ver a linha voltar para a triagem.
- [ ] **Step 3:** registrar em `jornada.md` o que foi visto em cada passo, com o print de cada
  estado do diálogo salvo no scratchpad e citado por caminho.
- [ ] **Step 4:** suíte backend inteira, `pnpm lint`, `pnpm build` e `pnpm test` verdes; commit
  `docs(44): jornada da importação com triagem`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2, 5 | sim — Task 1: `SpreadsheetRowReader`, `SpreadsheetTemplate`, `EnrollmentController`, `routes.php`, `SpreadsheetTemplateTest`; Task 2: `StudentResolver`, `StudentResolverTest`; Task 5: `shared/hooks/useBlobDownload*`, `shared/hooks/index.ts` | nenhuma entre elas |

Ordem: G1 → 3 → 4 → 6 → 7 → 8. As Tasks 3 e 4 tocam `EnrollmentController`, `routes.php`,
`lang/*/operation.php` e `generated.ts`, e a 4 consome as regras de duplicidade da 3. As Tasks
6 e 7 consomem os tipos gerados e o contrato do hook. Task fora de grupo executa e revisa uma a
uma.

## Handoff de execução

- **executor:** `claude`. O bloco toca as leis 3, 4 e 6, troca o contrato de uma rota que grava
  com peso legal (vínculo e cadastro de aluno) e pede julgamento visual no navegador; não é
  mecânico com paths fechados.
- **Sessão:** modelo `opus`, esforço da sessão, na lane
  `/home/jvbat/projetos/lotus-44-operacao-importacao-de-alunos-com-triagem` (offset +1).
- **Papéis** (`.claude/papeis.md`):
  - `implementador-mecanico` na Task 5 (1–2 arquivos, contrato fechado);
  - `implementador-integracao` nas Tasks 1, 2, 3, 4, 6 e 7;
  - `revisor-task` em cada task; `re-revisor` e `corretor-tardio` nas rodadas de correção;
  - `revisor-branch` ao fim;
  - a Task 8 é da sessão principal (stack e navegador), sem despacho.

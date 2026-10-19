# Carga inicial da produção (recorte 2026) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dois comandos artisan — um extrai a planilha da v1 para um arquivo canônico fora do git,
o outro carrega esse arquivo na base com `--simular` — e o ensaio com o dado real que prova as
contagens do recorte 2026.

**Architecture:** o extrator (`lotus:extrair-carga-inicial`) guarda todo o conhecimento da v1:
recorte, exclusões, agrupamento em turmas e o complemento curado. Ele grava `carga.json`,
`documentos/` e `relatorio.md` numa pasta de dados fora do repositório. A carga
(`lotus:carga-inicial`) não sabe nada da v1: valida o `carga.json`, grava por Eloquent, com
auditoria, as invariantes do v2 e as datas históricas, e é idempotente. O código mora em
`backend/app/Console/`, fora de `app/Domains`.

**Tech Stack:** Laravel 13 / PHP 8.3, OpenSpout 5 (leitura e escrita de xlsx), Poppler
(`pdfseparate`/`pdfunite`, presente no container `app`), `ZipArchive`, owen-it/laravel-auditing,
PHPUnit (sqlite `:memory:`).

**Spec:** `docs/superpowers/blocos/38-seeder-carga-inicial-producao/spec.md` (leia junto). Context
Packet: `context.md` na mesma pasta.

## Global Constraints

- **Dado pessoal fora do git:** RUT, nome, e-mail e telefone de aluno **e de redator** nunca entram
  no repositório, nem em `backend/`, nem em fixture de teste. Fixture usa RUT fictício com DV válido
  gerado no teste (`CargaSintetica::rut()`) e nomes inventados.
- **Coluna `CLAVE`:** coluna Z, índice 25, da aba `REGISTROS`. Guarda senhas. O leitor descarta
  tudo além do índice 24 antes de qualquer outro uso, e nada da `CLAVE` vai a saída, log ou
  relatório.
- **Nenhum e-mail, convite ou notificação.** A carga não chama `CreateRedatorAction` nem
  `SendRedatorAccessInvitationAction`.
- **Auditoria ligada (lei 2):** toda escrita em modelo auditável é por Eloquent (`save`/`create`),
  sem `WithoutModelEvents` e sem `DB::table` em tabela auditável. Pivot só por
  `App\Shared\Audit\PivotAudit` (catraca `PersistenceLawsTest`).
- **Exceção sem texto literal:** a mensagem chega por variável (catraca `MensagemLiteralTest`). A
  saída de console é em português e literal, como em `PodarLogins`.
- **Data de calendário nunca do relógio do servidor** (catraca `DataDeCalendarioTest`). O instante
  histórico é sempre `Instante::meioDia($dataIso)`: 12:00 de Santiago, em UTC.
- **Arquivos que não se tocam** (são da lane 39 ou do fluxo vivo): `PivotAudit`,
  `RedatorIdoneidadeService`, `DesignateRedatorAction`, `CertificateNumberService`,
  `CertificateSnapshotBuilder`, a tabela `certificate_sequences` e o Blade do certificado.
- **Valores fixos:** e-mail sintético `<número><dv minúsculo>@sin-correo.invalid`; `budgets.id` =
  número da SCAP, com `code` = `Scap <n>`; `seq_in_budget = 1`; `schema_version` do snapshot =
  `CertificateSnapshotData::CURRENT_VERSION` (2); do snapshot, `curso.technical_name` = `null`,
  `template.version` = `null`, `template.city` = `ciudad_emision` = a cidade impressa.
- **Comandos:**
  - suba a stack da lane uma vez com `docker compose up -d` (offset +2) e rode os testes com
    `docker compose exec -T app php artisan test --filter=<Nome>`;
  - se o `artisan test` fatalar por memória, refaça a imagem: `docker compose build app` (P-57);
  - Pint roda no host, de `backend/`, sempre com os caminhos: `./vendor/bin/pint <arquivos>`;
  - `git add` só com caminhos exatos;
  - mensagem de commit `feat(38): …`, terminada por
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Datas:** uma data da planilha pode vir como data do Excel, como número serial ou como texto
   `dd/mm/aaaa`, e as três têm de virar a mesma ISO. Teste na Task 5.
2. **Espaço a mais no nome:** espaço sobrando ou duplo no nome do mesmo RUT não é "nome diferente"
   e não pode excluir a pessoa. Teste na Task 5.
3. **Grafia do RUT:** sem pontos ou com `k` minúsculo, ele casa com o RUT formatado tanto no
   extrator quanto na carga, e o e-mail sintético sai igual nos dois caminhos. Testes nas Tasks 2
   e 5.
4. **`--simular` contra S3 real:** nada pode subir ao disco nem ficar no banco. Teste na Task 4.
5. **Pasta de dados dentro de `backend/`:** o extrator recusa, para dado pessoal não entrar na
   árvore. Teste na Task 6.

---

### Task 1: Contrato do arquivo canônico

**Files:**
- Create: `backend/app/Console/CargaInicial/ArquivoDeCarga.php`
- Create: `backend/app/Console/CargaInicial/CargaInvalidaException.php`
- Create: `backend/app/Console/CargaInicial/Instante.php`
- Create: `backend/tests/Support/CargaInicial/CargaSintetica.php`
- Test: `backend/tests/Feature/CargaInicial/ArquivoDeCargaTest.php`

**Interfaces:**
- Consumes: `App\Shared\Support\Rut`, `App\Shared\Support\FusoDoNegocio::inicioDoDia()`,
  `App\Domains\Identity\Enums\RedatorDocumentType`, `App\Domains\Operation\Enums\EnrollmentApprovalStatus`.
- Produces:
  - `ArquivoDeCarga::ler(string $pasta): array` lê `$pasta/carga.json`, roda `validar($carga, $pasta)`
    e devolve o array; com erro, lança `CargaInvalidaException`.
  - `ArquivoDeCarga::validar(array $carga, ?string $pasta = null): list<string>` devolve a lista de
    erros, vazia quando o arquivo é válido. Com `$pasta`, também confere que cada `documentos.*.arquivo`
    existe sob a pasta.
  - `CargaInvalidaException::__construct(list<string> $erros)` e `erros(): list<string>`.
  - `Instante::meioDia(string $data): CarbonImmutable` devolve
    `FusoDoNegocio::inicioDoDia(CarbonImmutable::parse($data))->addHours(12)`.
  - `CargaSintetica::payload(): array`, `CargaSintetica::gravarEm(string $pasta, ?array $payload = null): void`
    (grava `carga.json` e um PDF real em cada `documentos.*.arquivo`, com os bytes de
    `BuildsRealUploads::pdfReal()`) e `CargaSintetica::rut(int $numero): string`, que devolve o RUT
    formatado com o DV que torna `Rut::parse()->isValid()` verdadeiro.

**Formato do `carga.json` (`schema_version` 1).** É o contrato entre as Tasks 2 a 6.

```json
{
  "schema_version": 1,
  "cliente": {
    "rut": "<rut>", "name": "<nome curto>", "legal_name": "<razão social>",
    "business_activity": "<giro>|null", "email": "<sintético>", "desde": "AAAA-MM-DD",
    "endereco": {"line1": "…", "line2": null, "number": "…|null", "commune": "…|null",
                 "city": "…|null", "region": "…|null", "zip_code": null} ,
    "contato": {"name": "…", "email": "…|null", "phone": "…|null", "job_title": "…|null"}
  },
  "cursos": [{"chave": "200#", "name": "…", "technical_name": "…|null", "description": "…|null",
              "workload_hours": 16,
              "modulos": [{"name": "…", "learnings": null, "contents": "…|null",
                           "theory_hours": 0, "practice_hours": 0}]}],
  "redatores": [{"chave": "MAO", "name": "…", "rut": "…", "email": "…", "phone": "…|null",
                 "cursos": ["200#"],
                 "documentos": [{"type": "CV", "arquivo": "documentos/MAO-CV.pdf",
                                 "original_name": "….pdf", "valid_until": null}]}],
  "alunos": [{"rut": "…", "name": "…", "email": "…", "desde": "AAAA-MM-DD"}],
  "orcamentos": [{
    "scap": 176, "data": "AAAA-MM-DD",
    "cotacao": {"curso": "051#", "student_count": 11, "value_uf": "122.3200",
                "status": "approved|pending", "approved_on": "AAAA-MM-DD|null"},
    "turma": null | {"curso": "051#", "local_aplicacao": "Talca", "start_date": "…", "end_date": "…",
      "redator": "MAO",
      "matriculas": [{"aluno": "<rut>", "nota": 7, "approval_status": "aprobado",
        "certificado": {"codigo": "LOT-2026-001", "emitido_em": "…", "valido_ate": "…",
          "aluno_impresso": "…", "curso_impresso": "…", "horas_impressas": 8,
          "cliente_impresso": "…", "cliente_rut_impresso": "…", "redator_impresso": "…",
          "cidade": "Talca"}}]}
  }]
}
```

**Regras de `validar`.** Cada erro é uma frase que cita o caminho ou a chave do item.

- **Tipos:**
  - `schema_version === 1`;
  - os campos obrigatórios presentes, com o tipo acima;
  - datas no formato `Y-m-d`;
  - `end_date >= start_date`;
  - `value_uf` numérico e ≥ 0;
  - `nota` nula ou numérica;
  - `approval_status` entre os valores de `EnrollmentApprovalStatus`;
  - `documentos.*.type` entre os de `RedatorDocumentType`;
  - `cotacao.status` igual a `approved` ou `pending`;
  - `approved_on` preenchido se e só se o status for `approved`.
- **Unicidade:**
  - `cursos.*.chave`;
  - `redatores.*.chave`, `.rut` e `.email`;
  - `alunos.*.rut` e `.email`;
  - `orcamentos.*.scap`;
  - o `certificado.codigo` em todo o arquivo;
  - `matriculas.*.aluno` dentro de cada turma;
  - `documentos.*.type` dentro de cada redator.
- **RUT:** o do cliente, os dos redatores e os dos alunos passam em `Rut::parse()->isValid()`.
- **Referências:**
  - `cotacao.curso`, `turma.curso` e `redatores.*.cursos.*` existem entre as chaves de `cursos`;
  - `turma.redator` existe entre as chaves de `redatores`;
  - `matriculas.*.aluno` existe em `alunos.*.rut` (comparando por `Rut::parse()->format()`);
  - `turma.curso === cotacao.curso`;
  - turma não nula exige `cotacao.status === 'approved'`.

- [ ] **Step 1: Escrever os testes que falham**

```php
public function test_carga_sintetica_e_valida(): void
{
    $this->assertSame([], ArquivoDeCarga::validar(CargaSintetica::payload()));
}

public function test_ler_recusa_schema_version_desconhecida(): void
{
    $p = CargaSintetica::payload();
    $p['schema_version'] = 2;
    CargaSintetica::gravarEm($pasta = $this->pastaTemporaria(), $p);

    try {
        ArquivoDeCarga::ler($pasta);
        $this->fail('esperava CargaInvalidaException');
    } catch (CargaInvalidaException $e) {
        $this->assertStringContainsString('schema_version', implode("\n", $e->erros()));
    }
}

public function test_validar_acusa_curso_inexistente_codigo_repetido_rut_invalido_e_turma_nao_aprovada(): void
{
    $p = CargaSintetica::payload();
    $p['orcamentos'][0]['cotacao']['curso'] = 'Z#';
    $p['orcamentos'][1]['turma']['matriculas'][0]['certificado']['codigo'] = 'LOT-2026-001';
    $p['alunos'][0]['rut'] = '11.111.111-2';
    $p['orcamentos'][1]['cotacao']['status'] = 'pending';
    $erros = implode("\n", ArquivoDeCarga::validar($p));

    $this->assertStringContainsString('Z#', $erros);
    $this->assertStringContainsString('LOT-2026-001', $erros);
    $this->assertStringContainsString('11.111.111-2', $erros);
    $this->assertStringContainsString('180', $erros); // a SCAP da turma em cotação pendente
}

public function test_ler_acusa_documento_ausente_na_pasta(): void
{
    CargaSintetica::gravarEm($pasta = $this->pastaTemporaria());
    unlink("{$pasta}/documentos/R1-CV.pdf");

    $this->expectException(CargaInvalidaException::class);
    ArquivoDeCarga::ler($pasta);
}

public function test_instante_e_meio_dia_de_santiago_em_utc(): void
{
    $this->assertTrue(Instante::meioDia('2026-07-10')->equalTo(
        CarbonImmutable::parse('2026-07-10 12:00:00', 'America/Santiago')->utc()
    ));
}
```

A `CargaSintetica::payload()` tem exatamente o seguinte; as Tasks 2 a 4 afirmam sobre estes valores.

- **Cliente:**
  - RUT `rut(76111111)`, `name` = `EMPRESA PRUEBA LTDA.`, `legal_name` = `Empresa Prueba Servicios Ltda.`, `business_activity` = `Servicios`, `desde` = `2026-02-13`;
  - endereço: `line1` = `Calle Uno`, `number` = `100`, `commune` e `city` = `Talca`, `region` = `Maule`;
  - contato `Contacto Prueba`.
- **Cursos:**
  - `A#`: `Curso A (16 h)`, `technical_name` = `Nombre Técnico A`, 16 h, módulos `Módulo 1` e `Módulo 2`, com `contents` = `Contenido 1` e `Contenido 2`;
  - `B#`: `Curso B`, `technical_name` nulo, `description` = `Descripción B`, 4 h, sem módulos.
- **Redator `R1`:** `Relator Prueba`, RUT `rut(15111111)`, `relator@prueba.test`, cursos `A#` e `B#`, documentos `CV` (`documentos/R1-CV.pdf`) e `REUF` (`documentos/R1-REUF.pdf`, `valid_until` nulo).
- **Alunos:** `Alumno Uno` (`rut(16111111)`) e `Alumno Dos` (`rut(16222222)`), ambos com `desde` = `2026-02-13`; `Alumno Tres` (`rut(16333333)`), com `desde` = `2026-03-02`.
- **SCAP 176:**
  - orçamento com `data` = `2026-02-13`;
  - cotação `A#`, `student_count` 2, 122.3200 UF, `approved` em `2026-02-13`;
  - turma `A#` em Talca, de `2026-02-13` a `2026-02-14`, redator `R1`;
  - matrícula de Uno: nota 7 e `LOT-2026-001`, emitido em `2026-02-20`, válido até `2028-01-13`. Impresso: aluno `ALUMNO UNO`, curso `Nombre Técnico A`, 16 h, cliente `EMPRESA PRUEBA LTDA.` com o RUT do cliente, redator `Relator P.`, cidade `Talca`;
  - matrícula de Dos: nota nula e `LOT-2026-002`, mesmas datas.
- **SCAP 180:**
  - orçamento com `data` = `2026-03-02`;
  - cotação `B#`, `student_count` 1, 16.4700 UF, `approved` em `2026-03-02`;
  - turma `B#` em Santiago, em `2026-03-02`, redator `R1`;
  - matrícula de Tres: nota 6 e `LOT-2026-003`, emitido em `2026-03-05`, válido até `2028-02-02`, cidade `Santiago`.
- **SCAP 177:** orçamento com `data` = `2026-03-10`; cotação `B#`, `student_count` 10, 0.0000 UF, `pending`; sem turma.
- **E-mails:** `<número><dv>@sin-correo.invalid`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ArquivoDeCargaTest`
Expected: FAIL com `Class "App\Console\CargaInicial\ArquivoDeCarga" not found`.

- [ ] **Step 3: Implementar `ArquivoDeCarga`, `CargaInvalidaException`, `Instante` e `CargaSintetica`**

`validar` usa `Validator::make` para os tipos e laços próprios para unicidade e referências.
Mensagens próprias com `sprintf`. A exceção monta a mensagem com `implode("\n", $erros)`, sem
literal.

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=ArquivoDeCargaTest`
Expected: PASS (5 testes).

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Console/CargaInicial/ArquivoDeCarga.php app/Console/CargaInicial/CargaInvalidaException.php app/Console/CargaInicial/Instante.php tests/Support/CargaInicial/CargaSintetica.php tests/Feature/CargaInicial/ArquivoDeCargaTest.php && cd ..
git add backend/app/Console/CargaInicial/ArquivoDeCarga.php backend/app/Console/CargaInicial/CargaInvalidaException.php backend/app/Console/CargaInicial/Instante.php backend/tests/Support/CargaInicial/CargaSintetica.php backend/tests/Feature/CargaInicial/ArquivoDeCargaTest.php
git commit -m "feat(38): contrato do arquivo canônico da carga inicial"
```

---

### Task 2: Carga dos cadastros (cliente, alunos, redatores, cursos)

**Files:**
- Create: `backend/app/Console/CargaInicial/Contagem.php`
- Create: `backend/app/Console/CargaInicial/Cadastros.php`
- Create: `backend/app/Console/CargaInicial/CarregadorDeCadastros.php`
- Test: `backend/tests/Feature/CargaInicial/CarregadorDeCadastrosTest.php`

**Interfaces:**
- Consumes: Task 1 (`CargaSintetica`, `Instante`), `UploadFileAction::execute()`, `PivotAudit::syncWithoutDetaching()`, `ContentClass::Documento->mimes()` / `->tetoEmKb()`.
- Produces:
  - `Contagem`: `criado(string $entidade): void`, `existente(string $entidade): void`, `conflito(string $mensagem): void`, `temConflito(): bool`, `conflitos(): list<string>`, `linhas(): list<array{0: string, 1: int, 2: int}>` (entidade, criados, existentes, na ordem da primeira menção), `arquivoGravado(string $path): void`, `arquivosGravados(): list<string>`.
  - `Cadastros` (readonly): `?Client $cliente`, `array<string, Student> $alunos` (chave = RUT formatado), `array<string, Course> $cursos` (chave = `chave` do curso), `array<string, Redator> $redatores` (chave = `chave` do redator). Entidade em conflito **não** entra no mapa.
  - `CarregadorDeCadastros::__construct(UploadFileAction $upload)` e `carregar(array $carga, string $pasta, bool $gravarArquivos, Contagem $contagem): Cadastros`.
  - Nomes de entidade na `Contagem`: `clientes`, `alunos`, `redatores`, `documentos`, `cursos`, `modulos`.

**Regras** (spec §5.1, §5.2, §7). Usuário se procura por `User::withTrashed()->where('rut', Rut::parse($rut)->format())`.

- **Cliente:**
  - Casamento:
    - usuário `type=cliente` com `client` de mesmo `legal_name`: `existente`;
    - outro tipo ou outro `legal_name`: `conflito`;
    - e-mail já usado por outro RUT: `conflito`.
  - Criação:
    - `User` com `type=cliente`, `is_active=false` e senha `bin2hex(random_bytes(16))`;
    - `Client` com `type=client`;
    - um `ClientAddress` e um `ClientContact`, ambos `is_primary=true`;
    - `created_at` e `updated_at` = `Instante::meioDia(desde)` em todos.
- **Aluno:**
  - Casamento: mesmo critério, com `type=aluno` e mesmo `name`.
  - Criação:
    - `User` com `type=aluno` e `is_active=false`;
    - `Student` com `current_client_id` = cliente;
    - `StudentClientLog` com `started_on` = `desde` e `ended_on` nulo;
    - os três com data `Instante::meioDia(desde)`;
    - aluno que já existe não ganha vínculo novo.
- **Redator:**
  - Casamento: `type=redator` com o mesmo e-mail é `existente`; o resto é `conflito`.
  - Criação:
    - `User` com `type=redator`, `is_active=true` e `phone`, depois `syncRoles(['redator'])`;
    - `Redator`;
    - data = o instante da carga (default do Eloquent).
  - Habilitação: `PivotAudit::syncWithoutDetaching($redator, 'courses', ids)` nos cursos que **não** estão em conflito.
- **Documento:**
  - Casamento: documento ativo de mesmo `type` no redator é `existente`.
  - Validação, nos dois modos, antes de qualquer gravação. É `conflito`:
    - arquivo ausente;
    - mime fora de `ContentClass::Documento->mimes()` (lido com `finfo`);
    - tamanho acima de `tetoEmKb() * 1024`.
  - Gravação:
    - com `$gravarArquivos`: `UploadFileAction::execute($redator, new UploadedFile($caminho, $original, null, null, true), $type, $validUntil)`, seguido de `arquivoGravado($file->path)` e `criado('documentos')`;
    - sem `$gravarArquivos`: só `criado('documentos')`.
- **Curso:**
  - Casamento: `Course::withTrashed()->where('name')` com o mesmo `workload_hours` é `existente` (os módulos não se tocam). Horas diferentes ou curso arquivado é `conflito`.
  - Criação: `Course` mais os `CourseModule`, com `sort_order` 1…n na ordem do arquivo.
- **Contagem:** cada criação chama `criado(<entidade>)`, e `modulos` conta um por módulo.

- [ ] **Step 1: Escrever os testes que falham.** O `setUp` faz `$this->seed(RolePermissionSeeder::class)`, `Storage::fake('s3')`, `Notification::fake()` e `Mail::fake()`, e grava a carga sintética numa pasta temporária.

```php
public function test_cria_cliente_com_endereco_contato_e_datas_historicas(): void
{
    $cad = $this->carregar();
    $this->assertSame('Empresa Prueba Servicios Ltda.', $cad->cliente->legal_name);
    $this->assertFalse($cad->cliente->user->is_active);
    $this->assertSame('cliente', $cad->cliente->user->type);
    $this->assertTrue($cad->cliente->addresses()->sole()->is_primary);
    $this->assertSame('Contacto Prueba', $cad->cliente->contacts()->sole()->name);
    $this->assertTrue($cad->cliente->created_at->equalTo(Instante::meioDia('2026-02-13')));
}

public function test_cria_alunos_inativos_com_email_sintetico_e_vinculo_desde_o_primeiro_curso(): void
{
    $cad = $this->carregar();
    $tres = $cad->alunos[CargaSintetica::rut(16333333)];
    $this->assertFalse($tres->user->is_active);
    $this->assertStringEndsWith('@sin-correo.invalid', $tres->user->email);
    $this->assertSame($cad->cliente->id, $tres->current_client_id);
    $this->assertSame('2026-03-02', StudentClientLog::where('student_id', $tres->id)->sole()->started_on->toDateString());
    $this->assertTrue($tres->created_at->equalTo(Instante::meioDia('2026-03-02')));
}

public function test_cria_redator_ativo_sem_convite_com_role_habilitacao_e_documentos(): void
{
    $cad = $this->carregar();
    $r1 = $cad->redatores['R1'];
    $this->assertTrue($r1->user->is_active);
    $this->assertTrue($r1->user->hasRole('redator'));
    $this->assertEqualsCanonicalizing([$cad->cursos['A#']->id, $cad->cursos['B#']->id], $r1->courses()->pluck('courses.id')->all());
    $this->assertEqualsCanonicalizing(['CV', 'REUF'], $r1->documents()->pluck('type')->all());
    Storage::disk('s3')->assertExists($r1->documents()->where('type', 'CV')->value('path'));
    Notification::assertNothingSent();
    Mail::assertNothingSent();
}

public function test_cria_cursos_com_modulos_em_ordem(): void
{
    $cad = $this->carregar();
    $this->assertSame(['Módulo 1', 'Módulo 2'], $cad->cursos['A#']->modules()->orderBy('sort_order')->pluck('name')->all());
    $this->assertSame(0, $cad->cursos['B#']->modules()->count());
}

public function test_segunda_carga_conta_tudo_como_existente_e_nao_grava_nada(): void
{
    $this->carregar();
    $audits = Audit::count();
    $contagem = new Contagem;
    $this->carregar($contagem);
    $this->assertSame($audits, Audit::count());
    foreach ($contagem->linhas() as [$entidade, $criados]) {
        $this->assertSame(0, $criados, $entidade);
    }
}

public function test_sem_gravar_arquivos_nao_sobe_documento_nem_cria_linha(): void
{
    $contagem = new Contagem;
    $this->carregar($contagem, gravarArquivos: false);
    $this->assertSame([], Storage::disk('s3')->allFiles());
    $this->assertSame(0, File::count());
    $this->assertContains(['documentos', 2, 0], $contagem->linhas());
}

public function test_rut_sem_pontos_e_k_minusculo_casa_com_o_formatado(): void
{
    $this->carregar();
    $p = CargaSintetica::payload();
    $p['alunos'][0]['rut'] = str_replace(['.', '-'], '', strtolower($p['alunos'][0]['rut']));
    $contagem = new Contagem;
    $this->carregar($contagem, payload: $p);
    $this->assertContains(['alunos', 0, 3], $contagem->linhas());
}

public function test_rut_de_aluno_ja_usado_por_outro_tipo_e_conflito(): void
{
    User::factory()->create(['rut' => CargaSintetica::rut(16111111), 'type' => 'admin']);
    $contagem = new Contagem;
    $cad = $this->carregar($contagem);
    $this->assertTrue($contagem->temConflito());
    $this->assertArrayNotHasKey(CargaSintetica::rut(16111111), $cad->alunos);
}

public function test_email_de_redator_ja_usado_por_outro_usuario_e_conflito(): void
{
    User::factory()->create(['email' => 'relator@prueba.test', 'rut' => CargaSintetica::rut(17111111)]);
    $contagem = new Contagem;
    $this->carregar($contagem);
    $this->assertStringContainsString('relator@prueba.test', implode("\n", $contagem->conflitos()));
}

public function test_documento_que_nao_e_pdf_e_conflito(): void
{
    file_put_contents("{$this->pasta}/documentos/R1-CV.pdf", 'texto puro');
    $contagem = new Contagem;
    $this->carregar($contagem);
    $this->assertStringContainsString('R1-CV.pdf', implode("\n", $contagem->conflitos()));
}

public function test_email_sintetico_passa_na_regra_email_do_laravel(): void
{
    $this->assertTrue(Validator::make(['e' => '161111119@sin-correo.invalid'], ['e' => 'email'])->passes());
}
```

`carregar(?Contagem $c = null, bool $gravarArquivos = true, ?array $payload = null): Cadastros`
é um helper do teste. Ele chama
`app(CarregadorDeCadastros::class)->carregar($payload ?? CargaSintetica::payload(), $this->pasta, $gravarArquivos, $c ?? new Contagem)`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=CarregadorDeCadastrosTest`
Expected: FAIL com `Class "App\Console\CargaInicial\CarregadorDeCadastros" not found`.

- [ ] **Step 3: Implementar `Contagem`, `Cadastros` e `CarregadorDeCadastros`.** Os modelos se criam com `new Model` + `forceFill([...])` + `save()`, para aceitar `created_at`/`updated_at` explícitos. O docblock da classe diz qual Action cada bloco contorna e por quê (spec §5.1, coluna "Contorna").

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=CarregadorDeCadastrosTest`
Expected: PASS (10 testes).

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Console/CargaInicial/Contagem.php app/Console/CargaInicial/Cadastros.php app/Console/CargaInicial/CarregadorDeCadastros.php tests/Feature/CargaInicial/CarregadorDeCadastrosTest.php && cd ..
git add backend/app/Console/CargaInicial/Contagem.php backend/app/Console/CargaInicial/Cadastros.php backend/app/Console/CargaInicial/CarregadorDeCadastros.php backend/tests/Feature/CargaInicial/CarregadorDeCadastrosTest.php
git commit -m "feat(38): carga dos cadastros com datas históricas e sem convite"
```

---

### Task 3: Carga do histórico (orçamentos, cotações, turmas, matrículas, certificados)

**Files:**
- Create: `backend/app/Console/CargaInicial/CarregadorDeHistorico.php`
- Test: `backend/tests/Feature/CargaInicial/CarregadorDeHistoricoTest.php`

**Interfaces:**
- Consumes: Tasks 1 e 2 (`Cadastros`, `Contagem`, `CarregadorDeCadastros`, `Instante`, `CargaSintetica`), `CertificateSnapshotData` e os `Snapshot*Data` (`App\Domains\Certification\Data\Snapshot`), `PivotAudit::syncWithoutDetaching()`.
- Produces: `CarregadorDeHistorico::carregar(array $carga, Cadastros $cadastros, Contagem $contagem): void`, com as entidades `orcamentos`, `cotacoes`, `turmas`, `matriculas` e `certificados`.

**Regras** (spec §5.1, §5.2, §6, §7). Quando a dependência ficou em conflito (cliente nulo, curso, aluno ou redator fora do mapa), a entidade é pulada sem nova linha: o conflito já foi contado.

- **Orçamento:**
  - Casamento: `Budget::withTrashed()->find($scap)` com o mesmo `client_id` e `code` = `Scap n` é `existente`; o resto é `conflito`, e os dependentes da SCAP são pulados.
  - Criação: `new Budget([...])`, com `id = $scap`, `code` = `"Scap {$scap}"` e datas em `Instante::meioDia(data)`.
- **Cotação:**
  - Casamento: (`budget_id`, `seq_in_budget = 1`), com o mesmo `course_id` e `status` é `existente`.
  - Criação: `seq_in_budget = 1` atribuído direto (está fora do fillable), `approved_at` = `Instante::meioDia(approved_on)` ou nulo, e `created_at` = `Instante::meioDia(data)`.
- **Turma:**
  - Casamento: `Turma::withTrashed()->where('quote_id')`, com o mesmo `course_id` e `start_date`.
  - Criação:
    - `modalidade = presencial`, `status = concluida`;
    - `concluded_at` = `Instante::meioDia(end_date)` e `created_at` = `Instante::meioDia(start_date)`;
    - em seguida, `PivotAudit::syncWithoutDetaching($turma, 'redatores', [$redator->id])`.
- **Matrícula:**
  - Casamento: (`turma_id`, `student_id`) com `withTrashed`.
  - Criação: `grades = ['final' => nota]`, ou nulo; `approval_status`; `attendance_pct` nulo; `created_at` = `Instante::meioDia(start_date)`.
- **Certificado:**
  - Casamento: por `codigo`; com o mesmo `enrollment_id` é `existente`, senão `conflito`.
  - Criação:
    - `uuid` = `Str::uuid()`;
    - `course_id` = o da turma e `redator_id` = o redator da turma;
    - `valido_ate`, `status = emitido`;
    - `created_at` = `Instante::meioDia(emitido_em)`;
    - `snapshot` = `new CertificateSnapshotData(...)`, montado como na spec §6:
      - `aluno`: `aluno_impresso` e `Rut::parse(aluno)->format()`;
      - `curso`: `curso_impresso`, `technical_name: null`, `horas_impressas`, a `description` do curso e os módulos do curso como `SnapshotModuleData(sort_order, name, contents)`;
      - `turma`: id, datas `Y-m-d` e `presencial`;
      - `cliente`: `cliente_impresso` e `cliente_rut_impresso`;
      - `emissor`: `config('app.certificate_issuer.name'/'rut')`;
      - `redator`: `redator_impresso` e o RUT do usuário do redator;
      - `resultado`: grades da matrícula, `approval_status`, `attendance_pct` nulo;
      - `template`: `version: null`, `city: cidade`;
      - `ciudad_emision` = `cidade` e `emitido_em`.
  - Snapshot que falha em `isPresentable()` é `conflito`, e o certificado não é gravado.

- [ ] **Step 1: Escrever os testes que falham.** O `setUp` é o da Task 2, mais a chamada aos dois carregadores sobre a carga sintética.

```php
public function test_orcamento_nasce_com_id_da_scap_e_codigo_coerente(): void
{
    $this->assertSame('Scap 176', Budget::findOrFail(176)->code);
    $this->assertSame('Scap 176 - Cot 1', Quote::where('budget_id', 176)->sole()->code);
}

public function test_cotacao_com_turma_aprovada_e_sem_turma_pendente(): void
{
    $aprovada = Quote::where('budget_id', 176)->sole();
    $this->assertSame(QuoteStatus::Approved, $aprovada->status);
    $this->assertTrue($aprovada->approved_at->equalTo(Instante::meioDia('2026-02-13')));
    $pendente = Quote::where('budget_id', 177)->sole();
    $this->assertSame(QuoteStatus::Pending, $pendente->status);
    $this->assertNull($pendente->approved_at);
    $this->assertSame(0, Turma::where('quote_id', $pendente->id)->count());
}

public function test_turma_concluida_de_dois_dias_com_redator(): void
{
    $turma = Turma::whereHas('quote', fn ($q) => $q->where('budget_id', 176))->sole();
    $this->assertSame(TurmaStatus::Concluida, $turma->status);
    $this->assertSame('2026-02-14', $turma->end_date->toDateString());
    $this->assertTrue($turma->concluded_at->equalTo(Instante::meioDia('2026-02-14')));
    $this->assertSame([$this->cadastros->redatores['R1']->id], $turma->redatores()->pluck('redatores.id')->all());
    $this->assertSame(1, $turma->audits()->where('event', 'sync')->count());
}

public function test_matricula_com_nota_e_sem_nota(): void
{
    $uno = Certificate::where('codigo', 'LOT-2026-001')->sole()->enrollment;
    $dos = Certificate::where('codigo', 'LOT-2026-002')->sole()->enrollment;
    $this->assertSame(['final' => 7], $uno->grades);
    $this->assertNull($dos->grades);
    $this->assertSame(EnrollmentApprovalStatus::Aprobado, $dos->approval_status);
}

public function test_certificado_preserva_codigo_e_monta_snapshot_da_linha(): void
{
    $c = Certificate::where('codigo', 'LOT-2026-001')->sole();
    $s = $c->snapshot;
    $this->assertTrue(Str::isUuid($c->uuid));
    $this->assertSame('2028-01-13', $c->valido_ate->toDateString());
    $this->assertSame('ALUMNO UNO', $s->aluno->name);
    $this->assertSame('Nombre Técnico A', $s->curso->name);
    $this->assertNull($s->curso->technical_name);
    $this->assertSame(16, $s->curso->workload_hours);
    $this->assertSame(['Módulo 1', 'Módulo 2'], array_map(fn ($m) => $m->name, $s->curso->modules));
    $this->assertSame('EMPRESA PRUEBA LTDA.', $s->cliente->name);
    $this->assertSame('Relator P.', $s->redator->name);
    $this->assertSame(config('app.certificate_issuer.name'), $s->emissor->name);
    $this->assertNull($s->template->version);
    $this->assertSame('Talca', $s->template->city);
    $this->assertSame('Talca', $s->ciudad_emision);
    $this->assertSame('2026-02-20', $s->emitido_em);
    $this->assertTrue($s->isPresentable());
    $this->assertTrue($c->created_at->equalTo(Instante::meioDia('2026-02-20')));
    $this->assertSame(0, CertificateSequence::count());
}

public function test_certificado_importado_abre_no_validar_e_no_pdf(): void
{
    $c = Certificate::where('codigo', 'LOT-2026-002')->sole(); // o sem nota
    $this->getJson("/api/publico/certificados/{$c->uuid}")->assertOk()->assertJsonPath('codigo', 'LOT-2026-002');
    $this->actingAsAdmin();
    Http::preventStrayRequests();
    $this->app->instance(HtmlToPdf::class, $pdf = new FakeHtmlToPdf);
    $this->get("/api/certificates/{$c->id}/pdf")->assertOk();
    $this->assertStringContainsString('LOT-2026-002', $pdf->lastHtml());
}

public function test_orcamento_existente_de_outro_cliente_e_conflito_e_pula_dependentes(): void
{
    // banco limpo: cria Budget id 176 de outro cliente (makeClientWithUser), roda os dois carregadores
    $this->assertTrue($contagem->temConflito());
    $this->assertSame(0, Certificate::whereIn('codigo', ['LOT-2026-001', 'LOT-2026-002'])->count());
    $this->assertSame(1, Certificate::where('codigo', 'LOT-2026-003')->count());
}

public function test_segunda_carga_nao_cria_nada(): void
{
    $contagem = $this->carregarDeNovo();
    foreach ($contagem->linhas() as [$entidade, $criados]) {
        $this->assertSame(0, $criados, $entidade);
    }
}
```

Se o `HtmlToPdf` exigir URL de validação https no teste, siga o `setUp` de
`tests/Feature/Certification/CertificatePdfTest.php`. Os nomes dos enums (`QuoteStatus::Approved`,
`TurmaStatus::Concluida`, `EnrollmentApprovalStatus::Aprobado`) devem ser conferidos nos arquivos
de `Enums/` antes de escrever.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=CarregadorDeHistoricoTest`
Expected: FAIL com `Class "App\Console\CargaInicial\CarregadorDeHistorico" not found`.

- [ ] **Step 3: Implementar `CarregadorDeHistorico`.** O docblock nomeia as Actions contornadas (`CreateBudgetAction`, `CreateQuoteAction`, `ApproveQuoteAction`, `CreateTurmaAction`, `ConcludeTurmaAction`, `DesignateRedatorAction`, `IssueCertificateAction`) e o motivo de cada uma (spec §5.1).

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=CarregadorDeHistoricoTest`
Expected: PASS (8 testes).

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Console/CargaInicial/CarregadorDeHistorico.php tests/Feature/CargaInicial/CarregadorDeHistoricoTest.php && cd ..
git add backend/app/Console/CargaInicial/CarregadorDeHistorico.php backend/tests/Feature/CargaInicial/CarregadorDeHistoricoTest.php
git commit -m "feat(38): carga do histórico com código legado e snapshot da linha"
```

---

### Task 4: Comando `lotus:carga-inicial`

**Files:**
- Create: `backend/app/Console/Commands/CarregarCargaInicial.php`
- Create: `backend/app/Console/CargaInicial/CargaComConflitoException.php`
- Modify: `docs/estrutura-monolito.md`
- Test: `backend/tests/Feature/CargaInicial/CarregarCargaInicialCommandTest.php`

**Interfaces:**
- Consumes: Tasks 1, 2 e 3.
- Produces: `lotus:carga-inicial {pasta : pasta com carga.json e documentos/} {--simular : valida e conta sem gravar}`, com saída `0` quando dá certo e `1` em arquivo inválido, conflito ou falha.

**Fluxo:**
1. `ArquivoDeCarga::ler($pasta)`. Se lançar `CargaInvalidaException`, imprime os erros e sai `1`.
2. Passe simulado, igual nos dois modos:
   1. `DB::beginTransaction()`.
   2. `CarregadorDeCadastros` com `gravarArquivos: false`, depois `CarregadorDeHistorico`.
   3. `DB::rollBack()` num `finally`.
   4. Imprime a tabela `['Entidade', 'A criar', 'Já existe']` com `$this->table()` e cada conflito com `$this->error()`.
3. Havendo conflito, sai `1`. Com `--simular`, sai `0`.
4. Carga real: `DB::transaction()` com `gravarArquivos: true`. Conflito dentro dela lança `CargaComConflitoException($contagem->conflitos())` e desfaz tudo.
5. Exceção no passo 4: imprime "Arquivos gravados no disco sem linha no banco:" com `arquivosGravados()` e sai `1`.
6. Imprime a tabela da carga real e sai `0`.

- [ ] **Step 1: Escrever os testes que falham.** O `setUp` é o da Task 2.

```php
public function test_simular_nao_grava_nada_e_mostra_contagens(): void
{
    $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta, '--simular' => true])
        ->expectsOutputToContain('certificados')->assertExitCode(0);
    $this->assertSame(0, Certificate::count());
    $this->assertSame(0, User::count());
    $this->assertSame([], Storage::disk('s3')->allFiles());
}

public function test_carga_real_grava_tudo_e_a_segunda_nao_muda_nada(): void
{
    $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])->assertExitCode(0);
    $this->assertSame(3, Certificate::count());
    $this->assertSame(3, Budget::count());
    $audits = Audit::count();
    $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])->assertExitCode(0);
    $this->assertSame(3, Certificate::count());
    $this->assertSame($audits, Audit::count());
}

public function test_conflito_recusa_sem_gravar(): void
{
    $outro = $this->makeClientWithUser();
    $b = new Budget(['client_id' => $outro->id, 'code' => 'Scap 176']);
    $b->id = 176;
    $b->save();
    $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])
        ->expectsOutputToContain('176')->assertExitCode(1);
    $this->assertSame(0, Certificate::count());
    $this->assertSame([], Storage::disk('s3')->allFiles());
}

public function test_arquivo_invalido_sai_com_erro(): void
{
    $p = CargaSintetica::payload();
    $p['schema_version'] = 2;
    CargaSintetica::gravarEm($this->pasta, $p);
    $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])
        ->expectsOutputToContain('schema_version')->assertExitCode(1);
}

public function test_nenhum_email_ou_notificacao_sai_e_a_carga_audita(): void
{
    $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])->assertExitCode(0);
    Notification::assertNothingSent();
    Mail::assertNothingSent();
    $c = Certificate::where('codigo', 'LOT-2026-001')->sole();
    $this->assertSame(1, $c->audits()->where('event', 'created')->count());
    $this->assertNull($c->audits()->first()->user_id);
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=CarregarCargaInicialCommandTest`
Expected: FAIL com `The command "lotus:carga-inicial" does not exist.`

- [ ] **Step 3: Implementar o comando e a exceção.** Em `docs/estrutura-monolito.md`, no bloco `Console/Commands/`, registre:
  - `CarregarCargaInicial` (`lotus:carga-inicial`) e `ExtrairCargaInicial` (`lotus:extrair-carga-inicial`), carga inicial do bloco 38, uso único e manual, sem agendamento;
  - a pasta `Console/CargaInicial/` (com `Extracao/`), que guarda as classes de apoio dos dois comandos, fora de `Domains/` porque atravessa cinco domínios.

- [ ] **Step 4: Rodar e ver passar, com as catracas**

Run: `docker compose exec -T app php artisan test --filter='CarregarCargaInicialCommandTest|PersistenceLawsTest|MensagemLiteralTest|DataDeCalendarioTest|DomainDependencyTest'`
Expected: PASS.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Console/Commands/CarregarCargaInicial.php app/Console/CargaInicial/CargaComConflitoException.php tests/Feature/CargaInicial/CarregarCargaInicialCommandTest.php && cd ..
git add backend/app/Console/Commands/CarregarCargaInicial.php backend/app/Console/CargaInicial/CargaComConflitoException.php backend/tests/Feature/CargaInicial/CarregarCargaInicialCommandTest.php docs/estrutura-monolito.md
git commit -m "feat(38): comando lotus:carga-inicial com --simular e recusa por conflito"
```

---

### Task 5: Extrator — leitura da planilha e normalização

**Files:**
- Create: `backend/app/Console/CargaInicial/Extracao/LeitorDeRegistros.php`
- Create: `backend/app/Console/CargaInicial/Extracao/Normalizador.php`
- Create: `backend/app/Console/CargaInicial/Extracao/Normalizacao.php`
- Create: `backend/tests/Support/CargaInicial/PlanilhaSintetica.php`
- Create: `backend/tests/Support/CargaInicial/ComplementoSintetico.php`
- Test: `backend/tests/Feature/CargaInicial/LeitorDeRegistrosTest.php`
- Test: `backend/tests/Feature/CargaInicial/NormalizadorTest.php`

**Interfaces:**
- Consumes: Task 1 (`ArquivoDeCarga::validar`, `CargaInvalidaException`, `CargaSintetica::rut`), `Rut`, OpenSpout `OpenSpout\Reader\XLSX\Reader`.
- Produces:
  - `LeitorDeRegistros::ler(string $xlsx): list<array<string, mixed>>`. Lê a aba `REGISTROS` **pelo nome**, cabeçalho na linha 5 e dados da linha 6, pulando as linhas sem código. Cada linha traz as chaves:
    - `codigo`, `curso_seletor`, `realizado_en`, `modalidad`, `horas` (int);
    - `cliente_rut`, `cliente_nome`, `aluno_rut`, `aluno_nome`;
    - `fecha_curso`, `vigencia`, `f_emision`;
    - `instrutor`, `estado_eval`, `evaluacion` (int, float ou null), `nom_curso`, `servicio`.

    As três datas saem como `Y-m-d`, ou como o texto original quando não dá para ler a data, ou nulas. Os índices são as colunas A–Y da ficha (B=1 … X=23). Aba ausente ou cabeçalho divergente lança `CargaInvalidaException`.
  - `Normalizador::normalizar(list<array> $linhas, array $complemento): Normalizacao`.
  - `Normalizador::arquivoDoDocumento(string $chave, string $type): string`, que devolve `"documentos/{$chave}-{$type}.pdf"`.
  - `Normalizacao` (readonly): `array $carga` (formato da Task 1), `list<array{codigo: string, motivo: string}> $recusas`, `list<string> $erros` e `int $linhasNoRecorte`.

**Cabeçalho esperado** (linha 5). Compara com `trim`, espaços colapsados e sem diferenciar caixa,
nos índices `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 21, 22, 23`:

`Cº Certificado`, `Nombre del curso`, `Realizado en`, `Modalidad`, `HrCap`, `RUT Cliente`,
`Nombre Cliente`, `RUT Alumno`, `Nombre Alumno`, `Fecha Curso`, `Instructor`, `Estado Eval`,
`Evaluación`, `Vigencia`, `NomCURSO`, `SERVICIO`, `F.EMISION`.

Se a grafia real da planilha divergir, ajuste a constante para a grafia real e diga isso no commit.

**Formato do `complemento.json`** (o que a Task 7 escreve):

```json
{"planilha": "Certificados/JVBA - REGISTRO CERTIFICADOS LOTUS R1.xlsx",
 "recorte_prefixo": "LOT-2026-", "dominio_email_sintetico": "sin-correo.invalid",
 "excluir": [{"codigo": "LOT-2026-020", "motivo": "…"}],
 "cliente": {"rut", "name", "legal_name", "business_activity", "endereco", "contato"},
 "instrutores": {"<grafia impressa>": "<chave do redator>"},
 "cursos": [{"chave", "name", "technical_name", "description", "workload_hours", "dias_de_turma", "modulos"}],
 "redatores": [{"chave", "name", "rut", "email", "phone", "cursos",
                "documentos": [{"type", "origem": "<caminho sob origem>[#<membro do zip>]", "paginas": null, "valid_until": null}]}],
 "cotacoes": [{"scap", "value_uf", "data", "sem_turma": null}]}
```

**Regras do `Normalizador`** (spec §2, §5.1). Recusa vai para `recusas`. Erro vai para `erros` e
deixa `carga` vazia: o comando não grava nada com erro.

| # | Regra | Saída |
|---|---|---|
| R1 | Linha cujo código não começa com `recorte_prefixo` fica fora, sem recusa. | — |
| R2 | Código em `excluir` vira recusa com o motivo do complemento. | recusa |
| R3 | RUT de aluno com DV inválido sai **com todas as suas linhas**, com o motivo `RUT com DV inválido`. | recusa |
| R4 | RUT com mais de um nome, comparado depois de `trim` e de colapsar espaços (a caixa e os acentos contam), sai **com todas as suas linhas**, com o motivo `RUT com nomes diferentes`. | recusa |
| R5 | Guardas, todas listando os códigos envolvidos: seletor sem `chave` em `cursos` (chave = `NNN#` do início do seletor); instrutor ausente de `instrutores`; RUT de cliente diferente de `cliente.rut`; `SERVICIO` fora de `/^SCAP-(\d+)$/i`; SCAP sem item em `cotacoes`; dentro de uma SCAP, curso, `fecha_curso`, `realizado_en` ou instrutor diferentes; o mesmo RUT duas vezes na mesma SCAP; `horas` diferente do `workload_hours` do curso; `modalidad` diferente de `Presencial`; `estado_eval` fora de `Aprobado`/`Reprobado`; data que não é ISO. | erro |
| R6 | Uma turma por SCAP: `start_date` = `fecha_curso` e `end_date` = `start_date + (dias_de_turma − 1)` dias (sem `dias_de_turma`, conta 1). | turma |
| R7 | O aluno usa o `name` das linhas, o RUT formatado, `desde` = a menor `fecha_curso` e o e-mail `<número><dv minúsculo>@<dominio_email_sintetico>`. | aluno |
| R8 | Cotação com turma: `student_count` = nº de matrículas, `approved`, `approved_on` = `data` = `start_date`. Item de `cotacoes` com `sem_turma: {"curso", "student_count"}`: `pending`, `data` do complemento e `turma` nula. | orçamento |
| R9 | Matrícula: `nota` = `evaluacion` (inteiro quando é exato), `approval_status` = `estado_eval` em minúsculas. | matrícula |
| R10 | Certificado: `codigo`, `emitido_em` = `f_emision`, `valido_ate` = `vigencia`, e os campos impressos da linha (`aluno_nome`, `nom_curso`, `horas`, `cliente_nome`, `Rut::parse(cliente_rut)->format()`, `instrutor`, `realizado_en`). | certificado |
| R11 | O cliente da carga sai do complemento, com o e-mail sintético e `desde` = a menor `fecha_curso` das linhas mantidas. | cliente |
| R12 | Os documentos do redator saem com `arquivo` = `arquivoDoDocumento()`, `original_name` = o nome-base da origem (com `paginas`: `"<base sem .pdf> (p. i-f).pdf"`) e `valid_until`. | redator |

- [ ] **Step 1: Escrever os testes que falham.** O `PlanilhaSintetica::gravar(string $caminho, list<array> $linhas, array $opcoes = [])` escreve um xlsx com OpenSpout:
  - uma aba `Config` antes da `REGISTROS`;
  - linhas 1–4 de enfeite, o cabeçalho real na linha 5 (sobrescrevível por `$opcoes['cabecalho']`) e os dados da linha 6;
  - a coluna Z com `SEGREDO-NAO-LER` em toda linha.

  `PlanilhaSintetica::linha(array $sobrescreve = []): array` dá uma linha válida. `ComplementoSintetico::dados(): array` dá um complemento coerente com as linhas.

```php
// LeitorDeRegistrosTest
public function test_le_a_aba_pelo_nome_e_descarta_a_clave(): void
{
    $linhas = (new LeitorDeRegistros)->ler($this->xlsx([PlanilhaSintetica::linha()]));
    $this->assertCount(1, $linhas);
    $this->assertStringNotContainsString('SEGREDO-NAO-LER', json_encode($linhas));
}

public function test_datas_em_tres_formatos_viram_iso(): void
{
    $linhas = (new LeitorDeRegistros)->ler($this->xlsx([
        PlanilhaSintetica::linha(['fecha_curso' => new DateTimeImmutable('2026-07-10')]),
        PlanilhaSintetica::linha(['codigo' => 'LOT-2026-002', 'fecha_curso' => 46213.0]), // serial de 2026-07-10
        PlanilhaSintetica::linha(['codigo' => 'LOT-2026-003', 'fecha_curso' => '10/07/2026']),
    ]));
    $this->assertSame(['2026-07-10', '2026-07-10', '2026-07-10'], array_column($linhas, 'fecha_curso'));
}

public function test_cabecalho_divergente_aborta(): void
{
    $this->expectException(CargaInvalidaException::class);
    (new LeitorDeRegistros)->ler($this->xlsx([PlanilhaSintetica::linha()], ['cabecalho' => [10 => 'Fecha']]));
}

// NormalizadorTest
public function test_so_entra_o_prefixo_e_a_exclusao_explicita_vira_recusa(): void { /* R1, R2: motivo do complemento em $n->recusas */ }
public function test_rut_com_dv_invalido_sai_inteiro(): void { /* 2 linhas do mesmo RUT inválido: as 2 em recusas, aluno ausente da carga */ }
public function test_rut_com_nomes_diferentes_sai_inteiro(): void { /* 'Ana Pérez' x 'Ana Peres': as 2 linhas em recusas */ }
public function test_espaco_a_mais_no_nome_nao_exclui_o_rut(): void { /* 'Ana  Pérez ' x 'Ana Pérez': 0 recusas, 1 aluno */ }
public function test_rut_sem_pontos_sai_formatado_e_com_email_minusculo(): void { /* aluno_rut '12345678k' quando válido: rut '12.345.678-K', email '12345678k@sin-correo.invalid' */ }
public function test_turma_de_dois_dias_quando_o_curso_pede(): void { /* dias_de_turma 2: end_date = start + 1 */ }
public function test_cotacao_com_turma_conta_os_alunos_e_sem_turma_fica_pendente(): void { /* student_count = nº de matrículas; sem_turma vira pending com turma null */ }
/** @dataProvider guardas */
public function test_guarda_vira_erro_e_carga_vazia(string $campo, mixed $valor, string $trecho): void { /* curso desconhecido, SCAP sem cotação, horas divergentes, RUT repetido na SCAP, modalidad Online, SERVICIO '1000' */ }
public function test_saida_cumpre_o_contrato_do_arquivo_de_carga(): void
{
    $n = (new Normalizador)->normalizar($this->linhasValidas(), ComplementoSintetico::dados());
    $this->assertSame([], $n->erros);
    $this->assertSame([], ArquivoDeCarga::validar($n->carga));
}
```

O serial 46213 corresponde a 2026-07-10 na base 1899-12-30; confira com `(new DateTimeImmutable('1899-12-30'))->modify('+46213 days')` antes de fixar o número no teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter='LeitorDeRegistrosTest|NormalizadorTest'`
Expected: FAIL com `Class "App\Console\CargaInicial\Extracao\LeitorDeRegistros" not found`.

- [ ] **Step 3: Implementar o leitor, o normalizador e o `Normalizacao`.** O leitor converte as datas assim:
  - `DateTimeInterface` vira `format('Y-m-d')`;
  - número vira serial do Excel (base `1899-12-30`);
  - texto `d/m/Y` ou `d-m-Y` vira ISO;
  - texto já ISO fica como está;
  - o resto volta como texto, e a R5 acusa o erro.

  O leitor corta cada linha em `array_slice($celulas, 0, 25)` antes de mapear.

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter='LeitorDeRegistrosTest|NormalizadorTest'`
Expected: PASS.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Console/CargaInicial/Extracao/LeitorDeRegistros.php app/Console/CargaInicial/Extracao/Normalizador.php app/Console/CargaInicial/Extracao/Normalizacao.php tests/Support/CargaInicial/PlanilhaSintetica.php tests/Support/CargaInicial/ComplementoSintetico.php tests/Feature/CargaInicial/LeitorDeRegistrosTest.php tests/Feature/CargaInicial/NormalizadorTest.php && cd ..
git add backend/app/Console/CargaInicial/Extracao/LeitorDeRegistros.php backend/app/Console/CargaInicial/Extracao/Normalizador.php backend/app/Console/CargaInicial/Extracao/Normalizacao.php backend/tests/Support/CargaInicial/PlanilhaSintetica.php backend/tests/Support/CargaInicial/ComplementoSintetico.php backend/tests/Feature/CargaInicial/LeitorDeRegistrosTest.php backend/tests/Feature/CargaInicial/NormalizadorTest.php
git commit -m "feat(38): extrator lê REGISTROS e normaliza o recorte com as exclusões"
```

---

### Task 6: Extrator — documentos, relatório e comando `lotus:extrair-carga-inicial`

**Files:**
- Create: `backend/app/Console/CargaInicial/Extracao/Documentos.php`
- Create: `backend/app/Console/CargaInicial/Extracao/Relatorio.php`
- Create: `backend/app/Console/Commands/ExtrairCargaInicial.php`
- Create: `backend/tests/Support/CargaInicial/PdfSintetico.php`
- Test: `backend/tests/Feature/CargaInicial/DocumentosTest.php`
- Test: `backend/tests/Feature/CargaInicial/ExtrairCargaInicialCommandTest.php`

**Interfaces:**
- Consumes: Task 1 (`ArquivoDeCarga`), Task 5 (`LeitorDeRegistros`, `Normalizador`, `Normalizacao`, `Normalizador::arquivoDoDocumento`, `PlanilhaSintetica`, `ComplementoSintetico`).
- Produces:
  - `Documentos::preparar(array $redatoresDoComplemento, string $origem, string $dados): list<string>` grava cada documento em `$dados/<arquivoDoDocumento()>` e devolve os erros. Os casos de `origem`:
    - arquivo comum: copia os bytes;
    - `x.zip#membro`: `ZipArchive::getFromName`, e o membro ausente vira erro que lista os nomes do zip;
    - com `paginas [i, f]`: `pdfseparate -f i -l f` e `pdfunite` via `Symfony\Component\Process\Process`, num diretório temporário apagado no fim.
  - `Relatorio::markdown(Normalizacao $n): string`, com as seções:
    - `## Contagens`: linhas no recorte, recusadas, certificados, turmas, alunos, orçamentos, cotações aprovadas e pendentes, cursos, módulos, redatores e documentos;
    - `## Recusas` (`código | motivo`);
    - `## Por SCAP` (`SCAP | curso | local | início | fim | alunos | UF | status`);
    - `## Cursos` (`chave | nome | horas | módulos`);
    - `## Redatores` (`chave | nome | e-mail | cursos | documentos`).

    Não traz nome nem RUT de aluno.
  - `lotus:extrair-carga-inicial {origem : pasta do levantamento da v1} {dados : pasta de dados, com o complemento.json}`, com o fluxo:
    1. Recusa (`1`) se `realpath($dados)` estiver sob `base_path()`.
    2. Lê `complemento.json`.
    3. Roda `LeitorDeRegistros` sobre `"$origem/{$complemento['planilha']}"` e depois o `Normalizador`. Havendo erro, imprime e sai `1` sem gravar nada.
    4. `Documentos::preparar`. Havendo erro, sai `1`.
    5. `ArquivoDeCarga::validar($carga, $dados)` tem de dar `[]`; senão, sai `1`.
    6. Grava `carga.json` (`JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`) e `relatorio.md`, imprime as contagens e sai `0`.

- [ ] **Step 1: Escrever os testes que falham.** `PdfSintetico::paginas(int $n): string` monta um PDF mínimo e válido de `n` páginas em branco (Catalog, Pages, as `n` Page e o `xref` com os offsets calculados).

```php
// DocumentosTest
public function test_copia_arquivo_inteiro_e_extrai_membro_de_zip(): void { /* dois documentos; assert file_exists e bytes iguais à origem */ }
public function test_membro_ausente_lista_os_nomes_do_zip(): void { /* erro contém o nome de um membro existente */ }
public function test_separa_paginas_de_um_pdf(): void
{
    if ((new ExecutableFinder)->find('pdfseparate') === null) {
        $this->markTestSkipped('poppler ausente');
    }
    // origem com PdfSintetico::paginas(3), paginas [2, 3]
    $this->assertMatchesRegularExpression('/Pages:\s+2/', (new Process(['pdfinfo', $destino]))->mustRun()->getOutput());
}

// ExtrairCargaInicialCommandTest
public function test_gera_carga_documentos_e_relatorio(): void
{
    $this->artisan('lotus:extrair-carga-inicial', ['origem' => $this->origem, 'dados' => $this->dados])->assertExitCode(0);
    $this->assertSame([], ArquivoDeCarga::validar(ArquivoDeCarga::ler($this->dados), $this->dados));
    $relatorio = file_get_contents("{$this->dados}/relatorio.md");
    $this->assertStringContainsString('## Recusas', $relatorio);
    $this->assertStringNotContainsString('SEGREDO-NAO-LER', $relatorio.file_get_contents("{$this->dados}/carga.json"));
}

public function test_erro_de_normalizacao_nao_grava_nada(): void { /* seletor desconhecido: exit 1, carga.json ausente */ }

public function test_recusa_pasta_de_dados_dentro_do_backend(): void
{
    $dentro = storage_path('framework/testing/carga-38');
    @mkdir($dentro, 0777, true);
    $this->artisan('lotus:extrair-carga-inicial', ['origem' => $this->origem, 'dados' => $dentro])->assertExitCode(1);
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter='DocumentosTest|ExtrairCargaInicialCommandTest'`
Expected: FAIL com `Class "App\Console\CargaInicial\Extracao\Documentos" not found`.

- [ ] **Step 3: Implementar `Documentos`, `Relatorio` e o comando.**

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter='DocumentosTest|ExtrairCargaInicialCommandTest'`
Expected: PASS. O `test_separa_paginas_de_um_pdf` roda, não pula, no container `app`.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Console/CargaInicial/Extracao/Documentos.php app/Console/CargaInicial/Extracao/Relatorio.php app/Console/Commands/ExtrairCargaInicial.php tests/Support/CargaInicial/PdfSintetico.php tests/Feature/CargaInicial/DocumentosTest.php tests/Feature/CargaInicial/ExtrairCargaInicialCommandTest.php && cd ..
git add backend/app/Console/CargaInicial/Extracao/Documentos.php backend/app/Console/CargaInicial/Extracao/Relatorio.php backend/app/Console/Commands/ExtrairCargaInicial.php backend/tests/Support/CargaInicial/PdfSintetico.php backend/tests/Feature/CargaInicial/DocumentosTest.php backend/tests/Feature/CargaInicial/ExtrairCargaInicialCommandTest.php
git commit -m "feat(38): comando lotus:extrair-carga-inicial com documentos e relatório"
```

---

### Task 7: Complemento curado, ensaio com o dado real e roteiro de produção

Executada pela sessão (Claude), não por subagente: exige ler docx e PDF, julgar e parar diante do
João. **Nada desta task com dado pessoal entra no git**; só o roteiro de produção é commitado.

**Files:**
- Create: `docs/superpowers/blocos/38-seeder-carga-inicial-producao/execucao-producao.md`

**Interfaces:**
- Consumes: os dois comandos (Tasks 4 e 6) e o formato do complemento (Task 5).
- Produces: a pasta de dados `/home/jvbat/lotus-carga-inicial-38/`, fora de qualquer árvore git, com `complemento.json`, `carga.json`, `documentos/` e `relatorio.md`, e o roteiro de produção.

- [ ] **Step 1: Escrever o `complemento.json`** em `/home/jvbat/lotus-carga-inicial-38/`. As fontes ficam no espelho local `/mnt/c/Users/jvbat/Desktop/Projetos/Lotus.cl/V2/00. LEVANTAMIENTO INFO JOAO`; leia docx com `unzip -p <docx> word/document.xml` e PDF com `pdftotext`.
  - **`recorte_prefixo`:** `LOT-2026-`.
  - **`excluir`:** `LOT-2026-020`, com o motivo "SCAP 1000, curso de 2024 (decisão do João)".
  - **`instrutores`:** `{"Magallanes Acuña Olate": "MAO"}`.
  - **`cliente`:**
    - RUT `77.117.942-8`, `name` = `SWITCH CHILE LTDA.` (o nome impresso);
    - `legal_name`, giro, endereço e contato do docx da COT-185.
  - **`cursos`:**

    | chave | name | technical_name | horas | dias | módulos |
    |---|---|---|---|---|---|
    | `200#` | `Reciclaje con LLEE AT/MT (16 h)` | o NomCURSO das linhas | 16 | 2 | 6, do docx `200#` |
    | `051#` | `Trabajos en Líneas Energizadas AT/MT (8 h)` | o NomCURSO das linhas | 8 | 1 | nenhum |
    | `201#` | o nome da aba `CURSOS` | nulo | 9 | 1 | 8, do docx `201#` |
    | `202#` | o nome da aba `CURSOS` | nulo | 2 | 1 | 8, do docx `202#`, mais a `description` da narrativa |
    | `035#` | o nome da aba `CURSOS` | nulo | 4 | 1 | 4 tópicos da aba de temário do xlsx da COT-180, com as horas em `theory_hours` |
    | `EB` | `Electricidad Básica` | nulo | da COT-177 | 1 | da aba `Aprendizajes Esperados` do xlsx da COT-177 |

  - **`redatores`:** o nome como aparece na planilha da v1, e RUT, e-mail e telefone do CV.

    | chave | cursos | documentos (spec §4) |
    |---|---|---|
    | `MAO` | todos os 5 | `CV` = `CV-SMS-…`, `TITULO` = título UFRO e `POSTGRADO` = UTN, os três via `<zip>#<membro>` |
    | `CZR` | `201#` | `CV` = p. 1–5, `TITULO` = p. 6 e `POSTGRADO` = p. 9 do PDF do CV; `REUF` = registro SENCE |
    | `COO` | `201#` e `202#` | `CV` |

  - **`cotacoes`:**
    - `value_uf`: 176 = 122.32; 178 = 33.85; 179 = 69.92; 180 = 16.47; 181 = 122.32; 182 = 31.04; 183 = 8.56; 184 = 122.32; 185 = 69.47; 186 = 11.48; 187 = 0; 177 = o da COT-177;
    - `sem_turma`: na 177, `{"curso": "EB", "student_count": <da COT>}`; na 178, `{"curso": "051#", "student_count": <da COT>}`;
    - COT sem número de pessoas: `student_count` 1, anotado no relatório;
    - `data` da 177 e da 178 = a data das COT.

- [ ] **Step 2: Rodar o extrator**

```bash
docker compose run --rm -v "/mnt/c/Users/jvbat/Desktop/Projetos/Lotus.cl/V2/00. LEVANTAMIENTO INFO JOAO:/origem:ro" -v /home/jvbat/lotus-carga-inicial-38:/dados app php artisan lotus:extrair-carga-inicial /origem /dados
```

Expected: exit 0, com o `relatorio.md` mostrando:
- 116 certificados e 10 turmas;
- 11 recusas (1 explícita, 6 por DV e 4 por nomes);
- 60 alunos;
- 12 orçamentos e 12 cotações (10 aprovadas e 2 pendentes);
- 6 cursos, 3 redatores e 8 documentos.

**Número diferente: PARE e mostre ao João.** Não ajuste regra para fechar a conta.

- [ ] **Step 3: Conferir os documentos.** Rode `pdfinfo` em cada PDF de `documentos/` (CZR-CV = 5 páginas, CZR-TITULO e CZR-POSTGRADO = 1) e abra a primeira página de cada um com `pdftoppm -png -r 72 -f 1 -l 1` no scratchpad, conferindo pelo `Read` que o tipo bate com o conteúdo.

- [ ] **Step 4: Checkpoint do João.** Mostre o `relatorio.md` (contagens, recusas, por SCAP, cursos e redatores) e **espere a aprovação** antes do Step 5. Correção que ele pedir volta ao Step 1.

- [ ] **Step 5: Ensaio na stack da lane**

```bash
docker compose exec -T app php artisan migrate:fresh --force
docker compose exec -T app php artisan db:seed --class=RolePermissionSeeder --force
docker compose run --rm -v /home/jvbat/lotus-carga-inicial-38:/carga:ro app php artisan lotus:carga-inicial /carga --simular
docker compose run --rm -v /home/jvbat/lotus-carga-inicial-38:/carga:ro app php artisan lotus:carga-inicial /carga
docker compose run --rm -v /home/jvbat/lotus-carga-inicial-38:/carga:ro app php artisan lotus:carga-inicial /carga
docker compose exec -T app php artisan db:show --counts
```

Expected:
- o `--simular` e a primeira carga mostram as contagens do relatório aprovado;
- a segunda carga mostra "A criar" = 0 em todas as linhas;
- o `db:show --counts` bate com o relatório (certificates 116, turmas 10, budgets 12, quotes 12, enrollments 116, courses 6, redatores 3, files 8).

- [ ] **Step 6: `/validar` e PDF de um certificado por curso.** Pegue o `uuid` de um certificado de cada curso (200#, 201#, 202#, 051#, 035#) com `php artisan tinker --execute`.
  - **`/validar`:** `curl -s http://localhost:8082/api/publico/certificados/<uuid>` deve devolver 200 com o `codigo`.
  - **PDF:** gere com `app(App\Domains\Certification\Services\CertificatePdfService::class)->render($c)` gravado em `/tmp`, depois `pdftoppm -png -r 96`, e leia as páginas com `Read`.
  - Confira no PDF o nome impresso, o código, os dois dias no 200# e a página de módulos.

- [ ] **Step 7: Prova de ausência de dado pessoal.** Gere no scratchpad, a partir do `carga.json`, a lista de RUTs e nomes de aluno e de RUTs, e-mails e telefones dos redatores (`python3 -I`). Rode `git diff main...HEAD | grep -F -f <lista>`.
  - Esperado: nenhuma linha.
  - Apague a lista em seguida.

- [ ] **Step 8: Escrever o roteiro de produção** em `execucao-producao.md`, para o João executar:
  - os passos 1 a 8 do §9 da spec, com os comandos exatos;
  - o padrão `sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml run --rm -v /opt/lotus/carga-inicial:/carga:ro app php artisan lotus:carga-inicial /carga --simular'`;
  - a cópia por `scp` para `/opt/lotus/carga-inicial`, com `chmod -R a+rX` na pasta (o `/opt/lotus` 750 já fecha o acesso no host);
  - o `db:show --counts` antes e depois;
  - o `backup-db.sh` (runbook §9) antes da carga real;
  - a remoção da pasta no fim;
  - as contagens esperadas, iguais às do relatório aprovado.

```bash
git add docs/superpowers/blocos/38-seeder-carga-inicial-producao/execucao-producao.md
git commit -m "docs(38): roteiro de execução da carga inicial em produção"
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 2, 5 | sim | nenhuma entre elas (as duas consomem só a Task 1) |
| G2 | 3, 6 | sim | nenhuma entre elas (3 consome 2; 6 consome 1 e 5) |

Task fora de grupo executa e revisa uma a uma. A ordem é: 1, G1 (2 e 5), G2 (3 e 6), 4 e 7.

## Handoff de execução

- **executor:** `claude`. O bloco grava dado com peso legal, contorna Actions do fluxo vivo e a
  Task 7 exige julgamento e o checkpoint do João; nada disso é mecânico.
- **Sessão:** `opus`, esforço `high`.
- **Papéis** (`.claude/papeis.md`):
  - `implementador-integracao` nas Tasks 1 a 6;
  - `revisor-task` por task;
  - `re-revisor` e `corretor-tardio` nas rodadas de correção;
  - `revisor-branch` no fim.
  - A Task 7 roda na própria sessão, sem despacho.
- **paths_autorizados:** não se aplica (`executor: claude`).

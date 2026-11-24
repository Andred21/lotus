# Bloco 61 — Validação de certificado no site (API pública) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** abrir, sem vazar dado nem deixar percorrer a base, a API pública que a página de validação
do site (`lotusotec.cl`) vai consumir. São três peças: a consulta por código + RUT do aluno, o PDF
público pelo `uuid` e o CORS só para a origem do site.

**Architecture:** As rotas novas ficam ao lado da `GET publico/certificados/{uuid}` atual,
anônimas, cada uma com o seu limitador nomeado em `RateLimits`. As regras de acesso público ficam
num Domain Service, `PublicCertificateAccess`:
- a busca por código, com a comparação do RUT feita em PHP;
- os dois limitadores de falha, chamados direto no `RateLimiter`;
- a recusa do revogado.

O controller continua fino. O CORS ganha uma segunda política, escolhida por um `HandleCors`
próprio que substitui o do framework só quando a rota é `api/publico/*` e a origem é a do site.

**Tech Stack:** Laravel 13 (PHP 8.3), spatie/laravel-data com typescript-transformer, fruitcake/php-cors
(via `Illuminate\Http\Middleware\HandleCors`) e Gotenberg (`HtmlToPdf`). Testes PHPUnit de integração
em sqlite `:memory:`, com `CACHE_STORE=array`.

**Spec:** [`spec.md`](./spec.md) · Packet: [`context.md`](./context.md)

## Global Constraints

- Rotas e status:
  - Consulta: `POST /api/publico/certificados/consulta`, com o corpo JSON `{ "codigo": "...", "rut": "..." }`.
    Responde 200 com o `PublicCertificateData` e o `uuid`, sem o RUT.
  - PDF: `GET /api/publico/certificados/{uuid}/pdf`. Inexistente dá 404 e revogado dá **410**;
    o vencido **baixa**.
  - Headers do PDF: `Content-Type: application/pdf`,
    `Content-Disposition: attachment; filename="certificado-<codigo>.pdf"`, `Cache-Control: no-store`
    e `X-Robots-Tag: noindex`.
- Falha uniforme:
  - Código inexistente, RUT que não bate e snapshot sem RUT devolvem o **mesmo 404 RFC 7807**.
    Nenhum campo, header ou status distingue os casos.
- Ordem da consulta: formato (422), limitadores de falha (429), busca, comparação do RUT e só
  então o payload.
- RUT:
  - nunca vai para SQL;
  - nunca vai para resposta JSON, log, query string nem chave de cache em claro;
  - a chave de falha por RUT é `HMAC-SHA256` do RUT normalizado com o `APP_KEY`.
- Limites, todos em `App\Shared\RateLimiting\RateLimits`:
  - `public-certificate-lookup`: 10/min por IP;
  - falhas por IP: **20/hora**;
  - falhas por RUT: **10/hora**;
  - `public-certificate-pdf`: 10/min por IP;
  - `public-certificate`: 30/min, inalterado.
  - Não há bloqueio por código. Um acerto não zera contador.
- CORS do site:
  - env `CORS_PUBLIC_ORIGINS`, lista exata separada por vírgula, sem curinga, valendo **só** em
    `api/publico/*`;
  - métodos `GET, POST, OPTIONS`, **sem** `Access-Control-Allow-Credentials`, expondo
    `Content-Disposition`;
  - a política do app (`FRONTEND_URL`, com credenciais) não muda.
- Leis do `CLAUDE.md` §5:
  - erro sobe ao handler RFC 7807, nunca `abort(422)`;
  - mensagem ao usuário sai de `lang/` nos três locales (`en`, `es_CL`, `pt_BR`);
  - `generated.ts` só se regenera, nunca se edita;
  - sem Repository.
- Acerto da consulta e download não geram auditoria nem `EventoDeSeguranca`. O 429 continua
  virando `taxa.excedida`.
- Conteúdo e QR do PDF não mudam neste bloco.
- Backend roda no container da lane: `docker compose exec -T app php artisan test --filter=<Teste>`.
  Pint roda no host, de `backend/`, sempre com os arquivos como argumento.

## Review Focus

1. **POST com Data devolvendo 201.** O spatie/laravel-data responde 201 a todo `POST`. A consulta
   precisa de **200** exato, e o teste de acerto da Task 3 usa `assertStatus(200)`, nunca
   `assertSuccessful()`.
2. **Corpo com tipos errados** (`{"codigo": ["x"], "rut": {"a": 1}}`) tem de dar 422, nunca 500.
   Foi o Q-1 do login (`RateLimits::chaveDeLogin`). Teste na Task 3.
3. **RUT com zeros à esquerda, espaços e `k` minúsculo** (`012.345.678-5`, `1000005-k`) tem de
   achar o certificado. O canônico tira os zeros. Testes nas Tasks 1 e 3.
4. **`GET /consulta` cai no `{uuid}`.** Sem o `whereUuid`, o GET viraria 404 do controller, e a
   prova de aceitação (`-> 405`) mentiria. Teste na Task 3.
5. **`CORS_PUBLIC_ORIGINS=*` ou origem com curinga.** O middleware ignora a entrada com `*`, para
   que ninguém abra a API pública a qualquer origem por um env mal escrito. Teste na Task 5.

---

## Task 1: Limitadores públicos e chaves de falha

**Files:**
- Modify: `backend/app/Shared/RateLimiting/RateLimits.php`
- Modify: `backend/app/Shared/Support/Rut.php`
- Test: `backend/tests/Feature/Shared/RateLimitTest.php`
- Test: `backend/tests/Unit/Shared/RutTest.php`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `Rut::canonical(): string` devolve os dígitos sem zeros à esquerda, mais o DV em maiúscula
    (`'012.345.678-k'` vira `'12345678K'`).
  - Constantes de `RateLimits`:
    - `CONSULTA_CERTIFICADO = 10`
    - `FALHAS_CONSULTA_POR_IP = 20`
    - `FALHAS_CONSULTA_POR_RUT = 10`
    - `JANELA_FALHAS_CONSULTA = 3600` (segundos)
    - `PDF_CERTIFICADO_PUBLICO = 10`
  - Limitadores nomeados `public-certificate-lookup` e `public-certificate-pdf`, por IP.
  - `RateLimits::chaveDeFalhaPorIp(string $ip): string` devolve
    `'public-certificate-lookup-failures:ip:'.$ip`.
  - `RateLimits::chaveDeFalhaPorRut(Rut $rut): string` devolve
    `'public-certificate-lookup-failures:rut:'.hash_hmac('sha256', $rut->canonical(), (string) config('app.key'))`.

- [ ] **Step 1: Write the failing tests**

Em `RutTest`, `test_canonical_tira_formatacao_e_zeros_a_esquerda`:
- `Rut::parse('12.345.678-5')->canonical()` é `'123456785'`;
- `Rut::parse(' 012345678-5 ')->canonical()` é `'123456785'`;
- `Rut::parse('1.000.005-k')->canonical()` é `'1000005K'`.

Em `RateLimitTest`:
- `test_todos_os_limitadores_do_bloco_estao_registrados`: a lista ganha `'public-certificate-lookup'`
  e `'public-certificate-pdf'`.
- `test_limitadores_por_ip_usam_o_ip`: o mapa ganha
  `'public-certificate-lookup' => RateLimits::CONSULTA_CERTIFICADO` e
  `'public-certificate-pdf' => RateLimits::PDF_CERTIFICADO_PUBLICO`.
- Novo `test_chave_de_falha_por_rut_nao_guarda_o_rut_em_claro`:

```php
$a = RateLimits::chaveDeFalhaPorRut(Rut::parse('12.345.678-5'));
$this->assertSame($a, RateLimits::chaveDeFalhaPorRut(Rut::parse('123456785')));
$this->assertSame($a, RateLimits::chaveDeFalhaPorRut(Rut::parse('012.345.678-5')));
$this->assertNotSame($a, RateLimits::chaveDeFalhaPorRut(Rut::parse('9.876.543-3')));
$this->assertStringNotContainsString('12345678', $a);
$this->assertStringNotContainsString('345.678', $a);
```

- Novo `test_chave_de_falha_por_ip_separa_ips`: as chaves de `'10.0.0.1'` e `'10.0.0.2'` são
  diferentes, e nenhuma é igual à chave de RUT.

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter='RateLimitTest|RutTest'`
Expected: FAIL, com `Call to undefined method ... canonical()` e com o limitador não registrado.

- [ ] **Step 3: Implement**

Implementar `Rut::canonical()`, as cinco constantes (cada uma com docblock de uma linha dizendo o
que contém, no estilo das vizinhas), os dois `RateLimiter::for(...)->by($request->ip())` e as duas
funções de chave.

O docblock de `chaveDeFalhaPorRut` diz por que a chave é HMAC: a tabela `cache` de produção é
legível por quem lê o banco, e o RUT é dado pessoal.

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T app php artisan test --filter='RateLimitTest|RutTest'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Shared/RateLimiting/RateLimits.php backend/app/Shared/Support/Rut.php \
  backend/tests/Feature/Shared/RateLimitTest.php backend/tests/Unit/Shared/RutTest.php
git commit -m "feat(61): limitadores públicos e chaves de falha da consulta"
```

## Task 2: PDF público pelo `uuid`

**Files:**
- Create: `backend/app/Domains/Certification/Services/PublicCertificateAccess.php`
- Create: `backend/app/Domains/Certification/Exceptions/CertificadoRevogadoException.php`
- Create: `backend/tests/Support/Certification/CertificadoPublico.php` (trait de fixture)
- Create: `backend/tests/Feature/Certification/PublicCertificatePdfTest.php`
- Modify: `backend/app/Domains/Certification/routes.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/PublicCertificateController.php`
- Modify: `backend/app/Shared/Exceptions/TipoDeRecusa.php`
- Modify: `backend/lang/{en,es_CL,pt_BR}/problem.php`, `backend/lang/{en,es_CL,pt_BR}/certification.php`
- Modify: `backend/tests/Feature/Shared/AuthenticatedRouteMiddlewareTest.php` (`ANONIMAS`)
- Modify: `backend/tests/Feature/Shared/ListQueryBudgetTest.php` (`COM_PAI_ISENTAS`)
- Modify: `backend/tests/Feature/Shared/RateLimitTest.php` (`test_cada_alvo_carrega_o_seu_limitador_nomeado`)

**Interfaces:**
- Consumes: limitador `public-certificate-pdf` (Task 1).
- Produces:
  - `PublicCertificateAccess::paraDownload(string $uuid): Certificate`. Lança
    `NotFoundHttpException` para uuid inexistente e `CertificadoRevogadoException` quando
    `status === CertificateStatus::Revocado`.
  - `TipoDeRecusa::RecursoRevogado`, que vira status `410`, título `problem.title.gone` e tipo
    `https://lotus.cl/errors/gone`.
  - `CertificadoRevogadoException extends RecusaDeDominio`, com `tipo()` igual a
    `RecursoRevogado` e mensagem `__('certification.public.revoked')`.
  - O trait `Tests\Support\Certification\CertificadoPublico` tem o método
    `certificadoPublico(string $codigo = 'LOT-2026-1000', ?string $rutDoAluno = '12.345.678-5', array $atributos = []): Certificate`.
    - Monta a cadeia por `IssuableEnrollmentBuilder`.
    - Usa o snapshot do `CertificatePdfTest::setUp`, apresentável para o PDF, com o `aluno.rut`
      parametrizado. `null` grava o aluno sem RUT.
    - `$atributos` sobrescreve as colunas: `status`, `valido_ate` e `revoked_at`.
  - Constraint `whereUuid('uuid')` nas duas rotas `{uuid}`.

- [ ] **Step 1: Write the failing tests**

`PublicCertificatePdfTest` (use `RefreshDatabase`, `CertificadoPublico`; Gotenberg falso como em
`CertificatePdfTest::fakeGotenberg()`; **sem** `actingAs`):
- `test_pdf_publico_de_certificado_valido_baixa_como_anexo`: o GET devolve 200.
  - `Content-Type` é `application/pdf`.
  - `Content-Disposition` é `attachment; filename="certificado-LOT-2026-1000.pdf"`.
  - `Cache-Control` contém `no-store`, e `X-Robots-Tag` é `noindex`.
  - O corpo começa com `%PDF`.
- `test_pdf_publico_de_certificado_vencido_baixa`: `valido_ate` é ontem, com o relógio congelado,
  e o GET devolve 200 com `application/pdf`.
- `test_pdf_publico_de_certificado_revogado_devolve_410_sem_pdf`: com `status` `Revocado` e
  `revoked_at` em `now()`, o GET devolve 410.
  - `type` é `https://lotus.cl/errors/gone`.
  - O corpo não começa com `%PDF`.
- `test_a_recusa_do_revogado_sai_localizada_nos_tres_locales`: segue o molde de
  `PublicCertificateTest::test_a_recusa_publica_sai_localizada_nos_tres_locales`.
  - São três `detail` diferentes, e nenhum contém `certification.`.
- `test_pdf_publico_de_uuid_inexistente_devolve_404`.
- `test_rotas_publicas_recusam_o_que_nao_e_uuid`: `/api/publico/certificados/nao-e-uuid` e
  `/api/publico/certificados/nao-e-uuid/pdf` devolvem 404.
- `test_o_11o_pdf_do_mesmo_ip_no_minuto_recebe_429`: dez GETs dão 200, e o 11º dá 429.

Ratchets:
- `ANONIMAS` ganha esta entrada:

  ```php
  'api/publico/certificados/{uuid}/pdf' => 'PDF público pelo QR: quem tem o uuid tem o papel; revogado é recusado (bloco 61).',
  ```

- `COM_PAI_ISENTAS` ganha `'api/publico/certificados/{uuid}/pdf' => 'PDF de UM certificado pelo uuid, não é lista'`.
- O alvo `['GET', 'api/publico/certificados/{uuid}/pdf', 'throttle:public-certificate-pdf']` entra
  na lista de `test_cada_alvo_carrega_o_seu_limitador_nomeado`.

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter='PublicCertificatePdfTest|AuthenticatedRouteMiddlewareTest|ListQueryBudgetTest|RateLimitTest'`
Expected: FAIL, com 404 na rota nova e as catracas acusando a rota ausente.

- [ ] **Step 3: Implement**

- `routes.php`:
  - `GET publico/certificados/{uuid}/pdf` aponta para `PublicCertificateController::pdf`, com
    `->whereUuid('uuid')->middleware('throttle:public-certificate-pdf')`.
  - Acrescentar `->whereUuid('uuid')` ao `GET publico/certificados/{uuid}` existente.
  - O comentário diz por que a rota é anônima: o QR é o papel.
- `PublicCertificateController::pdf(string $uuid, PublicCertificateAccess $access, CertificatePdfService $pdf): Response`:
  - obtém o certificado por `$access->paraDownload($uuid)`;
  - devolve `response($pdf->render($certificate), 200, [...])` com os quatro headers dos Global
    Constraints.
- `TipoDeRecusa`: o caso novo entra nos três `match`.
- `lang/<locale>/problem.php`: `title.gone`.
- `lang/<locale>/certification.php`: `public.revoked`.
- Vocabulário: antes de gravar, confira as chaves vizinhas, como `certificate.already_revoked`, e
  use o mesmo verbo.
  - es_CL: `'Recurso ya no disponible'` e `'El certificado fue revocado y su PDF ya no está disponible.'`
  - pt_BR: `'Recurso não mais disponível'` e `'O certificado foi revogado e o PDF não está mais disponível.'`
  - en: `'Resource no longer available'` e `'The certificate was revoked and its PDF is no longer available.'`

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T app php artisan test --filter='PublicCertificatePdfTest|AuthenticatedRouteMiddlewareTest|ListQueryBudgetTest|RateLimitTest|PublicCertificateTest|RecusaDeDominioTest|EnvelopeLocalizadoTest|LocaleParityTest|MensagemLiteralTest'`
Expected: PASS. O `PublicCertificateTest` passa intacto, sem mudança no `GET {uuid}`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Domains/Certification backend/app/Shared/Exceptions/TipoDeRecusa.php backend/lang \
  backend/tests/Support/Certification/CertificadoPublico.php backend/tests/Feature/Certification/PublicCertificatePdfTest.php \
  backend/tests/Feature/Shared/AuthenticatedRouteMiddlewareTest.php backend/tests/Feature/Shared/ListQueryBudgetTest.php \
  backend/tests/Feature/Shared/RateLimitTest.php
git commit -m "feat(61): PDF público do certificado pelo uuid, 410 para revogado"
```

## Task 3: Consulta por código + RUT

**Files:**
- Create: `backend/app/Domains/Certification/Data/LookupPublicCertificateData.php`
- Create: `backend/tests/Feature/Certification/PublicCertificateLookupTest.php`
- Modify: `backend/app/Domains/Certification/Services/PublicCertificateAccess.php`
- Modify: `backend/app/Domains/Certification/Data/PublicCertificateData.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/PublicCertificateController.php`
- Modify: `backend/app/Domains/Certification/routes.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado, nunca à mão)
- Modify: `backend/tests/Feature/Shared/AuthenticatedRouteMiddlewareTest.php` (`ANONIMAS`)
- Modify: `backend/tests/Feature/Shared/RateLimitTest.php` (alvo nomeado)

**Interfaces:**
- Consumes:
  - `Rut::canonical()` e o limitador `public-certificate-lookup` (Task 1);
  - `PublicCertificateAccess` e o trait `CertificadoPublico` (Task 2).
- Produces:
  - `LookupPublicCertificateData`, um Data de **entrada**, sem `#[TypeScript]` e sem default
    literal. Tem `public string $codigo` e `public string $rut`.
    - `rules()`: `codigo` é `['required', 'string', 'max:20', 'regex:/^LOT-\d{4}-\d{1,9}$/i']`.
    - `rut` é `['required', 'string', 'max:20', new ValidRut]`.
  - `PublicCertificateAccess::porCodigoERut(string $codigo, Rut $rut, string $ip): Certificate`
    busca `Certificate::query()->where('codigo', strtoupper($codigo))->first()`.
    - Compara `Rut::parse($snapshot->aluno->rut ?? '')->canonical()` com `$rut->canonical()`.
    - Qualquer falha lança `new NotFoundHttpException`, sem mensagem: certificado nulo, RUT do
      snapshot vazio ou RUT diferente.
    - O `$ip` só é usado na Task 4.
  - `PublicCertificateData` ganha a propriedade `public string|Optional $uuid = new Optional`, a
    **última** do construtor, e o método `PublicCertificateData::fromLookup(Certificate $certificate): self`.
    - O `fromLookup` faz `fromModel` e atribui o `uuid`.
    - O `fromModel` não muda: o `GET {uuid}` continua sem `uuid`, e
      `test_payload_publico_nao_expoe_ruts_ids_ou_notas` segue valendo.
  - `PublicCertificateController::lookup(LookupPublicCertificateData $data, PublicCertificateAccess $access, Request $request): JsonResponse`
    devolve
    `PublicCertificateData::fromLookup($access->porCodigoERut($data->codigo, Rut::parse($data->rut), (string) $request->ip()))->toResponse($request)->setStatusCode(200)`.
  - Rota `POST publico/certificados/consulta`, com `->middleware('throttle:public-certificate-lookup')`.

- [ ] **Step 1: Write the failing tests**

`PublicCertificateLookupTest` usa `RefreshDatabase` e `CertificadoPublico`. O `setUp` congela o
relógio e cria `LOT-2026-1000` com o RUT `12.345.678-5`. O helper
`consultar(string $codigo, string $rut, string $ip = '10.0.0.1')` faz o `postJson` com
`withServerVariables(['REMOTE_ADDR' => $ip])`.

- `test_codigo_e_rut_certos_devolvem_200_com_payload_e_uuid_sem_rut`:
  - `assertStatus(200)`;
  - `uuid` igual ao do certificado;
  - `codigo` igual a `LOT-2026-1000`;
  - `aluno.name` presente e `aluno.rut` ausente;
  - o conteúdo cru não contém `12.345.678` nem `12345678`.
- `test_o_rut_vale_em_qualquer_formatacao`: o data provider traz `'123456785'`, `'12345678-5'`,
  `'12.345.678-5'` e `'012.345.678-5'`, e todos devolvem 200.
- `test_o_dv_k_minusculo_encontra`: um segundo certificado `LOT-2026-1001` com o RUT
  `1.000.005-K`, consultado com `'1000005-k'`, devolve 200.
- `test_codigo_em_minusculas_encontra`: `'lot-2026-1000'` devolve 200.
- `test_as_tres_falhas_sao_indistinguiveis`: os três casos devolvem 404, e `json()` e o
  `Content-Type` são **idênticos** entre eles.
  - código inexistente `LOT-2026-9999` com o RUT certo;
  - `LOT-2026-1000` com o RUT `9.876.543-3`;
  - `LOT-2026-1002` com o aluno sem RUT (`null`), consultado com `9.876.543-3`.
- `test_formato_invalido_devolve_422_sem_consultar_certificados`:
  - `DB::enableQueryLog()`;
  - o pedido `codigo: 'ABC'`, `rut: '12.345.678-4'` (DV errado) devolve 422, com `errors.codigo`
    e `errors.rut`;
  - nenhuma query do log menciona `certificates`;
  - o conteúdo não contém `12.345.678-4`.
- `test_entrada_que_nao_e_string_devolve_422`: `{"codigo": ["x"], "rut": {"a": 1}}` devolve 422.
- `test_payloads_de_sql_injection_nunca_devolvem_500`: o data provider traz três pares, e cada
  status está em `[404, 422]`. Depois, `Certificate::count()` não mudou.
  - `["LOT-2026-1000' OR '1'='1", '12.345.678-5']`
  - `['LOT-2026-1000', "1 OR 1=1"]`
  - `["'; DROP TABLE certificates; --", '12.345.678-5']`
- `test_a_busca_usa_binding_e_o_rut_nao_vai_ao_sql`: com `DB::enableQueryLog()`, um acerto.
  - A query em `certificates` tem `'LOT-2026-1000'` nos `bindings`, e não no texto do `query`.
  - Nenhuma query tem `12345678` no texto nem nos bindings.
- `test_certificado_revogado_aparece_com_estado`: devolve 200, com `status` `revocado`.
- `test_get_na_rota_da_consulta_devolve_405`: `getJson('/api/publico/certificados/consulta')`
  devolve 405. É a prova da aceitação.
- `test_a_11a_consulta_do_mesmo_ip_no_minuto_recebe_429`: dez acertos e, na 11ª, 429.

Ratchets:
- `ANONIMAS` ganha esta entrada:

  ```php
  'api/publico/certificados/consulta' => 'Consulta pública por código + RUT do aluno, para quem confere o certificado no site (bloco 61).',
  ```

- O alvo `['POST', 'api/publico/certificados/consulta', 'throttle:public-certificate-lookup']`
  entra na lista de alvos.

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter='PublicCertificateLookupTest|AuthenticatedRouteMiddlewareTest|RateLimitTest'`
Expected: FAIL, com 405 ou 404 no `POST`.

- [ ] **Step 3: Implement**

A rota, o Data, o `porCodigoERut`, o `uuid` em `PublicCertificateData`, o `fromLookup` e o
`lookup`, todos com as assinaturas do bloco Interfaces.

Depois, regenerar os tipos com `docker compose exec -T app php artisan typescript:transform`. O
esperado é o `PublicCertificateData` ganhar `uuid?: string`. Se o manifest do transformer mudar
junto, ele entra no commit.

- [ ] **Step 4: Run to verify it passes**

Run:
1. `docker compose exec -T app php artisan test --filter='PublicCertificateLookupTest|PublicCertificateTest|PublicCertificatePdfTest|AuthenticatedRouteMiddlewareTest|RateLimitTest|InputDataDefaultsTest|ListQueryBudgetTest'`
2. `cd frontend && pnpm build`

Expected: PASS, e o `tsc` compila a `ValidationPage` com o tipo novo.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Domains/Certification frontend/src/shared/types/generated.ts \
  backend/tests/Feature/Certification/PublicCertificateLookupTest.php \
  backend/tests/Feature/Shared/AuthenticatedRouteMiddlewareTest.php backend/tests/Feature/Shared/RateLimitTest.php
git commit -m "feat(61): consulta pública de certificado por código + RUT"
```

## Task 4: Limitadores de falha da consulta

**Files:**
- Modify: `backend/app/Domains/Certification/Services/PublicCertificateAccess.php`
- Create: `backend/tests/Feature/Certification/PublicCertificateLookupLimitsTest.php`

**Interfaces:**
- Consumes:
  - de `RateLimits`: `chaveDeFalhaPorIp`, `chaveDeFalhaPorRut`, `FALHAS_CONSULTA_POR_IP`,
    `FALHAS_CONSULTA_POR_RUT` e `JANELA_FALHAS_CONSULTA` (Task 1);
  - `porCodigoERut` (Task 3).
- Produces: o `porCodigoERut` passa a fazer, **antes** de qualquer query:
  - checa as duas chaves com `RateLimiter::tooManyAttempts`;
  - se alguma estourou, lança
    `new ThrottleRequestsException(headers: ['Retry-After' => <maior availableIn das estouradas>])`;
  - em toda falha (o 404 uniforme), faz `RateLimiter::hit` nas duas chaves, com decay de
    `JANELA_FALHAS_CONSULTA`;
  - o acerto não toca contador.

- [ ] **Step 1: Write the failing tests**

`PublicCertificateLookupLimitsTest` usa `RefreshDatabase`, `CertificadoPublico` e o mesmo helper
`consultar()`. O `rutValido(int $n): string` devolve `"$n-$dv"`, testando `0–9` e `K` com
`Rut::isValid()`. Entre blocos de 10 pedidos do mesmo IP, `$this->travel(61)->seconds()`, para o
limitador por minuto não mascarar o por hora.

- `test_a_21a_falha_do_mesmo_ip_na_hora_recebe_429_mesmo_com_o_par_certo`:
  - vinte falhas do IP `10.0.0.9`, cada uma com um RUT válido diferente,
    `rutValido(20000000 + $i)`, contra `LOT-2026-9999`;
  - depois o par certo do mesmo IP devolve 429, com o header `Retry-After`;
  - o par certo de `10.0.0.10` devolve 200.
- `test_a_11a_falha_do_mesmo_rut_recebe_429_de_qualquer_ip`:
  - dez falhas com o RUT `12.345.678-5` contra `LOT-2026-2000` … `LOT-2026-2009`, cada uma de um
    IP `10.0.1.<i>`;
  - depois o par certo, `LOT-2026-1000` com `12.345.678-5`, de `10.0.1.99` devolve 429.
- `test_o_429_de_falha_recusa_antes_de_consultar_certificados`: com o limite do RUT estourado como
  acima, `DB::enableQueryLog()`, o pedido devolve 429, e nenhuma query menciona `certificates`.
- `test_falhas_de_um_rut_nao_travam_outro_rut_no_mesmo_codigo`:
  - dez falhas de `9.876.543-3` contra `LOT-2026-1000`, de IPs distintos;
  - depois o RUT certo de um IP novo devolve 200.
- `test_acerto_nao_conta_como_falha`: 25 acertos do mesmo IP, em blocos de dez com `travel(61)`,
  e todos devolvem 200.
- `test_a_janela_de_falhas_e_de_uma_hora`: com o limite do RUT estourado, `travel(3601)` e o
  par certo devolve 200.
- `test_a_falha_conta_na_chave_hmac`: depois de uma falha com `12.345.678-5`,
  `RateLimiter::attempts(RateLimits::chaveDeFalhaPorRut(Rut::parse('12.345.678-5')))` é `1`.
- `test_nenhum_rut_vai_ao_log`:
  - `Log::listen` coleta todo `MessageLogged`;
  - roda um acerto, uma falha, um 422 e um 429 de falha;
  - nem `message` nem `json_encode(context)` contêm `12345678`, `12.345.678`, `9876543` ou
    `9.876.543`.
- `test_o_429_de_falha_vira_taxa_excedida`: com o mesmo coletor do `EventosDeAcessoTest`
  (`Log::channel(EventoDeSeguranca::CANAL)`), existe um `taxa.excedida` com `rota` igual a
  `api/publico/certificados/consulta`. Nenhum evento sai para o acerto.

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=PublicCertificateLookupLimitsTest`
Expected: FAIL, com 200 ou 404 onde se espera 429.

- [ ] **Step 3: Implement**

Implementar a guarda descrita em Produces, no início do `porCodigoERut`, e o `hit` no ponto único
de falha. Um método privado que registra a falha e lança o 404 mantém o lançamento num lugar só.

- [ ] **Step 4: Run to verify it passes**

Run: `docker compose exec -T app php artisan test --filter='PublicCertificateLookup'`
Expected: PASS, nos dois arquivos.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Domains/Certification/Services/PublicCertificateAccess.php \
  backend/tests/Feature/Certification/PublicCertificateLookupLimitsTest.php
git commit -m "feat(61): limitadores de falha por IP e por RUT na consulta pública"
```

## Task 5: CORS do site só em `api/publico/*`

**Files:**
- Create: `backend/app/Shared/Http/Middleware/HandleCors.php`
- Create: `backend/tests/Feature/Shared/PublicCorsTest.php`
- Modify: `backend/config/cors.php`
- Modify: `backend/bootstrap/app.php`
- Modify: `backend/.env.example`
- Modify: `deploy/aws/env.prod.example`
- Modify: `deploy/bin/conferir-golive.sh` (`CHAVES_ESPERADAS`)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `config('cors.publico')`, com estes valores:

    ```php
    'publico' => [
        'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_PUBLIC_ORIGINS', ''))))),
        'allowed_origins_patterns' => [],
        'allowed_methods' => ['GET', 'POST', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Accept', 'Accept-Language'],
        'exposed_headers' => ['Content-Disposition'],
        'max_age' => 0,
        'supports_credentials' => false,
    ],
    ```

  - `App\Shared\Http\Middleware\HandleCors extends Illuminate\Http\Middleware\HandleCors`
    sobrescreve o `handle()` com o mesmo fluxo do pai: `skipCallbacks`, `hasMatchingPath`,
    preflight com `varyHeader` e `addActualRequestHeaders`.
    - A única troca é o `setOptions(...)`.
    - Recebe `config('cors.publico')` quando `$request->is('api/publico/*')` e o header `Origin`
      está, por igualdade estrita, nas origens públicas **sem `*`**: o middleware descarta toda
      entrada que contém `*`.
    - Nos demais casos, recebe `config('cors')`.
  - `bootstrap/app.php` registra `$middleware->replace(\Illuminate\Http\Middleware\HandleCors::class, \App\Shared\Http\Middleware\HandleCors::class)`,
    com um comentário de por quê: o site é same-site com o app, e credencial para ele levaria o
    cookie de um admin logado.

- [ ] **Step 1: Write the failing tests**

`PublicCorsTest`. O `setUp` faz
`config(['cors.publico.allowed_origins' => ['https://lotusotec.cl'], 'sanctum.stateful' => ['app.lotusotec.cl']])`.
A origem do app é a primeira de `FRONTEND_URL`, como no `TestCase`.

- `test_preflight_do_site_em_rota_publica_recebe_a_origem_exata_sem_credenciais`:
  - um `OPTIONS /api/publico/certificados/consulta` com `Origin: https://lotusotec.cl`,
    `Access-Control-Request-Method: POST` e `Access-Control-Request-Headers: content-type`;
  - `Access-Control-Allow-Origin` é `https://lotusotec.cl`;
  - `Access-Control-Allow-Credentials` está ausente;
  - `Access-Control-Allow-Methods` contém `POST`.
- `test_resposta_do_site_em_rota_publica_expoe_content_disposition`:
  - um `GET /api/publico/certificados/<uuid inexistente>` com a origem do site devolve 404;
  - o `Allow-Origin` é exato, e o `Allow-Credentials` está ausente;
  - `Access-Control-Expose-Headers` contém `Content-Disposition`.
- `test_origem_do_site_em_rota_autenticada_nao_recebe_allow_origin`: o preflight de
  `/api/certificates` e o `GET /api/certificates` com a origem do site vêm sem
  `Access-Control-Allow-Origin`.
- `test_origem_do_app_mantem_a_politica_atual`: em `/api/publico/...` e em `/api/certificates`, o
  `Allow-Origin` é a origem do app e o `Allow-Credentials` é `true`.
- `test_origem_desconhecida_nao_recebe_nada`: `https://evil.example` em `/api/publico/...` vem sem
  `Allow-Origin`.
- `test_curinga_nas_origens_publicas_e_ignorado`: com
  `config(['cors.publico.allowed_origins' => ['*']])`, a origem do site em `/api/publico/...` vem
  sem `Allow-Origin`.
- `test_o_site_nao_e_dominio_stateful`: `EnsureFrontendRequestsAreStateful::fromFrontend(...)` é
  `false` para um `Request` com `Origin: https://lotusotec.cl` e
  `Referer: https://lotusotec.cl/validar/x`. Por isso o `POST` do site roda sem sessão e sem CSRF.

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=PublicCorsTest`
Expected: FAIL. O preflight do site vem sem `Allow-Origin`, e as asserções do app passam desde já.

- [ ] **Step 3: Implement**

- O middleware, o `publico` no `config/cors.php` e o `replace` no `bootstrap/app.php`.
- `backend/.env.example`: `CORS_PUBLIC_ORIGINS=`, vazio em dev, com um comentário de uma linha
  dizendo que vale só para `api/publico/*` e não leva credencial.
- `deploy/aws/env.prod.example`: `CORS_PUBLIC_ORIGINS=https://lotusotec.cl`, com um comentário
  dizendo que é a origem exata do site, sem curinga, e que a chave precisa estar no host **antes**
  do deploy, por causa da checagem de alinhamento.
- `conferir-golive.sh`: `CORS_PUBLIC_ORIGINS` entra no fim de `CHAVES_ESPERADAS`.

- [ ] **Step 4: Run to verify it passes**

Run:
1. `docker compose exec -T app php artisan test --filter='PublicCorsTest|SetLocaleTest|AccountDeactivationMidSessionTest'`
2. `cd frontend && pnpm test -- tests/env-prod-example.test.ts tests/conferir-golive.test.ts tests/conferir-alinhamento.test.ts`

Expected: PASS. A segunda catraca prende a lista do script ao molde.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Shared/Http/Middleware/HandleCors.php backend/config/cors.php backend/bootstrap/app.php \
  backend/.env.example backend/tests/Feature/Shared/PublicCorsTest.php \
  deploy/aws/env.prod.example deploy/bin/conferir-golive.sh
git commit -m "feat(61): CORS do site só nas rotas públicas, sem credenciais"
```

## Task 6: Rule atualizada e verificação da branch

**Files:**
- Modify: `.claude/rules/backend-ddd.md`

**Interfaces:**
- Consumes: as rotas das Tasks 2 e 3 e a política da Task 5.
- Produces: nada de código.

- [ ] **Step 1: Atualizar a rule**

Em `backend-ddd.md`:
- A lista de rotas anônimas, em **Rotas**, ganha `publico/certificados/consulta` e
  `publico/certificados/{uuid}/pdf`.
- O parágrafo de CORS, em **Auth**, ganha uma frase: a origem do site (`CORS_PUBLIC_ORIGINS`)
  recebe CORS só em `api/publico/*`, sem credenciais, pelo
  `App\Shared\Http\Middleware\HandleCors`.

- [ ] **Step 2: Verificação completa**

Run:
1. `docker compose exec -T app php artisan test`
2. `cd backend && ./vendor/bin/pint --test <arquivos PHP do bloco>`
3. `cd frontend && pnpm build && pnpm lint && pnpm test`

Expected: tudo verde, sem teste pulado novo. Esta é a prova do critério 7 da spec.

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/backend-ddd.md
git commit -m "docs(61): rotas anônimas e CORS público na rule do backend"
```

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 5 | sim: a 1 toca `RateLimits.php`, `Rut.php`, `RateLimitTest.php` e `RutTest.php`; a 5 toca o middleware, `cors.php`, `bootstrap/app.php`, os envs, o `conferir-golive.sh` e o `PublicCorsTest.php` | nenhuma: a 5 não consome nada |

As Tasks 2, 3 e 4 formam uma cadeia, com `routes.php`, `PublicCertificateAccess` e as catracas em
comum, e executam uma a uma depois da Task 1. A Task 6 vem por último.

## Handoff de execução

- **executor: claude.** O bloco toca quatro leis do §5:
  - o envelope RFC 7807, com o caso novo no `TipoDeRecusa`;
  - os tipos gerados;
  - a auth Sanctum, pelo CORS ao lado de uma API com cookie;
  - mensagem de `lang/`.

  É superfície anônima com requisito de segurança, e não há task mecânica de paths fechados que
  compense o gate do Codex.
- **Sessão:** `/executar-bloco 61`, numa sessão aberta na lane, com o modelo e o esforço do
  frontmatter do command (`sonnet`, `medium`).
  - As Tasks 4 e 5 são as de maior risco: uma erra a ordem guarda → busca, a outra vaza
    credencial para o site.
  - Se o João quiser opus nos implementadores, o caminho é `--max`.
- **Papéis (`.claude/papeis.md`):**
  - `implementador-mecanico`: Tasks 1 e 6.
  - `implementador-integracao`: Tasks 2, 3, 4 e 5.
  - `revisor-task`: por task.
  - `re-revisor` e `corretor-tardio`: nas rodadas de correção.
  - `revisor-branch`: no fim.
- **Efeito externo:** a `## Verificação externa` da spec tem dois itens, com o env antes do
  deploy. A tabela sai em `aceitacao.md`, gerada no planejamento.

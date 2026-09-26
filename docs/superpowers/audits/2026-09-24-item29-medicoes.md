# Medições — item 29 `backend-config-e-conteudo-de-documento`

> Task 11 do plano `plans/archive/2026-09-24-backend-config-e-conteudo-de-documento.md`. Cada seção cola a
> saída real do comando; nada é resumido de memória. Branch `fix/backend-config-e-conteudo-de-documento`,
> main tree (gate P-03), medido em 2026-09-25 sobre `b8ccb588`.

## 1. Suíte inteira

```
docker compose exec -T app php artisan test
```

```
  Tests:    5 skipped, 1216 passed (9261 assertions)
  Duration: 73.12s
```

Base: `main` com 1192 passed / 5 skipped no último fechamento de backend. Diferença **+24**,
reconciliada task a task pelo total da suíte que cada implementador registrou:

| Task | Testes novos | Suíte depois |
|---|---|---|
| 1 — `FusoDoNegocioTest` | +5 | 1197 |
| 2 — 23h de Santiago e 31/12 às 22h (`IssueCertificateTest`) | +2 | 1199 |
| 3 — vence hoje às 22h locais (`DocumentValidityStatusTest`) | +1 | 1200 |
| 4 — Dashboard (nenhum teste novo, nenhum editado) | 0 | 1200 |
| 5 — `DataDeCalendarioTest` | +3 | 1203 |
| 6 — `FusoDeArmazenamentoTest` | +1 | 1204 |
| 7 — `CertificateValidationUrlTest` (4 métodos + 3 casos do provider) | +7 | 1211 |
| 8 — PDF (1 + 2 do provider), emissão (1), lote (1) | +5 | 1216 |
| **Total** | **+24** | **1216** |

Os 5 skipped são os mesmos da `main`.

## 2. Contrato intacto

```
docker compose exec -T app php artisan typescript:transform && git diff --stat -- frontend/src/shared/types/generated.ts
```

```
All done!
```

`git diff --stat` sem nenhuma linha: `generated.ts` inalterado (o path real é
`frontend/src/shared/types/generated.ts`). Os dois avisos `Tried replacing reference to
Spatie\LaravelData\Optional in UserData` são anteriores ao bloco.

## 3. Pint no que o bloco tocou

```
cd backend && ./vendor/bin/pint --test $(git diff --name-only main...HEAD -- . | grep '\.php$' | grep -v '^backend/lang/' | sed 's#^backend/##')
```

```
{"tool":"pint","result":"passed"}
```

26 arquivos `.php` (17 em `app/`, `config/app.php` e 8 em `tests/`); `lang/` fica fora pela rule
`backend-lang.md`.

## 4. As provas de reprovação

### 4.1 Task 2 — emissão contra `$now = now()` em UTC

```
docker compose exec -T app php artisan test --filter='test_emissao_as_23h_de_santiago_grava_o_dia_local|test_emissao_na_noite_de_31_12_em_santiago_usa_o_ano_local'
```

```
FAILED  Tests\Feature\Certification\IssueCertificateTest > emissao as 23h…
Failed asserting that two strings are identical.
-'2026-09-24'
+'2026-09-25'
  at tests/Feature/Certification/IssueCertificateTest.php:321
    321: $this->assertSame('2026-09-24', $certificate->snapshot->emitido_em);

FAILED  Tests\Feature\Certification\IssueCertificateTest > emissao na noi…
Failed asserting that two strings are identical.
-'LOT-2026-1000'
+'LOT-2027-1000'
  at tests/Feature/Certification/IssueCertificateTest.php:340
    340: $this->assertSame('LOT-2026-1000', $certificate->codigo);

Tests:    2 failed (4 assertions)
```

### 4.2 Task 3 — vigência contra `CarbonImmutable::today()` em UTC

```
docker compose exec -T app php artisan test --filter=test_vence_hoje_em_santiago_segue_valendo_as_22h_locais
```

```
FAILED  Tests\Unit\Identity\DocumentValidityStatusTest > vence hoje em sa…
Failed asserting that two variables reference the same object.
-App\Domains\Identity\Enums\DocumentValidityStatus Enum #121 (VenceEmBreve, 'vence_em_breve')
+App\Domains\Identity\Enums\DocumentValidityStatus Enum #409 (Vencido, 'vencido')
Tests: 1 failed (1 assertions)
```

### 4.3 Task 5 — sonda da catraca de data de calendário

Mutação num sítio já migrado, restaurada de cópia no scratchpad da sessão (nunca `git stash`):

```bash
cp backend/app/Domains/Identity/Enums/DocumentValidityStatus.php "$SP/DocumentValidityStatus.php.orig"
sed -i 's/FusoDoNegocio::hoje()/CarbonImmutable::today()/' backend/app/Domains/Identity/Enums/DocumentValidityStatus.php
docker compose exec -T app php artisan test --filter=test_nenhum_arquivo_de_app_deriva_data_do_relogio_do_servidor
```

```
 FAIL  Tests\Unit\Shared\DataDeCalendarioTest
 ⨯ nenhum arquivo de app deriva data do relogio do servidor            0.02s
 FAILED  Tests\Unit\Shared\DataDeCalendarioTest > nenhum arquivo de app de…
  Data de calendário derivada do relógio UTC. Use App\Shared\Support\FusoDoNegocio (hoje(), agora(), dataDe()).
Failed asserting that two arrays are identical.
-Array &0 []
+Array &0 [
+    0 => 'Domains/Identity/Enums/DocumentValidityStatus.php: Carbon::today()',
+]

 Tests:    1 failed (1 assertions)
```

Restaurado com `cp "$SP/DocumentValidityStatus.php.orig" …`; `git diff --stat` do arquivo vazio e
a catraca de volta a `3 passed (14 assertions)`.

### 4.4 Task 6 — sonda do fuso de armazenamento

```bash
cp backend/config/app.php "$SP/app.php.final"
sed -i "s/'timezone' => 'UTC',/'timezone' => env('APP_TIMEZONE', 'UTC'),/" backend/config/app.php
docker compose exec -T app php artisan test --filter=FusoDeArmazenamentoTest
```

```
FAIL  Tests\Feature\Shared\FusoDeArmazenamentoTest
⨯ fuso da aplicacao e utc mesmo com app timezone no ambiente   0.10s
Failed asserting that two strings are identical.
-'UTC'
+'America/Santiago'
  at tests/Feature/Shared/FusoDeArmazenamentoTest.php:38
```

Restaurado com `cp "$SP/app.php.final" backend/config/app.php`; o teste volta a
`1 passed (3 assertions)` e o arquivo fica idêntico à cópia. A sonda não foi vácua.

### 4.5 Task 8 — PDF e emissão antes de passar pela chave própria

```
docker compose exec -T app php artisan test --filter='test_qr_aponta_para_a_chave_de_validacao_quando_preenchida|test_pdf_em_producao_sem_chave_https_recusa_com_500_nomeado|test_emissao_em_producao_sem_chave_https_recusa_e_nao_cria_certificado|test_lote_em_producao_sem_chave_https_recusa_sem_emitir_nenhum'
```

```
FAILED  Tests\Feature\Certification\BatchIssueTest > lote em producao sem…
  Expected response status code [500] but received 200.
  Failed asserting that 200 is identical to 500.

FAILED  Tests\Feature\Certification\CertificatePdfTest > qr aponta para a…
  O HTML do certificado não corresponde ao esperado.
  Failed asserting that false is true.

FAILED  Tests\Feature\Certification\CertificatePdfTest > pdf em producao…  (ausente)
  Expected response status code [500] but received 200.
  Failed asserting that 200 is identical to 500.

FAILED  Tests\Feature\Certification\CertificatePdfTest > pdf em producao…  (http cru)
  Expected response status code [500] but received 200.
  Failed asserting that 200 is identical to 500.

FAILED  Tests\Feature\Certification\IssueCertificateTest > emissao em pro…
  Expected response status code [500] but received 201.
  Failed asserting that 201 is identical to 500.

Tests:    5 failed (6 assertions)
```

Os testes de produção autenticam antes de trocar o ambiente (o seed do admin pede confirmação em
`production`) e os POSTs levam `Sec-Fetch-Site: same-origin` (fora de `testing` o CSRF segue
ativo). Asserções e valores de config como o plano os escreveu.

## 5. E2E — QR decodificado de um certificado real, com a chave

O João acrescentou `CERTIFICATE_VALIDATION_URL=https://valida.lotus.example` ao `backend/.env` (o
compose não sobrescreve a chave). Conferido no container antes de emitir:

```
docker compose exec -T app php artisan tinker --execute="echo config('app.certificate_validation_url');"
https://valida.lotus.example
```

Primeira tentativa: a linha foi posta no `.env` da raiz, que só alimenta a interpolação do compose e
não chega ao container — o `config()` voltou vazio. Movida para o `backend/.env`, o valor apareceu.

Contra a API real do dev (`http://localhost:8080`), sessão Sanctum do `admin@lotus.cl`
(`GET /sanctum/csrf-cookie` → 204, `POST /api/login` → 200). Matrícula emitível escolhida no
`GET /api/certificates/emission-panel`: `enrollment_id` 22 (turma 3, redator 3).

```
POST /api/enrollments/22/certificate  {"redator_id":3}
HTTP 201
{'id': 6001, 'codigo': 'LOT-2026-1000', 'uuid': 'bdffd55b-615d-4514-a1af-cd9cbf05db07', 'status': 'emitido'}

GET /api/certificates/6001/pdf  →  HTTP 200, item29-com-chave.pdf
Producer: Skia/PDF m151 · Pages: 2
```

Rasterizado e decodificado (arquivos no scratchpad da sessão; o zxing-cpp roda num container
descartável `python:3.12-slim`, porque o host não tem `python3-venv`/`pip`):

```bash
pdftoppm -png -r 300 -f 1 -l 1 item29-com-chave.pdf item29-com-chave
docker run --rm -v $SP:/w -e PYTHONPATH=/w/pylib python:3.12-slim python -c "import sys, zxingcpp; from PIL import Image; print([r.text for r in zxingcpp.read_barcodes(Image.open(sys.argv[1]))])" /w/item29-com-chave-1.png
```

```
['https://valida.lotus.example/validar/bdffd55b-615d-4514-a1af-cd9cbf05db07']
```

A URL do QR é a da chave, com o `uuid` do certificado emitido.

## 6. E2E — o fallback no mesmo certificado

O João removeu a linha do `backend/.env`. Conferido no container:

```
docker compose exec -T app php artisan tinker --execute="var_dump(config('app.certificate_validation_url')); echo config('app.frontend_url');"
NULL
http://localhost:5174
```

Mesmo certificado, baixado de novo e decodificado do mesmo jeito:

```
GET /api/certificates/6001/pdf  →  HTTP 200, item29-sem-chave.pdf
['http://localhost:5174/validar/bdffd55b-615d-4514-a1af-cd9cbf05db07']
```

É o `FRONTEND_URL` que o compose deriva do offset do main tree (`LOTUS_DEV_VITE_PORT=5174`): o
fallback de fora de produção exercido no artefato real. E o mesmo certificado, baixado duas vezes,
carregou dois endereços — o motivo de o QR ter dono próprio e de a produção recusar sem ele.

## 7. Devolver o banco de dev

Revogação, não delete: o registro de peso legal fica com trilha de auditoria.

```
POST /api/certificates/6001/revoke  {"reason":"prova do item 29"}
HTTP 200
{'id': 6001, 'codigo': 'LOT-2026-1000', 'status': 'revocado', 'revoked_at': '2026-09-25T04:44:17.000000Z', 'revocation_reason': 'prova do item 29'}
```

O `backend/.env` voltou ao que era antes do Step 5 (a linha foi removida pelo João).

## 8. Correções do review de 2026-09-25

O `/revisar-sprint` devolveu dois achados 🟡. O João aprovou os dois, sem nova rodada do Codex (a
revisão independente travou e foi cancelada sem achados).

### Q-1 — período do dashboard em dias de Santiago

A D1 migrou o default do `DashboardFilterData` para `FusoDoNegocio::hoje()`, mas o `AnalyticsQuery`
compara esse limite com instantes UTC (`created_at`, `approved_at`, `concluded_at`). Das 21h à
meia-noite de Santiago, o que acontecia no dia sumia das séries e dos rankings: uma regressão do
próprio bloco, medida no review com o relógio em 01:00 UTC de 25/09.

Correção: `FusoDoNegocio::inicioDoDia()` e `fimDoDia()` convertem o dia do cliente nos instantes
em que ele começa e termina em Santiago, e o balde mensal de instante passa a ser o mês de Santiago
(`dataDe()`). Coluna `date` (`start_date`) segue comparando dia com dia. O fim do dia é o início do
seguinte menos 1µs, porque `endOfDay()` em Santiago perde a hora repetida da volta do horário de
verão:

```
2026-04-04  endOfDay() = 2026-04-05 02:59:59.999999 UTC   início do dia seguinte - 1µs = 03:59:59.999999 UTC
2026-04-05  início     = 2026-04-05 04:00:00 UTC
```

Sondas (arquivo restaurado de cópia no scratchpad, `cmp` conferido):

| Sonda | `periodo_e_baldes` | `periodo_default` |
|---|---|---|
| `AnalyticsQuery` de `HEAD` (9f9b0d9e) | ⨯ | ⨯ |
| só os limites (balde em UTC) | ⨯ | ✓ |
| só o balde (limites crus) | ⨯ | ⨯ |
| `fimDoDia()` por `endOfDay()` | `FusoDoNegocioTest::os_dias_encostam_na_troca_de_horario` ⨯ | |

O `DashboardEndpointTest` gravava `approved_at` como data pura, ou seja, meia-noite UTC, que em
Santiago ainda é a noite anterior. A fixture passou a gravar o meio-dia UTC do dia pedido; nenhuma
asserção mudou.

Fora do achado, visto no caminho: no sqlite a coluna `date` guarda `Y-m-d 00:00:00`, então
`whereBetween('start_date', [..., 'Y-m-d'])` exclui o último dia por comparação de string. No MySQL
a coluna é `DATE` e o problema não existe. Já era assim antes do bloco, e o teste novo evita a borda.

### Q-2 — `agora()` não grava instante

Docblock do `FusoDoNegocio::agora()` e a rule `backend-ddd.md` dizem que ele serve para LER o
calendário, nunca para gravar ou filtrar instante. A catraca `DataDeCalendarioTest` ganhou a
grafia `agora() gravado como instante` (`*_at` recebendo `FusoDoNegocio::agora()`). Sonda com
`['revoked_at' => FusoDoNegocio::agora()]` injetado na `IssueCertificateAction`:

```
⨯ nenhum arquivo de app deriva data do relogio do servidor
+    0 => 'Domains/Certification/Actions/IssueCertificateAction.php: agora() gravado como instante'
```

### Verificação depois das correções

```
docker compose exec -T app php artisan test
Tests:    5 skipped, 1221 passed (9284 assertions)
```

+5 em relação à §1: dois do `AnalyticsQueryTest` e três do `FusoDoNegocioTest`. `generated.ts`
sem diff depois do `typescript:transform`. Pint `passed` nos sete `.php` tocados.

## 9. Prova do fechamento — 2026-09-25, contra a API real, na janela das 21h de Santiago

`/fechar-sprint` §0, sobre `6fe8a80d`. O relógio da prova:

```
UTC 2026-09-26T00:57:41
Santiago 2026-09-25T21:57:41
```

Sessão Sanctum do `admin@lotus.cl` contra `http://localhost:8080`. `GET /api/dashboard/metricas`
antes da emissão: `period_end: 2026-09-25`, série `certificados_emitidos` sem balde `2026-09`,
ranking do curso 2 e do cliente Enel com `certificados: 0`.

```
POST /api/enrollments/23/certificate  {"redator_id":3}
HTTP 201
{'id': 6002, 'codigo': 'LOT-2026-1001', 'uuid': '483757bf-0cd2-47be-ae4d-8a57a4fbc155', 'status': 'emitido', 'created_at': '2026-09-26T00:57:41.000000Z', 'valido_ate': '2027-09-25'}
```

Snapshot lido no container e texto da página 1 do PDF (`GET /api/certificates/6002/pdf` → 200,
`Skia/PDF m151`, 2 páginas):

```
{"emitido_em":"2026-09-25","codigo":"LOT-2026-1001","created_at_raw":"2026-09-26 00:57:41"}
N° LOT-2026-1001
Emisión: 25-09-2026
En Santiago a 25-09-2026, OTEC LOTUS SpA [77.510.327-2] certifica que:
Este certificado es válido hasta el 25-09-2027.
```

O instante segue em UTC (`created_at` de 26/09), e o dia impresso, a vigência e o ano do código são
de Santiago. QR decodificado do PNG a 300 dpi (zxing-cpp no `python:3.12-slim`, como na §5), sem
`CERTIFICATE_VALIDATION_URL` em `local`:

```
['http://localhost:5174/validar/483757bf-0cd2-47be-ae4d-8a57a4fbc155']
```

`GET /api/dashboard/metricas` depois da emissão (Q-1 — o certificado de 00:57 UTC do dia 26 entra
no dia 25 de Santiago):

```
dash-antes  2025-09-25 2026-09-25 serie 2026-09: []                              curso 2: 0  Enel: 0  a emitir: 12
dash-depois 2025-09-25 2026-09-25 serie 2026-09: [{'month': '2026-09', 'count': 1}] curso 2: 1  Enel: 1  a emitir: 11
```

Banco de dev devolvido por revogação:

```
POST /api/certificates/6002/revoke  {"reason":"prova do fechamento do item 29"}
HTTP 200
{'id': 6002, 'codigo': 'LOT-2026-1001', 'status': 'revocado', 'revoked_at': '2026-09-26T00:58:31.000000Z', 'revocation_reason': 'prova do fechamento do item 29'}
```

O QR **com** a chave não foi refeito no fechamento: o harness nega escrita em `.env`, e nenhum
arquivo do caminho do QR mudou desde a §5 (`git diff --stat ffe0b5ca..HEAD` toca só Dashboard,
`FusoDoNegocio`, testes e docs).

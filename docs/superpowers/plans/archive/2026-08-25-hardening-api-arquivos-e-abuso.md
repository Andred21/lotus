# Hardening de API, arquivos e abuso — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar à API contenção de abuso, política única de arquivo e escaneamento antivírus antes da
exposição pública, sem estreitar o fluxo normal de ~10 usuários internos.

**Architecture:** limitadores nomeados publicados por uma peça única em `Shared/RateLimiting`, com
teto global no grupo `api` para que rota nova nasça coberta; envelope `429` do ADR-03 passando a
carregar os headers que a exceção já produz; política de tipo/tamanho publicada por um enum em
`Shared/Files` que os 13 sítios de upload consomem, com o scan ClamAV embutido nela como regra de
validação; duas catracas de silêncio-reprova guardando as duas propriedades.

**Tech Stack:** Laravel 13 / PHP 8.3 · `Illuminate\Cache\RateLimiting` sobre `CACHE_STORE=database`
· ClamAV 1.4 no compose (protocolo INSTREAM em TCP 3310) · `Symfony\Component\Mime` para MIME de
conteúdo · PHPUnit.

---

## Correções de medição sobre a spec

A spec [`2026-08-25-hardening-api-arquivos-e-abuso-design.md`](../../specs/archive/2026-08-25-hardening-api-arquivos-e-abuso-design.md)
foi aprovada com três afirmações que a medição desta fase **desmentiu**. O plano segue a medição, e
a spec recebe uma emenda datada na Task 0. As decisões D1–D8 continuam valendo — o que muda é o
mecanismo, não a escolha.

**C-1 — `trustProxies` sai do bloco; ele ABRIRIA o buraco que a spec queria fechar.**
A spec §4.1 o declarou pré-requisito, supondo que `$request->ip()` devolvesse o endereço do
container do proxy. Medido em `main@6cfe0070`, com a stack de dev de pé:

| Medição | Resultado |
|---|---|
| `grep -n REMOTE_ADDR /etc/nginx/fastcgi_params` (container `nginx`) | `fastcgi_param REMOTE_ADDR $remote_addr;` |
| `curl http://localhost:8080/<sonda>.php` | `REMOTE_ADDR=172.20.0.1` |
| `curl -H 'X-Forwarded-For: 203.0.113.9' …` | `HTTP_X_FORWARDED_FOR=203.0.113.9` **e** `REMOTE_ADDR=172.20.0.1` |
| `$request->ip()` sem `trustProxies` | `172.20.0.1` (o peer real) |
| `$request->ip()` com `trustProxies(['172.16.0.0/12'])` | `203.0.113.9` — **o valor forjado pelo cliente** |

O PHP recebe o peer **como o nginx o viu**, não o endereço do container do nginx: em produção o
nginx é a borda, então `REMOTE_ADDR` já é o cliente. E o nginx repassa o `X-Forwarded-For` que o
cliente mandar, sem sobrescrever. Ligar `trustProxies` faria todo limitador por IP passar a ser
chaveado por um header que qualquer um escolhe — bypass de um header só. O hardening correto é o
inverso: **apagar o `X-Forwarded-*` de entrada no nginx** e manter a aplicação sem proxy confiável.
Task 2.

**C-2 — `mimes:` no Laravel já lê o conteúdo; a "camada dupla" da spec §4.3 é uma camada só.**
`ValidatesAttributes::validateMimes()` compara `$value->guessExtension()`, que deriva de
`getMimeType()` (conteúdo), não da extensão declarada. Medido com arquivos reais no container:

| Arquivo real | `guessExtension()` | `mimes:pdf,jpg,jpeg,png,webp` | `mimetypes:application/pdf,image/*…` |
|---|---|---|---|
| ELF renomeado `documento.pdf` | `NULL` | recusa | recusa |
| PDF real `.pdf` | `'pdf'` | aceita | aceita |
| PNG real renomeado `.pdf` | `'png'` | aceita | aceita |
| CSV real `.csv` | `'txt'` | recusa | recusa |
| XLSX real `.xlsx` | `'xlsx'` | recusa | recusa |

Os dois veredictos coincidem em todos os casos. A frase da spec — "`mimes:` aceita `.exe` renomeado
se o servidor adivinhar pela extensão" — é **falsa neste runtime**. `mimetypes:` continua no plano
por um motivo menor e verdadeiro: prende a string exata do MIME, então uma mudança futura no mapa
mime→extensão do Symfony não pode alargar a allowlist em silêncio. O ganho real da peça é outro, e
é grande: **os endpoints sem tipo passam a ter tipo**.

**C-3 — a emissão em lote NÃO chama o Gotenberg.**
A spec §1 e o DoD 6 dizem que cada `enrollment_id` vira um PDF. Medido:
`grep -n "pdf\|render\|Gotenberg" app/Domains/Certification/Actions/IssueCertificateAction.php`
não devolve nada, e `CertificatePdfService` tem **um** consumidor —
[`CertificateController.php:57`](../../../backend/app/Domains/Certification/Http/Controllers/CertificateController.php#L57),
a rota `GET certificates/{certificate}/pdf`. O custo do lote é `N` transações de emissão (seis
portas + snapshot + auditoria), não `N` renderizações. O teto continua necessário — o motivo e o
DoD é que mudam.

**Achado novo: a superfície de upload são 13 rotas, não 10.**
`POST /api/redatores` e `PUT /api/redatores/{redator}` aceitam `documents[<TIPO>]` como
`UploadedFile` e **não têm regra `file` nenhuma** — nem tipo, nem tamanho.
[`RedatorController.php:102-131`](../../../backend/app/Domains/Identity/Http/Controllers/RedatorController.php#L102-L131)
só confere que é um mapa de tipo válido para `UploadedFile`. O único teto é o transporte (nginx
12m, PHP `upload_max_filesize=12M`). É o pior sítio da superfície e a spec não o listou; a catraca
da Task 7 é exatamente o que o teria pego.

---

## Global Constraints

- **Container:** todo comando de backend roda em `docker compose exec -T app` (`CLAUDE.md` §6).
  Pint é a exceção: `cd backend && ./vendor/bin/pint <arquivos>` no host, **nunca sem argumento**.
- **Main tree:** este bloco toca backend, então roda na árvore principal — P-03.
- **Idioma de mensagem ao usuário:** es-CL. Docblock em PT-BR. Precedente:
  `App\Shared\Rules\PrintableGrade` e o contrato escrito em `App\Shared\Exceptions\PublicDetail`.
- **Erro sempre pelo handler global RFC 7807** (`CLAUDE.md` §5.4, ADR-03). Nunca `abort(422)`.
- **Nenhum DTO muda de forma neste bloco**, então `generated.ts` não muda. `typescript:transform`
  roda no gate e o `git diff` do arquivo tem de sair **vazio** — é prova, não suposição.
- **`down()` de migration de backfill é no-op declarado por escrito.** Precedente: P-47 em
  `2026_08_22_000003_backfill_redator_role.php`.
- **Catraca é vista reprovando antes de passar**, com a sonda revertida e a árvore limpa.
  Precedente: `ParentLockOnChildWriteTest`, Regra C do `DomainDependencyTest`.
- **Números medidos, e todos revisáveis com medição de produção:** as tabelas de limite da Task 3 e
  os tetos da Task 10 saem das medições registradas aqui. Nenhum é chute, e nenhum é sagrado.

### Ambiente medido (base das escolhas)

| Medição | Valor | Onde importa |
|---|---|---|
| `pm.max_children` (`docker/php/www.conf:38`) | **5** | 5 requisições PHP simultâneas no total — é o que torna o throttle e o scan síncrono proporcionais |
| `fastcgi_read_timeout` | dev **60s** (default), prod **120s** (`docker/nginx/prod.conf:35`) | teto de duração do lote e do import |
| `upload_max_filesize` / `post_max_size` | **12M** / **12M** | acima do teto lógico de 10 MB, de propósito |
| `memory_limit` FPM | **256M** | materializar 500 linhas de planilha é irrelevante perto disso |
| `CACHE_STORE` | `database` em dev/prod, `array` na suíte | contador do limitador; `array` zera por teste |
| Tamanho real de turma (`OperationDemoSeeder`) | **8 a 15 alunos** | referência dos tetos de lote e import |
| Scan ClamAV INSTREAM | 100 KB → **17 ms** · 1 MB → **72 ms** · 10 MB → **551 ms** | é o que sustenta D1 (síncrono, sem worker) |
| `clamav/clamav:1.4` | **146 MiB** comprimido, base de assinaturas embutida, `clamd` pronto em **~10 s**, **1,014 GiB** residentes | insumo do item 10 (dimensionamento da EC2) |
| `StreamMaxLength` do clamd | **104857600** (100 MB) | folga de 10× sobre o teto de 10 MB |

---

## Estrutura de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Shared/RateLimiting/RateLimits.php` | fonte única dos limitadores nomeados e dos números |
| `backend/app/Shared/Files/ContentClass.php` | fonte única de extensão, MIME e teto por classe de conteúdo |
| `backend/app/Shared/Files/MalwareScanner.php` | interface do scanner (o adapter troca nos testes) |
| `backend/app/Shared/Files/ClamAvScanner.php` | adapter INSTREAM do daemon `clamav` |
| `backend/app/Shared/Files/ScannerUnavailableException.php` | recusa por scanner fora do ar — 503, distinta da recusa por infecção |
| `backend/app/Shared/Files/Rules/ScannedForMalware.php` | regra de validação que roda o scan antes de qualquer escrita |
| `backend/database/migrations/2026_08_25_000001_backfill_files_mime.php` | corrige `files.mime` histórico relendo o objeto |
| `backend/tests/Support/Files/FakeMalwareScanner.php` | dobradura de teste do scanner |
| `backend/tests/Support/Files/BuildsRealUploads.php` | monta `UploadedFile` com bytes reais (o fake do framework não tem conteúdo) |
| `backend/tests/Feature/Shared/ProblemDetailsHeadersTest.php` | Task 1 |
| `backend/tests/Feature/Shared/ClientIpTrustTest.php` | Task 2 |
| `backend/tests/Feature/Shared/RateLimitTest.php` | Tasks 3 e 4 |
| `backend/tests/Feature/Shared/ThrottledRouteRatchetTest.php` | catraca 1 (Task 5) |
| `backend/tests/Feature/Shared/UploadPolicyTest.php` | Task 6 |
| `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php` | catraca 2 (Task 7) |
| `backend/tests/Feature/Shared/FileMimeFromContentTest.php` | Task 8 |
| `backend/tests/Feature/Shared/BackfillFilesMimeMigrationTest.php` | Task 8 |
| `backend/tests/Feature/Shared/MalwareScanTest.php` | Task 9 |
| `backend/tests/Feature/Shared/PrivateStorageTest.php` | Task 11 |

**Modificados**

| Arquivo | O que muda |
|---|---|
| `backend/app/Shared/Exceptions/ProblemDetails.php` | braço do `429` + repasse de `getHeaders()` |
| `backend/bootstrap/app.php` | `throttle:api` no grupo `api` |
| `backend/app/Providers/AppServiceProvider.php` | registra os limitadores e o binding do scanner |
| `backend/app/Domains/Identity/routes.php` | `throttle:login`, `throttle:password`, `throttle:upload` |
| `backend/app/Domains/Certification/routes.php` | `throttle:public-certificate`, `certificate-batch`, `certificate-pdf` |
| `backend/app/Domains/Operation/routes.php` | `throttle:upload`, `throttle:import` |
| `backend/app/Domains/Commercial/routes.php` | `throttle:upload` |
| `backend/app/Domains/Identity/Services/UserPhotoService.php` | `RULES` passa a vir do `ContentClass` |
| `backend/app/Domains/Identity/Http/Controllers/ProfileDocumentController.php` | regras do `ContentClass` |
| `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php` | regras do `ContentClass` |
| `backend/app/Domains/Identity/Http/Controllers/RedatorController.php` | valida `documents[<TIPO>]` — hoje sem regra nenhuma |
| `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php` | regras do `ContentClass` |
| `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php` | regras do `ContentClass` |
| `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php` | regras do `ContentClass` |
| `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` | regras do `ContentClass` |
| `backend/app/Shared/Files/Actions/UploadFileAction.php` | `getClientMimeType()` → `getMimeType()` |
| `backend/app/Domains/Certification/Data/BatchIssueData.php` | `max:200` em `enrollment_ids` |
| `backend/app/Domains/Operation/Actions/ImportStudentsAction.php` | teto de linhas antes de matricular |
| `backend/config/services.php` | bloco `clamav` |
| `backend/.env.example` | `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_TIMEOUT` |
| `backend/phpunit.xml` | `CLAMAV_HOST` inerte na suíte |
| `backend/tests/TestCase.php` | scanner default da suíte é a dobradura |
| `docker-compose.yml` · `docker-compose.prod.yml` | serviço `clamav` |
| `docker/nginx/default.conf` · `docker/nginx/prod.conf` | apaga `X-Forwarded-*` de entrada |
| `docs/superpowers/specs/2026-08-25-…-design.md` | emenda com C-1, C-2 e C-3 |

---

### Task 0: Emenda datada na spec

A spec é o desenho de registro. Deixar C-1, C-2 e C-3 lá dentro como afirmação corrente faria o
próximo leitor herdar três coisas falsas — inclusive uma que **abriria** um buraco de segurança.
Emenda, não reescrita: o texto original fica, e a emenda diz o que a medição mostrou.

**Files:**
- Modify: `docs/superpowers/specs/2026-08-25-hardening-api-arquivos-e-abuso-design.md`

- [ ] **Step 1: Acrescentar a seção de emenda ao fim da spec**

```markdown
## 9. Emenda de 2026-08-25 — medição do plano

Três afirmações desta spec não sobreviveram à medição feita ao escrever o plano
(`plans/2026-08-25-hardening-api-arquivos-e-abuso.md`, seção "Correções de medição sobre a spec",
onde as tabelas estão). D1–D8 seguem valendo; o que muda é mecanismo.

- **§1 e §4.1, `trustProxies`: REVERTIDO.** O PHP recebe `REMOTE_ADDR` como o nginx viu o peer, e
  em produção o nginx é a borda — `$request->ip()` já é o cliente. Medido: com `trustProxies`
  ligado, um `X-Forwarded-For` forjado pelo cliente VIRA o `ip()`, e todo limitador por IP passa a
  ser contornável com um header. O bloco faz o oposto: o nginx apaga o `X-Forwarded-*` de entrada e
  a aplicação segue sem proxy confiável. Se um balanceador L7 entrar na frente (item 10), a decisão
  reabre — com o `real_ip_module` do nginx, não com `trustProxies` cru.
- **§4.3, "validação de duas camadas": IMPRECISO.** `mimes:` no Laravel compara
  `guessExtension()`, que deriva do conteúdo. As duas regras deram veredicto idêntico em todos os
  casos medidos. `mimetypes:` fica por prender a string exata do MIME contra alargamento futuro do
  mapa do Symfony, não por ser uma segunda camada.
- **§1 e §7.6, "cada id vira um PDF pelo Gotenberg": FALSO.** `IssueCertificateAction` não toca o
  conversor; `CertificatePdfService` tem um único consumidor, a rota
  `GET certificates/{certificate}/pdf`. O custo do lote é `N` transações de emissão. O teto
  permanece; o DoD 6 passa a medir o que existe.

Achado que a spec não tinha: `POST /api/redatores` e `PUT /api/redatores/{redator}` aceitam
`documents[<TIPO>]` **sem regra `file` nenhuma**. A superfície de upload são 13 rotas, não 10.
```

- [ ] **Step 2: Conferir que a spec segue legível e nada foi apagado**

Run: `git -C /home/jvbat/projetos/lotus diff --stat docs/superpowers/specs/`
Expected: um único arquivo, só linhas adicionadas (`+`), zero removidas.

- [ ] **Step 3: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add docs/superpowers/specs/2026-08-25-hardening-api-arquivos-e-abuso-design.md
git commit -m "docs(spec): emenda de medicao — trustProxies revertido, mimes ja le conteudo, lote nao renderiza PDF"
```

---

### Task 1: `429` com `Retry-After` no envelope RFC 7807

`ThrottleRequestsException` já cai no braço genérico de `HttpExceptionInterface` e sai como
`application/problem+json` — o ADR-03 está formalmente atendido. Mas `ProblemDetails` monta os
headers do zero e **nunca chama `getHeaders()`**, então o `Retry-After` e os `X-RateLimit-*` que
`ThrottleRequests::buildException()` produz são descartados. Sem isso o cliente recebe `429` sem
saber quando pode voltar, e todo DoD de throttle deste bloco ficaria sem o que ler. Por isso é a
primeira task.

O repasse vale para **todo** `HttpExceptionInterface`, não só para o `429`: restringir ao throttle
deixaria o mesmo defeito vivo para qualquer outra exceção HTTP que carregue header. O
`Content-Type: application/problem+json` tem de **vencer** o merge — a ordem é o comportamento,
então é teste, não comentário.

**Files:**
- Modify: `backend/app/Shared/Exceptions/ProblemDetails.php:22-53`
- Test: `backend/tests/Feature/Shared/ProblemDetailsHeadersTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: resposta `429` com `type = 'https://lotus.cl/errors/too-many-requests'`,
  `title = 'Demasiadas solicitudes'` e os headers `Retry-After`, `X-RateLimit-Limit`,
  `X-RateLimit-Remaining`. Tasks 3, 4 e 12 leem esses headers.

- [ ] **Step 1: Escrever o teste que falha**

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Exceptions\ProblemDetails;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Tests\TestCase;

/**
 * O `429` já saía com o envelope certo — o que se perdia eram os headers. A
 * exceção do throttle CARREGA `Retry-After` e `X-RateLimit-*`, e o
 * `response()->json()` do ProblemDetails montava os headers do zero, jogando
 * fora os únicos que dizem ao cliente quando ele pode voltar.
 */
class ProblemDetailsHeadersTest extends TestCase
{
    private function resposta(\Throwable $e): \Illuminate\Http\JsonResponse
    {
        return ProblemDetails::fromException($e, Request::create('/api/login', 'POST'));
    }

    public function test_429_tem_titulo_e_type_proprios(): void
    {
        $resposta = $this->resposta(new ThrottleRequestsException('Too Many Attempts.', null, []));

        $this->assertSame(429, $resposta->getStatusCode());
        $this->assertSame('Demasiadas solicitudes', $resposta->getData(true)['title']);
        $this->assertSame(
            'https://lotus.cl/errors/too-many-requests',
            $resposta->getData(true)['type'],
        );
    }

    public function test_429_repassa_retry_after_e_x_rate_limit(): void
    {
        $resposta = $this->resposta(new ThrottleRequestsException('Too Many Attempts.', null, [
            'Retry-After' => 37,
            'X-RateLimit-Limit' => 5,
            'X-RateLimit-Remaining' => 0,
        ]));

        $this->assertSame('37', $resposta->headers->get('Retry-After'));
        $this->assertSame('5', $resposta->headers->get('X-RateLimit-Limit'));
        $this->assertSame('0', $resposta->headers->get('X-RateLimit-Remaining'));
    }

    public function test_content_type_do_problem_details_vence_o_header_da_excecao(): void
    {
        // Uma exceção que tentasse impor outro Content-Type não pode tirar a
        // resposta do envelope do ADR-03. A ordem do merge É o comportamento.
        $resposta = $this->resposta(new ServiceUnavailableHttpException(60, 'Fuera de servicio.', null, 0, [
            'Content-Type' => 'text/plain',
            'Retry-After' => 60,
        ]));

        $this->assertSame(503, $resposta->getStatusCode());
        $this->assertStringStartsWith(
            'application/problem+json',
            (string) $resposta->headers->get('Content-Type'),
        );
        $this->assertSame('60', $resposta->headers->get('Retry-After'));
    }

    public function test_excecao_sem_headers_nao_quebra(): void
    {
        $resposta = $this->resposta(new \RuntimeException('qualquer coisa'));

        $this->assertSame(500, $resposta->getStatusCode());
        $this->assertStringStartsWith(
            'application/problem+json',
            (string) $resposta->headers->get('Content-Type'),
        );
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ProblemDetailsHeadersTest`
Expected: FAIL. `test_429_tem_titulo_e_type_proprios` reclama de `'Erro na requisição'` em vez de
`'Demasiadas solicitudes'`; os dois testes de header reclamam de `null`.

- [ ] **Step 3: Implementar**

Em `backend/app/Shared/Exceptions/ProblemDetails.php`, acrescentar o import e o braço, e trocar a
montagem dos headers:

```php
use Illuminate\Http\Exceptions\ThrottleRequestsException;
```

O braço novo entra **antes** do genérico de `HttpExceptionInterface` (a ordem do `match` decide):

```php
            $e instanceof ThrottleRequestsException =>
                [429, 'Demasiadas solicitudes', 'https://lotus.cl/errors/too-many-requests'],
            $e instanceof HttpExceptionInterface =>
                [$e->getStatusCode(), 'Erro na requisição', 'https://lotus.cl/errors/http'],
```

E o `return`:

```php
        // Os headers da exceção vêm PRIMEIRO e o Content-Type do envelope
        // depois, porque o segundo array vence o merge: `Retry-After` e
        // `X-RateLimit-*` do throttle chegam ao cliente, mas nenhuma exceção
        // consegue tirar a resposta do `application/problem+json` do ADR-03.
        $headers = $e instanceof HttpExceptionInterface ? $e->getHeaders() : [];

        return response()->json($payload, $status, array_merge($headers, [
            'Content-Type' => 'application/problem+json',
        ]));
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=ProblemDetailsHeadersTest`
Expected: PASS, 4 testes.

- [ ] **Step 5: Suíte inteira, porque este arquivo atende toda a API**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Nenhum teste existente afirma `title = 'Erro na requisição'` para `429` — se algum
aparecer vermelho, é ele que estava documentando o defeito, e a correção é o teste.

- [ ] **Step 6: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint app/Shared/Exceptions/ProblemDetails.php tests/Feature/Shared/ProblemDetailsHeadersTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Exceptions/ProblemDetails.php backend/tests/Feature/Shared/ProblemDetailsHeadersTest.php
git commit -m "fix(api): 429 com Retry-After e X-RateLimit no envelope RFC 7807"
```

---

### Task 2: O nginx apaga o `X-Forwarded-*` de entrada

Correção **C-1**. Hoje o nginx repassa ao PHP o `X-Forwarded-For` que o cliente mandar, e não põe
um seu. Enquanto a aplicação não confia em proxy nenhum isso é inerte — `$request->ip()` devolve o
`REMOTE_ADDR`, que é o peer real. O risco é o próximo passo: qualquer `trustProxies` ligado depois
transforma esse header do cliente na identidade que os limitadores contam. Apagar o header na borda
tira a munição de vez, e o teste em PHP guarda a outra metade: se alguém ligar `trustProxies`, ele
fica vermelho.

**Files:**
- Modify: `docker/nginx/default.conf:13-18`
- Modify: `docker/nginx/prod.conf:22-36`
- Test: `backend/tests/Feature/Shared/ClientIpTrustTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: garantia de que `$request->ip()` é o peer real. Tasks 3, 4 e 12 dependem dela —
  limitador por IP chaveado num header forjável não limita nada.

- [ ] **Step 1: Escrever o teste que falha**

```php
<?php

namespace Tests\Feature\Shared;

use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * C-1 do plano de 2026-08-25. Medido na stack de dev: o nginx entrega ao PHP o
 * `X-Forwarded-For` que o CLIENTE mandou, e `fastcgi_params` já põe em
 * `REMOTE_ADDR` o peer como o nginx o viu — que em produção é o cliente, porque
 * lá o nginx é a borda.
 *
 * Logo `trustProxies` não conserta nada aqui: ele TROCA um endereço correto por
 * um header que qualquer um escolhe, e todo limitador por IP deste bloco vira
 * contornável com uma linha de `curl`. Este teste é a guarda de que ninguém
 * religa isso sem reabrir a decisão.
 */
class ClientIpTrustTest extends TestCase
{
    private function requisicaoForjada(): Request
    {
        return Request::create('/api/login', 'POST', [], [], [], [
            'REMOTE_ADDR' => '172.20.0.1',
            'HTTP_X_FORWARDED_FOR' => '203.0.113.9',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);
    }

    public function test_x_forwarded_for_do_cliente_nao_vira_o_ip_da_requisicao(): void
    {
        $this->assertSame('172.20.0.1', $this->requisicaoForjada()->ip());
    }

    public function test_a_aplicacao_nao_declara_proxy_confiavel(): void
    {
        $this->assertSame(
            [],
            Request::getTrustedProxies(),
            implode("\n", [
                'Algum proxy foi declarado confiável. Com o nginx atual — que apaga o',
                'X-Forwarded-* de entrada — isso é inofensivo; sem ele, é bypass de',
                'todo limitador por IP. Se um balanceador L7 entrou na frente, a',
                'decisão reabre no bloco que o provisionar (item 10), com real_ip_module.',
            ]),
        );
    }
}
```

- [ ] **Step 2: Rodar e ver passar — e entender por que**

Run: `docker compose exec -T app php artisan test --filter=ClientIpTrustTest`
Expected: PASS já agora. Este teste não descreve um defeito de PHP: ele **congela** o estado certo
do lado da aplicação. O defeito a corrigir é o do nginx, e ele não tem como reprovar em PHPUnit —
a prova dele é o Step 5, com `curl`.

- [ ] **Step 3: Apagar o header de entrada no nginx de dev**

Em `docker/nginx/default.conf`, dentro do `location ~ \.php$`, depois do `include fastcgi_params;`:

```nginx
    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

        # O nginx é a BORDA: não há salto na frente dele, então nenhum
        # `X-Forwarded-*` de entrada é legítimo — o que chega foi escrito pelo
        # cliente. Medido em 2026-08-25: sem estas linhas o header do cliente
        # atravessa até o PHP, e basta alguém ligar `trustProxies` depois para
        # que todo limitador por IP passe a contar um valor que o atacante
        # escolhe. A string vazia REMOVE o parâmetro FastCGI.
        fastcgi_param HTTP_X_FORWARDED_FOR "";
        fastcgi_param HTTP_X_FORWARDED_PROTO "";
        fastcgi_param HTTP_X_FORWARDED_HOST "";
        fastcgi_param HTTP_X_FORWARDED_PORT "";
        fastcgi_param HTTP_FORWARDED "";
    }
```

- [ ] **Step 4: A mesma coisa no nginx de produção**

Em `docker/nginx/prod.conf`, dentro do `location ~ ^/(api|sanctum|up)(/|$)`, depois do
`fastcgi_read_timeout 120s;`:

```nginx
        # Idêntico ao de dev e pelo mesmo motivo: o nginx é a borda, então
        # `X-Forwarded-*` de entrada só pode ter vindo do cliente. Se um
        # balanceador L7 entrar na frente (item 10), estas linhas saem JUNTO
        # com a entrada do `real_ip_module` — nunca uma sem a outra.
        fastcgi_param HTTP_X_FORWARDED_FOR "";
        fastcgi_param HTTP_X_FORWARDED_PROTO "";
        fastcgi_param HTTP_X_FORWARDED_HOST "";
        fastcgi_param HTTP_X_FORWARDED_PORT "";
        fastcgi_param HTTP_FORWARDED "";
```

- [ ] **Step 5: Provar contra o nginx real, com sonda temporária**

```bash
cd /home/jvbat/projetos/lotus
cat > backend/public/__probe-xff.php <<'PHP'
<?php
header('Content-Type: text/plain');
foreach ($_SERVER as $k => $v) {
    if (str_starts_with($k, 'HTTP_X_FORWARDED') || $k === 'HTTP_FORWARDED' || $k === 'REMOTE_ADDR') {
        echo "{$k}={$v}\n";
    }
}
echo "FIM\n";
PHP
docker compose restart nginx
curl -s -H 'X-Forwarded-For: 203.0.113.9' -H 'X-Forwarded-Proto: https' http://localhost:8080/__probe-xff.php
rm -f backend/public/__probe-xff.php
```

Expected: **só** `REMOTE_ADDR=172.20.0.1` e `FIM`. Nenhuma linha `HTTP_X_FORWARDED_*`. Antes da
mudança a mesma sonda devolvia `HTTP_X_FORWARDED_FOR=203.0.113.9`.

- [ ] **Step 6: Conferir que a sonda saiu**

Run: `git -C /home/jvbat/projetos/lotus status --short backend/public/`
Expected: saída vazia. A sonda não entra em commit nenhum.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add docker/nginx/default.conf docker/nginx/prod.conf backend/tests/Feature/Shared/ClientIpTrustTest.php
git commit -m "fix(nginx): apaga X-Forwarded-* de entrada e congela a app sem proxy confiavel"
```

---

### Task 3: Peça de limitadores e teto global no grupo `api`

D2. Uma peça única publica os limitadores e os números; o grupo `api` inteiro ganha um teto largo,
para que rota nova nasça coberta. Foi exatamente a ausência desse teto que manteve `/login` de fora
por três linhas.

**Os números, e de onde saem.** O teto global é backstop contra **um** cliente desgovernado, não
plano de capacidade — com `pm.max_children = 5`, a capacidade real é 5 requisições simultâneas, e
nenhum destes números chega perto disso.

| Limitador | Chave | Por minuto | Por quê esse número |
|---|---|---|---|
| `api` | usuário autenticado | **240** | uma tela do SPA dispara ~10-15 requisições em paralelo (TanStack Query); 240/min dá ~16 navegações cheias por minuto por pessoa, muito acima de uso humano e muito abaixo de varredura |
| `api` | IP, quando anônimo | **60** | a superfície anônima são 5 rotas, todas com limitador nomeado mais apertado; este é o backstop que impede uma única origem de pulverizar e-mails diferentes no `/login` |
| `login` | `email\|ip` | **5** | padrão do Fortify. Cinco erros de digitação por minuto para a mesma conta no mesmo lugar é folga; o teste com mais chamadas de login por método na suíte tem **uma** |
| `public-certificate` | IP | **30** | quem valida QR valida um; 30 cobre um escritório conferindo um lote na mão e ainda assim tira o valor de varredura |
| `password` | IP | **6** | é o `throttle:6,1` de hoje, revisado e mantido: nenhuma medição justifica mudá-lo. O que muda é passar a ser nomeado e legível num lugar só |
| `upload` | usuário | **20** | cada upload custa um scan (17-551 ms) mais a escrita no bucket; 20/min é mais do que um humano anexa e ainda assim impede que 1 conta ocupe os 5 workers |
| `import` | usuário | **5** | uma planilha por turma; 5/min é folga de uma ordem de grandeza |
| `certificate-batch` | usuário | **5** | idem — o lote já é a operação em massa |
| `certificate-pdf` | usuário | **30** | é a rota mais cara do sistema: renderiza no Gotenberg a **cada** requisição, sem cache. 30/min cobre o operador que abre um a um os certificados de uma turma inteira (8-15) |

**Files:**
- Create: `backend/app/Shared/RateLimiting/RateLimits.php`
- Modify: `backend/app/Providers/AppServiceProvider.php:47`
- Modify: `backend/bootstrap/app.php:44-46`
- Test: `backend/tests/Feature/Shared/RateLimitTest.php`

**Interfaces:**
- Consumes: Task 1 (os headers do `429`), Task 2 (`$request->ip()` confiável).
- Produces: os limitadores nomeados `api`, `login`, `public-certificate`, `password`, `upload`,
  `import`, `certificate-batch`, `certificate-pdf`, e as constantes públicas
  `RateLimits::API_AUTENTICADO`, `API_ANONIMO`, `LOGIN`, `CERTIFICADO_PUBLICO`, `SENHA`, `UPLOAD`,
  `IMPORT`, `LOTE_CERTIFICADO`, `PDF_CERTIFICADO` (todas `int`). Task 4 pendura os nomes nas rotas;
  Task 5 confere a cobertura; os testes leem as constantes em vez de repetir o número.

- [ ] **Step 1: Escrever o teste que falha**

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\RateLimiting\RateLimits;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Os limitadores são lidos do registro, não das rotas: assim o teste prova a
 * CHAVE e o número de cada balde sem depender de 241 requisições HTTP.
 *
 * A prova de que a chave separa de verdade (mesmo e-mail de outro IP, mesmo IP
 * de outro e-mail) é o coração do D3 e está aqui; a versão pela API real é o
 * DoD 1 da Task 12.
 */
class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    /** @return list<Limit> */
    private function limites(string $nome, Request $request): array
    {
        $limiter = RateLimiter::limiter($nome);
        $this->assertNotNull($limiter, "O limitador `{$nome}` não foi registrado.");

        // `Collection::wrap`, e nunca `collect()`: o limitador pode devolver um
        // `Limit` solto, e `collect()` sobre um objeto casta as PROPRIEDADES dele
        // para array. É o mesmo `wrap` que o `ThrottleRequests` usa.
        return Collection::wrap($limiter($request))->all();
    }

    private function requisicao(string $ip, array $corpo = [], ?User $user = null): Request
    {
        $request = Request::create('/api/login', 'POST', $corpo, [], [], ['REMOTE_ADDR' => $ip]);

        if ($user !== null) {
            $request->setUserResolver(fn () => $user);
        }

        return $request;
    }

    public function test_todos_os_limitadores_do_bloco_estao_registrados(): void
    {
        foreach ([
            'api', 'login', 'public-certificate', 'password',
            'upload', 'import', 'certificate-batch', 'certificate-pdf',
        ] as $nome) {
            $this->assertNotNull(
                RateLimiter::limiter($nome),
                "O limitador `{$nome}` não foi registrado — a rota que o cita daria 500.",
            );
        }
    }

    public function test_teto_global_separa_autenticado_de_anonimo(): void
    {
        $user = User::factory()->create();

        $anonimo = $this->limites('api', $this->requisicao('10.0.0.1'))[0];
        $autenticado = $this->limites('api', $this->requisicao('10.0.0.1', [], $user))[0];

        $this->assertSame(RateLimits::API_ANONIMO, $anonimo->maxAttempts);
        $this->assertSame(RateLimits::API_AUTENTICADO, $autenticado->maxAttempts);
        $this->assertNotSame($anonimo->key, $autenticado->key);
    }

    public function test_login_e_chaveado_por_email_e_ip_juntos(): void
    {
        $base = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => 'ana@lotus.cl']))[0];
        $outroIp = $this->limites('login', $this->requisicao('10.0.0.2', ['email' => 'ana@lotus.cl']))[0];
        $outroEmail = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => 'bruno@lotus.cl']))[0];

        $this->assertSame(RateLimits::LOGIN, $base->maxAttempts);
        $this->assertNotSame($base->key, $outroIp->key, 'Mesmo e-mail de outro IP tem de ter balde próprio (D3).');
        $this->assertNotSame($base->key, $outroEmail->key, 'Mesmo IP com outro e-mail tem de ter balde próprio (D3).');
    }

    public function test_login_ignora_caixa_e_espaco_do_email(): void
    {
        // Sem normalizar, `Ana@Lotus.cl ` seria outro balde e a contenção
        // cairia por uma tecla de shift.
        $a = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => 'ana@lotus.cl']))[0];
        $b = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => '  Ana@Lotus.CL ']))[0];

        $this->assertSame($a->key, $b->key);
    }

    public function test_limitadores_por_usuario_separam_usuarios(): void
    {
        $ana = User::factory()->create();
        $bruno = User::factory()->create();

        foreach ([
            'upload' => RateLimits::UPLOAD,
            'import' => RateLimits::IMPORT,
            'certificate-batch' => RateLimits::LOTE_CERTIFICADO,
            'certificate-pdf' => RateLimits::PDF_CERTIFICADO,
        ] as $nome => $esperado) {
            $daAna = $this->limites($nome, $this->requisicao('10.0.0.1', [], $ana))[0];
            $doBruno = $this->limites($nome, $this->requisicao('10.0.0.1', [], $bruno))[0];

            $this->assertSame($esperado, $daAna->maxAttempts, "Número errado em `{$nome}`.");
            $this->assertNotSame($daAna->key, $doBruno->key, "`{$nome}` está juntando usuários no mesmo balde.");
        }
    }

    public function test_limitadores_por_ip_usam_o_ip(): void
    {
        foreach (['public-certificate' => RateLimits::CERTIFICADO_PUBLICO, 'password' => RateLimits::SENHA] as $nome => $esperado) {
            $a = $this->limites($nome, $this->requisicao('10.0.0.1'))[0];
            $b = $this->limites($nome, $this->requisicao('10.0.0.2'))[0];

            $this->assertSame($esperado, $a->maxAttempts, "Número errado em `{$nome}`.");
            $this->assertNotSame($a->key, $b->key, "`{$nome}` não está separando por IP.");
        }
    }

    public function test_o_grupo_api_carrega_o_teto_global(): void
    {
        $middleware = app('router')->getMiddlewareGroups()['api'] ?? [];

        $this->assertContains('throttle:api', $middleware, implode("\n", [
            'O grupo `api` perdeu o teto global. Sem ele a cobertura volta a depender',
            'de alguém lembrar de pendurar `throttle:` na rota nova — que é o buraco',
            'medido que deixou `/login` de fora por três linhas (D2).',
        ]));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=RateLimitTest`
Expected: FAIL. `test_todos_os_limitadores_do_bloco_estao_registrados` acusa `api` como o primeiro
não registrado, e `test_o_grupo_api_carrega_o_teto_global` mostra o grupo sem `throttle:api`.

- [ ] **Step 3: Escrever a peça**

Criar `backend/app/Shared/RateLimiting/RateLimits.php`:

```php
<?php

namespace App\Shared\RateLimiting;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Fonte única da política de taxa da API (RNF-SEC-06). Nenhum número de
 * throttle mora em `routes.php`: quem quer saber a política lê ESTE arquivo.
 *
 * O desenho é teto global + nomeados (spec D2). O teto do grupo `api` existe
 * para que rota nova nasça coberta — foi a ausência dele que deixou `/login`
 * sem limite três linhas acima do único grupo que tinha. Os nomeados são os que
 * apertam de verdade, cada um na operação que custa caro.
 *
 * Os contadores vão para a tabela `cache` do MySQL (`CACHE_STORE=database`).
 * Redis fica fora: ~10 usuários internos não o justificam.
 *
 * A chave do balde já é prefixada pelo framework com o NOME do limitador
 * (`ThrottleRequests` compõe `md5($limiterName.$limit->key)`), então dois
 * limitadores podem chavear pelo mesmo IP sem se misturarem.
 */
final class RateLimits
{
    /** Teto largo por pessoa: ~16 telas cheias do SPA por minuto. */
    public const API_AUTENTICADO = 240;

    /** Backstop da superfície anônima — impede pulverização de e-mails de uma origem só. */
    public const API_ANONIMO = 60;

    /** Padrão do Fortify. Chave `email|ip` (spec D3). */
    public const LOGIN = 5;

    /** Validação pública do QR: peso legal, então largo o bastante para conferência na mão. */
    public const CERTIFICADO_PUBLICO = 30;

    /** O `throttle:6,1` de hoje, revisado e mantido — nenhuma medição justifica mexer. */
    public const SENHA = 6;

    /** Cada upload custa um scan de antivírus antes da escrita. */
    public const UPLOAD = 20;

    public const IMPORT = 5;

    public const LOTE_CERTIFICADO = 5;

    /** Renderiza no Gotenberg a cada requisição — a rota mais cara do sistema. */
    public const PDF_CERTIFICADO = 30;

    public static function register(): void
    {
        RateLimiter::for('api', fn (Request $request) => $request->user()
            ? Limit::perMinute(self::API_AUTENTICADO)->by(self::porUsuario($request))
            : Limit::perMinute(self::API_ANONIMO)->by('ip:'.$request->ip()));

        // `email|ip` (D3): só-IP trancaria os ~10 usuários da Lotus juntos atrás
        // do mesmo NAT; só-e-mail deixaria trancar de fora uma conta conhecida.
        // Normalizado porque `Ana@Lotus.CL` e `ana@lotus.cl` são a mesma conta —
        // sem isto a contenção cai por uma tecla de shift.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(self::LOGIN)
            ->by(Str::lower(trim((string) $request->input('email'))).'|'.$request->ip()));

        RateLimiter::for('public-certificate', fn (Request $request) => Limit::perMinute(self::CERTIFICADO_PUBLICO)
            ->by($request->ip()));

        RateLimiter::for('password', fn (Request $request) => Limit::perMinute(self::SENHA)
            ->by($request->ip()));

        RateLimiter::for('upload', fn (Request $request) => Limit::perMinute(self::UPLOAD)
            ->by(self::porUsuario($request)));

        RateLimiter::for('import', fn (Request $request) => Limit::perMinute(self::IMPORT)
            ->by(self::porUsuario($request)));

        RateLimiter::for('certificate-batch', fn (Request $request) => Limit::perMinute(self::LOTE_CERTIFICADO)
            ->by(self::porUsuario($request)));

        RateLimiter::for('certificate-pdf', fn (Request $request) => Limit::perMinute(self::PDF_CERTIFICADO)
            ->by(self::porUsuario($request)));
    }

    /**
     * Todos estes limitadores vivem atrás de `auth.active`, então `user()` está
     * resolvido — `ThrottleRequests` roda DEPOIS do `AuthenticatesRequests` na
     * prioridade declarada em `bootstrap/app.php`. O fallback para IP existe
     * para não haver balde nulo se a rota mudar de lugar um dia.
     */
    private static function porUsuario(Request $request): string
    {
        return $request->user()
            ? 'user:'.$request->user()->getAuthIdentifier()
            : 'ip:'.$request->ip();
    }
}
```

- [ ] **Step 4: Registrar no boot**

Em `backend/app/Providers/AppServiceProvider.php`, acrescentar o import e a chamada como
**primeira** linha de `boot()`:

```php
use App\Shared\RateLimiting\RateLimits;
```

```php
    public function boot(): void
    {
        // Política de taxa da API (RNF-SEC-06). Não existe RouteServiceProvider
        // neste repositório — o `routes/api.php` agrega por glob() —, então o
        // registro dos limitadores nomeados mora aqui.
        RateLimits::register();

        Relation::enforceMorphMap([
```

- [ ] **Step 5: Pendurar o teto global no grupo `api`**

Em `backend/bootstrap/app.php`, no bloco que já apenda o `SetLocale`:

```php
        // Teto global (spec D2): rota nova do grupo `api` nasce coberta. É
        // largo de propósito — quem aperta são os limitadores nomeados de cada
        // operação cara. A ordem real não vem daqui: `ThrottleRequests` está na
        // lista de prioridade abaixo, logo após o `AuthenticatesRequests`, e é
        // isso que garante que o balde por usuário veja o usuário resolvido.
        $middleware->api(prepend: [
            'throttle:api',
        ], append: [
            SetLocale::class,
        ]);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=RateLimitTest`
Expected: PASS, 7 testes.

- [ ] **Step 7: Suíte inteira — o teto global toca toda requisição da suíte**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. `CACHE_STORE=array` no `phpunit.xml` zera o contador por teste, e nenhum método
faz 240 requisições; se algum aparecer vermelho por `429`, é ele que precisa ser dividido.

- [ ] **Step 8: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint app/Shared/RateLimiting/RateLimits.php app/Providers/AppServiceProvider.php bootstrap/app.php tests/Feature/Shared/RateLimitTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/RateLimiting backend/app/Providers/AppServiceProvider.php backend/bootstrap/app.php backend/tests/Feature/Shared/RateLimitTest.php
git commit -m "feat(api): limitadores nomeados e teto global de taxa no grupo api"
```

---

### Task 4: Limitadores nomeados nos alvos

Pendura os nomes da Task 3 nas rotas. Nenhum número entra em `routes.php` — o `throttle:6,1`
literal que existe hoje sai e vira `throttle:password`.

**Files:**
- Modify: `backend/app/Domains/Identity/routes.php:23,28,42,45,77,81,84,87`
- Modify: `backend/app/Domains/Certification/routes.php:7,13,14`
- Modify: `backend/app/Domains/Operation/routes.php:36,47`
- Modify: `backend/app/Domains/Commercial/routes.php:50,55,61`
- Test: `backend/tests/Feature/Shared/RateLimitTest.php` (acrescenta casos)

**Interfaces:**
- Consumes: os nomes registrados pela Task 3.
- Produces: a superfície coberta que a catraca da Task 5 confere.

- [ ] **Step 1: Acrescentar ao `RateLimitTest` os casos que leem o roteador montado**

```php
    /** @return list<string> os middleware resolvidos de uma rota, por método e URI */
    private function middlewareDa(string $metodo, string $uri): array
    {
        foreach (app('router')->getRoutes() as $rota) {
            if ($rota->uri() === $uri && in_array($metodo, $rota->methods(), true)) {
                return array_values(array_map(strval(...), app('router')->gatherRouteMiddleware($rota)));
            }
        }

        $this->fail("Rota {$metodo} {$uri} não existe.");
    }

    public function test_cada_alvo_carrega_o_seu_limitador_nomeado(): void
    {
        $esperado = [
            ['POST', 'api/login', 'throttle:login'],
            ['GET', 'api/publico/certificados/{uuid}', 'throttle:public-certificate'],
            ['POST', 'api/password/forgot', 'throttle:password'],
            ['POST', 'api/password/reset', 'throttle:password'],
            ['POST', 'api/invitation/accept', 'throttle:password'],
            ['POST', 'api/profile/photo', 'throttle:upload'],
            ['POST', 'api/profile/documents', 'throttle:upload'],
            ['POST', 'api/users/{user}/photo', 'throttle:upload'],
            ['POST', 'api/redatores', 'throttle:upload'],
            ['PUT', 'api/redatores/{redator}', 'throttle:upload'],
            ['POST', 'api/redatores/{redator}/photo', 'throttle:upload'],
            ['POST', 'api/redatores/{redator}/documents', 'throttle:upload'],
            ['POST', 'api/students/{student}/photo', 'throttle:upload'],
            ['POST', 'api/clients/{client}/photo', 'throttle:upload'],
            ['POST', 'api/quotes/{quote}/files', 'throttle:upload'],
            ['POST', 'api/budgets/{budget}/files', 'throttle:upload'],
            ['POST', 'api/turmas/{turma}/documents', 'throttle:upload'],
            ['POST', 'api/turmas/{turma}/alunos/importar', 'throttle:import'],
            ['POST', 'api/certificates/batch', 'throttle:certificate-batch'],
            ['GET', 'api/certificates/{certificate}/pdf', 'throttle:certificate-pdf'],
        ];

        foreach ($esperado as [$metodo, $uri, $limitador]) {
            $this->assertContains(
                $limitador,
                $this->middlewareDa($metodo, $uri),
                "{$metodo} {$uri} está sem `{$limitador}`.",
            );
        }
    }

    public function test_nenhum_throttle_com_numero_literal_sobrou_nas_rotas(): void
    {
        // O `throttle:6,1` de `Identity/routes.php` era a política inteira do
        // repositório escrita dentro de um arquivo de rotas. A política agora
        // mora no `RateLimits`; número literal em rota é a volta do problema.
        $literais = [];

        foreach (app('router')->getRoutes() as $rota) {
            foreach (app('router')->gatherRouteMiddleware($rota) as $m) {
                if (preg_match('/^Illuminate\\\\Routing\\\\Middleware\\\\ThrottleRequests:\d/', (string) $m)) {
                    $literais[] = $rota->uri().' -> '.$m;
                }
            }
        }

        $this->assertSame([], array_values(array_unique($literais)), implode("\n", array_merge(
            ['Throttle com número literal na rota. A política é única e mora em `App\Shared\RateLimiting\RateLimits`:'],
            $literais,
        )));
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=RateLimitTest`
Expected: FAIL. `test_cada_alvo_carrega_o_seu_limitador_nomeado` para em `POST api/login está sem
throttle:login`; `test_nenhum_throttle_com_numero_literal_sobrou_nas_rotas` lista as três rotas do
grupo `throttle:6,1`.

- [ ] **Step 3: `Identity/routes.php`**

```php
// Rotas do domínio Identity. Já entram sob prefixo `api/` e middleware `api`
// (agregadas por routes/api.php).
//
// `throttle:login` e não o teto do grupo: a política e a chave (`email|ip`,
// spec D3) moram em `App\Shared\RateLimiting\RateLimits`. Esta rota ficou sem
// limite nenhum até 2026-08-25, três linhas acima do único grupo que tinha.
Route::middleware('throttle:login')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Públicas por definição: quem pede acesso ainda não tem sessão. O número saiu
// daqui e virou `RateLimits::SENHA` — mesmo valor de sempre (6/min por IP),
// agora legível num lugar só junto do resto da política.
Route::middleware('throttle:password')->group(function () {
    Route::post('/password/forgot', [PasswordResetController::class, 'forgot']);
    Route::post('/password/reset', [PasswordResetController::class, 'reset']);
    Route::post('/invitation/accept', [PasswordResetController::class, 'accept']);
});
```

Dentro do grupo `auth.active`, as rotas de perfil que sobem arquivo:

```php
    Route::post('profile/photo', [ProfilePhotoController::class, 'store'])->middleware('throttle:upload');
    Route::delete('profile/photo', [ProfilePhotoController::class, 'destroy']);
    Route::put('profile/password', [ProfilePasswordController::class, 'update']);
    Route::post('profile/documents', [ProfileDocumentController::class, 'store'])->middleware('throttle:upload');
```

E, no grupo de administração de identidade (linhas 77-88), acrescentar
`->middleware('throttle:upload')` a cada rota que recebe arquivo — inclusive as duas de cadastro
de redator, que sobem `documents[<TIPO>]`:

```php
        Route::post('redatores/{redator}/documents', [RedatorDocumentController::class, 'store'])->middleware('throttle:upload');
        Route::post('users/{user}/photo', [UserPhotoController::class, 'store'])->middleware('throttle:upload');
        Route::post('redatores/{redator}/photo', [RedatorPhotoController::class, 'store'])->middleware('throttle:upload');
        Route::post('students/{student}/photo', [StudentPhotoController::class, 'store'])->middleware('throttle:upload');
```

O `DELETE` de foto e de documento **não** leva `upload`: não recebe arquivo.

O cadastro e a edição de redator são um `apiResource` (linha 56), e só `store` e `update` sobem
`documents[<TIPO>]`. `middlewareFor` alcança verbos escolhidos sem contaminar `index`/`show` — que,
com o limitador de upload, gastariam a cota de anexo para listar:

```php
    Route::apiResource('redatores', RedatorController::class)
        ->parameters(['redatores' => 'redator'])
        // `store` e `update` recebem `documents[<TIPO>]` no multipart; `index` e
        // `show` não sobem nada e não podem gastar a cota de upload.
        ->middlewareFor(['store', 'update'], 'throttle:upload')
```

> Preserve o `->only([...])` que já estiver na cadeia — esta task só acrescenta o `middlewareFor`.

- [ ] **Step 4: `Certification/routes.php`**

```php
// Anônima de propósito (validação do QR, peso legal), e por isso a única
// contenção possível é por IP. Larga o bastante para conferência na mão.
Route::get('publico/certificados/{uuid}', [PublicCertificateController::class, 'show'])
    ->middleware('throttle:public-certificate');

Route::middleware('auth.active')->group(function () {
    Route::post('enrollments/{enrollment}/certificate', [CertificateController::class, 'store']);
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::get('certificates/emission-panel', [CertificateController::class, 'emissionPanel']);
    Route::post('certificates/batch', [CertificateController::class, 'batch'])
        ->middleware('throttle:certificate-batch');
    // Renderiza no Gotenberg a CADA requisição — nada é cacheado nem lido do
    // bucket. É a rota mais cara do sistema, e o limitador é a contenção dela
    // (spec D6); persistir o PDF ficou fora do bloco de propósito.
    Route::get('certificates/{certificate}/pdf', [CertificateController::class, 'pdf'])
        ->middleware('throttle:certificate-pdf');
    Route::get('certificates/{certificate}', [CertificateController::class, 'show']);
    Route::post('certificates/{certificate}/revoke', [CertificateController::class, 'revoke']);
});
```

- [ ] **Step 5: `Operation/routes.php` e `Commercial/routes.php`**

```php
    Route::post('turmas/{turma}/documents', [TurmaDocumentController::class, 'store'])->middleware('throttle:upload');
```

```php
    Route::post('turmas/{turma}/alunos/importar', [EnrollmentController::class, 'import'])->middleware('throttle:import');
```

```php
        Route::post('clients/{client}/photo', [ClientPhotoController::class, 'store'])->middleware('throttle:upload');
        Route::post('budgets/{budget}/files', [BudgetFileController::class, 'store'])->middleware('throttle:upload');
        Route::post('quotes/{quote}/files', [QuoteFileController::class, 'store'])->middleware('throttle:upload');
```

- [ ] **Step 6: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=RateLimitTest`
Expected: PASS, 9 testes.

- [ ] **Step 7: Suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Atenção especial a `PublicPasswordRoutesTest`, que exercita o antigo
`throttle:6,1`: o número não mudou, então ele tem de continuar verde sem edição.

- [ ] **Step 8: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint app/Domains/Identity/routes.php app/Domains/Certification/routes.php app/Domains/Operation/routes.php app/Domains/Commercial/routes.php tests/Feature/Shared/RateLimitTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/*/routes.php backend/tests/Feature/Shared/RateLimitTest.php
git commit -m "feat(api): limitadores nomeados em login, QR publico, upload, import, lote e PDF"
```

---

### Task 5: Catraca — rota do grupo `api` sem throttle reprova

Primeira das duas catracas da spec §5, no molde do `AuthenticatedRouteMiddlewareTest`, onde
**silêncio reprova**. A superfície isenta é declarada por escrito: acrescentar rota sem limite
exige escrever que ela é isenta, com o motivo ao lado.

**Files:**
- Test: `backend/tests/Feature/Shared/ThrottledRouteRatchetTest.php`

**Interfaces:**
- Consumes: Tasks 3 e 4.
- Produces: nada em código — produz a propriedade "rota nova nasce coberta".

- [ ] **Step 1: Escrever a catraca**

```php
<?php

namespace Tests\Feature\Shared;

use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

/**
 * Catraca 1 do bloco de hardening (spec §5). O teto global do grupo `api`
 * cobre toda rota por construção; esta catraca é o que impede que ele seja
 * removido, ou que uma rota nasça fora do grupo, sem alguém escrever por quê.
 *
 * Lê o roteador MONTADO, não o texto dos arquivos: `throttle` escrito à mão
 * numa rota nova conta igual, venha de onde vier.
 *
 * Molde e razão: `AuthenticatedRouteMiddlewareTest`. Silêncio reprova.
 */
class ThrottledRouteRatchetTest extends TestCase
{
    /**
     * Rotas `api/*` que podem rodar SEM limite de taxa. Hoje: nenhuma.
     *
     * Entrada nova aqui é decisão consciente e precisa do motivo ao lado —
     * exatamente como a lista de anônimas do `AuthenticatedRouteMiddlewareTest`.
     *
     * @var array<string,string>
     */
    private const ISENTAS = [];

    /** @return array<string,list<string>> uri => middleware resolvido, só rotas `api/*` */
    private function rotasDaApi(): array
    {
        $mapa = [];

        /** @var Route $rota */
        foreach (RouteFacade::getRoutes() as $rota) {
            if (str_starts_with($rota->uri(), 'api/')) {
                $mapa[$rota->uri()] = array_values(array_map(
                    strval(...),
                    app('router')->gatherRouteMiddleware($rota),
                ));
            }
        }

        return $mapa;
    }

    private function temThrottle(array $middleware): bool
    {
        foreach ($middleware as $m) {
            if (str_starts_with($m, ThrottleRequests::class)) {
                return true;
            }
        }

        return false;
    }

    public function test_toda_rota_da_api_esta_sob_limite_de_taxa(): void
    {
        $descobertas = [];

        foreach ($this->rotasDaApi() as $uri => $middleware) {
            if (! $this->temThrottle($middleware) && ! array_key_exists($uri, self::ISENTAS)) {
                $descobertas[] = $uri;
            }
        }

        sort($descobertas);

        $this->assertSame([], $descobertas, implode("\n", array_merge(
            [
                'Rota `api/*` sem limite de taxa (RNF-SEC-06).',
                'O teto do grupo `api` deveria cobri-la — se não cobre, ou ela nasceu',
                'fora do grupo, ou o teto saiu do bootstrap/app.php. Rotas:',
            ],
            $descobertas,
        )));
    }

    public function test_a_lista_de_isentas_esta_declarada_com_motivo(): void
    {
        $reais = [];

        foreach ($this->rotasDaApi() as $uri => $middleware) {
            if (! $this->temThrottle($middleware)) {
                $reais[] = $uri;
            }
        }

        $reais = array_values(array_unique($reais));
        sort($reais);

        $declaradas = array_keys(self::ISENTAS);
        sort($declaradas);

        $this->assertSame($declaradas, $reais, implode("\n", [
            'A superfície sem limite de taxa mudou sem passar por esta lista.',
            'Rota que passa a rodar sem throttle entra em ISENTAS com o motivo ao lado;',
            'rota que voltou a ser limitada sai de lá. Silêncio reprova de propósito.',
        ]));

        foreach (self::ISENTAS as $uri => $motivo) {
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Rota isenta {$uri} com motivo curto demais para ser um motivo.",
            );
        }
    }
}
```

- [ ] **Step 2: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=ThrottledRouteRatchetTest`
Expected: PASS, 2 testes, com `ISENTAS` vazio.

- [ ] **Step 3: VER A CATRACA REPROVAR — sonda temporária**

Sem isto a catraca é decorativa. Retirar o teto global e conferir que ela fica vermelha:

```bash
cd /home/jvbat/projetos/lotus
# sonda: remove o teto global do grupo `api`
sed -i "s/^        \$middleware->api(prepend: \[$/        \$middleware->api(prepend: [ \/\/ SONDA/" backend/bootstrap/app.php
sed -i "s/^            'throttle:api',$/            \/\/ 'throttle:api', SONDA/" backend/bootstrap/app.php
docker compose exec -T app php artisan test --filter=ThrottledRouteRatchetTest
```

Expected: FAIL, com as ~70 rotas `api/*` listadas nas duas mensagens.

- [ ] **Step 4: Reverter a sonda e confirmar a árvore limpa**

```bash
cd /home/jvbat/projetos/lotus
git checkout -- backend/bootstrap/app.php
git status --short
docker compose exec -T app php artisan test --filter=ThrottledRouteRatchetTest
```

Expected: `git status` sem `backend/bootstrap/app.php`; o teste de volta verde.

- [ ] **Step 5: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint tests/Feature/Shared/ThrottledRouteRatchetTest.php
cd /home/jvbat/projetos/lotus
git add backend/tests/Feature/Shared/ThrottledRouteRatchetTest.php
git commit -m "test(api): catraca — rota do grupo api sem limite de taxa reprova"
```

---

### Task 6: Peça única de política de arquivo

D4 e D7. Três políticas literais espalhadas por sete controllers já produziram quatro endpoints sem
tipo — e o achado desta fase mostrou dois piores ainda, sem regra nenhuma. A política passa a ser um
enum em `Shared/Files`, e os treze sítios pedem a **classe** em vez de reescrever a regra.

`FormRequest` foi recusado na spec e a medição confirma o motivo: `find app -path '*Http/Requests*'`
volta vazio — o repositório não tem nenhum, e a regra continuaria copiada treze vezes.

**A tabela, com as extensões e os MIME medidos no container:**

| Classe | Extensões | MIME de conteúdo medido | Teto | Sítios |
|---|---|---|---|---|
| `Imagem` | `jpg`, `jpeg`, `png`, `webp` | `image/jpeg`, `image/png`, `image/webp` | **5120 KB** (o de hoje) | os 5 `*/photo` |
| `Documento` | `pdf`, `jpg`, `jpeg`, `png`, `webp` | `application/pdf` + os de imagem | **10240 KB** (o de hoje) | `profile/documents`, `redatores/{id}/documents`, `documents[<TIPO>]` do cadastro/edição, `quotes/{id}/files`, `budgets/{id}/files` |
| `DocumentoDeTurma` | `pdf` | `application/pdf` | **10240 KB** | `turmas/{turma}/documents` |
| `Planilha` | `xlsx`, `csv`, `txt` | `…spreadsheetml.sheet`, `text/csv`, `text/plain` | **10240 KB** | `turmas/{turma}/alunos/importar` |

Os tetos **preservam os números de hoje**. Mudá-los sem medição seria supor, e a spec diz isso por
escrito.

`text/plain` entra na Planilha porque é o que o `finfo` devolve para um CSV real — medido. `text/csv`
entra junto porque outras compilações do libmagic o devolvem, e a allowlist não pode depender da
build. A extensão continua sendo o segundo filtro, e `txt` já era aceito antes.

**Files:**
- Create: `backend/app/Shared/Files/ContentClass.php`
- Create: `backend/tests/Support/Files/BuildsRealUploads.php`
- Test: `backend/tests/Feature/Shared/UploadPolicyTest.php`
- Modify: `backend/app/Domains/Identity/Services/UserPhotoService.php:28-30`
- Modify: `backend/app/Domains/Identity/Http/Controllers/ProfileDocumentController.php:29-33`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php:20-24`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php:102-131`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php:21-24`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php:21-24`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php:41-44`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php:92-95`

**Interfaces:**
- Consumes: nada.
- Produces: `App\Shared\Files\ContentClass` com os casos `Imagem`, `Documento`, `DocumentoDeTurma`,
  `Planilha` e os métodos públicos `extensoes(): array<string>`, `mimes(): array<string>`,
  `tetoEmKb(): int` e `regras(bool $obrigatorio = true): array<int, string|object>`. A Task 7
  varre o código atrás de `ContentClass::`; a Task 9 pendura a regra de antivírus dentro de
  `regras()`.

- [ ] **Step 1: Criar o helper que monta upload com bytes REAIS**

`UploadedFile::fake()->create()` produz um arquivo **vazio** e devolve em `getMimeType()` o que lhe
disserem — `Illuminate\Http\Testing\File::getMimeType()` é
`$this->mimeTypeToReport ?: MimeType::from($this->name)`, medido. Com ele não dá para provar
nenhuma regra de conteúdo. Este trait monta `UploadedFile` de verdade sobre bytes de verdade.

```php
<?php

namespace Tests\Support\Files;

use Illuminate\Http\UploadedFile;

/**
 * `UploadedFile::fake()` não serve para provar regra de CONTEÚDO: o arquivo sai
 * vazio e `getMimeType()` devolve o que o teste declarou, nunca o que os bytes
 * são (medido em `Illuminate\Http\Testing\File`). Aqui os bytes são reais, e o
 * `finfo` que o Laravel usa vê o que veria em produção.
 */
trait BuildsRealUploads
{
    /** Assinatura de teste padrão da indústria — todo antivírus a reconhece, e ela não é maliciosa. */
    public const EICAR = 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

    protected function pdfReal(): string
    {
        return "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
    }

    protected function pngReal(): string
    {
        return base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        );
    }

    protected function csvReal(): string
    {
        return "RUT,Nombre,Email,Telefono\n11.111.111-1,Ana,ana@lotus.cl,+56900000000\n";
    }

    /** Um ELF de verdade: o binário `sh` do próprio container. */
    protected function executavelReal(): string
    {
        return (string) file_get_contents('/bin/sh');
    }

    /**
     * Monta um `UploadedFile` REAL (não o fake do framework) sobre os bytes
     * dados. `$nome` é o que o cliente declara — é justamente o que precisa
     * poder mentir para as regras de conteúdo terem o que provar.
     */
    protected function uploadReal(string $bytes, string $nome, string $mimeDeclarado): UploadedFile
    {
        $caminho = tempnam(sys_get_temp_dir(), 'lotus-upload-');
        file_put_contents($caminho, $bytes);

        // `$test: true` faz o `UploadedFile` aceitar um arquivo que não veio de
        // um POST real; o `getMimeType()` continua lendo os bytes.
        return new UploadedFile($caminho, $nome, $mimeDeclarado, null, true);
    }
}
```

- [ ] **Step 2: Escrever o teste que falha**

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Services\UserPhotoService;
use App\Shared\Files\ContentClass;
use Illuminate\Support\Facades\Validator;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * A política de arquivo passou a ser uma peça só (spec D4). Estes casos provam
 * o COMPORTAMENTO da peça com bytes reais — o que a suíte não conseguia provar
 * enquanto a regra estava copiada em sete controllers e o upload de teste era
 * um arquivo vazio.
 */
class UploadPolicyTest extends TestCase
{
    use BuildsRealUploads;

    private function passa(ContentClass $classe, string $bytes, string $nome, string $mimeDeclarado): bool
    {
        return Validator::make(
            ['arquivo' => $this->uploadReal($bytes, $nome, $mimeDeclarado)],
            ['arquivo' => $classe->regras()],
        )->passes();
    }

    public function test_documento_aceita_pdf_e_imagem(): void
    {
        $this->assertTrue($this->passa(ContentClass::Documento, $this->pdfReal(), 'cv.pdf', 'application/pdf'));
        $this->assertTrue($this->passa(ContentClass::Documento, $this->pngReal(), 'cedula.png', 'image/png'));
    }

    public function test_executavel_renomeado_para_pdf_e_recusado(): void
    {
        // O nome mente e o MIME declarado mente; quem decide é o conteúdo.
        $this->assertFalse($this->passa(
            ContentClass::Documento, $this->executavelReal(), 'contrato.pdf', 'application/pdf',
        ));
    }

    public function test_planilha_aceita_csv_real_e_recusa_pdf(): void
    {
        $this->assertTrue($this->passa(ContentClass::Planilha, $this->csvReal(), 'alunos.csv', 'text/csv'));
        $this->assertFalse($this->passa(ContentClass::Planilha, $this->pdfReal(), 'alunos.csv', 'text/csv'));
    }

    public function test_documento_de_turma_so_aceita_pdf(): void
    {
        $this->assertTrue($this->passa(ContentClass::DocumentoDeTurma, $this->pdfReal(), 'manual.pdf', 'application/pdf'));
        $this->assertFalse($this->passa(ContentClass::DocumentoDeTurma, $this->pngReal(), 'manual.pdf', 'application/pdf'));
    }

    public function test_imagem_recusa_pdf(): void
    {
        $this->assertTrue($this->passa(ContentClass::Imagem, $this->pngReal(), 'foto.png', 'image/png'));
        $this->assertFalse($this->passa(ContentClass::Imagem, $this->pdfReal(), 'foto.png', 'image/png'));
    }

    public function test_os_tetos_preservam_os_numeros_de_hoje(): void
    {
        // Mudar um teto é decisão, não efeito colateral de refatoração.
        $this->assertSame(5120, ContentClass::Imagem->tetoEmKb());
        $this->assertSame(10240, ContentClass::Documento->tetoEmKb());
        $this->assertSame(10240, ContentClass::DocumentoDeTurma->tetoEmKb());
        $this->assertSame(10240, ContentClass::Planilha->tetoEmKb());
    }

    public function test_a_foto_de_perfil_consome_a_peca_em_vez_de_reescrever(): void
    {
        // `assertEquals` e não `assertSame`: a partir da Task 9 a lista carrega
        // um `ScannedForMalware` novo a cada chamada, e identidade de objeto
        // reprovaria duas listas que são a mesma política.
        $this->assertEquals(
            ContentClass::Imagem->regras(),
            UserPhotoService::rules()['photo'],
            'O `UserPhotoService` voltou a escrever a própria regra em vez de pedir a classe.',
        );
    }
}
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=UploadPolicyTest`
Expected: FAIL com `Class "App\Shared\Files\ContentClass" not found`.

- [ ] **Step 4: Escrever o enum**

```php
<?php

namespace App\Shared\Files;

/**
 * Política de tipo e tamanho de upload — fonte única (spec D4). Os treze sítios
 * que recebem `UploadedFile` pedem a CLASSE de conteúdo; nenhum reescreve a
 * regra. Guarda viva: `UploadPolicyRatchetTest`.
 *
 * `mimes:` e `mimetypes:` juntos, com uma ressalva medida em 2026-08-25: no
 * Laravel os DOIS leem o conteúdo — `validateMimes()` compara
 * `guessExtension()`, que deriva de `getMimeType()`. Não são duas camadas, são
 * duas escritas do mesmo veredicto. `mimetypes:` fica por prender a string
 * exata do MIME, para que uma mudança futura no mapa mime→extensão do Symfony
 * não alargue a allowlist em silêncio.
 *
 * `bail` na frente NÃO é estilo: sem ele, um arquivo de tipo errado seguiria
 * até a regra de antivírus e mandaria 10 MB para o daemon só para ser recusado
 * pelo tipo depois.
 *
 * Os tetos são os números que já vigoravam. Mudá-los sem medição seria supor.
 */
enum ContentClass: string
{
    case Imagem = 'imagem';
    case Documento = 'documento';
    case DocumentoDeTurma = 'documento_de_turma';
    case Planilha = 'planilha';

    /**
     * Extensões aceitas. Documento aceita imagem (spec D7): documento
     * digitalizado e foto de documento é o que redator de rede não auditada
     * manda, e a lista fecha macro de Office e executável de uma vez.
     *
     * @return list<string>
     */
    public function extensoes(): array
    {
        return match ($this) {
            self::Imagem => ['jpg', 'jpeg', 'png', 'webp'],
            self::Documento => ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
            self::DocumentoDeTurma => ['pdf'],
            self::Planilha => ['xlsx', 'csv', 'txt'],
        };
    }

    /**
     * MIME de CONTEÚDO aceito. Todos medidos com arquivos reais no container em
     * 2026-08-25 — `text/plain` é o que o finfo devolve para um CSV de verdade,
     * e `text/csv` entra junto porque outras compilações do libmagic o devolvem.
     *
     * @return list<string>
     */
    public function mimes(): array
    {
        return match ($this) {
            self::Imagem => ['image/jpeg', 'image/png', 'image/webp'],
            self::Documento => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
            self::DocumentoDeTurma => ['application/pdf'],
            self::Planilha => [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv',
                'text/plain',
            ],
        };
    }

    /**
     * Teto em kilobytes. Fica ABAIXO do teto de transporte (nginx 12m, PHP 12M)
     * de propósito: quem rejeita é sempre esta regra, com envelope RFC 7807, e
     * nunca o nginx com um 413 que não passa pelo Laravel.
     */
    public function tetoEmKb(): int
    {
        return match ($this) {
            self::Imagem => 5120,
            self::Documento, self::DocumentoDeTurma, self::Planilha => 10240,
        };
    }

    /** @return list<string> */
    public function regras(bool $obrigatorio = true): array
    {
        return [
            'bail',
            $obrigatorio ? 'required' : 'nullable',
            'file',
            'mimes:'.implode(',', $this->extensoes()),
            'mimetypes:'.implode(',', $this->mimes()),
            'max:'.$this->tetoEmKb(),
        ];
    }
}
```

> A regra de antivírus entra em `regras()` na **Task 9**, não aqui: ela precisa do scanner, que
> ainda não existe. O retorno passa a ser `list<string|object>` naquela task.

- [ ] **Step 5: `UserPhotoService::RULES` vira método**

`public const RULES = ['photo' => ContentClass::Imagem->regras()]` **não compila**: expressão
constante em PHP não aceita chamada de método. A constante vira um método estático de mesmo papel,
em `backend/app/Domains/Identity/Services/UserPhotoService.php`, substituindo as linhas 21-30:

```php
    /**
     * Regras de validação da foto. Fonte única — os controllers consomem daqui
     * em vez de recopiar, e a política de tipo/tamanho vem do `ContentClass`
     * (spec D4 do hardening). Virou método porque expressão constante não
     * chama método, e a política deixou de ser um literal.
     *
     * @return array<string, array<int, string|object>>
     */
    public static function rules(): array
    {
        return ['photo' => ContentClass::Imagem->regras()];
    }
```

Trocar os consumidores de `UserPhotoService::RULES` por `UserPhotoService::rules()`:

Run: `docker compose exec -T app sh -c 'grep -rn "UserPhotoService::RULES" app/'`
Expected: os controllers de foto (`ProfilePhotoController`, `UserPhotoController`,
`RedatorPhotoController`, `StudentPhotoController`, `ClientPhotoController`). Trocar `::RULES` por
`::rules()` em cada um. O teste do Step 2 já afirma `UserPhotoService::rules()['photo']`.

Acrescentar o import em `UserPhotoService.php`:

```php
use App\Shared\Files\ContentClass;
```

- [ ] **Step 6: Os controllers de documento e planilha**

```php
// ProfileDocumentController
        $validated = $request->validate([
            'type' => ['required', Rule::in(RedatorDocumentType::selfServiceValues())],
            'file' => ContentClass::Documento->regras(),
            'valid_until' => ['nullable', 'date'],
        ]);
```

```php
// RedatorDocumentController
        $validated = $request->validate([
            'type' => ['required', new Enum(RedatorDocumentType::class)],
            'file' => ContentClass::Documento->regras(),
            'valid_until' => ['nullable', 'date'],
        ]);
```

```php
// QuoteFileController
        $validated = $request->validate([
            'type' => ['required', 'in:quote_document'],
            'file' => ContentClass::Documento->regras(),
        ]);
```

```php
// BudgetFileController
        $validated = $request->validate([
            'type' => ['required', 'in:invoice,receipt'],
            'file' => ContentClass::Documento->regras(),
        ]);
```

```php
// TurmaDocumentController
        $validated = $request->validate([
            'type' => ['required', new Enum(TurmaDocumentType::class)],
            'file' => ContentClass::DocumentoDeTurma->regras(),
        ]);
```

```php
// EnrollmentController::import
        $validated = $request->validate([
            'file' => ContentClass::Planilha->regras(),
        ]);
```

- [ ] **Step 7: O sítio que não tinha regra nenhuma**

`RedatorController::documentsFromRequest()` só confere que é um mapa de tipo válido para
`UploadedFile` — nenhum `file`, nenhum tipo, nenhum tamanho. Acrescentar a validação por arquivo,
depois do guard de instância que já existe:

```php
use App\Shared\Files\ContentClass;
use Illuminate\Support\Facades\Validator;
```

```php
            // Até 2026-08-25 este sítio não tinha regra NENHUMA: aceitava
            // qualquer conteúdo em qualquer tamanho, contido só pelo transporte
            // (nginx 12m). É a mesma política dos outros documentos de redator —
            // a diferença era só ninguém a ter escrito aqui.
            Validator::make(
                ["documents.{$type}" => $file],
                ["documents.{$type}" => ContentClass::Documento->regras()],
            )->validate();
```

- [ ] **Step 8: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=UploadPolicyTest`
Expected: PASS, 7 testes.

- [ ] **Step 9: Suíte inteira — treze sítios mudaram de regra**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Dois pontos de atenção, ambos esperados:
- `UploadSizeLimitTest` continua verde: os tetos não mudaram.
- Testes que subiam documento com `UploadedFile::fake()->create('x.pdf', 100, 'application/pdf')`
  continuam verdes porque o fake do framework devolve o MIME declarado. Se algum teste subia um
  tipo que a classe não aceita (por exemplo `.docx` em documento de redator), ele fica **vermelho e
  está certo** — a recusa é o comportamento novo. Corrija o teste para o tipo permitido, nunca a
  allowlist para o teste.

- [ ] **Step 10: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint app/Shared/Files/ContentClass.php app/Domains/Identity app/Domains/Commercial app/Domains/Operation tests/Support/Files tests/Feature/Shared/UploadPolicyTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Files/ContentClass.php backend/app/Domains backend/tests/Support/Files backend/tests/Feature/Shared/UploadPolicyTest.php
git commit -m "feat(files): politica de tipo e tamanho como peca unica nos 13 sitios de upload"
```

---

### Task 7: Catraca — sítio que recebe `UploadedFile` sem a peça reprova

Segunda catraca da spec §5. É a que teria pego os dois sítios sem regra nenhuma que esta fase
descobriu no `RedatorController`. Ao contrário da catraca 1, esta não tem como ler o roteador: a
propriedade é sobre o **código-fonte**, então varre os arquivos como o `DomainDependencyTest` e o
`PersistenceLawsTest` já fazem, com o `ScansPhpSource` que existe para isso.

**Files:**
- Test: `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php`

**Interfaces:**
- Consumes: Task 6.
- Produces: a propriedade "upload novo nasce coberto".

- [ ] **Step 1: Escrever a catraca**

**O detector foi medido, e a primeira versão dele estava errada.** Procurar só por `UploadedFile`
acharia as Actions e não acharia **nenhum** dos controllers — eles escrevem `$request->file('file')`
ou leem `$validated['file']`, e nunca nomeiam a classe. Medido em `main@6cfe0070`: `UploadedFile`
sozinho pega 10 arquivos, **nenhum deles** sendo `QuoteFileController`, `BudgetFileController` ou
`TurmaDocumentController`. São precisos três sinais.

E a referência à política não é uma só: os cinco controllers de foto consomem
`UserPhotoService::rules()`, que é quem pede a `ContentClass`. Exigir `ContentClass::` deles seria
exigir que furassem a própria fonte única.

```php
<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * Catraca 2 do bloco de hardening (spec §5). Três políticas literais em sete
 * controllers já tinham produzido quatro endpoints sem tipo; ao escrever o
 * plano descobriu-se um quinto e um sexto — `store` e `update` de redator —
 * que não tinham regra NENHUMA. Esta catraca existe para que o próximo não
 * exista.
 *
 * Varre a fonte porque a propriedade é sobre o CÓDIGO: um controller que lê
 * `$request->file(...)` e valida à mão não se distingue pelo roteador.
 * `codigoSemComentarios` porque citar `mimes:` num comentário que EXPLICA a
 * política não pode reprovar a política (mesmo cuidado do review de 2026-08-04).
 */
class UploadPolicyRatchetTest extends TestCase
{
    use ScansPhpSource;

    /**
     * Os três sinais de que um arquivo mexe com upload. Medido: `UploadedFile`
     * sozinho não acha NENHUM controller — eles nunca nomeiam a classe.
     */
    private const SINAIS_DE_UPLOAD = [
        'UploadedFile',      // Actions e Services que recebem o arquivo tipado
        'request->file(',    // controllers que o tiram da requisição
        "'file' =>",         // controllers que declaram a regra do campo `file`
    ];

    /**
     * As formas de pedir a política. `ContentClass::` é a direta; os cinco
     * controllers de foto pedem por `UserPhotoService::rules()`, que é a fonte
     * única deles e é ela quem chama a `ContentClass` — exigir a forma direta
     * deles seria mandá-los furar a própria fonte única.
     */
    private const REFERENCIAS_DE_POLITICA = [
        'ContentClass::',
        'UserPhotoService::rules(',
    ];

    /**
     * Arquivos que casam um sinal de upload mas legitimamente NÃO pedem a
     * política, e por quê. Silêncio reprova: entrada nova aqui é escrita
     * explícita, com motivo ao lado.
     *
     * @var array<string,string>
     */
    private const ISENTOS = [
        'app/Shared/Files/Actions/UploadFileAction.php' => 'É a escrita no disco, não a porta de entrada: recebe o arquivo já validado por quem o recebeu do cliente.',
        'app/Domains/Operation/Services/SpreadsheetRowReader.php' => 'Só itera as linhas da planilha que o controller já validou; nunca recebe upload direto do cliente.',
        'app/Domains/Operation/Actions/ImportStudentsAction.php' => 'Recebe o `UploadedFile` já validado pelo `EnrollmentController::import`, que pede a classe Planilha.',
        'app/Domains/Operation/Actions/StoreTurmaDocumentAction.php' => 'Recebe o arquivo já validado pelo `TurmaDocumentController`, que pede a classe DocumentoDeTurma.',
        'app/Domains/Identity/Actions/CreateRedatorAction.php' => 'Recebe os documentos já validados pelo `RedatorController::documentsFromRequest`, um a um.',
        'app/Domains/Identity/Actions/UpdateRedatorAction.php' => 'Recebe os documentos já validados pelo `RedatorController::documentsFromRequest`, um a um.',
        'app/Domains/Identity/Actions/StoreRedatorDocumentAction.php' => 'Recebe o arquivo já validado pelos controllers de documento de redator e de perfil.',
        'app/Domains/Identity/Data/RedatorData.php' => 'DTO de leitura e escrita do redator: o campo multipart `documents` é validado no controller, não aqui.',
        'app/Providers/AppServiceProvider.php' => 'A chave `file` que casa aqui é a entrada do morph map do ADR-10, e não tem nada com upload.',
    ];

    /** @return list<string> paths relativos que mexem com upload, ignorando comentários */
    private function sitiosDeUpload(): array
    {
        $sitios = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);

            foreach (self::SINAIS_DE_UPLOAD as $sinal) {
                if (str_contains($codigo, $sinal)) {
                    $sitios[] = ltrim(str_replace(base_path(), '', $arquivo), '/');
                    break;
                }
            }
        }

        sort($sitios);

        return array_values(array_unique($sitios));
    }

    private function pedeAPolitica(string $codigo): bool
    {
        foreach (self::REFERENCIAS_DE_POLITICA as $referencia) {
            if (str_contains($codigo, $referencia)) {
                return true;
            }
        }

        return false;
    }

    public function test_todo_sitio_de_upload_pede_a_classe_de_conteudo(): void
    {
        $descobertos = [];

        foreach ($this->sitiosDeUpload() as $relativo) {
            if (array_key_exists($relativo, self::ISENTOS)) {
                continue;
            }

            if (! $this->pedeAPolitica($this->codigoSemComentarios(base_path($relativo)))) {
                $descobertos[] = $relativo;
            }
        }

        $this->assertSame([], $descobertos, implode("\n", array_merge(
            [
                'Sítio que mexe com upload sem pedir a política de conteúdo (spec D4).',
                'Peça uma `ContentClass` em vez de escrever `mimes:`/`max:` à mão — ou',
                'declare o arquivo em ISENTOS com o motivo, se ele recebe arquivo JÁ',
                'validado por outro. Arquivos:',
            ],
            $descobertos,
        )));
    }

    public function test_nenhum_sitio_escreve_a_politica_a_mao(): void
    {
        $descobertos = [];

        foreach ($this->sitiosDeUpload() as $relativo) {
            // A peça é onde a política MORA — é o único lugar que pode escrevê-la.
            if (str_ends_with($relativo, 'app/Shared/Files/ContentClass.php')) {
                continue;
            }

            $codigo = $this->codigoSemComentarios(base_path($relativo));

            foreach (['mimes:', 'mimetypes:'] as $literal) {
                if (str_contains($codigo, $literal)) {
                    $descobertos[] = "{$relativo} -> {$literal}";
                }
            }
        }

        sort($descobertos);

        $this->assertSame([], array_values(array_unique($descobertos)), implode("\n", array_merge(
            ['Política de tipo escrita à mão fora do `ContentClass`. Foi assim que quatro endpoints ficaram sem tipo:'],
            $descobertos,
        )));
    }

    public function test_a_lista_de_isentos_esta_declarada_e_atual(): void
    {
        foreach (self::ISENTOS as $relativo => $motivo) {
            $this->assertFileExists(
                base_path($relativo),
                "Isento `{$relativo}` não existe mais — tire-o da lista em vez de deixar a isenção órfã.",
            );
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Isento {$relativo} com motivo curto demais para ser um motivo.",
            );
        }
    }

    public function test_a_lista_de_isentos_nao_esconde_sitio_que_pede_a_politica(): void
    {
        // Isenção que sobra é isenção que passa a cobrir um sítio que já ficou
        // certo — e a próxima regressão nele passaria calada.
        $desnecessarios = [];

        foreach (array_keys(self::ISENTOS) as $relativo) {
            if ($this->pedeAPolitica($this->codigoSemComentarios(base_path($relativo)))) {
                $desnecessarios[] = $relativo;
            }
        }

        $this->assertSame([], $desnecessarios, implode("\n", array_merge(
            ['Isento que já pede a política — tire-o da lista para que ele volte a ser guardado:'],
            $desnecessarios,
        )));
    }
}
```

- [ ] **Step 2: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=UploadPolicyRatchetTest`
Expected: PASS, 4 testes. Os três sinais devolvem **22 arquivos** em `main@6cfe0070`: 9 isentos e
os **13 sítios** que a Task 6 já converteu — os 8 que passaram a citar `ContentClass::`
(`BudgetFileController`, `QuoteFileController`, `ProfileDocumentController`,
`RedatorDocumentController`, `TurmaDocumentController`, `EnrollmentController`, `RedatorController`,
`UserPhotoService`) e os 5 de foto que citam `UserPhotoService::rules(` (`ProfilePhotoController`,
`UserPhotoController`, `RedatorPhotoController`, `StudentPhotoController`, `ClientPhotoController`).

Se aparecer arquivo que a lista não previu: se ele **recebe do cliente**, dê-lhe uma
`ContentClass`; se ele **recebe já validado por outro**, entre em `ISENTOS` com o motivo escrito.
Nunca alargue `REFERENCIAS_DE_POLITICA` para calar um achado.

- [ ] **Step 3: VER A CATRACA REPROVAR — sonda temporária**

```bash
cd /home/jvbat/projetos/lotus
# sonda: devolve o QuoteFileController à política literal que ele tinha
sed -i "s|'file' => ContentClass::Documento->regras(),|'file' => ['required', 'file', 'max:10240'],|" backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php
docker compose exec -T app php artisan test --filter=UploadPolicyRatchetTest
```

Expected: FAIL em `test_todo_sitio_de_upload_pede_a_classe_de_conteudo`, listando
`app/Domains/Commercial/Http/Controllers/QuoteFileController.php` — que é exatamente o modo de
falha real: um endpoint sem tipo, passando despercebido.

- [ ] **Step 4: Reverter a sonda e confirmar a árvore limpa**

```bash
cd /home/jvbat/projetos/lotus
git checkout -- backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php
git status --short
docker compose exec -T app php artisan test --filter=UploadPolicyRatchetTest
```

Expected: `git status` sem esse arquivo; o teste de volta verde, 4 casos.

- [ ] **Step 5: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint tests/Feature/Shared/UploadPolicyRatchetTest.php
cd /home/jvbat/projetos/lotus
git add backend/tests/Feature/Shared/UploadPolicyRatchetTest.php
git commit -m "test(files): catraca — sitio de upload sem ContentClass reprova"
```

---

### Task 8: `files.mime` passa a ser o MIME do conteúdo, e o histórico é corrigido

D5. `UploadFileAction::metadataOf()` grava `getClientMimeType()` — o MIME que o **cliente declara**.
É esse valor que vai para `files.mime` e que o resto do sistema lê depois, num repositório onde o
arquivo tem peso legal. A escrita passa a usar `getMimeType()` (conteúdo), e o histórico é corrigido
por migration de backfill relendo o objeto — precedente P-47: o seeder não alcança linha que já
existe.

Sem o backfill a coluna passaria a significar duas coisas conforme a data, e quem lê não teria como
saber qual.

**Files:**
- Modify: `backend/app/Shared/Files/Actions/UploadFileAction.php:42-49`
- Create: `backend/database/migrations/2026_08_25_000001_backfill_files_mime.php`
- Test: `backend/tests/Feature/Shared/FileMimeFromContentTest.php`
- Test: `backend/tests/Feature/Shared/BackfillFilesMimeMigrationTest.php`

**Interfaces:**
- Consumes: `Tests\Support\Files\BuildsRealUploads` (Task 6).
- Produces: `files.mime` com o MIME de conteúdo. Nenhum DTO muda de forma —
  `FileData::$mime` já é `?string`.

- [ ] **Step 1: Escrever o teste da escrita**

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\Actions\UploadFileAction;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * `files.mime` guardava o MIME que o CLIENTE declarou (`getClientMimeType`),
 * num repositório onde o arquivo tem peso legal: bastava o cliente dizer
 * "application/pdf" para a linha afirmar isso, fossem quais fossem os bytes.
 */
class FileMimeFromContentTest extends TestCase
{
    use BuildsRealUploads;

    public function test_o_mime_gravado_vem_do_conteudo_e_nao_do_cliente(): void
    {
        $upload = $this->uploadReal($this->pngReal(), 'documento.pdf', 'application/pdf');

        $meta = app(UploadFileAction::class)->metadataOf($upload);

        $this->assertSame('image/png', $meta['mime']);
        $this->assertSame('documento.pdf', $meta['original_name'], 'O nome declarado continua sendo o do cliente — é o que a pessoa reconhece.');
    }

    public function test_pdf_legitimo_continua_gravando_application_pdf(): void
    {
        $upload = $this->uploadReal($this->pdfReal(), 'cv.pdf', 'application/pdf');

        $this->assertSame('application/pdf', app(UploadFileAction::class)->metadataOf($upload)['mime']);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=FileMimeFromContentTest`
Expected: FAIL em `test_o_mime_gravado_vem_do_conteudo_e_nao_do_cliente`:
`'application/pdf'` onde se esperava `'image/png'`.

- [ ] **Step 3: Corrigir a escrita**

Em `backend/app/Shared/Files/Actions/UploadFileAction.php`:

```php
    /**
     * Metadados do upload, capturados ANTES da escrita: depois dela o arquivo
     * temporário já cumpriu seu papel e ler dele de novo é dependência
     * desnecessária do driver.
     *
     * `getMimeType()` e NÃO `getClientMimeType()`: o segundo é o cabeçalho que
     * o cliente declarou no multipart, e o cliente escolhe o que declarar. Num
     * repositório onde o arquivo tem peso legal, a coluna precisa dizer o que o
     * binário É — o `finfo` lê os bytes. `original_name` continua sendo o nome
     * do cliente de propósito: é por ele que a pessoa reconhece o documento.
     *
     * @return array{original_name: string, mime: string, size: int}
     */
    public function metadataOf(UploadedFile $file): array
    {
        return [
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
        ];
    }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=FileMimeFromContentTest`
Expected: PASS, 2 testes.

- [ ] **Step 5: Escrever o teste da migration**

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\Models\File;
use App\Domains\Commercial\Models\Budget;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * D5. Toda linha de `files` gravada antes de 2026-08-25 tem em `mime` o que o
 * cliente declarou. Migration é o único mecanismo que alcança linha que já
 * existe — mesmo argumento da P-47, e pelo mesmo motivo o `down()` é no-op.
 */
class BackfillFilesMimeMigrationTest extends TestCase
{
    use BuildsRealUploads;
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_25_000001_backfill_files_mime.php');
    }

    private function arquivoLegado(string $bytes, string $mimeMentiroso): File
    {
        Storage::fake('s3');

        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);
        $path = 'budget/1/legado.bin';
        Storage::disk('s3')->put($path, $bytes);

        return $budget->files()->create([
            'type' => 'invoice',
            'path' => $path,
            'original_name' => 'fatura.pdf',
            'mime' => $mimeMentiroso,
            'size' => strlen($bytes),
        ]);
    }

    public function test_corrige_a_linha_cujo_mime_divergia_do_objeto(): void
    {
        $file = $this->arquivoLegado($this->pngReal(), 'application/pdf');

        $this->migration()->up();

        $this->assertSame('image/png', $file->fresh()->mime);
    }

    public function test_nao_toca_a_linha_que_ja_estava_certa(): void
    {
        $file = $this->arquivoLegado($this->pdfReal(), 'application/pdf');
        $antes = $file->fresh()->updated_at;

        $this->migration()->up();

        $this->assertSame('application/pdf', $file->fresh()->mime);
        $this->assertEquals($antes, $file->fresh()->updated_at, 'Linha correta não pode ganhar um UPDATE inútil.');
    }

    public function test_objeto_ausente_no_bucket_nao_derruba_a_migration(): void
    {
        $file = $this->arquivoLegado($this->pdfReal(), 'application/pdf');
        Storage::disk('s3')->delete($file->path);

        $this->migration()->up();

        // O valor antigo permanece: sem o objeto não há o que medir, e apagar
        // o que existe seria trocar um dado duvidoso por nenhum.
        $this->assertSame('application/pdf', $file->fresh()->mime);
    }

    public function test_alcanca_linha_soft_deletada(): void
    {
        // Documento substituído continua no bucket e continua sendo rastro de
        // auditoria — o metadado dele mentir é o mesmo problema.
        $file = $this->arquivoLegado($this->pngReal(), 'application/pdf');
        $file->delete();

        $this->migration()->up();

        $this->assertSame('image/png', File::withTrashed()->find($file->id)->mime);
    }

    public function test_down_e_no_op(): void
    {
        $file = $this->arquivoLegado($this->pngReal(), 'application/pdf');
        $this->migration()->up();
        $this->migration()->down();

        $this->assertSame('image/png', $file->fresh()->mime, 'Restaurar um valor que sabidamente mentia não é reversão útil.');
    }
}
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=BackfillFilesMimeMigrationTest`
Expected: FAIL — a migration ainda não existe (`failed to open stream`).

- [ ] **Step 7: Escrever a migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Mime\MimeTypes;
use Throwable;

/**
 * D5 do bloco de hardening. Até `UploadFileAction::metadataOf()` passar a usar
 * `getMimeType()`, a coluna `files.mime` guardava o MIME que o CLIENTE
 * declarou no multipart. Migration, e não seeder, pelo mesmo motivo da P-47:
 * seeder não alcança linha que já existe no banco.
 *
 * Sem este backfill a coluna passaria a significar duas coisas conforme a data
 * da linha, e quem lê não teria como saber qual.
 *
 * Lê o BINÁRIO, nunca o metadado do bucket: `Storage::mimeType()` devolve o
 * Content-Type que a própria escrita gravou — ou seja, a mesma declaração do
 * cliente. Só os bytes desmentem os bytes.
 *
 * `withTrashed` por construção (query builder cru, sem escopo de model):
 * documento substituído continua no bucket e continua sendo rastro de
 * auditoria; o metadado dele mentir é o mesmo problema.
 *
 * `down()` é no-op declarado: restaurar um valor que sabidamente mentia não é
 * reversão útil, e esta migration não guarda o valor antigo justamente porque
 * ele não vale nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        $disco = Storage::disk(config('filesystems.default'));
        $tipos = MimeTypes::getDefault();

        $corrigidas = 0;
        $ausentes = 0;
        $total = 0;

        DB::table('files')->chunkById(100, function ($linhas) use ($disco, $tipos, &$corrigidas, &$ausentes, &$total) {
            foreach ($linhas as $linha) {
                $total++;

                try {
                    if (! $disco->exists($linha->path)) {
                        $ausentes++;

                        continue;
                    }

                    // Arquivo temporário porque `guessMimeType()` recebe um
                    // caminho: é a MESMA chamada que `UploadedFile::getMimeType()`
                    // faz, então o valor gravado aqui e o gravado num upload novo
                    // vêm do mesmo lugar.
                    $temporario = tempnam(sys_get_temp_dir(), 'lotus-backfill-');
                    file_put_contents($temporario, $disco->get($linha->path));
                    $real = $tipos->guessMimeType($temporario);
                    @unlink($temporario);

                    if ($real === null || $real === $linha->mime) {
                        continue;
                    }

                    DB::table('files')->where('id', $linha->id)->update(['mime' => $real]);
                    $corrigidas++;
                } catch (Throwable $e) {
                    // Objeto ilegível não pode derrubar a migration: o resto das
                    // linhas continua valendo a correção, e o que ficou de fora
                    // sai no log com o id.
                    $ausentes++;
                    Log::warning('Backfill de files.mime não conseguiu ler o objeto', [
                        'file_id' => $linha->id,
                        'path' => $linha->path,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        });

        // A contagem é a evidência do DoD 7. Vai para o log e para a saída do
        // `artisan migrate`, porque quem roda em produção precisa ler o número.
        $resumo = "Backfill de files.mime: {$total} linhas lidas, {$corrigidas} corrigidas, {$ausentes} sem objeto legível.";
        Log::info($resumo);

        if (app()->runningInConsole()) {
            echo $resumo.PHP_EOL;
        }
    }

    public function down(): void
    {
        // No-op declarado: o valor antigo era a declaração do cliente, e
        // restaurá-lo devolveria a mentira. Não há reversão útil a fazer.
    }
};
```

- [ ] **Step 8: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=BackfillFilesMimeMigrationTest`
Expected: PASS, 5 testes.

- [ ] **Step 9: Suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. `RedatorDocumentTest:71` afirma `'application/pdf'` num upload feito com
`UploadedFile::fake()->create(..., 'application/pdf')` — e o fake do framework devolve o MIME
declarado em `getMimeType()`, então continua verde.

- [ ] **Step 10: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint app/Shared/Files/Actions/UploadFileAction.php database/migrations/2026_08_25_000001_backfill_files_mime.php tests/Feature/Shared/FileMimeFromContentTest.php tests/Feature/Shared/BackfillFilesMimeMigrationTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Files/Actions/UploadFileAction.php backend/database/migrations backend/tests/Feature/Shared/FileMimeFromContentTest.php backend/tests/Feature/Shared/BackfillFilesMimeMigrationTest.php
git commit -m "fix(files): mime vem do conteudo, com backfill do historico"
```

---

### Task 9: ClamAV — serviço, cliente INSTREAM e regra de validação

D1 e D8. O `RNF-SEC-08` exige o **resultado** — escaneamento — e não nomeia sonda, serviço,
fornecedor, protocolo nem topologia. O João decidiu não renegociar o resultado.

**Por que síncrono, medido e não suposto:** o projeto não tem worker
(`docker-compose.prod.yml` diz isso por escrito, e `grep ShouldQueue` devolve uma linha que é
comentário). Assíncrono exigiria subir fila e worker junto — outro bloco. E o custo real não pede
worker: **17 ms para 100 KB, 72 ms para 1 MB, 551 ms para o teto de 10 MB**, medidos contra o
daemon real em 2026-08-25.

**Por que cliente próprio e não pacote:** não há nenhum no `composer.json`, e o protocolo cabe num
arquivo — a mesma escolha de proporção que o resto do projeto faz. O `GotenbergHtmlToPdf` é o molde:
interface no `Shared`, adapter fino, binding no `AppServiceProvider`, dobradura nos testes.

**Protocolo INSTREAM, verificado contra `clamav/clamav:1.4` em 2026-08-25:**
manda `zINSTREAM\0`, depois cada pedaço como `<tamanho em 4 bytes big-endian><bytes>`, e termina com
quatro zeros. A resposta é `stream: OK\0` para limpo e
`stream: Eicar-Test-Signature FOUND\0` para infectado. `StreamMaxLength` do daemon é 100 MB, dez
vezes o teto de 10 MB.

**Dois custos declarados na abertura, não descobertos no gate:**
- A imagem `clamav/clamav:1.4` tem **146 MiB comprimidos** e traz a base de assinaturas embutida
  (`main.cvd` + `daily.cvd`, ~112 MB) — o `clamd` ficou pronto em **~10 s** na medição, sem esperar
  download. Isto **corrige** a spec §4.4, que previa o `freshclam` baixando a base no primeiro `up`:
  isso vale para a tag `_base`, não para esta.
- O daemon ocupou **1,014 GiB residentes**, medido com `docker stats`. Isso **pressiona a decisão de
  tamanho da EC2 que o item 10 tem em aberto**: numa `t4g.small` (2 GiB) sobraria menos de 1 GiB
  para PHP-FPM, nginx e Gotenberg juntos. Este bloco vira insumo daquela decisão; **não a toma**.

**Fail closed (D8), com uma distinção que a spec deixou em aberto:** infectado é recusa do
**arquivo** e sai `422` com erro no campo — o arquivo está errado. Scanner fora do ar não é culpa do
arquivo, então sai **`503` com `Retry-After`**, pelo mesmo mecanismo de header que a Task 1
construiu. Continua sendo fail closed: nenhum byte entra no bucket. A consequência aceita e
declarada é que daemon fora do ar derruba todo upload até voltar.

**Files:**
- Create: `backend/app/Shared/Files/MalwareScanner.php`
- Create: `backend/app/Shared/Files/ClamAvScanner.php`
- Create: `backend/app/Shared/Files/ScannerUnavailableException.php`
- Create: `backend/app/Shared/Files/Rules/ScannedForMalware.php`
- Create: `backend/tests/Support/Files/FakeMalwareScanner.php`
- Test: `backend/tests/Feature/Shared/MalwareScanTest.php`
- Modify: `backend/app/Shared/Files/ContentClass.php` (a regra entra em `regras()`)
- Modify: `backend/app/Providers/AppServiceProvider.php` (binding)
- Modify: `backend/config/services.php`
- Modify: `backend/.env.example`
- Modify: `backend/tests/TestCase.php`
- Modify: `docker-compose.yml`, `docker-compose.prod.yml`

**Interfaces:**
- Consumes: `ContentClass` (Task 6), o repasse de headers do `ProblemDetails` (Task 1).
- Produces: `App\Shared\Files\MalwareScanner` com `infected(string $path): bool` (lança
  `ScannerUnavailableException`); `ClamAvScanner` e `FakeMalwareScanner` implementando-a;
  `ContentClass::regras()` passando a devolver `list<string|object>`.

- [ ] **Step 1: Escrever o teste que falha**

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\ClamAvScanner;
use App\Shared\Files\MalwareScanner;
use App\Shared\Files\ScannerUnavailableException;
use App\Shared\Files\ContentClass;
use Illuminate\Support\Facades\Validator;
use Tests\Support\Files\BuildsRealUploads;
use Tests\Support\Files\FakeMalwareScanner;
use Tests\TestCase;

/**
 * RNF-SEC-08. O requisito pede o RESULTADO — escaneamento — e não nomeia
 * mecanismo. Estes casos provam o resultado: infectado não passa, e scanner
 * fora do ar também não deixa passar (D8, fail closed).
 *
 * O daemon real não participa da suíte: quem responde aqui é a dobradura. A
 * prova contra o ClamAV de verdade é o DoD 3 e 4 da Task 12, com EICAR e com o
 * serviço parado.
 */
class MalwareScanTest extends TestCase
{
    use BuildsRealUploads;

    private function validar(): \Illuminate\Contracts\Validation\Validator
    {
        return Validator::make(
            ['arquivo' => $this->uploadReal($this->pdfReal(), 'cv.pdf', 'application/pdf')],
            ['arquivo' => ContentClass::Documento->regras()],
        );
    }

    public function test_arquivo_limpo_passa(): void
    {
        $this->app->instance(MalwareScanner::class, new FakeMalwareScanner);

        $this->assertTrue($this->validar()->passes());
    }

    public function test_arquivo_infectado_e_recusado_com_erro_no_campo(): void
    {
        $this->app->instance(MalwareScanner::class, FakeMalwareScanner::queAcusaTudo());

        $validador = $this->validar();

        $this->assertFalse($validador->passes());
        $this->assertArrayHasKey('arquivo', $validador->errors()->toArray());
    }

    public function test_scanner_fora_do_ar_recusa_o_upload(): void
    {
        // Fail closed (D8): a alternativa exigiria coluna de estado, tela do
        // pendente e rotina de reconciliação — sem os três, "fail open" é uma
        // flag que ninguém lê.
        $this->app->instance(MalwareScanner::class, FakeMalwareScanner::foraDoAr());

        $this->expectException(ScannerUnavailableException::class);

        $this->validar()->validate();
    }

    public function test_a_recusa_por_indisponibilidade_e_503_com_retry_after(): void
    {
        // Não é 422: o arquivo não está errado, o serviço é que caiu. E o
        // `Retry-After` chega ao cliente pelo repasse de headers da Task 1.
        $e = new ScannerUnavailableException;

        $resposta = \App\Shared\Exceptions\ProblemDetails::fromException(
            $e, \Illuminate\Http\Request::create('/api/quotes/1/files', 'POST'),
        );

        $this->assertSame(503, $resposta->getStatusCode());
        $this->assertNotNull($resposta->headers->get('Retry-After'));
        $this->assertStringStartsWith('application/problem+json', (string) $resposta->headers->get('Content-Type'));
    }

    public function test_a_mensagem_distingue_infectado_de_servico_fora_do_ar(): void
    {
        // Quem recebe a recusa precisa saber se o arquivo está infectado ou se
        // o serviço caiu — são ações diferentes de quem está do outro lado.
        $this->app->instance(MalwareScanner::class, FakeMalwareScanner::queAcusaTudo());
        $porInfeccao = $this->validar()->errors()->first('arquivo');

        $porQueda = (new ScannerUnavailableException)->getMessage();

        $this->assertNotSame($porInfeccao, $porQueda);
        $this->assertNotSame('', trim($porInfeccao));
        $this->assertNotSame('', trim($porQueda));
    }

    public function test_o_scanner_default_da_aplicacao_e_o_clamav(): void
    {
        // A dobradura é escolha da SUÍTE (TestCase), nunca da aplicação: um
        // binding permissivo vazando para produção seria o RNF-SEC-08 morto sem
        // ninguém perceber.
        $this->app->forgetInstance(MalwareScanner::class);

        $this->assertInstanceOf(ClamAvScanner::class, $this->app->make(MalwareScanner::class));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=MalwareScanTest`
Expected: FAIL com `Class "App\Shared\Files\MalwareScanner" not found`.

- [ ] **Step 3: Interface, exceção e adapter**

`backend/app/Shared/Files/MalwareScanner.php`:

```php
<?php

namespace App\Shared\Files;

/**
 * Escaneamento antimalware do binário ANTES de qualquer escrita (RNF-SEC-08).
 * Interface e não classe pelo mesmo motivo do `HtmlToPdf`: nos testes o binding
 * troca por uma dobradura, e o daemon real não participa da suíte.
 */
interface MalwareScanner
{
    /**
     * @param  string  $path  caminho do arquivo temporário do upload
     *
     * @throws ScannerUnavailableException quando o serviço não responde — nunca
     *                                     devolve `false` por não ter conseguido olhar
     */
    public function infected(string $path): bool;
}
```

`backend/app/Shared/Files/ScannerUnavailableException.php`:

```php
<?php

namespace App\Shared\Files;

use App\Shared\Exceptions\PublicDetail;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

/**
 * O antivírus não respondeu, então o upload é RECUSADO (spec D8, fail closed):
 * deixar passar sem olhar seria afirmar um cumprimento que não aconteceu.
 *
 * 503 e não 422 porque o arquivo não está errado — o serviço é que caiu; um
 * 422 mandaria a pessoa procurar defeito num arquivo que está bom. O
 * `Retry-After` chega ao cliente pelo repasse de `getHeaders()` do
 * `ProblemDetails`.
 *
 * `PublicDetail` não é necessário para o 503 — o mascaramento do
 * `ProblemDetails` só age em 500. Está aqui como CONTRATO: declara que esta
 * mensagem foi escrita para quem lê a resposta, em es-CL, e não vaza nada que a
 * resposta já não pudesse dizer. Se o status mudar um dia, a garantia já está
 * declarada em vez de precisar ser redescoberta.
 */
class ScannerUnavailableException extends ServiceUnavailableHttpException implements PublicDetail
{
    public function __construct(?\Throwable $previous = null)
    {
        parent::__construct(
            30,
            'El servicio de antivirus no está disponible. El archivo no fue guardado; intente nuevamente en unos minutos.',
            $previous,
        );
    }
}
```

`backend/app/Shared/Files/ClamAvScanner.php`:

```php
<?php

namespace App\Shared\Files;

use Throwable;

/**
 * Adapter do daemon `clamav` do compose, protocolo INSTREAM em TCP 3310.
 * Verificado contra `clamav/clamav:1.4` em 2026-08-25:
 *
 *   -> "zINSTREAM\0", depois cada pedaço como <tamanho 4 bytes big-endian><bytes>,
 *      e quatro zeros para fechar
 *   <- "stream: OK\0"                            arquivo limpo
 *   <- "stream: <assinatura> FOUND\0"            arquivo infectado
 *
 * Cliente próprio e não pacote: não há nenhum no composer.json e o protocolo
 * cabe aqui — mesma proporção que o resto do projeto usa.
 *
 * Custo medido: 17 ms para 100 KB, 72 ms para 1 MB, 551 ms para o teto de
 * 10 MB. É o que sustenta o scan SÍNCRONO (spec D1) num projeto sem worker.
 */
class ClamAvScanner implements MalwareScanner
{
    /** 8 KB por pedaço: abaixo de qualquer `StreamMaxLength` e acima do custo de syscall. */
    private const PEDACO = 8192;

    public function infected(string $path): bool
    {
        $resposta = $this->stream($path);

        if (str_contains($resposta, 'FOUND')) {
            return true;
        }

        if (str_contains($resposta, 'OK')) {
            return false;
        }

        // Resposta que não é nem OK nem FOUND é daemon em estado que não
        // sabemos ler. Fail closed: não afirmamos "limpo" sem ter lido "limpo".
        throw new ScannerUnavailableException;
    }

    private function stream(string $path): string
    {
        $socket = @stream_socket_client(
            'tcp://'.config('services.clamav.host').':'.config('services.clamav.port'),
            $errno,
            $errstr,
            (float) config('services.clamav.timeout'),
        );

        if ($socket === false) {
            throw new ScannerUnavailableException;
        }

        try {
            stream_set_timeout($socket, (int) config('services.clamav.timeout'));

            fwrite($socket, "zINSTREAM\0");

            $arquivo = @fopen($path, 'rb');

            if ($arquivo === false) {
                throw new ScannerUnavailableException;
            }

            try {
                while (! feof($arquivo)) {
                    $pedaco = (string) fread($arquivo, self::PEDACO);

                    if ($pedaco === '') {
                        continue;
                    }

                    fwrite($socket, pack('N', strlen($pedaco)));
                    fwrite($socket, $pedaco);
                }
            } finally {
                fclose($arquivo);
            }

            // Quatro zeros fecham o stream e disparam o veredicto.
            fwrite($socket, pack('N', 0));

            $resposta = '';

            while (! feof($socket)) {
                $resposta .= (string) fread($socket, 4096);

                // `stream_get_meta_data` é o único jeito de distinguir "acabou"
                // de "o daemon parou de responder": sem isto, um timeout viraria
                // resposta vazia, e resposta vazia não pode virar "limpo".
                if (stream_get_meta_data($socket)['timed_out']) {
                    throw new ScannerUnavailableException;
                }
            }

            return trim($resposta, "\0\n ");
        } catch (ScannerUnavailableException $e) {
            throw $e;
        } catch (Throwable $e) {
            throw new ScannerUnavailableException($e);
        } finally {
            if (is_resource($socket)) {
                fclose($socket);
            }
        }
    }
}
```

- [ ] **Step 4: A regra de validação**

`backend/app/Shared/Files/Rules/ScannedForMalware.php`:

```php
<?php

namespace App\Shared\Files\Rules;

use App\Shared\Files\MalwareScanner;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * Escaneia o binário durante a VALIDAÇÃO, e é isso que garante o requisito:
 * a validação roda antes do controller, logo antes de qualquer `putFile()` —
 * binário infectado nunca chega ao bucket. Também alcança a foto de perfil, que
 * grava por `UserPhotoService` e não pelo `UploadFileAction`.
 *
 * Vem sempre por último no `ContentClass::regras()`, atrás de um `bail`: sem
 * isso um arquivo de tipo errado seria mandado inteiro ao daemon só para ser
 * recusado pelo tipo depois.
 *
 * Scanner fora do ar não vira `$fail`: a `ScannerUnavailableException` sobe e
 * sai 503, porque o arquivo não está errado (spec D8).
 */
final class ScannedForMalware implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // As regras anteriores já reprovaram o que não é arquivo. Repetir a
        // recusa aqui só produziria duas mensagens para o mesmo defeito.
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            return;
        }

        if (app(MalwareScanner::class)->infected((string) $value->getRealPath())) {
            $fail('El archivo fue rechazado: el antivirus detectó contenido malicioso.');
        }
    }
}
```

E a regra entra no fim de `ContentClass::regras()`:

```php
use App\Shared\Files\Rules\ScannedForMalware;
```

```php
    /** @return list<string|object> */
    public function regras(bool $obrigatorio = true): array
    {
        return [
            'bail',
            $obrigatorio ? 'required' : 'nullable',
            'file',
            'mimes:'.implode(',', $this->extensoes()),
            'mimetypes:'.implode(',', $this->mimes()),
            'max:'.$this->tetoEmKb(),
            // Por último de propósito: só vale mandar bytes ao daemon depois de
            // o tipo e o tamanho já terem passado.
            new ScannedForMalware,
        ];
    }
```

- [ ] **Step 5: Declarar a regra na catraca de upload**

`ScannedForMalware.php` cita `UploadedFile`, então a partir de agora a catraca da Task 7 a
encontra — e ela não pede `ContentClass`, porque roda **dentro** da peça. Acrescentar a `ISENTOS`
em `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php`:

```php
        'app/Shared/Files/Rules/ScannedForMalware.php' => 'É a regra de antivírus que a própria peça de política publica: roda dentro dela, nunca antes dela.',
```

Run: `docker compose exec -T app php artisan test --filter=UploadPolicyRatchetTest`
Expected: PASS, 4 testes. Sem esta entrada, `test_todo_sitio_de_upload_pede_a_classe_de_conteudo`
fica vermelho listando a própria regra — que é a catraca funcionando.

- [ ] **Step 6: A dobradura de teste**

`backend/tests/Support/Files/FakeMalwareScanner.php`:

```php
<?php

namespace Tests\Support\Files;

use App\Shared\Files\MalwareScanner;
use App\Shared\Files\ScannerUnavailableException;

/**
 * Dobradura do antivírus. O default APROVA, porque quase todo teste da suíte
 * sobe arquivo e nenhum deles é sobre malware; quem prova a recusa instala a
 * variante que precisa.
 */
class FakeMalwareScanner implements MalwareScanner
{
    /** @param  list<string>  $escaneados */
    public function __construct(
        private readonly bool $acusa = false,
        private readonly bool $foraDoAr = false,
        public array $escaneados = [],
    ) {}

    public static function queAcusaTudo(): self
    {
        return new self(acusa: true);
    }

    public static function foraDoAr(): self
    {
        return new self(foraDoAr: true);
    }

    public function infected(string $path): bool
    {
        $this->escaneados[] = $path;

        if ($this->foraDoAr) {
            throw new ScannerUnavailableException;
        }

        return $this->acusa;
    }
}
```

- [ ] **Step 7: Binding, configuração e default da suíte**

`backend/config/services.php`, no molde do `gotenberg`:

```php
    'clamav' => [
        // Daemon do compose, protocolo INSTREAM. Rede interna: sem porta
        // publicada, alcançável só de dentro do Compose.
        'host' => env('CLAMAV_HOST', 'clamav'),
        'port' => (int) env('CLAMAV_PORT', 3310),
        // 30 s: o pior caso medido é 551 ms para 10 MB, então este teto só
        // morde quando o daemon está de fato travado — que é quando queremos
        // recusar em vez de esperar.
        'timeout' => (int) env('CLAMAV_TIMEOUT', 30),
    ],
```

`backend/.env.example`, junto do `GOTENBERG_URL`:

```dotenv
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_TIMEOUT=30
```

`backend/app/Providers/AppServiceProvider.php`, em `register()`:

```php
        // Antivírus (RNF-SEC-08): serviço `clamav` do compose, INSTREAM na
        // 3310. Nos testes o binding troca pelo `FakeMalwareScanner`.
        $this->app->bind(MalwareScanner::class, ClamAvScanner::class);
```

`backend/phpunit.xml`, para que um esquecimento de binding não vire conexão de rede na suíte:

```xml
        <env name="CLAMAV_HOST" value="127.0.0.1"/>
        <env name="CLAMAV_PORT" value="1"/>
        <env name="CLAMAV_TIMEOUT" value="1"/>
```

`backend/tests/TestCase.php`, ao fim do `setUp()`:

```php
        // Nenhum teste fala com o daemon real: o scanner da suíte aprova por
        // padrão, e quem prova a recusa instala a sua própria dobradura. A
        // escolha é da SUÍTE — a aplicação continua ligada no ClamAV, e
        // `MalwareScanTest` guarda isso.
        $this->app->instance(MalwareScanner::class, new FakeMalwareScanner);
```

- [ ] **Step 8: O serviço no compose**

`docker-compose.yml`, no molde do `gotenberg` — imagem externa, sem porta publicada:

```yaml
  clamav:
    # Tag COM base de assinaturas embutida (146 MiB comprimidos): o `clamd`
    # ficou pronto em ~10 s na medição de 2026-08-25, sem esperar download. A
    # tag `_base` (38 MiB) baixaria a base pelo freshclam no primeiro `up` e
    # deixaria a stack inutilizável por vários minutos.
    #
    # Medido: ~1,01 GiB residentes. É insumo do dimensionamento da EC2 (item 10),
    # não decisão deste bloco.
    image: clamav/clamav:1.4
    healthcheck:
      test: ["CMD", "/usr/local/bin/clamdcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
```

E `app` passa a depender dele:

```yaml
    depends_on: [mysql, gotenberg, minio, clamav]
```

`docker-compose.prod.yml`, no molde do `gotenberg` de lá (com `restart` e `logging`):

```yaml
  clamav:
    image: clamav/clamav:1.4
    restart: unless-stopped
    logging: *logging
    # Script que a própria imagem traz (medido): faz PING/PONG na 3310.
    healthcheck:
      test: ["CMD", "/usr/local/bin/clamdcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
```

E o `app` de produção:

```yaml
    depends_on: [gotenberg, clamav]
```

- [ ] **Step 9: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=MalwareScanTest`
Expected: PASS, 6 testes.

- [ ] **Step 10: Suíte inteira — a regra entrou em todos os uploads**

Run: `docker compose exec -T app php artisan test`
Expected: PASS. Se algum teste ficar pendurado, é o `FakeMalwareScanner` que não foi instalado no
`TestCase::setUp()` e a conexão real está sendo tentada — as variáveis do `phpunit.xml`
(`127.0.0.1:1`) fazem isso falhar rápido em vez de travar.

- [ ] **Step 11: Provar contra o daemon REAL, com EICAR**

```bash
cd /home/jvbat/projetos/lotus
docker compose up -d clamav
# esperar o healthcheck
until docker compose exec -T clamav /usr/local/bin/clamdcheck.sh >/dev/null 2>&1; do sleep 5; done
docker compose exec -T app php -r '
require "/var/www/vendor/autoload.php";
$app = require "/var/www/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$scanner = $app->make(App\Shared\Files\MalwareScanner::class);
echo "adapter: ".get_class($scanner)."\n";
$limpo = tempnam(sys_get_temp_dir(), "t"); file_put_contents($limpo, "%PDF-1.4\n");
$sujo  = tempnam(sys_get_temp_dir(), "t"); file_put_contents($sujo, "X5O!P%@AP[4\\PZX54(P^)7CC)7}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H+H*");
var_dump($scanner->infected($limpo));
var_dump($scanner->infected($sujo));
'
```

Expected: `adapter: App\Shared\Files\ClamAvScanner`, depois `bool(false)` e `bool(true)`.

- [ ] **Step 12: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint app/Shared/Files app/Providers/AppServiceProvider.php config/services.php tests/Support/Files tests/TestCase.php tests/Feature/Shared/MalwareScanTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Files backend/app/Providers/AppServiceProvider.php backend/config/services.php backend/.env.example backend/phpunit.xml backend/tests docker-compose.yml docker-compose.prod.yml
git commit -m "feat(files): escaneamento antivirus ClamAV sincrono antes de gravar no bucket"
```

---

### Task 10: Tetos de lote e de import

D6 e §4.6. `BatchIssueData::rules()` pede `enrollment_ids => ['required','array','min:1']`, **sem
teto**. `ImportStudentsAction` não limita linhas: com o teto de 10 MB de arquivo, um CSV cabe com
mais de cem mil linhas, e cada uma vira uma transação de matrícula.

**Correção C-3 aplicada aqui:** o lote **não** renderiza PDF. Cada item é uma
`IssueCertificateAction` — seis portas, snapshot e auditoria, em transação própria. O teto continua
necessário, e o motivo é duração de requisição e volume de escrita, não Gotenberg.

**Os números, e de onde saem.** Turma real tem **8 a 15 alunos** (`OperationDemoSeeder`), e o
`fastcgi_read_timeout` é **60 s** em dev e **120 s** em produção.

| Teto | Valor | Múltiplo da turma real | Raciocínio |
|---|---|---|---|
| `enrollment_ids` | **200** | ~13× a maior turma | um lote é uma turma; 200 dá folga para o caso excepcional de várias turmas juntas e ainda cabe com sobra no timeout |
| linhas de import | **500** | ~33× a maior turma | uma planilha é uma turma; 500 é folga larga e troca um teto de ~100 000 linhas por um que um humano nunca alcança |

Os dois são **teto, não meta**, e o Step 7 mede o tempo real no maior valor permitido. Se a medição
mostrar duração desconfortável perto do timeout, o número desce **com a medição ao lado** — nunca
por impressão.

**Files:**
- Modify: `backend/app/Domains/Certification/Data/BatchIssueData.php:17-27`
- Modify: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php:26-40`
- Test: `backend/tests/Feature/Certification/BatchIssueTest.php` (acrescenta casos)
- Test: `backend/tests/Feature/Operation/ImportStudentsActionTest.php` (acrescenta casos)

**Interfaces:**
- Consumes: nada.
- Produces: `BatchIssueData::MAX_ITENS` (`int`, 200) e `ImportStudentsAction::MAX_LINHAS`
  (`int`, 500) — os testes e o DoD leem as constantes, nunca o número repetido.

- [ ] **Step 1: Acrescentar os casos ao `BatchIssueTest`**

```php
    public function test_lote_acima_do_teto_e_recusado_antes_de_emitir_qualquer_certificado(): void
    {
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $ids = range(1, BatchIssueData::MAX_ITENS + 1);

        $this->postJson('/api/certificates/batch', [
            'enrollment_ids' => $ids,
            'redator_id' => $redator->id,
        ])->assertStatus(422)->assertJsonValidationErrors('enrollment_ids');

        // A prova é o banco, não a resposta: recusa que já tivesse emitido
        // metade do lote não seria recusa.
        $this->assertSame(0, Certificate::query()->count());
    }

    public function test_lote_no_teto_passa_pela_validacao(): void
    {
        // No teto exato a validação não pode reprovar — teto é inclusivo.
        $this->actingAsAdmin();
        $redator = $this->makeRedator();

        $this->postJson('/api/certificates/batch', [
            'enrollment_ids' => range(1, BatchIssueData::MAX_ITENS),
            'redator_id' => $redator->id,
        ])->assertOk();
    }
```

> `makeRedator()` e o import de `Certificate` seguem o que o próprio `BatchIssueTest` já usa —
> leia o arquivo e reaproveite os helpers dele em vez de criar novos. Os ids inexistentes viram
> linha de erro no relatório, que é o comportamento já provado por
> `test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu`; por isso o segundo caso afirma
> `assertOk()` e não sucesso de emissão.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=BatchIssueTest`
Expected: FAIL — `BatchIssueData::MAX_ITENS` não existe, e sem o teto o lote de 201 ids passa.

- [ ] **Step 3: O teto do lote**

```php
class BatchIssueData extends Data
{
    /**
     * Teto de itens por lote. Turma real tem 8 a 15 alunos
     * (`OperationDemoSeeder`), então 200 é ~13× a maior — folga para vários
     * lotes juntos e ainda longe do `fastcgi_read_timeout` (60 s em dev, 120 s
     * em produção). Cada item é uma `IssueCertificateAction` completa: seis
     * portas, snapshot e auditoria, em transação própria. Sem teto, o único
     * limite era o `post_max_size`.
     */
    public const MAX_ITENS = 200;

    public function __construct(
        /** @var array<int> */
        public array $enrollment_ids,
        public int $redator_id,
    ) {}

    public static function rules(): array
    {
        return [
            'enrollment_ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_ITENS],
            // `distinct`: a UI nunca manda id repetido, mas a API crua manda —
            // e um duplicado renderia o item duas vezes no relatório (emitido +
            // "ya existe un certificado vigente"), com `key` React duplicada.
            'enrollment_ids.*' => ['integer', 'distinct', 'exists:enrollments,id'],
            'redator_id' => ['required', 'integer', 'exists:redatores,id'],
        ];
    }
}
```

- [ ] **Step 4: Acrescentar os casos ao `ImportStudentsActionTest`**

```php
    public function test_planilha_acima_do_teto_e_recusada_sem_matricular_ninguem(): void
    {
        $turma = $this->turmaAberta();

        $linhas = ImportStudentsAction::MAX_LINHAS + 1;
        $csv = "RUT,Nombre,Email,Telefono\n";
        for ($i = 1; $i <= $linhas; $i++) {
            $csv .= "11.111.11{$i}-1,Aluno {$i},aluno{$i}@lotus.cl,+56900000000\n";
        }

        $arquivo = $this->uploadReal($csv, 'alunos.csv', 'text/csv');

        try {
            app(ImportStudentsAction::class)->execute($turma, $arquivo);
            $this->fail('A planilha acima do teto tinha de ser recusada.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('file', $e->errors());
            $this->assertStringContainsString((string) ImportStudentsAction::MAX_LINHAS, ValidationMessages::squash($e));
        }

        // A prova é o banco: recusa que já matriculou 500 pessoas não é recusa.
        $this->assertSame(0, $turma->enrollments()->count());
    }
```

> `turmaAberta()` segue o helper que o próprio `ImportStudentsActionTest` já usa. O trait
> `BuildsRealUploads` entra no `use` da classe.

- [ ] **Step 5: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=ImportStudentsActionTest`
Expected: FAIL — `ImportStudentsAction::MAX_LINHAS` não existe.

- [ ] **Step 6: O teto do import, ANTES de matricular**

O `SpreadsheetRowReader` é um gerador consumido por um laço que escreve por linha — teto lá dentro
dispararia **no meio** do import, deixando parte das matrículas feitas. O teto tem de morder antes
de a primeira matrícula acontecer, então a leitura é materializada com o próprio teto como limite:
o laço para na linha `MAX_LINHAS + 1` e recusa, sem ter escrito nada.

```php
    /**
     * Teto de linhas por planilha. Turma real tem 8 a 15 alunos
     * (`OperationDemoSeeder`), então 500 é ~33× a maior. Sem ele, o único
     * limite era o tamanho do arquivo — um CSV de 10 MB passa de cem mil
     * linhas, e cada linha é uma transação de matrícula.
     */
    public const MAX_LINHAS = 500;

    public function execute(Turma $turma, UploadedFile $file): ImportResultData
    {
        // O gate fica no topo mesmo com o EnrollStudentAction gateando por
        // linha: recusar a planilha inteira de uma vez é a resposta certa, e
        // não é o mesmo que recusar 40 linhas uma a uma.
        $turma->assertAcademicallyWritable();

        // Materializa ANTES de matricular, e para de ler na primeira linha
        // acima do teto. O leitor é um gerador e o laço abaixo escreve por
        // linha: teto aplicado durante o laço recusaria a planilha DEPOIS de
        // já ter matriculado parte dela — o que não é recusa, é meia importação.
        // Memória: 500 linhas de quatro campos curtos, contra os 256M do pool.
        $linhas = [];

        foreach ($this->reader->rows($file) as $linha) {
            if (count($linhas) >= self::MAX_LINHAS) {
                throw ValidationException::withMessages([
                    'file' => 'La planilla supera el máximo de '.self::MAX_LINHAS.' filas. Divídala y vuelva a enviarla.',
                ]);
            }

            $linhas[] = $linha;
        }

        $created = $relinked = $already = 0;
        $moved = [];
        $errors = [];

        foreach ($linhas as $line) {
```

O resto do método fica **igual** — só o cabeçalho do laço muda de
`foreach ($this->reader->rows($file) as $line)` para `foreach ($linhas as $line)`.

- [ ] **Step 7: Rodar, ver passar e MEDIR o tempo real no teto**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan test --filter=BatchIssueTest
docker compose exec -T app php artisan test --filter=ImportStudentsActionTest
```

Expected: PASS nos dois.

A medição de duração é contra a API real e vai junto do DoD 6 (Task 12): um import de exatamente
`MAX_LINHAS` linhas e um lote de `MAX_ITENS` itens, cronometrados. Registre os dois tempos. Se
qualquer um passar de **30 s** — metade do timeout de dev —, o teto correspondente desce, e a nova
escolha entra no docblock com o tempo medido ao lado.

- [ ] **Step 8: Suíte inteira**

Run: `docker compose exec -T app php artisan test`
Expected: PASS.

- [ ] **Step 9: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint app/Domains/Certification/Data/BatchIssueData.php app/Domains/Operation/Actions/ImportStudentsAction.php tests/Feature/Certification/BatchIssueTest.php tests/Feature/Operation/ImportStudentsActionTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Certification/Data/BatchIssueData.php backend/app/Domains/Operation/Actions/ImportStudentsAction.php backend/tests
git commit -m "feat(api): teto de itens no lote de certificados e de linhas no import"
```

---

### Task 11: Confirmar o eixo ADR-11 — S3 privado e URL temporária

O `backlog.md` lista "S3 privado + URL temporária" no escopo do item 4. A medição mostra que já está
satisfeito: o disco `s3` não declara `visibility`, e `SignedUrlTransformer:37` assina toda leitura
com `temporaryUrl()`. Então é **confirmação, não trabalho** — mas confirmação que ninguém escreveu
não confirma nada, e um `'visibility' => 'public'` acrescentado por engano no `filesystems.php` não
teria hoje nada que reprovasse.

**Files:**
- Test: `backend/tests/Feature/Shared/PrivateStorageTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: nada em código.

- [ ] **Step 1: Escrever a confirmação**

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\Data\FileData;
use Tests\TestCase;

/**
 * Eixo "S3 privado + URL temporária" do item 4 do backlog (ADR-11). Medido em
 * 2026-08-25: já estava satisfeito. Este teste não constrói nada — ele impede
 * que deixe de estar sem ninguém perceber.
 */
class PrivateStorageTest extends TestCase
{
    public function test_o_disco_de_arquivos_nao_declara_visibilidade_publica(): void
    {
        foreach (['s3', 's3_public'] as $disco) {
            $config = config("filesystems.disks.{$disco}");

            if ($config === null) {
                continue;   // `s3_public` só existe quando AWS_ENDPOINT_PUBLIC está definido
            }

            $this->assertNotSame(
                'public',
                $config['visibility'] ?? null,
                implode("\n", [
                    "O disco `{$disco}` passou a gravar objeto público.",
                    'O ADR-11 diz o contrário: o binário NÃO é servido pela app nem pelo bucket —',
                    'o acesso é por URL pré-assinada temporária, e documento aqui tem peso legal.',
                ]),
            );
        }
    }

    public function test_a_url_de_leitura_do_dto_e_assinada_e_expira(): void
    {
        // O contrato do `FileData` é que `download_url` sai do
        // `SignedUrlTransformer`, e não o path cru. Ler o atributo do DTO é o
        // que prova isso sem depender de um bucket de verdade.
        $propriedade = new \ReflectionProperty(FileData::class, 'download_url');
        $atributos = $propriedade->getAttributes(\Spatie\LaravelData\Attributes\WithTransformer::class);

        $this->assertCount(1, $atributos, '`FileData::$download_url` perdeu o `WithTransformer` — a URL sairia crua.');
        $this->assertSame(
            \App\Shared\Files\Transformers\SignedUrlTransformer::class,
            $atributos[0]->getArguments()[0],
        );
        $this->assertGreaterThan(0, $atributos[0]->getArguments()[1], 'A expiração da URL assinada tem de ser positiva.');
    }
}
```

- [ ] **Step 2: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter=PrivateStorageTest`
Expected: PASS, 2 testes — verde na primeira corrida, porque o eixo já estava satisfeito.

- [ ] **Step 3: VER REPROVAR — sonda temporária**

```bash
cd /home/jvbat/projetos/lotus
# sonda: torna o disco s3 público
python3 - <<'PY'
import io
p = 'backend/config/filesystems.php'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""        's3' => [
            'driver' => 's3',""", """        's3' => [
            'visibility' => 'public',   // SONDA
            'driver' => 's3',""", 1)
io.open(p, 'w', encoding='utf-8').write(s)
PY
docker compose exec -T app php artisan test --filter=PrivateStorageTest
```

Expected: FAIL em `test_o_disco_de_arquivos_nao_declara_visibilidade_publica`.

- [ ] **Step 4: Reverter a sonda e confirmar a árvore limpa**

```bash
cd /home/jvbat/projetos/lotus
git checkout -- backend/config/filesystems.php
git status --short
docker compose exec -T app php artisan test --filter=PrivateStorageTest
```

Expected: `git status` sem `backend/config/filesystems.php`; o teste de volta verde.

- [ ] **Step 5: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint tests/Feature/Shared/PrivateStorageTest.php
cd /home/jvbat/projetos/lotus
git add backend/tests/Feature/Shared/PrivateStorageTest.php
git commit -m "test(files): confirma S3 privado e URL temporaria do ADR-11"
```

---

### Task 12: DoD contra a API real e gate de fechamento

A spec §7 é explícita: provado **contra a API real** em `:8080` e o banco de dev, **não pela
suíte**. Suíte verde prova que o código faz o que o teste diz; o DoD prova que o sistema montado faz
o que o requisito pede.

Dois avisos que mudam o procedimento e não podem ser descobertos no meio dele:

1. **Em dev, o IP de origem é o gateway do Docker para toda chamada vinda do host.** Medido:
   `172.20.0.1` do host, `172.20.0.7` de dentro do container `app`. Para provar chave por IP, use
   as duas origens — `curl` do host e `docker compose exec -T app curl http://nginx/...`. É a única
   forma honesta agora que o `X-Forwarded-For` é apagado na borda (Task 2), e é justamente o ponto:
   se dava para variar o IP com um header, o limitador não valia nada.
2. **O CSRF do Sanctum vale para tudo que não é `GET`.** Pegue o cookie e o token antes:
   `curl -c /tmp/lotus.jar http://localhost:8080/sanctum/csrf-cookie`, e depois mande
   `-b /tmp/lotus.jar -H "X-XSRF-TOKEN: <valor do cookie, urldecoded>"`.

**Files:** nenhum — esta task produz evidência, não código.

- [ ] **Step 1: Subir a stack e migrar**

```bash
cd /home/jvbat/projetos/lotus
docker compose up -d
until docker compose exec -T clamav /usr/local/bin/clamdcheck.sh >/dev/null 2>&1; do sleep 5; done
docker compose exec -T app php artisan migrate
```

Expected: o `migrate` roda a `2026_08_25_000001_backfill_files_mime` e **imprime a contagem**
(`N linhas lidas, M corrigidas, K sem objeto legível`). Anote os três números — são a evidência do
DoD 7.

- [ ] **Step 2: DoD 1 — login errado repetido devolve `429` legível, e a chave separa**

```bash
cd /home/jvbat/projetos/lotus
curl -s -c /tmp/lotus.jar http://localhost:8080/sanctum/csrf-cookie >/dev/null
TOKEN=$(python3 -c "import re,urllib.parse,io;print(urllib.parse.unquote([l.split()[-1] for l in io.open('/tmp/lotus.jar') if 'XSRF-TOKEN' in l][0]))")
for i in $(seq 1 7); do
  printf "tentativa %s -> " "$i"
  curl -s -o /tmp/resp.json -w "%{http_code}  Retry-After=%header{Retry-After}  Content-Type=%header{Content-Type}\n" \
    -b /tmp/lotus.jar -H "X-XSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' \
    -d '{"email":"admin@lotus.cl","password":"errada"}' http://localhost:8080/api/login
done
cat /tmp/resp.json
```

Expected: as 5 primeiras dão `422` (credencial inválida); a 6ª e a 7ª dão **`429`**, com
`Content-Type: application/problem+json` e um `Retry-After` numérico. O corpo traz
`"title":"Demasiadas solicitudes"` e `"type":"https://lotus.cl/errors/too-many-requests"`.

Depois, com o balde do e-mail já estourado, provar as duas metades da chave `email|ip` (D3):

```bash
# mesmo IP, OUTRO e-mail: tem de voltar a 422, não 429
curl -s -o /dev/null -w "outro email, mesmo ip -> %{http_code}\n" \
  -b /tmp/lotus.jar -H "X-XSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"outro@lotus.cl","password":"errada"}' http://localhost:8080/api/login

# mesmo e-mail, OUTRO IP (de dentro da rede do compose): tem de voltar a 422
docker compose exec -T app sh -c 'curl -s -o /dev/null -w "mesmo email, outro ip -> %{http_code}\n" \
  -H "Content-Type: application/json" -H "Referer: http://localhost:5173" \
  -d "{\"email\":\"admin@lotus.cl\",\"password\":\"errada\"}" http://nginx/api/login'
```

Expected: os dois devolvem `422`, não `429`. Se algum devolver `429`, a chave está errada e o D3 não
foi cumprido.

- [ ] **Step 3: DoD 2 — varredura do QR público é bloqueada, e o certificado válido segue abrindo**

```bash
cd /home/jvbat/projetos/lotus
UUID=$(docker compose exec -T app php artisan tinker --execute='echo App\Domains\Certification\Models\Certificate::query()->value("uuid");' | tr -d '\r\n')
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code} " "http://localhost:8080/api/publico/certificados/00000000-0000-4000-8000-00000000000$((i % 10))"
done; echo
curl -s -o /dev/null -w "\ncertificado real -> %{http_code}\n" "http://localhost:8080/api/publico/certificados/$UUID"
```

Expected: as primeiras 30 devolvem `404` (uuid inexistente) e as seguintes viram `429`. O
certificado real, **do mesmo IP**, também dará `429` — e é aqui que se decide se o número está
certo: espere um minuto e repita a última linha. Ela **tem** de devolver `200`. Rota de peso legal
não pode ficar inacessível a quem tem o papel na mão; se o balde não recuperar, o número sobe.

- [ ] **Step 4: DoD 3 e 4 — EICAR recusado, bucket sem objeto novo, e scanner parado também recusa**

```bash
cd /home/jvbat/projetos/lotus
# Contagem ANTES: a prova é a ausência no bucket, não a resposta HTTP
docker compose exec -T app php artisan tinker --execute='echo App\Shared\Files\Models\File::withTrashed()->count();'
printf 'X5O!P%%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > /tmp/eicar.pdf
```

Autentique como admin (login pelo SPA em `http://localhost:5173` ou pelo `curl` com CSRF do Step 2)
e suba `/tmp/eicar.pdf` em `POST /api/quotes/{quote}/files` com `type=quote_document`.

Expected: **`422`**, `application/problem+json`, `errors.file` com a mensagem de antivírus. Em
seguida, a contagem de `files` tem de estar **igual à de antes**, e o console do MinIO
(`http://localhost:9001`, `lotus`/`lotus-secret`) **sem objeto novo**.

Depois, o cenário D8:

```bash
docker compose stop clamav
# repita o mesmo upload, agora com um PDF legítimo
```

Expected: **`503`**, `application/problem+json`, com `Retry-After` e a mensagem de serviço
indisponível — **diferente** da mensagem de infecção. Nenhum objeto novo no bucket.

```bash
docker compose start clamav
until docker compose exec -T clamav /usr/local/bin/clamdcheck.sh >/dev/null 2>&1; do sleep 5; done
# o mesmo PDF legítimo agora tem de subir: 201
```

- [ ] **Step 5: DoD 5 — executável renomeado recusado, PDF legítimo aceito nos quatro que não tinham tipo**

```bash
cp /bin/sh /tmp/falso.pdf
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > /tmp/bom.pdf
```

Subir os dois em cada um dos quatro endpoints que até hoje aceitavam qualquer tipo:
`POST /api/profile/documents`, `POST /api/redatores/{redator}/documents`,
`POST /api/quotes/{quote}/files`, `POST /api/budgets/{budget}/files`.

Expected: `/tmp/falso.pdf` → `422` com `errors.file`; `/tmp/bom.pdf` → `201`. Repetir com
`POST /api/redatores` mandando `documents[CV]=/tmp/falso.pdf` — o sítio que **não tinha regra
nenhuma** — e conferir `422` com `errors["documents.CV"]`.

- [ ] **Step 6: DoD 6 — lote e import acima do teto recusam antes de escrever, e os dois no teto são cronometrados**

Mandar `POST /api/certificates/batch` com `MAX_ITENS + 1` ids e conferir `422` com
`errors.enrollment_ids`, sem nenhum certificado novo em `certificates`. Depois, um lote de
`MAX_ITENS` itens, cronometrado com `curl -w "%{time_total}"`.

Mandar um CSV de `MAX_LINHAS + 1` linhas para `POST /api/turmas/{turma}/alunos/importar` e conferir
`422` com `errors.file`, sem nenhuma matrícula nova. Depois, um de `MAX_LINHAS`, cronometrado.

Expected: as duas recusas em `422` e o banco intacto nas duas. **Anote os dois tempos.** Acima de
30 s, o teto correspondente desce, com o tempo medido escrito no docblock.

- [ ] **Step 7: DoD 7 — backfill medido**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan tinker --execute='
$disco = Storage::disk(config("filesystems.default"));
$tipos = Symfony\Component\Mime\MimeTypes::getDefault();
$divergentes = 0; $lidas = 0;
foreach (DB::table("files")->get() as $f) {
    if (! $disco->exists($f->path)) { continue; }
    $t = tempnam(sys_get_temp_dir(), "chk"); file_put_contents($t, $disco->get($f->path));
    $real = $tipos->guessMimeType($t); @unlink($t);
    $lidas++;
    if ($real !== null && $real !== $f->mime) { $divergentes++; echo "id={$f->id} banco={$f->mime} objeto={$real}\n"; }
}
echo "lidas={$lidas} divergentes={$divergentes}\n";
'
```

Expected: `divergentes=0` **depois** da migration. Compare com a contagem que o `migrate` imprimiu
no Step 1: `M corrigidas` antes, `0 divergentes` depois. Os dois números juntos são a evidência.

- [ ] **Step 8: DoD 8 — o fluxo normal inteiro, sem esbarrar em limite**

Pelo SPA em `http://localhost:5173`, na mesma sessão e sem esperar entre os passos: login → upload
de documento de turma → import de planilha no tamanho real (uma turma, 8 a 15 linhas) → emissão em
lote no tamanho real → download do PDF de um certificado → navegar por dashboard, turmas,
certificados e redatores.

Expected: **nenhum `429` em nenhum momento**. Um `429` aqui é falso positivo de throttle no uso
normal — o risco declarado na spec §8 — e o número do limitador que disparou sobe, com o passo que
o disparou registrado.

- [ ] **Step 9: DoD 9 — as duas catracas vistas reprovando**

Já feitas nos Steps 3-4 da Task 5 e da Task 7. Confirmar que a árvore está limpa:

Run: `git -C /home/jvbat/projetos/lotus status --short`
Expected: saída vazia.

- [ ] **Step 10: Gate**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan test
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/api/generated.ts
```

Expected: suíte **verde**; `git diff` do `generated.ts` **vazio** — nenhum DTO mudou de forma neste
bloco, e isso é medido, não suposto. Pint já rodou por task; conferir com
`cd backend && ./vendor/bin/pint --test <arquivos tocados>`.

- [ ] **Step 11: Registrar a evidência**

Escrever os números medidos (tempos do lote e do import, contagem do backfill, e qualquer limite que
tenha sido revisado) no corpo do PR. É o que o `/revisar-sprint` e o `/fechar-sprint` leem.

---

## Fora deste plano, e por quê

- **Persistir o PDF renderizado no S3** (spec D6) — vira ficha `D-*` no `/fechar-sprint`, com
  gatilho. Contenção não muda o que o documento significa; persistir mudaria.
- **Provisionamento AWS** — item 10. Este bloco só entrega a medição de 1,014 GiB do ClamAV como
  insumo.
- **Worker e fila** — o scan é síncrono justamente para não abrir essa frente (D1), e os 551 ms do
  pior caso mostram que não precisa.
- **`SpreadsheetRowReader` escolhe o leitor pela extensão declarada pelo cliente**
  (`getClientOriginalExtension()`), então um CSV chamado `.xlsx` entra no `XlsxReader` e estoura com
  erro do OpenSpout em vez de `422` limpo. Achado desta fase, pequeno e fora do escopo do item 4 —
  vai como ficha para o `/fechar-sprint`.
- **Correção da linha do `backlog.md`** que atribui o antimalware ao `RNF-SEC-06` — vai no
  `/fechar-sprint`, porque planejamento não edita a fila.
- **Retenção documental, PII e logs centralizados** (item 5); **N+1, índices e cache** (item 6).

---

## Handoff de execução

**executor: claude**

Não é tarefa mecânica de caminho fechado. Três razões, cada uma bastando sozinha:

1. **Toca lei do `CLAUDE.md` §5.** A §5.4 (erro sobe ao handler global RFC 7807) é o objeto direto
   das Tasks 1 e 9, e a decisão de `503` para scanner fora do ar contra `422` para arquivo
   infectado é julgamento sobre o que a lei quer dizer, não aplicação dela.
2. **O plano reverte um item aprovado da spec.** A Task 0 escreve a emenda de `trustProxies`, e
   quem executa precisa poder reabrir a conversa se a medição em outra máquina divergir.
3. **Três tetos ainda podem mudar durante a execução.** `MAX_ITENS`, `MAX_LINHAS` e os números dos
   limitadores têm gatilho explícito de revisão nos Steps 6 e 8 da Task 12. Trocar um número
   medido por outro medido é decisão, e a decisão precisa ficar escrita no docblock com o número ao
   lado.

Onde o Codex ajuda melhor neste bloco é **depois**: revisão independente do resultado, pelo
`/revisar-sprint`.

**Árvore:** main tree, por causa da P-03 (o compose monta a árvore principal). Branch
`feat/hardening-api-arquivos-e-abuso`, já criada a partir de `main@7fa1cb0a`.

**Ordem das tasks é dependência, não preferência.** A Task 1 vem primeiro porque todo DoD de
throttle lê os headers que ela repassa; a Task 2 vem antes das de limitador porque limitador por IP
sobre IP errado não limita nada; a Task 6 vem antes da 9 porque a regra de antivírus mora dentro da
peça de política.

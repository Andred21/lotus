# `hardening-i18n-e-erros-api` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** toda mensagem que a API do Lotus emite ao usuário sai de `lang/` e responde ao `Accept-Language`, com es-CL como fallback.

**Architecture:** um mecanismo só — `__('<dominio>.<agregado>.<motivo>')` resolvido no momento do `throw`, com os dicionários em `backend/lang/<locale>/<dominio>.php`. O transporte (`SetLocale` + header do axios) já existe e não se reescreve. Três locales: `en`, `es_CL`, `pt_BR`.

**Tech Stack:** Laravel 13 / PHP 8.3 · PHPUnit · `lang/` do Laravel · RFC 7807 via `App\Shared\Exceptions\ProblemDetails`.

**Spec:** [`specs/2026-08-29-hardening-i18n-e-erros-api-design.md`](../../specs/archive/2026-08-29-hardening-i18n-e-erros-api-design.md)

## Global Constraints

- **Locales suportados: exatamente `en`, `es_CL`, `pt_BR`.** Não crie, não mantenha e não repovoe `lang/es/` nem `lang/es.json` depois da Task 1.
- **Fallback é `es_CL`** (ADR-15). Vale para `.env.example`, `phpunit.xml` e para o que o `SetLocale` faz com header desconhecido.
- **Nenhuma mensagem ao usuário nasce literal em `app/`.** Toda string que pode chegar a uma resposta HTTP sai de `__()`.
- **Chave = `<arquivo>.<agregado>.<motivo>`**, minúscula, `snake_case`, sem acento. Ex.: `commercial.quote.approved_cannot_edit`.
- **Paridade total:** toda chave nova entra nos **três** arquivos de locale no mesmo commit. Chave em um locale só é falha da catraca da Task 1.
- **Nenhum campo de DTO nasce, muda de tipo ou sai.** `git diff main...HEAD -- frontend/src/shared/types/generated.ts` tem de ficar **vazio** no fechamento (lei §5.3 não é disparada).
- **Erros sobem ao handler global** (CLAUDE.md §5.4). Nunca `abort(422)`; nunca formatar envelope fora do `ProblemDetails`.
- **Backend roda no container:** `docker compose exec -T app php artisan test [--filter=X]`. **Pint roda no host, de dentro de `backend/`, sempre com argumentos:** `./vendor/bin/pint <arquivos>`.
- **Texto es-CL é a referência.** Onde a mensagem de hoje já está em espanhol, o valor de `es_CL` é **o texto de hoje, byte a byte** — o `pt_BR` e o `en` são traduções dele. Onde a mensagem de hoje está em português, o `pt_BR` recebe o texto de hoje e o `es_CL` é a tradução.

---

### Task 1: Fundação de locale — três dicionários, fallback es-CL e a catraca de paridade

**Files:**
- Delete: `backend/lang/es/` (8 arquivos), `backend/lang/es.json`
- Create: `backend/lang/es_CL.json` (conteúdo do antigo `backend/lang/es.json`)
- Modify: `backend/app/Shared/Http/Middleware/SetLocale.php:19`
- Modify: `backend/.env.example:15`
- Modify: `backend/phpunit.xml:21`
- Test: `backend/tests/Unit/Shared/LocaleParityTest.php` (criar)
- Test: `backend/tests/Feature/Shared/SetLocaleTest.php` (criar)

**Interfaces:**
- Consome: nada.
- Produz: `SetLocale::SUPPORTED === ['en', 'es_CL', 'pt_BR']`; a garantia, usada por toda task seguinte, de que uma chave só existe se existir nos três locales.

- [ ] **Step 1: Escrever o teste de paridade, que falha**

Criar `backend/tests/Unit/Shared/LocaleParityTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Os três locales do backend têm de carregar exatamente o mesmo conjunto de
 * chaves. Tradução faltando não se anuncia: o Laravel devolve a CHAVE quando
 * não acha o valor, e a resposta HTTP sai com `commercial.quote.x` no lugar da
 * frase. Por isso o teste recusa três coisas: chave a mais, chave a menos e
 * valor igual à própria chave.
 */
class LocaleParityTest extends TestCase
{
    private const LOCALES = ['en', 'es_CL', 'pt_BR'];

    /** @return array<string, string> chave achatada => valor */
    private function achatar(array $itens, string $prefixo = ''): array
    {
        $saida = [];
        foreach ($itens as $chave => $valor) {
            $completa = $prefixo === '' ? (string) $chave : $prefixo.'.'.$chave;
            if (is_array($valor)) {
                $saida += $this->achatar($valor, $completa);
            } else {
                $saida[$completa] = (string) $valor;
            }
        }

        return $saida;
    }

    /** @return array<string, string> */
    private function dicionario(string $locale): array
    {
        $saida = [];
        foreach (glob(lang_path($locale.'/*.php')) as $arquivo) {
            $nome = basename($arquivo, '.php');
            $saida += $this->achatar(require $arquivo, $nome);
        }
        $json = lang_path($locale.'.json');
        if (file_exists($json)) {
            $saida += $this->achatar(json_decode(file_get_contents($json), true) ?: [], 'json');
        }

        return $saida;
    }

    #[Test]
    public function os_tres_locales_tem_o_mesmo_conjunto_de_chaves(): void
    {
        $referencia = array_keys($this->dicionario('es_CL'));
        sort($referencia);

        foreach (self::LOCALES as $locale) {
            $chaves = array_keys($this->dicionario($locale));
            sort($chaves);

            $this->assertSame(
                $referencia,
                $chaves,
                "O locale {$locale} divergiu do es_CL. Faltando: "
                .implode(', ', array_diff($referencia, $chaves))
                .' | Sobrando: '.implode(', ', array_diff($chaves, $referencia))
            );
        }
    }

    #[Test]
    public function nenhum_valor_esta_vazio_ou_igual_a_propria_chave(): void
    {
        foreach (self::LOCALES as $locale) {
            foreach ($this->dicionario($locale) as $chave => $valor) {
                $this->assertNotSame('', trim($valor), "{$locale}: {$chave} está vazia.");
                $this->assertNotSame($chave, $valor, "{$locale}: {$chave} não foi traduzida.");
            }
        }
    }

    #[Test]
    public function o_espanhol_neutro_nao_existe_mais(): void
    {
        $this->assertDirectoryDoesNotExist(lang_path('es'));
        $this->assertFileDoesNotExist(lang_path('es.json'));
        $this->assertFileExists(lang_path('es_CL.json'));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=LocaleParityTest
```

Esperado: **FAIL** em `o_espanhol_neutro_nao_existe_mais` (`lang/es` ainda existe, `lang/es_CL.json` não existe).

- [ ] **Step 3: Mover o espanhol para `es_CL` e apagar o neutro**

```bash
cd backend
git mv lang/es.json lang/es_CL.json
git rm -r lang/es
```

`lang/es_CL/` já existe e é byte-idêntico ao que foi apagado — nada se copia de volta.

- [ ] **Step 4: Encolher `SUPPORTED`**

Em `backend/app/Shared/Http/Middleware/SetLocale.php:19`, trocar:

```php
    private const SUPPORTED = ['en', 'es', 'es_CL', 'pt_BR'];
```

por:

```php
    /**
     * Locales suportados — casam com os diretórios em lang/ e com os TRÊS do
     * front (`shared/config/i18n.ts`). `es` puro saiu em 2026-08-29: era
     * byte-idêntico ao `es_CL` e o Laravel não funde arquivo parcialmente, então
     * manter os dois significava duplicar 100% do conteúdo para sempre. Quem
     * mandar `Accept-Language: es` cai no fallback, que é es-CL (ADR-15).
     */
    private const SUPPORTED = ['en', 'es_CL', 'pt_BR'];
```

- [ ] **Step 5: Fixar o locale da configuração**

Em `backend/.env.example:15`, trocar `APP_FALLBACK_LOCALE=en` por:

```
APP_FALLBACK_LOCALE=es_CL
```

Em `backend/phpunit.xml`, logo após a linha `<env name="APP_ENV" value="testing"/>`, acrescentar:

```xml
        <env name="APP_LOCALE" value="es_CL"/>
        <env name="APP_FALLBACK_LOCALE" value="es_CL"/>
```

Sem isso a suíte herda o `.env` da máquina, que é gitignored: na CI ela roda em `en` e mede outra coisa.

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=LocaleParityTest
```

Esperado: **PASS**, 3 testes.

- [ ] **Step 7: Escrever o teste das bordas do `SetLocale`**

Criar `backend/tests/Feature/Shared/SetLocaleTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * As bordas do `Accept-Language` são comportamento DECLARADO (spec §4.5), não
 * acidente: sem header, com locale não suportado ou com `es` puro, a resposta
 * sai em es-CL. E o header é lido pelo PRIMEIRO item, sem negociar `q` — é o
 * que o middleware sempre fez, e agora está medido em vez de suposto.
 */
class SetLocaleTest extends TestCase
{
    /** @return array<string, array{string|null, string}> */
    public static function cabecalhos(): array
    {
        return [
            'sem header'          => [null, 'es_CL'],
            'es-CL'               => ['es-CL', 'es_CL'],
            'es-cl minusculo'     => ['es-cl', 'es_CL'],
            'pt-BR'               => ['pt-BR', 'pt_BR'],
            'en'                  => ['en', 'en'],
            'es puro cai no fallback' => ['es', 'es_CL'],
            'fr-FR cai no fallback'   => ['fr-FR', 'es_CL'],
            'primeiro item vence q'   => ['pt-BR;q=0.9,es', 'pt_BR'],
        ];
    }

    #[Test]
    #[DataProvider('cabecalhos')]
    public function o_locale_efetivo_sai_do_accept_language(?string $header, string $esperado): void
    {
        $headers = $header === null ? [] : ['Accept-Language' => $header];

        $this->withHeaders($headers)->getJson('/api/me')->assertUnauthorized();

        $this->assertSame($esperado, app()->getLocale());
    }
}
```

- [ ] **Step 8: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=SetLocaleTest
```

Esperado: **PASS**, 8 casos. Se `es puro cai no fallback` falhar com `es`, o Step 4 não foi aplicado.

- [ ] **Step 9: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: verde. Fixar `APP_LOCALE` pode revelar teste que passava por acidente do `.env` da máquina — se algum falhar, **anote o arquivo e a linha no commit** e conserte no lugar; não desfaça o Step 5.

- [ ] **Step 10: Commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Http/Middleware/SetLocale.php tests/Unit/Shared/LocaleParityTest.php tests/Feature/Shared/SetLocaleTest.php
cd .. && git add backend/lang backend/app/Shared/Http/Middleware/SetLocale.php backend/.env.example backend/phpunit.xml backend/tests/Unit/Shared/LocaleParityTest.php backend/tests/Feature/Shared/SetLocaleTest.php
git commit -m "feat(i18n): tres locales, fallback es-CL e a catraca de paridade"
```

---

### Task 2: O envelope RFC 7807 fala o idioma do request

Paga a `D-36` e a `P-61`, e o achado da spec §1 que não tinha ficha: o `detail` de 401/403/404 é `getMessage()` cru do framework, em inglês.

**Files:**
- Create: `backend/lang/es_CL/problem.php`, `backend/lang/pt_BR/problem.php`, `backend/lang/en/problem.php`
- Modify: `backend/app/Shared/Exceptions/ProblemDetails.php:22-36,60-88`
- Modify: `backend/tests/Feature/Operation/ManualTurmaTest.php:82`
- Test: `backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php` (criar)

**Interfaces:**
- Consome: a garantia de paridade da Task 1.
- Produz: as chaves `problem.title.{validation,unauthenticated,forbidden,not_found,http,too_many_requests,server}` e `problem.detail.{server,too_many_requests,unauthenticated,forbidden,not_found,generic}`, e a regra da D5 — **`detail` de `lang/` por TIPO de exceção**, nunca por inspeção do texto.

- [ ] **Step 1: Escrever o teste do envelope, que falha**

Criar `backend/tests/Feature/Shared/EnvelopeLocalizadoTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * A MESMA falha nos três locales: três envelopes distintos, nenhum devolvendo
 * chave crua e nenhum devolvendo inglês de framework quando o locale pedido não
 * é `en`. É o DoD do bloco expresso em teste — o que se prova no navegador
 * depois é este mesmo contrato contra a API real.
 */
class EnvelopeLocalizadoTest extends TestCase
{
    private const LOCALES = ['es-CL', 'pt-BR', 'en'];

    /** @return array<string, mixed> */
    private function envelope(string $locale, string $metodo, string $rota): array
    {
        return $this->withHeaders(['Accept-Language' => $locale])
            ->json($metodo, $rota)
            ->json();
    }

    #[Test]
    public function o_401_tem_title_e_detail_localizados_e_distintos_por_locale(): void
    {
        $titulos = [];
        $detalhes = [];

        foreach (self::LOCALES as $locale) {
            $corpo = $this->envelope($locale, 'GET', '/api/me');
            $titulos[] = $corpo['title'];
            $detalhes[] = $corpo['detail'];

            $this->assertStringNotContainsString('problem.', $corpo['title']);
            $this->assertStringNotContainsString('problem.', $corpo['detail']);
        }

        $this->assertCount(3, array_unique($titulos), 'Os três locales devolveram o mesmo title.');
        $this->assertCount(3, array_unique($detalhes), 'Os três locales devolveram o mesmo detail.');
    }

    #[Test]
    public function o_403_nao_devolve_mais_a_mensagem_em_ingles_do_framework(): void
    {
        $redator = User::factory()->redator()->create();

        foreach (['es-CL', 'pt-BR'] as $locale) {
            $corpo = $this->actingAs($redator)
                ->withHeaders(['Accept-Language' => $locale])
                ->json('GET', '/api/users')
                ->json();

            $this->assertSame(403, $corpo['status']);
            $this->assertNotSame('This action is unauthorized.', $corpo['detail']);
            $this->assertStringNotContainsString('unauthorized', strtolower($corpo['detail']));
        }
    }

    #[Test]
    public function o_404_e_o_500_mascarado_saem_no_locale_pedido(): void
    {
        $titulos404 = [];
        foreach (self::LOCALES as $locale) {
            $corpo = $this->envelope($locale, 'GET', '/api/turmas/999999');
            $this->assertSame(404, $corpo['status']);
            $titulos404[] = $corpo['title'];
        }
        $this->assertCount(3, array_unique($titulos404));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=EnvelopeLocalizadoTest
```

Esperado: **FAIL** — os três locales devolvem o mesmo `title` em português.

- [ ] **Step 3: Criar os três `problem.php`**

`backend/lang/es_CL/problem.php`:

```php
<?php

declare(strict_types=1);

return [
    'title' => [
        'validation'        => 'Error de validación',
        'unauthenticated'   => 'No autenticado',
        'forbidden'         => 'Acceso denegado',
        'not_found'         => 'Recurso no encontrado',
        'http'              => 'Error en la solicitud',
        'too_many_requests' => 'Demasiadas solicitudes',
        'server'            => 'Error interno',
    ],
    'detail' => [
        'server'            => 'Ocurrió un error inesperado. Vuelva a intentarlo.',
        'too_many_requests' => 'Demasiadas solicitudes. Espere unos segundos y vuelva a intentarlo.',
        'unauthenticated'   => 'Debe iniciar sesión para continuar.',
        'forbidden'         => 'No tiene permiso para realizar esta acción.',
        'not_found'         => 'El recurso solicitado no existe.',
        'generic'           => 'No fue posible procesar la solicitud.',
    ],
];
```

`backend/lang/pt_BR/problem.php`:

```php
<?php

declare(strict_types=1);

return [
    'title' => [
        'validation'        => 'Erro de validação',
        'unauthenticated'   => 'Não autenticado',
        'forbidden'         => 'Acesso negado',
        'not_found'         => 'Recurso não encontrado',
        'http'              => 'Erro na requisição',
        'too_many_requests' => 'Muitas solicitações',
        'server'            => 'Erro interno',
    ],
    'detail' => [
        'server'            => 'Ocorreu um erro inesperado. Tente novamente.',
        'too_many_requests' => 'Muitas solicitações. Aguarde alguns segundos e tente novamente.',
        'unauthenticated'   => 'É preciso entrar para continuar.',
        'forbidden'         => 'Você não tem permissão para esta ação.',
        'not_found'         => 'O recurso solicitado não existe.',
        'generic'           => 'Não foi possível processar a requisição.',
    ],
];
```

`backend/lang/en/problem.php`:

```php
<?php

declare(strict_types=1);

return [
    'title' => [
        'validation'        => 'Validation error',
        'unauthenticated'   => 'Not authenticated',
        'forbidden'         => 'Access denied',
        'not_found'         => 'Resource not found',
        'http'              => 'Request error',
        'too_many_requests' => 'Too many requests',
        'server'            => 'Internal error',
    ],
    'detail' => [
        'server'            => 'An unexpected error occurred. Please try again.',
        'too_many_requests' => 'Too many requests. Wait a few seconds and try again.',
        'unauthenticated'   => 'You must sign in to continue.',
        'forbidden'         => 'You do not have permission for this action.',
        'not_found'         => 'The requested resource does not exist.',
        'generic'           => 'The request could not be processed.',
    ],
];
```

- [ ] **Step 4: Trocar os `title` literais**

Em `backend/app/Shared/Exceptions/ProblemDetails.php`, o `match` passa a:

```php
        [$status, $title, $type] = match (true) {
            $e instanceof ValidationException => [422, __('problem.title.validation'), 'https://lotus.cl/errors/validation'],
            $e instanceof AuthenticationException => [401, __('problem.title.unauthenticated'), 'https://lotus.cl/errors/unauthenticated'],
            $e instanceof AuthorizationException => [403, __('problem.title.forbidden'), 'https://lotus.cl/errors/forbidden'],
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException => [404, __('problem.title.not_found'), 'https://lotus.cl/errors/not-found'],
            $e instanceof ThrottleRequestsException => [429, __('problem.title.too_many_requests'), 'https://lotus.cl/errors/too-many-requests'],
            $e instanceof HttpExceptionInterface => [$e->getStatusCode(), __('problem.title.http'), 'https://lotus.cl/errors/http'],
            default => [500, __('problem.title.server'), 'https://lotus.cl/errors/server'],
        };
```

As URLs de `type` **não** mudam: são identificador estável, não texto de tela.

- [ ] **Step 5: Reescrever o `detailFor` com a regra por TIPO**

Substituir o corpo de `detailFor` por:

```php
    /**
     * Em 500 sem debug, não vaza mensagem interna. Nos demais, mostra a
     * mensagem — mas só quando a mensagem é NOSSA.
     *
     * A regra é por TIPO de exceção, não por inspeção do texto (spec D5):
     * adivinhar se uma string "parece do framework" seria heurística sobre
     * conteúdo. As exceções que o Laravel levanta com texto próprio em inglês
     * (`This action is unauthorized.`) passam a ter `detail` de `lang/`.
     *
     * Duas portas continuam com o `detail` próprio, e são as duas em que
     * alguém escreveu a frase para quem lê a resposta: `ValidationException`
     * (o `getMessage()` é a primeira mensagem de campo, já localizada no
     * `throw`) e quem implementa `PublicDetail` — sem ela o operador em
     * produção recebe "erro inesperado" onde o desenho prometeu o certificado
     * e o campo que falta.
     */
    private static function detailFor(Throwable $e, int $status): string
    {
        if ($status === 500 && ! config('app.debug') && ! $e instanceof PublicDetail) {
            return __('problem.detail.server');
        }

        if ($e instanceof PublicDetail || $e instanceof ValidationException) {
            return $e->getMessage() ?: __('problem.detail.generic');
        }

        return match (true) {
            $e instanceof ThrottleRequestsException => __('problem.detail.too_many_requests'),
            $e instanceof AuthenticationException => __('problem.detail.unauthenticated'),
            $e instanceof AuthorizationException => __('problem.detail.forbidden'),
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException => __('problem.detail.not_found'),
            default => $e->getMessage() ?: __('problem.detail.generic'),
        };
    }
```

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=EnvelopeLocalizadoTest
```

Esperado: **PASS**, 3 testes.

- [ ] **Step 7: Corrigir a asserção de teste que casava o `title` literal**

Em `backend/tests/Feature/Operation/ManualTurmaTest.php:82`, trocar:

```php
            ->assertJsonPath('title', 'Erro interno')
```

por:

```php
            ->assertJsonPath('title', __('problem.title.server'))
```

- [ ] **Step 8: Rodar a suíte e commitar**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint app/Shared/Exceptions/ProblemDetails.php lang/es_CL/problem.php lang/pt_BR/problem.php lang/en/problem.php tests/Feature/Shared/EnvelopeLocalizadoTest.php tests/Feature/Operation/ManualTurmaTest.php
cd .. && git add backend/lang backend/app/Shared/Exceptions/ProblemDetails.php backend/tests
git commit -m "feat(i18n): o envelope RFC 7807 fala o idioma do request (D-36, P-61)"
```

---

### Task 3: `shared.php` — arquivo, planilha e antivírus

**Files:**
- Create: `backend/lang/{es_CL,pt_BR,en}/shared.php`
- Modify: `backend/app/Shared/Files/ContentClass.php:121-126`
- Modify: `backend/app/Shared/Files/ScannerUnavailableException.php:26-32`
- Modify: `backend/app/Domains/Operation/Services/SpreadsheetRowReader.php:42,59`
- Test: `backend/tests/Feature/Shared/MensagemDeArquivoLocalizadaTest.php` (criar)

**Interfaces:**
- Consome: paridade da Task 1.
- Produz: `shared.file.set_too_large` (`:max`), `shared.file.scanner_unavailable`, `shared.spreadsheet.unsupported_format`, `shared.spreadsheet.too_many_rows` (`:max`).

- [ ] **Step 1: Escrever o teste, que falha**

Criar `backend/tests/Feature/Shared/MensagemDeArquivoLocalizadaTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeArquivoLocalizadaTest extends TestCase
{
    #[Test]
    public function a_planilha_em_formato_errado_recusa_no_locale_pedido(): void
    {
        app()->setLocale('pt_BR');
        $ptBR = __('shared.spreadsheet.unsupported_format');

        app()->setLocale('es_CL');
        $esCL = __('shared.spreadsheet.unsupported_format');

        $this->assertNotSame($ptBR, $esCL);
        $this->assertStringNotContainsString('shared.', $esCL);
    }

    #[Test]
    public function o_teto_de_linhas_interpola_o_numero_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            $this->assertStringContainsString('100', __('shared.spreadsheet.too_many_rows', ['max' => 100]));
        }
    }

    #[Test]
    public function o_teto_do_conjunto_interpola_os_MB_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            $this->assertStringContainsString('10', __('shared.file.set_too_large', ['max' => 10]));
        }
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeArquivoLocalizadaTest
```

Esperado: **FAIL** — `__()` devolve a própria chave, então `assertNotSame` reprova.

- [ ] **Step 3: Criar os três `shared.php`**

`backend/lang/es_CL/shared.php`:

```php
<?php

declare(strict_types=1);

return [
    'file' => [
        'set_too_large'       => 'El conjunto de archivos supera el máximo de :max MB. Envíelos en solicitudes separadas.',
        'scanner_unavailable' => 'El servicio de antivirus no está disponible. El archivo no fue guardado; intente nuevamente en unos minutos.',
    ],
    'spreadsheet' => [
        'unsupported_format' => 'Formato no soportado — envíe xlsx o csv.',
        'too_many_rows'      => 'La planilla supera el máximo de :max filas. Divídala y vuelva a enviarla.',
    ],
];
```

`backend/lang/pt_BR/shared.php`:

```php
<?php

declare(strict_types=1);

return [
    'file' => [
        'set_too_large'       => 'O conjunto de arquivos passa do máximo de :max MB. Envie-os em requisições separadas.',
        'scanner_unavailable' => 'O serviço de antivírus está indisponível. O arquivo não foi salvo; tente de novo em alguns minutos.',
    ],
    'spreadsheet' => [
        'unsupported_format' => 'Formato não suportado — envie xlsx ou csv.',
        'too_many_rows'      => 'A planilha passa do máximo de :max linhas. Divida-a e envie de novo.',
    ],
];
```

`backend/lang/en/shared.php`:

```php
<?php

declare(strict_types=1);

return [
    'file' => [
        'set_too_large'       => 'The file set exceeds the maximum of :max MB. Send them in separate requests.',
        'scanner_unavailable' => 'The antivirus service is unavailable. The file was not saved; try again in a few minutes.',
    ],
    'spreadsheet' => [
        'unsupported_format' => 'Unsupported format — send xlsx or csv.',
        'too_many_rows'      => 'The spreadsheet exceeds the maximum of :max rows. Split it and send it again.',
    ],
];
```

- [ ] **Step 4: Trocar os três sítios**

Em `backend/app/Shared/Files/ContentClass.php`, o par de linhas 123-125 vira uma só:

```php
                $campo => __('shared.file.set_too_large', ['max' => $tetoEmMb]),
```

Se o nome da variável do teto local não for `$tetoEmMb`, use o identificador que já existe naquele escopo — **não** recalcule o número.

Em `backend/app/Shared/Files/ScannerUnavailableException.php`, o construtor vira:

```php
    public function __construct(?\Throwable $previous = null)
    {
        parent::__construct(
            30,
            __('shared.file.scanner_unavailable'),
            $previous,
        );
    }
```

Em `backend/app/Domains/Operation/Services/SpreadsheetRowReader.php:42`:

```php
                'file' => __('shared.spreadsheet.unsupported_format'),
```

e `:59`:

```php
                            'file' => __('shared.spreadsheet.too_many_rows', ['max' => $maxLinhas]),
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeArquivoLocalizadaTest
docker compose exec -T app php artisan test --filter=LocaleParityTest
```

Esperado: **PASS** nos dois.

- [ ] **Step 6: Commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Files/ContentClass.php app/Shared/Files/ScannerUnavailableException.php app/Domains/Operation/Services/SpreadsheetRowReader.php lang/es_CL/shared.php lang/pt_BR/shared.php lang/en/shared.php tests/Feature/Shared/MensagemDeArquivoLocalizadaTest.php
cd .. && git add backend/lang backend/app backend/tests
git commit -m "feat(i18n): arquivo, planilha e antivirus saem de lang/"
```

---

### Task 4: `commercial.php` — as cinco recusas do Comercial e o contato obrigatório

**Files:**
- Create: `backend/lang/{es_CL,pt_BR,en}/commercial.php`
- Modify: `backend/app/Domains/Commercial/Models/Client.php:144`
- Modify: `backend/app/Domains/Commercial/Actions/DeleteBudgetAction.php:20`
- Modify: `backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php:25`
- Modify: `backend/app/Domains/Commercial/Actions/UpdateQuoteAction.php:21`
- Modify: `backend/app/Domains/Commercial/Actions/RestoreQuoteAction.php:66`
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php:43,92-93`
- Test: `backend/tests/Feature/Commercial/MensagemComercialLocalizadaTest.php` (criar)

**Interfaces:**
- Consome: paridade da Task 1.
- Produz: `commercial.client.archived`, `commercial.client.contact_required`, `commercial.budget.approved_cannot_delete`, `commercial.quote.approved_cannot_delete`, `commercial.quote.approved_cannot_edit`, `commercial.quote.budget_archived`.

- [ ] **Step 1: Escrever o teste, que falha**

Criar `backend/tests/Feature/Commercial/MensagemComercialLocalizadaTest.php`:

```php
<?php

namespace Tests\Feature\Commercial;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Cinco recusas do Comercial escreviam literal — quatro em PORTUGUÊS, num
 * produto es-CL (D-07). O teste não repete as frases: mede que existem três
 * traduções distintas e que nenhuma delas é a chave crua.
 */
class MensagemComercialLocalizadaTest extends TestCase
{
    private const CHAVES = [
        'commercial.client.archived',
        'commercial.client.contact_required',
        'commercial.budget.approved_cannot_delete',
        'commercial.quote.approved_cannot_delete',
        'commercial.quote.approved_cannot_edit',
        'commercial.quote.budget_archived',
    ];

    #[Test]
    public function cada_recusa_tem_tres_traducoes_distintas(): void
    {
        foreach (self::CHAVES as $chave) {
            $valores = [];
            foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
                app()->setLocale($locale);
                $valor = __($chave);
                $this->assertNotSame($chave, $valor, "{$chave} não existe em {$locale}.");
                $valores[] = $valor;
            }
            $this->assertCount(3, array_unique($valores), "{$chave} repete texto entre locales.");
        }
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=MensagemComercialLocalizadaTest
```

Esperado: **FAIL** — `commercial.client.archived não existe em es_CL`.

- [ ] **Step 3: Criar os três `commercial.php`**

`backend/lang/es_CL/commercial.php`:

```php
<?php

declare(strict_types=1);

return [
    'client' => [
        'archived'         => 'Este cliente fue archivado y ya no acepta cambios.',
        'contact_required' => 'El cliente necesita al menos un contacto.',
    ],
    'budget' => [
        'approved_cannot_delete' => 'Un presupuesto con cotización aprobada no puede eliminarse. Rechácela antes.',
    ],
    'quote' => [
        'approved_cannot_delete' => 'Una cotización aprobada no puede eliminarse. Rechácela antes.',
        'approved_cannot_edit'   => 'Una cotización aprobada no puede editarse.',
        'budget_archived'        => 'El presupuesto de esta cotización está archivado: restáuralo primero.',
    ],
];
```

`backend/lang/pt_BR/commercial.php`:

```php
<?php

declare(strict_types=1);

return [
    'client' => [
        'archived'         => 'Este cliente foi arquivado e não aceita mais alterações.',
        'contact_required' => 'O cliente precisa de ao menos um contato.',
    ],
    'budget' => [
        'approved_cannot_delete' => 'Orçamento com cotação aprovada não pode ser excluído. Recuse-a antes.',
    ],
    'quote' => [
        'approved_cannot_delete' => 'Cotação aprovada não pode ser excluída. Recuse-a antes.',
        'approved_cannot_edit'   => 'Cotação aprovada não pode ser editada.',
        'budget_archived'        => 'O orçamento desta cotação está arquivado: restaure-o primeiro.',
    ],
];
```

`backend/lang/en/commercial.php`:

```php
<?php

declare(strict_types=1);

return [
    'client' => [
        'archived'         => 'This client was archived and no longer accepts changes.',
        'contact_required' => 'The client needs at least one contact.',
    ],
    'budget' => [
        'approved_cannot_delete' => 'A budget with an approved quote cannot be deleted. Reject it first.',
    ],
    'quote' => [
        'approved_cannot_delete' => 'An approved quote cannot be deleted. Reject it first.',
        'approved_cannot_edit'   => 'An approved quote cannot be edited.',
        'budget_archived'        => 'The budget of this quote is archived: restore it first.',
    ],
];
```

- [ ] **Step 4: Trocar os cinco sítios**

```php
// Client.php:144
                'client' => __('commercial.client.archived'),

// DeleteBudgetAction.php:20
                'status' => __('commercial.budget.approved_cannot_delete'),

// DeleteQuoteAction.php:25
                'status' => __('commercial.quote.approved_cannot_delete'),

// UpdateQuoteAction.php:21
                'status' => __('commercial.quote.approved_cannot_edit'),

// RestoreQuoteAction.php:66
                    'quote' => __('commercial.quote.budget_archived'),
```

- [ ] **Step 5: Matar a constante `CONTATO_OBRIGATORIO`**

A constante é literal compartilhada por três sítios (`ClientData.php:92,93` e os dois `withMessages` de `CreateClientAction.php:40` e `DeleteClientContactAction.php:47`) — o `__()` já é o ponto único, então a constante perde a razão de existir.

Em `backend/app/Domains/Commercial/Data/ClientData.php`, remover a linha 43 (`public const CONTATO_OBRIGATORIO = ...`) e trocar o `messages()`:

```php
            'contacts.min'   => __('commercial.client.contact_required'),
            'contacts.array' => __('commercial.client.contact_required'),
```

Em `backend/app/Domains/Commercial/Actions/CreateClientAction.php:40` e `backend/app/Domains/Commercial/Actions/DeleteClientContactAction.php:47`:

```php
                'contacts' => __('commercial.client.contact_required'),
```

Remover o `use App\Domains\Commercial\Data\ClientData;` dos dois Actions **somente se** nada mais no arquivo usar `ClientData` — confira com `grep -n ClientData <arquivo>` antes de apagar o import.

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=MensagemComercialLocalizadaTest
docker compose exec -T app php artisan test --filter=Commercial
```

Esperado: **PASS** nos dois.

- [ ] **Step 7: Commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial lang/es_CL/commercial.php lang/pt_BR/commercial.php lang/en/commercial.php tests/Feature/Commercial/MensagemComercialLocalizadaTest.php
cd .. && git add backend/lang backend/app/Domains/Commercial backend/tests
git commit -m "feat(i18n): as recusas do Comercial saem de lang/ (D-07)"
```

---

### Task 5: `operation.php` — as cinco recusas de turma e os rótulos de documento

Paga a `D-58` (`Turma::concluir` em espanhol fixo) e prepara os rótulos que a Task 8 consome.

**Files:**
- Create: `backend/lang/{es_CL,pt_BR,en}/operation.php`
- Modify: `backend/app/Domains/Operation/Models/Turma.php:200,252`
- Modify: `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php:34`
- Modify: `backend/app/Domains/Operation/Actions/RestoreTurmaAction.php:81,88`
- Modify (asserção): `backend/tests/Feature/Operation/{EnrollmentApiTest.php:155,EnrollmentResultTest.php:145,TurmaCrudTest.php:184,TurmaCrudTest.php:191,TurmaArchiveCascadeTest.php:113,EnrollmentArchiveEndpointTest.php:144,TurmaDesignationTest.php:195,TurmaDesignationTest.php:202,TurmaDesignationTest.php:226,ConcludeTurmaTest.php:123}`
- Test: `backend/tests/Feature/Operation/MensagemDeTurmaLocalizadaTest.php` (criar)

**Interfaces:**
- Consome: paridade da Task 1.
- Produz: `operation.turma.{concluded_locked,archived,restore_conflict,restore_redator_archived,documents_incomplete}` (a última com `:tipos`) e o mapa `operation.document_type.{MANUAL,PRUEBAS,EVALUACION_REDATOR}`, consumido pela Task 8.

- [ ] **Step 1: Escrever o teste, que falha**

Criar `backend/tests/Feature/Operation/MensagemDeTurmaLocalizadaTest.php`:

```php
<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Enums\TurmaDocumentType;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeTurmaLocalizadaTest extends TestCase
{
    #[Test]
    public function a_recusa_de_turma_concluida_tem_tres_traducoes(): void
    {
        $valores = [];
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            $valor = __('operation.turma.concluded_locked');
            $this->assertNotSame('operation.turma.concluded_locked', $valor);
            $valores[] = $valor;
        }
        $this->assertCount(3, array_unique($valores));
    }

    #[Test]
    public function a_lista_de_documentos_faltantes_chega_traduzida_e_nao_como_codigo(): void
    {
        app()->setLocale('es_CL');

        $rotulos = array_map(
            fn (TurmaDocumentType $t) => __('operation.document_type.'.$t->value),
            [TurmaDocumentType::MANUAL, TurmaDocumentType::EVALUACION_REDATOR],
        );

        $frase = __('operation.turma.documents_incomplete', ['tipos' => implode(', ', $rotulos)]);

        $this->assertStringNotContainsString('EVALUACION_REDATOR', $frase);
        $this->assertStringContainsString('Manual', $frase);
    }

    #[Test]
    public function todo_tipo_de_documento_de_turma_tem_rotulo_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (TurmaDocumentType::cases() as $tipo) {
                $chave = 'operation.document_type.'.$tipo->value;
                $this->assertNotSame($chave, __($chave), "{$chave} falta em {$locale}.");
            }
        }
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeTurmaLocalizadaTest
```

Esperado: **FAIL** nos três casos.

- [ ] **Step 3: Criar os três `operation.php`**

`backend/lang/es_CL/operation.php`:

```php
<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked'         => 'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
        'archived'                 => 'Esta clase fue archivada y ya no acepta cambios.',
        'restore_conflict'         => 'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
        'restore_redator_archived' => 'Un redactor de esta clase está archivado: restáuralo antes de restaurar la clase.',
        'documents_incomplete'     => 'Documentación obligatoria incompleta (RN-16). Falta: :tipos.',
    ],
    'document_type' => [
        'MANUAL'             => 'Manual',
        'PRUEBAS'            => 'Pruebas',
        'EVALUACION_REDATOR' => 'Evaluación del relator',
    ],
];
```

`backend/lang/pt_BR/operation.php`:

```php
<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked'         => 'A turma já foi concluída: o registro acadêmico está bloqueado (RN-15).',
        'archived'                 => 'Esta turma foi arquivada e não aceita mais alterações.',
        'restore_conflict'         => 'Já existe uma turma ativa para esta cotação: arquive-a antes de restaurar esta.',
        'restore_redator_archived' => 'Um redator desta turma está arquivado: restaure-o antes de restaurar a turma.',
        'documents_incomplete'     => 'Documentação obrigatória incompleta (RN-16). Falta: :tipos.',
    ],
    'document_type' => [
        'MANUAL'             => 'Manual',
        'PRUEBAS'            => 'Provas',
        'EVALUACION_REDATOR' => 'Avaliação do redator',
    ],
];
```

`backend/lang/en/operation.php`:

```php
<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked'         => 'The class has already been concluded: the academic record is locked (RN-15).',
        'archived'                 => 'This class was archived and no longer accepts changes.',
        'restore_conflict'         => 'An active class already exists for this quote: archive it before restoring this one.',
        'restore_redator_archived' => 'An instructor of this class is archived: restore them before restoring the class.',
        'documents_incomplete'     => 'Required documentation incomplete (RN-16). Missing: :tipos.',
    ],
    'document_type' => [
        'MANUAL'             => 'Manual',
        'PRUEBAS'            => 'Tests',
        'EVALUACION_REDATOR' => 'Instructor evaluation',
    ],
];
```

- [ ] **Step 4: Trocar os cinco sítios**

```php
// Turma.php:200
                'turma' => __('operation.turma.concluded_locked'),

// Turma.php:252
                'turma' => __('operation.turma.archived'),

// RestoreTurmaAction.php:81
                    'turma' => __('operation.turma.restore_conflict'),

// RestoreTurmaAction.php:88
                    'turma' => __('operation.turma.restore_redator_archived'),
```

Em `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php:34`, a concatenação vira interpolação **com o rótulo traduzido**, não o código do enum:

```php
                    'documents' => __('operation.turma.documents_incomplete', [
                        'tipos' => implode(', ', array_map(
                            fn (array $doc): string => __('operation.document_type.'.$doc['value']),
                            $missing,
                        )),
                    ]),
```

Se `$missing` não for `array<array{value: string}>` naquele escopo, ajuste o `fn` para extrair o `value` da forma que o código já usa em `array_column($missing, 'value')` — **o dado é o mesmo**, só o mapeamento muda.

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeTurmaLocalizadaTest
```

Esperado: **PASS**, 3 testes.

- [ ] **Step 6: Realinhar as dez asserções que casavam a frase literal**

Em cada um dos sítios listados em **Files**, trocar a string literal pela chave. Nas nove ocorrências de `'La clase ya fue concluida: el registro académico está bloqueado (RN-15).'`:

```php
                __('operation.turma.concluded_locked'),
```

Em `backend/tests/Feature/Operation/ConcludeTurmaTest.php:123`, a frase carrega a lista — passa a:

```php
                __('operation.turma.documents_incomplete', [
                    'tipos' => __('operation.document_type.MANUAL'),
                ]),
```

- [ ] **Step 7: Rodar toda a Operação e commitar**

```bash
docker compose exec -T app php artisan test --filter=Operation
cd backend && ./vendor/bin/pint app/Domains/Operation lang/es_CL/operation.php lang/pt_BR/operation.php lang/en/operation.php tests/Feature/Operation
cd .. && git add backend/lang backend/app/Domains/Operation backend/tests/Feature/Operation
git commit -m "feat(i18n): as recusas de turma saem de lang/ (D-07, D-58)"
```

---

### Task 6: `identity.php` — treze mensagens sob `errors.*` e os rótulos de documento de relator

`identity.php` **já existe** nos três locales e serve os e-mails de convite e reset. As mensagens novas entram sob a chave `errors`, sem tocar no que já está lá.

**Files:**
- Modify: `backend/lang/{es_CL,pt_BR,en}/identity.php`
- Modify: `backend/app/Domains/Identity/Services/StudentResolver.php:37,43,56,107,118`
- Modify: `backend/app/Domains/Identity/Services/SuperadminGuard.php:50`
- Modify: `backend/app/Domains/Identity/Models/Redator.php:132`
- Modify: `backend/app/Domains/Identity/Actions/ArchiveRedatorAction.php:50`
- Modify: `backend/app/Domains/Identity/Actions/CreateRoleAction.php:23`
- Modify: `backend/app/Domains/Identity/Actions/UpdateRoleAction.php:29`
- Modify: `backend/app/Domains/Identity/Actions/CreateStaffUserAction.php:26`
- Modify: `backend/app/Domains/Identity/Actions/CreateStudentAction.php:34,44`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php:109,116,126`
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php:116`
- Test: `backend/tests/Feature/Identity/MensagemDeIdentidadeLocalizadaTest.php` (criar)

**Interfaces:**
- Consome: paridade da Task 1.
- Produz: `identity.errors.*` (13 chaves) e `identity.document_type.{CV,REUF,TITULO,POSTGRADO}`, consumido pela Task 8.

- [ ] **Step 1: Escrever o teste, que falha**

Criar `backend/tests/Feature/Identity/MensagemDeIdentidadeLocalizadaTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\RedatorDocumentType;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeIdentidadeLocalizadaTest extends TestCase
{
    private const CHAVES = [
        'identity.errors.rut_invalid',
        'identity.errors.rut_wrong_type',
        'identity.errors.student_email_required',
        'identity.errors.student_client_required',
        'identity.errors.student_client_not_found',
        'identity.errors.staff_password_required',
        'identity.errors.role_name_taken',
        'identity.errors.last_superadmin',
        'identity.errors.redator_archived',
        'identity.errors.redator_has_active_turmas',
        'identity.errors.documents_shape',
        'identity.errors.document_type_invalid',
        'identity.errors.permission_invalid',
    ];

    #[Test]
    public function as_treze_mensagens_existem_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (self::CHAVES as $chave) {
                $this->assertNotSame($chave, __($chave), "{$chave} falta em {$locale}.");
            }
        }
    }

    #[Test]
    public function o_tipo_de_documento_invalido_interpola_o_codigo_recebido(): void
    {
        app()->setLocale('es_CL');
        $frase = __('identity.errors.document_type_invalid', ['tipo' => 'XPTO']);

        $this->assertStringContainsString('XPTO', $frase);
    }

    #[Test]
    public function todo_documento_de_relator_tem_rotulo_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (RedatorDocumentType::cases() as $tipo) {
                $chave = 'identity.document_type.'.$tipo->value;
                $this->assertNotSame($chave, __($chave), "{$chave} falta em {$locale}.");
            }
        }
    }

    #[Test]
    public function o_bloco_de_email_continua_intacto(): void
    {
        app()->setLocale('es_CL');
        $this->assertNotSame('identity.invitation.subject', __('identity.invitation.subject'));
        $this->assertNotSame('identity.reset.subject', __('identity.reset.subject'));
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeIdentidadeLocalizadaTest
```

Esperado: **FAIL** — `identity.errors.rut_invalid falta em es_CL`. O quarto teste (`o_bloco_de_email_continua_intacto`) já passa: é a sonda de que nada do que existia foi perdido.

- [ ] **Step 3: Acrescentar os blocos a `identity.php`**

Em `backend/lang/es_CL/identity.php`, acrescentar ao array de retorno (sem remover nada):

```php
    'errors' => [
        'rut_invalid'               => 'RUT inválido.',
        'rut_wrong_type'            => 'Este RUT pertenece a un usuario de otro tipo.',
        'student_email_required'    => 'El correo es obligatorio para un alumno nuevo.',
        'student_client_required'   => 'El cliente es obligatorio al registrar un alumno.',
        'student_client_not_found'  => 'Cliente no encontrado.',
        'staff_password_required'   => 'La contraseña es obligatoria.',
        'role_name_taken'           => 'Ya existe un rol con ese nombre.',
        'last_superadmin'           => 'No es posible dejar el sistema sin un superadministrador activo.',
        'redator_archived'          => 'Este relator fue archivado y ya no acepta cambios.',
        'redator_has_active_turmas' => 'El relator tiene clases en curso: concluye o reasigna antes de archivarlo.',
        'documents_shape'           => 'El campo documents debe ser un mapa de tipo a archivo.',
        'document_type_invalid'     => 'Tipo de documento inválido: :tipo',
        'permission_invalid'        => 'Permiso inválido o no asignable a un rol personalizado.',
    ],
    'document_type' => [
        'CV'        => 'Currículum',
        'REUF'      => 'REUF',
        'TITULO'    => 'Título',
        'POSTGRADO' => 'Posgrado',
    ],
```

Em `backend/lang/pt_BR/identity.php`:

```php
    'errors' => [
        'rut_invalid'               => 'RUT inválido.',
        'rut_wrong_type'            => 'Este RUT pertence a um usuário de outro tipo.',
        'student_email_required'    => 'E-mail é obrigatório para aluno novo.',
        'student_client_required'   => 'O cliente é obrigatório no cadastro do aluno.',
        'student_client_not_found'  => 'Cliente não encontrado.',
        'staff_password_required'   => 'A senha é obrigatória.',
        'role_name_taken'           => 'Já existe uma role com esse nome.',
        'last_superadmin'           => 'Não é possível deixar o sistema sem superadmin ativo.',
        'redator_archived'          => 'Este redator foi arquivado e não aceita mais alterações.',
        'redator_has_active_turmas' => 'O redator tem turmas em curso: conclua ou reatribua antes de arquivá-lo.',
        'documents_shape'           => 'O campo documents deve ser um mapa de tipo para arquivo.',
        'document_type_invalid'     => 'Tipo de documento inválido: :tipo',
        'permission_invalid'        => 'Permissão inválida ou não atribuível a uma role customizada.',
    ],
    'document_type' => [
        'CV'        => 'Currículo',
        'REUF'      => 'REUF',
        'TITULO'    => 'Diploma',
        'POSTGRADO' => 'Pós-graduação',
    ],
```

Em `backend/lang/en/identity.php`:

```php
    'errors' => [
        'rut_invalid'               => 'Invalid RUT.',
        'rut_wrong_type'            => 'This RUT belongs to a user of another type.',
        'student_email_required'    => 'E-mail is required for a new student.',
        'student_client_required'   => 'The client is required when registering a student.',
        'student_client_not_found'  => 'Client not found.',
        'staff_password_required'   => 'The password is required.',
        'role_name_taken'           => 'A role with this name already exists.',
        'last_superadmin'           => 'The system cannot be left without an active superadmin.',
        'redator_archived'          => 'This instructor was archived and no longer accepts changes.',
        'redator_has_active_turmas' => 'The instructor has ongoing classes: conclude or reassign before archiving.',
        'documents_shape'           => 'The documents field must be a map of type to file.',
        'document_type_invalid'     => 'Invalid document type: :tipo',
        'permission_invalid'        => 'Invalid permission, or not assignable to a custom role.',
    ],
    'document_type' => [
        'CV'        => 'Résumé',
        'REUF'      => 'REUF',
        'TITULO'    => 'Degree',
        'POSTGRADO' => 'Postgraduate',
    ],
```

- [ ] **Step 4: Trocar os treze sítios**

```php
// StudentResolver.php:37 e :107
            throw ValidationException::withMessages(['rut' => __('identity.errors.rut_invalid')]);

// StudentResolver.php:43 e :118
                'rut' => __('identity.errors.rut_wrong_type'),

// StudentResolver.php:56
                        'email' => __('identity.errors.student_email_required'),

// SuperadminGuard.php:50
                'role' => __('identity.errors.last_superadmin'),

// Redator.php:132
                'redator' => __('identity.errors.redator_archived'),

// ArchiveRedatorAction.php:50
                    'redator' => __('identity.errors.redator_has_active_turmas'),

// CreateRoleAction.php:23 e UpdateRoleAction.php:29
                throw ValidationException::withMessages(['name' => __('identity.errors.role_name_taken')]);

// CreateStaffUserAction.php:26
            throw ValidationException::withMessages(['password' => __('identity.errors.staff_password_required')]);

// CreateStudentAction.php:34
                    'client_id' => __('identity.errors.student_client_required'),

// CreateStudentAction.php:44
                    'client_id' => __('identity.errors.student_client_not_found'),

// RedatorController.php:109 e :126
                'documents' => __('identity.errors.documents_shape'),

// RedatorController.php:116
                    'documents' => __('identity.errors.document_type_invalid', ['tipo' => $type]),

// PermissionCatalog.php:116
                'permissions' => __('identity.errors.permission_invalid'),
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeIdentidadeLocalizadaTest
docker compose exec -T app php artisan test --filter=Identity
```

Esperado: **PASS** nos dois.

- [ ] **Step 6: Commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity lang/es_CL/identity.php lang/pt_BR/identity.php lang/en/identity.php tests/Feature/Identity/MensagemDeIdentidadeLocalizadaTest.php
cd .. && git add backend/lang backend/app/Domains/Identity backend/tests/Feature/Identity
git commit -m "feat(i18n): as mensagens de identidade saem de lang/ (D-07)"
```

---

### Task 7: `certification.php` — as duas recusas do documento de peso legal

**Files:**
- Create: `backend/lang/{es_CL,pt_BR,en}/certification.php`
- Modify: `backend/app/Domains/Certification/Actions/BatchIssueCertificatesAction.php:70`
- Modify: `backend/app/Domains/Certification/Actions/RevokeCertificateAction.php:18`
- Modify (asserção): `backend/tests/Feature/Certification/RevokeCertificateTest.php:85`
- Test: `backend/tests/Feature/Certification/MensagemDeCertificadoLocalizadaTest.php` (criar)

**Interfaces:**
- Consome: paridade da Task 1.
- Produz: `certification.certificate.already_revoked`, `certification.enrollment.not_found`.

- [ ] **Step 1: Escrever o teste, que falha**

Criar `backend/tests/Feature/Certification/MensagemDeCertificadoLocalizadaTest.php`:

```php
<?php

namespace Tests\Feature\Certification;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeCertificadoLocalizadaTest extends TestCase
{
    #[Test]
    public function as_duas_recusas_tem_tres_traducoes_distintas(): void
    {
        foreach (['certification.certificate.already_revoked', 'certification.enrollment.not_found'] as $chave) {
            $valores = [];
            foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
                app()->setLocale($locale);
                $valor = __($chave);
                $this->assertNotSame($chave, $valor, "{$chave} falta em {$locale}.");
                $valores[] = $valor;
            }
            $this->assertCount(3, array_unique($valores), "{$chave} repete texto entre locales.");
        }
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=MensagemDeCertificadoLocalizadaTest
```

Esperado: **FAIL**.

- [ ] **Step 3: Criar os três `certification.php`**

`backend/lang/es_CL/certification.php`:

```php
<?php

declare(strict_types=1);

return [
    'certificate' => [
        'already_revoked' => 'El certificado ya fue revocado.',
    ],
    'enrollment' => [
        'not_found' => 'La matrícula no existe.',
    ],
];
```

`backend/lang/pt_BR/certification.php`:

```php
<?php

declare(strict_types=1);

return [
    'certificate' => [
        'already_revoked' => 'O certificado já foi revogado.',
    ],
    'enrollment' => [
        'not_found' => 'A matrícula não existe.',
    ],
];
```

`backend/lang/en/certification.php`:

```php
<?php

declare(strict_types=1);

return [
    'certificate' => [
        'already_revoked' => 'The certificate has already been revoked.',
    ],
    'enrollment' => [
        'not_found' => 'The enrollment does not exist.',
    ],
];
```

- [ ] **Step 4: Trocar os dois sítios e a asserção**

```php
// BatchIssueCertificatesAction.php:70
                    'enrollment' => __('certification.enrollment.not_found'),

// RevokeCertificateAction.php:18
                    'certificate' => __('certification.certificate.already_revoked'),

// tests/Feature/Certification/RevokeCertificateTest.php:85
            ->assertJsonPath('errors.certificate.0', __('certification.certificate.already_revoked'));
```

- [ ] **Step 5: Rodar e commitar**

```bash
docker compose exec -T app php artisan test --filter=Certification
cd backend && ./vendor/bin/pint app/Domains/Certification lang/es_CL/certification.php lang/pt_BR/certification.php lang/en/certification.php tests/Feature/Certification
cd .. && git add backend/lang backend/app/Domains/Certification backend/tests/Feature/Certification
git commit -m "feat(i18n): as recusas de certificado saem de lang/ (D-07)"
```

---

### Task 8: `dashboard.php` — as treze descrições e o fim do código de enum na frase

Paga a `D-18` e a `D-38`, executando a **D1 da spec** (que derruba a D1 de 2026-08-22).

**Files:**
- Create: `backend/lang/{es_CL,pt_BR,en}/dashboard.php`
- Modify: `backend/app/Domains/Dashboard/Services/AdminDashboardAssembler.php:147`
- Modify: `backend/app/Domains/Dashboard/Services/CertificationMetricsQuery.php:40,77,78`
- Modify: `backend/app/Domains/Dashboard/Services/CommercialMetricsQuery.php:48,64`
- Modify: `backend/app/Domains/Dashboard/Services/IdentityMetricsQuery.php:55,56`
- Modify: `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php:128,137,146`
- Modify: `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php:149,150`
- Modify: `backend/app/Domains/Dashboard/Data/DashboardFilterData.php:26`
- Test: `backend/tests/Feature/Dashboard/DescricaoLocalizadaTest.php` (criar)

**Interfaces:**
- Consome: `operation.document_type.*` (Task 5) e `identity.document_type.*` (Task 6).
- Produz: `dashboard.pending.*`, `dashboard.alert.*`, `dashboard.filter.inverted_period`. Nenhum campo de DTO muda: `description` continua `string`.

- [ ] **Step 1: Escrever o teste, que falha**

Criar `backend/tests/Feature/Dashboard/DescricaoLocalizadaTest.php`:

```php
<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Identity\Enums\RedatorDocumentType;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * A D-38 media UM sítio (`OperationMetricsQuery`); a varredura de 2026-08-29
 * achou QUATRO frases interpolando o código do enum cru. O teste guarda os
 * quatro: nenhuma descrição pode conter `EVALUACION_REDATOR`, `POSTGRADO` e
 * companhia depois deste bloco.
 */
class DescricaoLocalizadaTest extends TestCase
{
    private const CHAVES = [
        'dashboard.pending.quote_pending_approval',
        'dashboard.pending.quote_without_turma',
        'dashboard.pending.turma_without_redator',
        'dashboard.pending.turma_docs_incomplete',
        'dashboard.pending.turma_awaiting_conclusion',
        'dashboard.pending.turma_overdue',
        'dashboard.pending.certificates_pending',
        'dashboard.alert.certificate_expired',
        'dashboard.alert.certificate_expiring',
        'dashboard.alert.redator_document_expired',
        'dashboard.alert.redator_document_expiring',
        'dashboard.alert.document_expired',
        'dashboard.alert.document_expiring',
        'dashboard.filter.inverted_period',
    ];

    #[Test]
    public function as_catorze_descricoes_existem_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (self::CHAVES as $chave) {
                $this->assertNotSame($chave, __($chave, ['tipo' => 'X', 'tipos' => 'X']), "{$chave} falta em {$locale}.");
            }
        }
    }

    #[Test]
    public function a_descricao_de_documento_usa_rotulo_e_nao_codigo_de_enum(): void
    {
        app()->setLocale('es_CL');

        $frase = __('dashboard.alert.redator_document_expired', [
            'tipo' => __('identity.document_type.'.RedatorDocumentType::POSTGRADO->value),
        ]);

        $this->assertStringNotContainsString('POSTGRADO', $frase);
        $this->assertStringContainsString('Posgrado', $frase);
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=DescricaoLocalizadaTest
```

Esperado: **FAIL**.

- [ ] **Step 3: Criar os três `dashboard.php`**

`backend/lang/es_CL/dashboard.php`:

```php
<?php

declare(strict_types=1);

return [
    'pending' => [
        'quote_pending_approval'    => 'Cotización pendiente de aprobación.',
        'quote_without_turma'       => 'Cotización aprobada sin clase configurada.',
        'turma_without_redator'     => 'Clase sin relator designado.',
        'turma_docs_incomplete'     => 'Documentación obligatoria incompleta: :tipos.',
        'turma_awaiting_conclusion' => 'Clase habilitada pendiente de confirmación de conclusión.',
        'turma_overdue'             => 'Clase con fecha de término vencida y aún en curso.',
        'certificates_pending'      => 'Clase concluida con matrículas aprobadas pendientes de certificado.',
    ],
    'alert' => [
        'certificate_expired'       => 'Certificado vencido.',
        'certificate_expiring'      => 'Certificado próximo a vencer.',
        'redator_document_expired'  => 'Documento :tipo de relator vencido.',
        'redator_document_expiring' => 'Documento :tipo de relator próximo a vencer.',
        'document_expired'          => 'Documento :tipo vencido.',
        'document_expiring'         => 'Documento :tipo próximo a vencer.',
    ],
    'filter' => [
        'inverted_period' => 'La fecha de término no puede ser anterior a la de inicio.',
    ],
];
```

`backend/lang/pt_BR/dashboard.php`:

```php
<?php

declare(strict_types=1);

return [
    'pending' => [
        'quote_pending_approval'    => 'Cotação pendente de aprovação.',
        'quote_without_turma'       => 'Cotação aprovada sem turma configurada.',
        'turma_without_redator'     => 'Turma sem redator designado.',
        'turma_docs_incomplete'     => 'Documentação obrigatória incompleta: :tipos.',
        'turma_awaiting_conclusion' => 'Turma habilitada aguardando confirmação de conclusão.',
        'turma_overdue'             => 'Turma com data de término vencida e ainda em curso.',
        'certificates_pending'      => 'Turma concluída com matrículas aprovadas pendentes de certificado.',
    ],
    'alert' => [
        'certificate_expired'       => 'Certificado vencido.',
        'certificate_expiring'      => 'Certificado próximo do vencimento.',
        'redator_document_expired'  => 'Documento :tipo do redator vencido.',
        'redator_document_expiring' => 'Documento :tipo do redator próximo do vencimento.',
        'document_expired'          => 'Documento :tipo vencido.',
        'document_expiring'         => 'Documento :tipo próximo do vencimento.',
    ],
    'filter' => [
        'inverted_period' => 'A data de término não pode ser anterior à de início.',
    ],
];
```

`backend/lang/en/dashboard.php`:

```php
<?php

declare(strict_types=1);

return [
    'pending' => [
        'quote_pending_approval'    => 'Quote pending approval.',
        'quote_without_turma'       => 'Approved quote without a configured class.',
        'turma_without_redator'     => 'Class without an assigned instructor.',
        'turma_docs_incomplete'     => 'Required documentation incomplete: :tipos.',
        'turma_awaiting_conclusion' => 'Enabled class awaiting conclusion confirmation.',
        'turma_overdue'             => 'Class past its end date and still ongoing.',
        'certificates_pending'      => 'Concluded class with approved enrollments pending certificates.',
    ],
    'alert' => [
        'certificate_expired'       => 'Certificate expired.',
        'certificate_expiring'      => 'Certificate expiring soon.',
        'redator_document_expired'  => 'Instructor :tipo document expired.',
        'redator_document_expiring' => 'Instructor :tipo document expiring soon.',
        'document_expired'          => ':tipo document expired.',
        'document_expiring'         => ':tipo document expiring soon.',
    ],
    'filter' => [
        'inverted_period' => 'The end date cannot be earlier than the start date.',
    ],
];
```

- [ ] **Step 4: Trocar os treze sítios**

```php
// AdminDashboardAssembler.php:147
                description: __('dashboard.pending.turma_overdue'),

// CertificationMetricsQuery.php:40
                description: __('dashboard.pending.certificates_pending'),

// CertificationMetricsQuery.php:77-78
                    description: $expired
                        ? __('dashboard.alert.certificate_expired')
                        : __('dashboard.alert.certificate_expiring'),

// CommercialMetricsQuery.php:48
                description: __('dashboard.pending.quote_pending_approval'),

// CommercialMetricsQuery.php:64
                description: __('dashboard.pending.quote_without_turma'),

// IdentityMetricsQuery.php:55-56
                    description: $expired
                        ? __('dashboard.alert.redator_document_expired', ['tipo' => __('identity.document_type.'.$document->type)])
                        : __('dashboard.alert.redator_document_expiring', ['tipo' => __('identity.document_type.'.$document->type)]),

// OperationMetricsQuery.php:128
                    __('dashboard.pending.turma_without_redator'),

// OperationMetricsQuery.php:137
                    __('dashboard.pending.turma_docs_incomplete', [
                        'tipos' => implode(', ', array_map(
                            fn (array $tipo): string => __('operation.document_type.'.$tipo['value']),
                            $status->missingTypes(),
                        )),
                    ]),

// OperationMetricsQuery.php:146
                    __('dashboard.pending.turma_awaiting_conclusion'),

// RedatorScopeQuery.php:149-150
                        ? __('dashboard.alert.document_expired', ['tipo' => __('identity.document_type.'.$document->type)])
                        : __('dashboard.alert.document_expiring', ['tipo' => __('identity.document_type.'.$document->type)]),
```

Se `$document->type` já for um enum (e não `string`), use `$document->type->value` — confira com `grep -n 'type' backend/app/Shared/Files/File.php` antes de escrever, e siga o que o cast do model diz.

Em `backend/app/Domains/Dashboard/Data/DashboardFilterData.php`, remover a constante `PERIODO_INVERTIDO` da linha 26 e trocar cada uso dela por `__('dashboard.filter.inverted_period')`. Ache os usos com:

```bash
grep -rn "PERIODO_INVERTIDO" backend/app backend/tests
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=DescricaoLocalizadaTest
docker compose exec -T app php artisan test --filter=Dashboard
```

Esperado: **PASS** nos dois. Se algum teste de Dashboard casava a frase literal, troque a asserção pela chave, no molde da Task 5 Step 6.

- [ ] **Step 6: Provar que `generated.ts` não se moveu**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/types/generated.ts
```

Esperado: **saída vazia**. Se houver diff, algum DTO mudou de forma — pare e reporte: a spec §4.4 promete o contrário.

- [ ] **Step 7: Commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Dashboard lang/es_CL/dashboard.php lang/pt_BR/dashboard.php lang/en/dashboard.php tests/Feature/Dashboard
cd .. && git add backend/lang backend/app/Domains/Dashboard backend/tests/Feature/Dashboard
git commit -m "feat(i18n): as descricoes do Dashboard saem de lang/ (D-18, D-38)"
```

---

### Task 9: A catraca que impede o 42º sítio de nascer errado

Só agora — antes disso a régua reprovaria por causa dos sítios que as tasks anteriores ainda não tinham limpado.

**Files:**
- Test: `backend/tests/Unit/Shared/MensagemLiteralTest.php` (criar)
- Modify: `.claude/rules/backend-ddd.md`

**Interfaces:**
- Consome: todos os sítios já limpos pelas Tasks 3 a 8.
- Produz: a garantia estática de que nenhum `withMessages` e nenhum braço do `ProblemDetails` volta a carregar literal.

- [ ] **Step 1: Escrever a catraca**

Criar `backend/tests/Unit/Shared/MensagemLiteralTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Mensagem ao usuário não nasce literal em `app/`.
 *
 * A régua é estática de propósito: o teste comportamental prova o que EXISTE,
 * e esta prova o que NÃO PODE existir. Sem ela, o 42º `withMessages` nasce em
 * português num produto es-CL e ninguém vê até o cliente ver — foi exatamente
 * assim que a D-07 chegou a 41 sítios.
 */
class MensagemLiteralTest extends TestCase
{
    /** @return list<string> */
    private function arquivosPhp(string $diretorio): array
    {
        $saida = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(base_path($diretorio)));
        foreach ($it as $arquivo) {
            if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                $saida[] = $arquivo->getPathname();
            }
        }

        return $saida;
    }

    #[Test]
    public function nenhum_withMessages_carrega_texto_literal(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp('app') as $caminho) {
            $linhas = file($caminho);
            foreach ($linhas as $i => $linha) {
                if (! str_contains($linha, 'withMessages')) {
                    continue;
                }

                $bloco = implode('', array_slice($linhas, $i, 8));

                // Um par `'campo' => '<texto com espaço>'` é mensagem escrita à
                // mão. Chave de tradução não tem espaço; `__(...)` não casa.
                if (preg_match("/'[a-z_]+'\s*=>\s*['\"][^'\"]*\s[^'\"]*['\"]/", $bloco)) {
                    $ofensores[] = basename($caminho).':'.($i + 1);
                }
            }
        }

        $this->assertSame([], $ofensores, "Mensagem literal em withMessages: \n".implode("\n", $ofensores));
    }

    #[Test]
    public function o_problem_details_nao_tem_texto_literal(): void
    {
        $fonte = file_get_contents(base_path('app/Shared/Exceptions/ProblemDetails.php'));

        // Só as linhas de código: docblock e comentário podem citar texto.
        $codigo = preg_replace('#/\*.*?\*/|//[^\n]*#s', '', $fonte);

        $this->assertDoesNotMatchRegularExpression(
            "/(?:title|detail)['\"]?\s*(?:=>|:)\s*['\"][^'\"]*\s[^'\"]*['\"]/",
            $codigo,
            'O ProblemDetails voltou a escrever texto literal.'
        );
    }
}
```

- [ ] **Step 2: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=MensagemLiteralTest
```

Esperado: **PASS**, 2 testes. Se reprovar, um sítio das Tasks 3 a 8 ficou para trás — o nome do arquivo e a linha estão na mensagem.

- [ ] **Step 3: Sonda negativa — ver a catraca morder**

Reintroduzir um literal temporariamente:

```bash
sed -i "s|'certificate' => __('certification.certificate.already_revoked')|'certificate' => 'El certificado ya fue revocado.'|" backend/app/Domains/Certification/Actions/RevokeCertificateAction.php
docker compose exec -T app php artisan test --filter=MensagemLiteralTest
```

Esperado: **FAIL** nomeando `RevokeCertificateAction.php:18`.

Desfazer:

```bash
git checkout -- backend/app/Domains/Certification/Actions/RevokeCertificateAction.php
docker compose exec -T app php artisan test --filter=MensagemLiteralTest
```

Esperado: **PASS**. Registre no corpo do commit as duas saídas — a régua vale porque foi vista reprovar.

- [ ] **Step 4: Escrever a regra**

Em `.claude/rules/backend-ddd.md`, acrescentar uma seção:

```markdown
## Mensagem ao usuário sai de `lang/`, nunca do código

Toda string que pode chegar a uma resposta HTTP — `ValidationException::withMessages`,
`title`/`detail` do `ProblemDetails`, `description` do Dashboard, mensagem de exceção
`PublicDetail` — vem de `__('<dominio>.<agregado>.<motivo>')`, com o dicionário em
`backend/lang/<locale>/<dominio>.php` e paridade nos três locales (`en`, `es_CL`, `pt_BR`).

**Catraca:** `tests/Unit/Shared/MensagemLiteralTest.php` (nenhum literal) e
`tests/Unit/Shared/LocaleParityTest.php` (mesmas chaves nos três, nenhum valor igual à chave).

**Razão:** o produto é para o cliente chileno e a `D-07` chegou a 41 sítios porque cada
domínio escreveu no idioma de quem estava ali — `Commercial` em português, `Operation` em
espanhol, e o usuário lendo um ou outro conforme o endpoint.
```

- [ ] **Step 5: Commit**

```bash
cd backend && ./vendor/bin/pint tests/Unit/Shared/MensagemLiteralTest.php
cd .. && git add backend/tests/Unit/Shared/MensagemLiteralTest.php .claude/rules/backend-ddd.md
git commit -m "test(i18n): catraca contra mensagem literal, vista reprovar"
```

---

### Task 10: O docblock do front que descreve um débito já pago

O comportamento **não** muda (spec D4). Só o texto que explica por que ele existe.

**Files:**
- Modify: `frontend/src/shared/lib/screenDetail.ts:1-20`
- Modify: `docs/adrs.md` (emenda datada ao ADR-15)
- Modify: `docs/superpowers/pendencias/abertas.md` (acrescentar ficha)

- [ ] **Step 1: Reescrever o docblock**

Em `frontend/src/shared/lib/screenDetail.ts`, o parágrafo que hoje começa em "O `detail` do servidor não é apresentável hoje" passa a:

```typescript
/**
 * O `detail` que pode ir à tela — e só vai o que o FRONT escreveu.
 *
 * **A razão original foi paga e esta política sobreviveu a ela.** O
 * `ProblemDetails` do backend devolvia `title` e `detail` literais em
 * português; desde o bloco `hardening-i18n-e-erros-api` (2026-08-29) o
 * envelope inteiro sai de `lang/` e responde ao `Accept-Language`. O que
 * ainda não foi decidido é se o `detail` do SERVIDOR deve substituir a dica
 * do i18n em erro de CARGA — é mudança de política de tela, não de backend, e
 * está registrada como pendência própria.
 *
 * Os envelopes que o PRÓPRIO front sintetiza (rede caída, corpo não-parseável)
 * seguem indo à tela: eles já são i18n e dizem coisa distinta da dica genérica
 * — `common.unexpectedErrorHint` é "não deu para processar a resposta", que o
 * `common.loadErrorHint` ("verifique sua conexão") não diz.
 *
 * **A exceção declarada é uma só:** o `CertificateViewDialog` imprime o `detail`
 * cru, porque `CorruptedSnapshotException` implementa `PublicDetail` de
 * propósito para o suporte descobrir QUAIS campos do snapshot faltam (D8 da
 * spec de certificação). Ele não chama esta função, e isso está comentado lá.
 */
```

- [ ] **Step 2: Abrir a ficha**

Em `docs/superpowers/pendencias/abertas.md`, acrescentar (usando o próximo número livre — confira o maior `P-NN` do arquivo antes de escrever):

```markdown
## P-NN — o `screenDetail` continua calando o `detail` do servidor depois que ele passou a ser localizado

**Bloco:** `hardening-i18n-e-erros-api` (D4 da spec de 2026-08-29) ·
**Gatilho:** próximo bloco da frente de frontend que tocar política de erro de tela.
Revisar em **2026-11-30**.

`frontend/src/shared/lib/screenDetail.ts` devolve `undefined` para todo envelope que não seja
sintetizado pelo próprio front, então erro de CARGA (GET) mostra a dica genérica do i18n em vez do
que o servidor disse. A razão escrita era que o `ProblemDetails` respondia em português fixo — isso
acabou: o envelope inteiro sai de `lang/` e responde ao `Accept-Language`.

**Por que não foi virado junto:** o item 7 é da frente Backend. Virar a chave exige garantir que
nenhuma mensagem de exceção não prevista chegue à tela, o que transforma um bloco de backend em
backend+frontend. Decisão do João em 2026-08-29.

**DoD de quem pegar:** um GET que falha com 403 e outro com 404 mostram, na tela, a mensagem
localizada do servidor, nos três locales — e um 500 continua mostrando a dica genérica.
```

- [ ] **Step 3: Registrar a emenda datada no ADR-15**

O ADR-15 descreve o back como "`lang/` do Laravel cobre só as mensagens que a API emite" e não
nomeia o conjunto de locales do backend. Esse conjunto acabou de mudar. Em `docs/adrs.md`, ao fim
da seção `## ADR-15`, antes da `**Nota:**`, acrescentar:

```markdown
**Emenda (2026-08-29, bloco `hardening-i18n-e-erros-api`).** O backend passa a suportar **três**
locales — `en`, `es_CL`, `pt_BR` —, os mesmos três do front. O `lang/es/` saiu: era byte-idêntico ao
`lang/es_CL/` nos oito arquivos, e como o Laravel não funde arquivo de tradução parcialmente, chave
ausente em `es_CL` cai no `fallback_locale` e nunca em `es` — manter os dois só funcionaria
duplicando 100% do conteúdo para sempre. `Accept-Language: es` passa a cair no fallback es-CL, que
este ADR já fixava. `APP_FALLBACK_LOCALE` passa a `es_CL` no `.env.example` e no `phpunit.xml`, que
não o fixava e deixava a suíte herdar o `.env` gitignored da máquina.
```

- [ ] **Step 4: Verificar o front e commitar**

```bash
cd frontend && pnpm lint && pnpm build
cd .. && git add frontend/src/shared/lib/screenDetail.ts docs/superpowers/pendencias docs/adrs.md
git commit -m "docs(i18n): emenda do ADR-15 e o docblock de um debito ja pago"
```

---

### Task 11: DoD end-to-end contra a API real

Build verde não é DoD (CLAUDE.md §5.8). Esta task **não** escreve código de produção; ela mede.

**Files:**
- Create: `docs/superpowers/audits/2026-08-29-hardening-i18n-e-erros-api-medicoes.md`

- [ ] **Step 1: Subir a stack e autenticar**

```bash
docker compose up -d
curl -s -c /tmp/lotus.jar http://localhost:8080/sanctum/csrf-cookie -o /dev/null -w '%{http_code}\n'
```

Esperado: `204`.

```bash
TOKEN=$(grep XSRF-TOKEN /tmp/lotus.jar | cut -f7 | python3 -c 'import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))')
curl -s -b /tmp/lotus.jar -c /tmp/lotus.jar -X POST http://localhost:8080/api/login \
  -H "X-XSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"admin@lotus.cl","password":"password"}' -w '\n%{http_code}\n'
```

Esperado: `200`. Se a senha do seed for outra, use a de `backend/database/seeders`.

- [ ] **Step 2: DoD 1 — a mesma recusa de domínio nos três locales**

Escolha uma turma concluída e tente alterar o registro acadêmico dela. Para cada locale:

```bash
for L in es-CL pt-BR en; do
  echo "== $L"
  curl -s -b /tmp/lotus.jar -H "Accept-Language: $L" -H "X-XSRF-TOKEN: $TOKEN" \
    -X PUT http://localhost:8080/api/turmas/<ID_CONCLUIDA> \
    -H 'Content-Type: application/json' -d '{"start_date":"2026-01-01"}' \
    | python3 -m json.tool | grep -E '"title"|"detail"|registro|record|registro'
done
```

Esperado: três textos distintos, `title` e `detail` **no mesmo idioma** em cada resposta.

- [ ] **Step 3: DoD 2 — o 403 não fala mais inglês**

Autentique como redator (ou use um endpoint que o admin não pode) e repita nos três locales:

```bash
for L in es-CL pt-BR en; do
  curl -s -b /tmp/redator.jar -H "Accept-Language: $L" http://localhost:8080/api/users \
    | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["status"], d["title"], "|", d["detail"])'
done
```

Esperado: nenhuma linha contém `This action is unauthorized.`.

- [ ] **Step 4: DoD 3 — 404, 422, 429 e 500 mascarado**

```bash
for L in es-CL pt-BR en; do
  curl -s -b /tmp/lotus.jar -H "Accept-Language: $L" http://localhost:8080/api/turmas/999999 \
    | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["status"], d["title"], "|", d["detail"])'
done
```

Para o 429, dispare seis `POST /api/login` errados seguidos com `Accept-Language: en` e confira que `title` e `detail` saem em inglês.

- [ ] **Step 5: DoD 4 — a pendência do Dashboard traduzida**

```bash
for L in es-CL pt-BR en; do
  echo "== $L"
  curl -s -b /tmp/lotus.jar -H "Accept-Language: $L" http://localhost:8080/api/dashboard/metricas \
    | python3 -c 'import json,sys;d=json.load(sys.stdin);[print(p["type"],"|",p["description"]) for p in d.get("pendencias",[])[:5]]'
done
```

Esperado: a linha `turma_docs_incomplete` traz os documentos por **rótulo** (`Manual, Evaluación del relator`), nunca `MANUAL, EVALUACION_REDATOR`.

- [ ] **Step 6: DoD 5 — as bordas**

```bash
curl -s -b /tmp/lotus.jar http://localhost:8080/api/turmas/999999 | python3 -c 'import json,sys;print(json.load(sys.stdin)["title"])'
curl -s -b /tmp/lotus.jar -H 'Accept-Language: es' http://localhost:8080/api/turmas/999999 | python3 -c 'import json,sys;print(json.load(sys.stdin)["title"])'
curl -s -b /tmp/lotus.jar -H 'Accept-Language: fr-FR' http://localhost:8080/api/turmas/999999 | python3 -c 'import json,sys;print(json.load(sys.stdin)["title"])'
```

Esperado: as três linhas iguais, em es-CL (`Recurso no encontrado`).

- [ ] **Step 7: DoD 6 e 7 — gate**

```bash
docker compose exec -T app php artisan test
docker compose exec -T app php artisan typescript:transform
git diff --stat -- frontend/src/shared/types/generated.ts    # tem de sair VAZIO
cd frontend && pnpm lint && pnpm build
cd .. && git diff --name-only main...HEAD -- 'backend/**/*.php' > /tmp/php-do-bloco.txt
cd backend && ./vendor/bin/pint --test $(sed 's|^backend/||' /tmp/php-do-bloco.txt | tr '\n' ' ')
```

- [ ] **Step 8: Registrar as medições e commitar**

Escrever `docs/superpowers/audits/2026-08-29-hardening-i18n-e-erros-api-medicoes.md` com a **saída real** de cada passo acima — comando, resposta, veredito. Saída colada, não parafraseada.

```bash
git add docs/superpowers/audits/2026-08-29-hardening-i18n-e-erros-api-medicoes.md
git commit -m "docs(i18n): DoD medido contra a API real nos tres locales"
```

---

## Handoff de execução

**executor: claude**

Três razões, e nenhuma é a contagem de arquivos:

1. **Toca o handler global de erro**, que é mecanismo da lei §5.4 do `CLAUDE.md`. A D5 muda quem escolhe o `detail` de toda resposta 401/403/404 da aplicação; errar ali mascara mensagem escrita de propósito (`PublicDetail`) ou vaza mensagem interna.
2. **Traduzir 41 mensagens de domínio para três idiomas é julgamento, não mecânica** — num produto de peso legal, para um cliente chileno, onde a redação da recusa é a interface. Um executor com paths fechados produziria tradução literal onde o registro pede registro formal.
3. **Duas tasks dependem de leitura do código em volta** (o nome da variável de teto na Task 3, a forma de `$missing` na Task 5, o cast de `$document->type` na Task 8). O plano diz o que conferir; conferir é julgamento fora do texto.

`paths_autorizados`: não se aplica.

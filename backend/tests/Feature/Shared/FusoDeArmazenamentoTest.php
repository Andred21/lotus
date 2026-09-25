<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * P-59, spec D2 do item 29: o fuso de ARMAZENAMENTO é UTC, e a chave do
 * ambiente não o alcança.
 *
 * Com `env('APP_TIMEZONE')` no `config/app.php`, bastaria escrever
 * `America/Santiago` no `.env` de produção para reinterpretar em 3–4h todo
 * `DATETIME` já gravado — e tornar ambígua a hora do fim do horário de verão
 * nas auditorias. O fuso do cliente mora no `FusoDoNegocio`.
 */
class FusoDeArmazenamentoTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['APP_TIMEZONE'], $_SERVER['APP_TIMEZONE']);
        putenv('APP_TIMEZONE');

        parent::tearDown();
    }

    public function test_fuso_da_aplicacao_e_utc_mesmo_com_app_timezone_no_ambiente(): void
    {
        $_ENV['APP_TIMEZONE'] = $_SERVER['APP_TIMEZONE'] = 'America/Santiago';
        putenv('APP_TIMEZONE=America/Santiago');

        $this->refreshApplication();

        $this->assertSame(
            'America/Santiago',
            env('APP_TIMEZONE'),
            'A sonda não chegou ao ambiente — sem isto o teste não provaria nada.',
        );
        $this->assertSame('UTC', config('app.timezone'));
        $this->assertSame('UTC', date_default_timezone_get());
    }
}

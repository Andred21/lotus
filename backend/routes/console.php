<?php

use App\Console\Commands\PodarAuditoria;
use App\Console\Commands\PodarLogins;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Retenção (spec §4.4). Quem roda isto em produção é o serviço `scheduler` do
 * `docker-compose.prod.yml` — antes deste bloco o projeto não agendava NADA, e
 * o comando existiria sem nunca executar.
 *
 * `timezone('America/Santiago')` porque `config/app.php` fixa `UTC` e o cliente
 * é chileno: sem isto a "madrugada" da poda cairia no meio da tarde local.
 *
 * Horários separados de propósito: as duas podas varrem tabelas diferentes e
 * não precisam competir por I/O na mesma janela.
 *
 * `withoutOverlapping()` protege contra a passada anterior ainda estar viva
 * numa tabela grande; o lock vai para o `CACHE_STORE=database`, que já é o do
 * projeto. Expira em 60 minutos, não no default de 24h: o `scheduler` não tem
 * monitor de liveness (débito aceito na spec), e um container morto a meio da
 * poda não pode segurar o lock até a madrugada seguinte e pular a próxima
 * passada em silêncio (achado do review final de 2026-08-26).
 */
Schedule::command(PodarAuditoria::class)
    ->timezone('America/Santiago')
    ->dailyAt('03:10')
    ->withoutOverlapping(60);

Schedule::command(PodarLogins::class)
    ->timezone('America/Santiago')
    ->dailyAt('03:40')
    ->withoutOverlapping(60);

<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use App\Console\Commands\PodarAuditoria;
use App\Console\Commands\PodarLogins;
use Illuminate\Support\Facades\Schedule;

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
 * projeto.
 */
Schedule::command(PodarAuditoria::class)
    ->timezone('America/Santiago')
    ->dailyAt('03:10')
    ->withoutOverlapping();

Schedule::command(PodarLogins::class)
    ->timezone('America/Santiago')
    ->dailyAt('03:40')
    ->withoutOverlapping();

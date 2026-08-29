<?php

namespace Tests\Feature\Shared;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * Catraca 1 da spec (§5). O bloco descobriu que o projeto NÃO agenda nada —
 * sem `app/Console/`, sem um único `Schedule::`, sem cron ou supervisor em
 * compose nenhum. Poda que não roda é código morto que parece proteção.
 *
 * Lê o `schedule:list` REAL e não o texto do `routes/console.php`: o que
 * interessa é o agendador montado, venha a entrada de onde vier. Molde e razão:
 * `AuthenticatedRouteMiddlewareTest` e `ThrottledRouteRatchetTest`.
 *
 * Comando de poda novo entra em `PODAS` por escrita explícita, ou a catraca
 * barra. Silêncio reprova.
 */
class PodaAgendadaRatchetTest extends TestCase
{
    /** @var array<string,string> comando => por que ele precisa estar agendado */
    private const PODAS = [
        'lotus:podar-auditoria' => 'Retenção da audits: anonimiza aos 12 meses, descarta aos 5 anos.',
        'lotus:podar-logins' => 'Retenção da login_logs: descarta aos 12 meses (P-33).',
    ];

    private function agendamento(): string
    {
        Artisan::call('schedule:list');

        return Artisan::output();
    }

    public function test_toda_poda_esta_agendada(): void
    {
        $saida = $this->agendamento();

        foreach (self::PODAS as $comando => $motivo) {
            $this->assertStringContainsString(
                $comando,
                $saida,
                "O comando `{$comando}` não está agendado. {$motivo}",
            );
        }
    }

    public function test_o_agendador_tem_pelo_menos_as_podas(): void
    {
        $this->assertNotSame(
            '',
            trim($this->agendamento()),
            'O `schedule:list` voltou vazio: nenhuma tarefa agendada.',
        );
    }
}

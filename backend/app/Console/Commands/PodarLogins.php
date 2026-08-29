<?php

namespace App\Console\Commands;

use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\Retention\RetentionPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Poda da `login_logs` (spec §4.2). Fase única: a tabela é PII pura —
 * `ip_address` e `user_agent` — e não guarda trilha de mudança nenhuma, então
 * não há o que anonimizar e preservar. É a ficha P-33 sendo paga por
 * mecanismo.
 *
 * Consulta crua pelo mesmo motivo do `PodarAuditoria`: `LoginLog` não é
 * `Auditable`, e apagar log de segurança não pode gerar linha de auditoria.
 *
 * Consequência ACEITA e declarada (spec §8): conta sem login há mais de 12
 * meses perde o "último acesso" que o `User::latestLogin()` serve ao
 * `UserData` e ao `RedatorData`. Preservar sempre a última linha por usuário
 * manteria PII indefinida numa conta abandonada, contra a decisão do João.
 */
class PodarLogins extends Command
{
    protected $signature = 'lotus:podar-logins';

    protected $description = 'Descarta linhas de login_logs com mais de 12 meses (spec de retenção).';

    public function handle(): int
    {
        $limite = RetentionPolicy::limiteDeDescarteDeLoginLogs();
        $total = 0;

        do {
            $afetadas = DB::table('login_logs')
                ->where('created_at', '<', $limite)
                ->limit(RetentionPolicy::CHUNK)
                ->delete();

            $total += $afetadas;
        } while ($afetadas > 0);

        EventoDeSeguranca::podaExecutada('login_logs', 'descarte', $total);

        $this->info("Poda da `login_logs`: {$total} descartada(s).");

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\Retention\RetentionPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Poda da `audits` em duas fases (spec §4.2). PRIMEIRO comando Artisan do
 * projeto — é ele que faz nascer `app/Console/`, exatamente como o
 * `docs/estrutura-monolito.md` previa.
 *
 * **Fase 1 (12 meses): anonimizar.** `ip_address`, `user_agent` e `url` viram
 * `NULL`. Todo o resto fica: `user_id`, `user_type`, `event`, `auditable_*`,
 * `old_values`, `new_values`, `tags` e `created_at` são o quem/o quê/valor
 * anterior/valor novo que o `RNF-SEC-04` exige e que a `ArchiveTrailQuery` lê.
 *
 * **Fase 2 (5 anos): descartar.** A linha inteira sai.
 *
 * **A ordem de EXECUÇÃO é a inversa da numeração, de propósito:** descartar
 * primeiro tira da tabela as linhas com mais de 5 anos antes que a
 * anonimização precise tocá-las. Janelas e resultado final são idênticos;
 * muda só o trabalho gasto.
 *
 * **Consulta crua, não Eloquent, e isso é o requisito e não um atalho.** A
 * lição 5 do `docs/README.md` manda usar `$model->delete()` para que o
 * `owen-it` registre a exclusão; aqui o requisito é o OPOSTO — apagar trilha
 * não pode gerar trilha nova. Nem `Audit` nem `LoginLog` são `Auditable`, e o
 * `PodaDeAuditoriaTest::test_podar_nao_gera_trilha_nova` guarda isso.
 *
 * Em chunk porque produção roda com gente acordada: a `audits` cresceu 5513
 * linhas em 15 dias de DESENVOLVIMENTO.
 */
class PodarAuditoria extends Command
{
    protected $signature = 'lotus:podar-auditoria';

    protected $description = 'Anonimiza a PII da audits aos 12 meses e descarta a linha aos 5 anos (spec de retenção).';

    public function handle(): int
    {
        $conexao = config('audit.drivers.database.connection') ?: config('database.default');
        $tabela = config('audit.drivers.database.table', 'audits');

        $descartadas = $this->descartar($conexao, $tabela);
        $anonimizadas = $this->anonimizar($conexao, $tabela);

        EventoDeSeguranca::podaExecutada($tabela, 'descarte', $descartadas);
        EventoDeSeguranca::podaExecutada($tabela, 'anonimizacao', $anonimizadas);

        $this->info("Poda da `{$tabela}`: {$descartadas} descartada(s), {$anonimizadas} anonimizada(s).");

        return self::SUCCESS;
    }

    private function descartar(string $conexao, string $tabela): int
    {
        $limite = RetentionPolicy::limiteDeDescarteDeAudits();
        $total = 0;

        do {
            $afetadas = DB::connection($conexao)
                ->table($tabela)
                ->where('created_at', '<', $limite)
                ->limit(RetentionPolicy::CHUNK)
                ->delete();

            $total += $afetadas;
        } while ($afetadas > 0);

        return $total;
    }

    private function anonimizar(string $conexao, string $tabela): int
    {
        $limite = RetentionPolicy::limiteDeAnonimizacaoDeAudits();
        $total = 0;

        do {
            // O filtro dos três campos não é adorno: sem ele a consulta
            // reencontra as MESMAS linhas já anonimizadas em toda passada e o
            // laço nunca termina.
            $afetadas = DB::connection($conexao)
                ->table($tabela)
                ->where('created_at', '<', $limite)
                ->where(function ($consulta) {
                    $consulta->whereNotNull('ip_address')
                        ->orWhereNotNull('user_agent')
                        ->orWhereNotNull('url');
                })
                ->limit(RetentionPolicy::CHUNK)
                ->update([
                    'ip_address' => null,
                    'user_agent' => null,
                    'url' => null,
                ]);

            $total += $afetadas;
        } while ($afetadas > 0);

        return $total;
    }
}

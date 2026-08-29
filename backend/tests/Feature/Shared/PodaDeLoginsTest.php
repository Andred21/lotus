<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\LoginLog;
use App\Domains\Identity\Models\User;
use App\Shared\Retention\RetentionPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * DoD 3 da spec. `login_logs` é PII pura sem trilha a preservar (P-33), então
 * descarte direto aos 12 meses — sem fase de anonimização, que não teria o que
 * conservar.
 *
 * O último teste registra a consequência ACEITA e declarada na spec §8: conta
 * sem login há mais de 12 meses passa a não ter "último acesso". O frontend já
 * imprime `—` para `last_login` nulo (`UsersTable.tsx:83`,
 * `RedatoresTable.tsx:101`), então não há mudança de tela neste bloco.
 */
class PodaDeLoginsTest extends TestCase
{
    use RefreshDatabase;

    private function plantar(User $user, string $criadoEm): int
    {
        return DB::table('login_logs')->insertGetId([
            'user_id' => $user->id,
            'ip_address' => '203.0.113.9',
            'user_agent' => 'Mozilla/5.0',
            'created_at' => $criadoEm,
        ]);
    }

    public function test_linha_com_mais_de_12_meses_e_apagada(): void
    {
        $user = User::factory()->create();
        $id = $this->plantar($user, now()->subMonths(13)->toDateTimeString());

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        $this->assertNull(DB::table('login_logs')->find($id));
    }

    public function test_linha_com_menos_de_12_meses_fica_intocada(): void
    {
        $user = User::factory()->create();
        $id = $this->plantar($user, now()->subMonths(11)->toDateTimeString());

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        $linha = DB::table('login_logs')->find($id);

        $this->assertNotNull($linha);
        $this->assertSame('203.0.113.9', $linha->ip_address);
    }

    public function test_poda_atravessa_mais_de_um_chunk(): void
    {
        // Precisa passar de RetentionPolicy::CHUNK: com menos linhas que o
        // teto por sentença, o `do...while ($afetadas > 0)` do comando fecha
        // numa passada só e o teste não prova paginação nenhuma. Insert em
        // lote — inserir uma a uma pagaria RetentionPolicy::CHUNK + 5 idas ao
        // banco só para plantar o cenário.
        $user = User::factory()->create();
        $criadoEm = now()->subMonths(13)->toDateTimeString();
        $linhas = [];

        for ($i = 0; $i < RetentionPolicy::CHUNK + 5; $i++) {
            $linhas[] = [
                'user_id' => $user->id,
                'ip_address' => '203.0.113.9',
                'user_agent' => 'Mozilla/5.0',
                'created_at' => $criadoEm,
            ];
        }

        DB::table('login_logs')->insert($linhas);

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        // Só zera se o comando tiver dado mais de uma passada de descarte —
        // cada passada apaga no máximo CHUNK linhas.
        $this->assertSame(0, LoginLog::query()->count());
    }

    public function test_podar_login_logs_nao_gera_trilha_em_audits(): void
    {
        $user = User::factory()->create();
        $this->plantar($user, now()->subMonths(13)->toDateTimeString());

        $antes = DB::table('audits')->count();

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        $this->assertSame($antes, DB::table('audits')->count());
    }

    public function test_conta_sem_acesso_recente_fica_sem_ultimo_acesso(): void
    {
        $user = User::factory()->create();
        $this->plantar($user, now()->subMonths(13)->toDateTimeString());

        $this->artisan('lotus:podar-logins')->assertSuccessful();

        // Consequência aceita e declarada (spec §8): o "último acesso" some
        // junto com a PII. Preservar a última linha por usuário manteria IP e
        // user agent indefinidos numa conta abandonada.
        $this->assertNull($user->fresh()->latestLogin);
    }
}

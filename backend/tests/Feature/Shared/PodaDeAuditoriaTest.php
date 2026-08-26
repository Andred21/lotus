<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\Retention\RetentionPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * DoD 1, 2 e 5 da spec. A `audits` guarda DUAS coisas com valores diferentes:
 * a trilha que o RNF-SEC-04 exige, que vive 5 anos, e `ip_address`/`user_agent`/
 * `url`, que são PII pura e saem aos 12 meses. Este teste prova as duas janelas
 * separadamente — e prova que podar não gera trilha nova, que é o oposto exato
 * da lição 5 e precisa estar escrito como asserção.
 */
class PodaDeAuditoriaTest extends TestCase
{
    use RefreshDatabase;

    private function plantar(string $criadaEm, array $extra = []): int
    {
        return DB::table('audits')->insertGetId(array_merge([
            'user_type' => 'user',
            'user_id' => 1,
            'event' => 'updated',
            'auditable_type' => 'client',
            'auditable_id' => 99,
            'old_values' => '{"name":"antes"}',
            'new_values' => '{"name":"depois"}',
            'url' => 'https://lotus.cl/api/clients/99',
            'ip_address' => '203.0.113.9',
            'user_agent' => 'Mozilla/5.0',
            'tags' => null,
            'created_at' => $criadaEm,
            'updated_at' => $criadaEm,
        ], $extra));
    }

    public function test_linha_entre_12_meses_e_5_anos_perde_a_pii_e_conserva_a_trilha(): void
    {
        $id = $this->plantar(now()->subMonths(18)->toDateTimeString());

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $linha = DB::table('audits')->find($id);

        $this->assertNotNull($linha, 'A linha de 18 meses não pode ser apagada: o descarte é aos 5 anos.');
        $this->assertNull($linha->ip_address);
        $this->assertNull($linha->user_agent);
        $this->assertNull($linha->url);

        $this->assertSame(1, (int) $linha->user_id);
        $this->assertSame('user', $linha->user_type);
        $this->assertSame('updated', $linha->event);
        $this->assertSame('client', $linha->auditable_type);
        $this->assertSame(99, (int) $linha->auditable_id);
        $this->assertSame('{"name":"antes"}', $linha->old_values);
        $this->assertSame('{"name":"depois"}', $linha->new_values);
    }

    public function test_linha_com_mais_de_5_anos_e_apagada(): void
    {
        $id = $this->plantar(now()->subYears(6)->toDateTimeString());

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $this->assertNull(DB::table('audits')->find($id));
    }

    public function test_linha_com_menos_de_12_meses_fica_intocada(): void
    {
        $id = $this->plantar(now()->subMonths(6)->toDateTimeString());

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        $linha = DB::table('audits')->find($id);

        $this->assertSame('203.0.113.9', $linha->ip_address);
        $this->assertSame('Mozilla/5.0', $linha->user_agent);
        $this->assertSame('https://lotus.cl/api/clients/99', $linha->url);
    }

    public function test_podar_nao_gera_trilha_nova(): void
    {
        $this->plantar(now()->subMonths(18)->toDateTimeString());
        $this->plantar(now()->subYears(6)->toDateTimeString());
        $this->plantar(now()->subMonths(6)->toDateTimeString());

        $antes = DB::table('audits')->count();

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        // Uma linha some (a de 6 anos) e NENHUMA nasce. Se a poda gravasse
        // auditoria de si mesma, a conta daria 3 ou mais.
        $this->assertSame($antes - 1, DB::table('audits')->count());
    }

    public function test_poda_atravessa_mais_de_um_chunk(): void
    {
        // Precisa passar de RetentionPolicy::CHUNK: com menos linhas que o
        // teto por sentença, o `do...while ($afetadas > 0)` do comando fecha
        // numa passada só e o teste não prova paginação nenhuma. Insert em
        // lote — inserir uma a uma pagaria RetentionPolicy::CHUNK + 5 idas ao
        // banco só para plantar o cenário.
        $criadaEm = now()->subYears(6)->toDateTimeString();
        $linhas = [];

        for ($i = 0; $i < RetentionPolicy::CHUNK + 5; $i++) {
            $linhas[] = [
                'user_type' => 'user',
                'user_id' => 1,
                'event' => 'updated',
                'auditable_type' => 'client',
                'auditable_id' => 99,
                'old_values' => '{"name":"antes"}',
                'new_values' => '{"name":"depois"}',
                'url' => 'https://lotus.cl/api/clients/99',
                'ip_address' => '203.0.113.9',
                'user_agent' => 'Mozilla/5.0',
                'tags' => null,
                'created_at' => $criadaEm,
                'updated_at' => $criadaEm,
            ];
        }

        DB::table('audits')->insert($linhas);

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        // Só zera se o comando tiver dado mais de uma passada de descarte —
        // cada passada apaga no máximo CHUNK linhas.
        $this->assertSame(0, DB::table('audits')->count());
    }

    public function test_usuario_real_auditado_continua_sendo_auditado_depois_da_poda(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);

        $this->artisan('lotus:podar-auditoria')->assertSuccessful();

        // O `create` acima já gravou uma trilha "created" (é `now()`, sempre
        // dentro de toda janela) — contar antes do update isola o que importa:
        // se a poda desligou a auditoria PARA ESTE MODEL, nenhuma linha nova
        // nasce e a contagem não sobe.
        $antes = DB::table('audits')->where('auditable_type', 'user')->where('auditable_id', $user->id)->count();

        $user->update(['name' => 'Nome novo']);

        $this->assertGreaterThan(
            $antes,
            DB::table('audits')->where('auditable_type', 'user')->where('auditable_id', $user->id)->count(),
            'A poda não pode desligar a auditoria (ADR-08).',
        );
    }
}

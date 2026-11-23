<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Bloco 60, Task 15. Os telefones gravados antes do `ValidPhone` saem todos em
 * E.164 ou `NULL`, por MODEL (cada linha alterada ganha seu `audits`, com o
 * valor antigo em `old_values`), e a conversão é idempotente. O relatório vai
 * ao log só em contagens e `id`: telefone é dado pessoal.
 */
class PhoneConversionMigrationTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function migration(): object
    {
        return require base_path('database/migrations/2026_11_22_000004_converte_telefones_para_e164.php');
    }

    /** Grava o telefone LEGADO sem passar pelo mutator nem pelo audit, como o dado de antes do bloco. */
    private function legado(User|ClientContact $linha, ?string $phone): void
    {
        DB::table($linha->getTable())->where('id', $linha->id)->update(['phone' => $phone]);
    }

    private function usuario(?string $phone, bool $apagado = false): User
    {
        $user = User::factory()->create(['type' => 'aluno', 'is_active' => false]);
        $this->legado($user, $phone);
        if ($apagado) {
            $user->delete();
        }

        return $user;
    }

    private function contato(?string $phone): ClientContact
    {
        $contato = $this->makeClientWithUser()->contacts()->create(['name' => 'Contato']);
        $this->legado($contato, $phone);

        return $contato;
    }

    private function auditoriasDeTelefone(User|ClientContact $linha): array
    {
        return DB::table('audits')
            ->where('auditable_type', $linha->getMorphClass())
            ->where('auditable_id', $linha->id)
            ->where('event', 'updated')
            ->get()
            ->all();
    }

    public function test_converte_users_e_contatos_para_e164_ou_null(): void
    {
        $movel = $this->usuario('+56 9 8765 4321');
        $digitos = $this->usuario('987654321');
        $comZero = $this->usuario('09 8765 4321');
        $lixo = $this->usuario('12345');
        $apagado = $this->usuario('(2) 2123 4567', apagado: true);
        $contato = $this->contato('9 7654 3210');

        $this->migration()->up();

        $phone = fn (int $id) => DB::table('users')->where('id', $id)->value('phone');
        $this->assertSame('+56987654321', $phone($movel->id));
        $this->assertSame('+56987654321', $phone($digitos->id));
        $this->assertSame('+56987654321', $phone($comZero->id));
        $this->assertNull($phone($lixo->id));
        $this->assertSame('+56221234567', $phone($apagado->id)); // soft-deletado também
        $this->assertSame('+56976543210', DB::table('client_contacts')->where('id', $contato->id)->value('phone'));

        foreach (DB::table('users')->whereNotNull('phone')->pluck('phone') as $valor) {
            $this->assertMatchesRegularExpression('/^\+[1-9]\d{6,14}$/', $valor);
        }
    }

    public function test_cada_linha_alterada_tem_audit_com_o_valor_antigo(): void
    {
        $user = $this->usuario('+56 9 8765 4321');
        $zerado = $this->usuario('12345');
        $contato = $this->contato('9 7654 3210');

        $this->migration()->up();

        $audit = $this->auditoriasDeTelefone($user);
        $this->assertCount(1, $audit);
        $this->assertSame('+56 9 8765 4321', json_decode($audit[0]->old_values, true)['phone']);
        $this->assertSame('+56987654321', json_decode($audit[0]->new_values, true)['phone']);

        $auditZerado = $this->auditoriasDeTelefone($zerado);
        $this->assertCount(1, $auditZerado);
        $this->assertSame('12345', json_decode($auditZerado[0]->old_values, true)['phone']);
        $this->assertNull(json_decode($auditZerado[0]->new_values, true)['phone']);

        $auditContato = $this->auditoriasDeTelefone($contato);
        $this->assertCount(1, $auditContato);
        $this->assertSame('9 7654 3210', json_decode($auditContato[0]->old_values, true)['phone']);
    }

    public function test_a_segunda_execucao_nao_gera_audit(): void
    {
        $this->usuario('+56 9 8765 4321');
        $this->usuario('12345');
        $this->contato('9 7654 3210');
        $this->usuario('+56987654321'); // já E.164
        $this->usuario(null);

        $this->migration()->up();
        $alteracoes = fn () => DB::table('audits')->where('event', 'updated')->where('old_values', 'like', '%phone%')->count();
        $depoisDaPrimeira = $alteracoes();
        $this->assertSame(3, $depoisDaPrimeira); // as duas de users e a do contato

        $totalDeAudits = DB::table('audits')->count();
        $this->migration()->up();

        $this->assertSame($depoisDaPrimeira, $alteracoes());
        $this->assertSame($totalDeAudits, DB::table('audits')->count());
    }

    public function test_linha_ja_em_e164_ou_sem_telefone_nao_e_tocada(): void
    {
        $e164 = $this->usuario('+56987654321');
        $nulo = $this->usuario(null);

        $this->migration()->up();

        $this->assertSame([], $this->auditoriasDeTelefone($e164));
        $this->assertSame([], $this->auditoriasDeTelefone($nulo));
    }

    /** `''` não é E.164 nem `NULL`: sobraria depois da conversão, e a spec diz "E.164 ou NULL". */
    public function test_string_vazia_vira_null_com_audit(): void
    {
        $vazio = $this->usuario('');

        $this->migration()->up();

        $this->assertNull(DB::table('users')->where('id', $vazio->id)->value('phone'));
        $this->assertCount(1, $this->auditoriasDeTelefone($vazio));
    }

    public function test_o_log_traz_contagens_e_ids_e_nunca_o_numero(): void
    {
        Log::spy();
        $convertido = $this->usuario('+56 9 7654 3210');
        $limpo = $this->usuario('+56 56 9 8765 4321');
        $zerado = $this->usuario('12345');
        $contatoZerado = $this->contato('555');

        $this->migration()->up();

        Log::shouldHaveReceived('info')->withArgs(function (string $mensagem, array $contexto = []) use ($convertido, $limpo, $zerado, $contatoZerado): bool {
            if ($mensagem !== 'telefones.e164') {
                return false;
            }
            $json = json_encode($contexto);
            $this->assertStringNotContainsString('87654321', $json);
            $this->assertStringNotContainsString('76543210', $json);
            $this->assertStringNotContainsString('12345"', $json);
            $this->assertStringNotContainsString('555"', $json);

            $this->assertSame(1, $contexto['users']['convertidos']);
            $this->assertSame(1, $contexto['users']['limpos_e_convertidos']);
            $this->assertSame(1, $contexto['users']['zerados']);
            $this->assertSame(3, $contexto['users']['lidos']);
            $this->assertSame([$zerado->id], $contexto['users']['zerados_ids']);
            $this->assertSame(1, $contexto['client_contacts']['zerados']);
            $this->assertSame([$contatoZerado->id], $contexto['client_contacts']['zerados_ids']);
            $this->assertNotContains($convertido->id, $contexto['users']['zerados_ids']);
            $this->assertNotContains($limpo->id, $contexto['users']['zerados_ids']);

            return true;
        });
    }
}

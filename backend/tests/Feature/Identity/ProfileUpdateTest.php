<?php

namespace Tests\Feature\Identity;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_atualiza_nome_e_telefone(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => 'Ana Nova', 'phone' => '+56 9 2222 2222'])
            ->assertOk()
            ->assertJsonPath('name', 'Ana Nova')
            ->assertJsonPath('phone', '+56 9 2222 2222');

        $user->refresh();
        $this->assertSame('Ana Nova', $user->name);
        $this->assertSame('+56 9 2222 2222', $user->phone);
    }

    /**
     * `name` e `phone` estão em `$auditInclude`: a trilha vem de graça.
     *
     * Asserir o CONTEÚDO de `new_values` é o ponto: `config/audit.php` tem
     * `empty_values => true`, então a linha de auditoria existe mesmo com
     * trilha vazia — só a existência dela não prova que `name` está em
     * `$auditInclude` (review 2026-08-15, Q-4).
     */
    public function test_a_troca_de_nome_gera_linha_de_auditoria(): void
    {
        $user = $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => 'Ana Auditada'])->assertOk();

        $linha = DB::table('audits')
            ->where('auditable_type', $user->getMorphClass())
            ->where('auditable_id', $user->id)
            ->where('event', 'updated')
            ->latest('id')
            ->first();

        $this->assertNotNull($linha);
        $this->assertStringContainsString('Ana Auditada', (string) $linha->new_values);
    }

    /** Omitir `phone` NÃO apaga o telefone — o campo nasce `Optional`. */
    public function test_omitir_telefone_preserva_o_valor_existente(): void
    {
        $user = $this->actingAsAdmin();
        $user->update(['phone' => '+56 9 3333 3333']);

        $this->putJson('/api/profile', ['name' => 'Ana'])->assertOk();

        $this->assertSame('+56 9 3333 3333', $user->refresh()->phone);
    }

    /** `phone: null` explícito apaga — ausente e nulo são coisas diferentes. */
    public function test_telefone_nulo_explicito_apaga(): void
    {
        $user = $this->actingAsAdmin();
        $user->update(['phone' => '+56 9 3333 3333']);

        $this->putJson('/api/profile', ['name' => 'Ana', 'phone' => null])->assertOk();

        $this->assertNull($user->refresh()->phone);
    }

    /**
     * Spec D8: campo forjado devolve 422 NOMEANDO o campo, nunca 200 em
     * silêncio. Ignorar também protegeria o dado, mas o cliente acreditaria
     * ter salvo.
     */
    #[DataProvider('camposProibidos')]
    public function test_campo_proibido_reprova_com_422(string $campo, mixed $valor): void
    {
        $user = $this->actingAsAdmin();
        $antes = $user->only(['email', 'rut', 'type', 'is_active']);

        $this->putJson('/api/profile', ['name' => 'Ana', $campo => $valor])
            ->assertStatus(422)
            ->assertJsonPath('errors.'.$campo.'.0', fn (?string $msg) => filled($msg));

        $this->assertSame($antes, $user->refresh()->only(['email', 'rut', 'type', 'is_active']));
    }

    public static function camposProibidos(): array
    {
        return [
            'email' => ['email', 'outro@lotus.cl'],
            'rut' => ['rut', '11.111.111-1'],
            'type' => ['type', 'superadmin'],
            'is_active' => ['is_active', false],
            'roles' => ['roles', ['superadmin']],
            'permissions' => ['permissions', ['identity.user.update']],
            'photo_url' => ['photo_url', 'x/y.png'],
            // Chave presente mas vazia também reprova: `prohibited` deixava
            // estes três passarem com 200 (review 2026-08-15, Q-2).
            'email nulo' => ['email', null],
            'roles vazio' => ['roles', []],
            'rut vazio' => ['rut', ''],
        ];
    }

    public function test_nome_vazio_reprova(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/profile', ['name' => ''])->assertStatus(422);
    }
}

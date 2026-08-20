<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * D-12: `photo_url` é `#[Computed]` e tem rota própria de upload. Mandá-la no
 * corpo devolvia 200 e era engolida — a promoção no construtor do DTO desvia do
 * `CannotSetComputedValue`.
 *
 * `missing`, não `prohibited`: `validateProhibited` é `! validateRequired` no
 * vendor, então o campo presente mas VAZIO passava. É por isso que o segundo
 * ramo (`null`) existe aqui — o precedente é `ProfileUpdateData:28-35`.
 */
class ComputedKeyInBodyTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    #[DataProvider('valoresForjados')]
    public function test_photo_url_no_corpo_do_staff_e_422(mixed $valor): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
            'photo_url' => $valor,
        ])->assertStatus(422)->assertJsonPath('errors.photo_url.0', fn ($m) => $m !== null);
    }

    public static function valoresForjados(): array
    {
        return [
            'url forjada' => ['http://evil/x.png'],
            'null' => [null],
            'string vazia' => [''],
        ];
    }

    public function test_photo_url_no_corpo_do_cliente_e_422(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(
            [],
            ['rut' => '12.345.678-5', 'email' => 'acme@lotus.cl'],
        );

        $this->putJson("/api/clients/{$client->id}", [
            'name' => 'ACME',
            'rut' => '12.345.678-5',
            'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME S.A.',
            'type' => 'client',
            'photo_url' => 'http://evil/x.png',
        ])->assertStatus(422);
    }

    /**
     * Arch test: todo campo de foto dos DTOs é `#[Computed]`. Cobre também os
     * DTOs que só SAEM, onde `rules()` nunca roda.
     */
    public function test_todo_campo_de_foto_de_dto_e_computed(): void
    {
        $arquivos = glob(app_path('Domains/*/Data/*.php'));
        $faltando = [];

        foreach ($arquivos as $arquivo) {
            $fonte = file_get_contents($arquivo);

            if (! preg_match_all('/^\s*(#\[[^\]]+\]\s*)*public \?string \$(\w*photo_url) =/m', $fonte, $m)) {
                continue;
            }

            foreach ($m[2] as $campo) {
                $trecho = substr($fonte, 0, strpos($fonte, "\$$campo ="));

                if (! str_contains(substr($trecho, -400), '#[Computed]')) {
                    $faltando[] = basename($arquivo).'::'.$campo;
                }
            }
        }

        $this->assertSame([], $faltando, 'Campo de foto sem #[Computed]: '.implode(', ', $faltando));
    }
}

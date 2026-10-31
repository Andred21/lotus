<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class VersaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_sem_sessao_responde_401(): void
    {
        $this->getJson('/api/versao')->assertUnauthorized();
    }

    public function test_com_sessao_devolve_a_versao_da_config(): void
    {
        $this->actingAs(User::factory()->create(), 'web');

        $this->getJson('/api/versao')
            ->assertOk()
            ->assertExactJson(['versao' => config('app.version')]);
    }

    public function test_versao_da_config_e_semver(): void
    {
        $this->assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', config('app.version'));
    }

    public function test_versao_vai_no_contexto_de_log(): void
    {
        $this->assertSame(config('app.version'), Log::sharedContext()['versao'] ?? null);
    }
}

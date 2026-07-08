<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedatorModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_redator_navega_user_e_documentos_polimorficos(): void
    {
        $user = User::factory()->redator()->create();

        $redator = Redator::create(['user_id' => $user->id]);

        $redator->documents()->create([
            'type'          => 'cv',
            'path'          => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime'          => 'application/pdf',
            'size'          => 2048,
        ]);

        $redator->refresh();

        $this->assertInstanceOf(User::class, $redator->user);
        $this->assertCount(1, $redator->documents);
        $this->assertSame('redator', $redator->documents->first()->fileable_type);
        $this->assertTrue($user->redator->is($redator));
    }
}

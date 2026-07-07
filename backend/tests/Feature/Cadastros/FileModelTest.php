<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FileModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_file_resolve_o_dono_via_morph(): void
    {
        $user = User::factory()->create();

        $file = File::create([
            'fileable_type'  => 'user',
            'fileable_id'    => $user->id,
            'type'           => 'cv',
            'path'           => 'docs/cv.pdf',
            'original_name'  => 'cv.pdf',
            'mime'           => 'application/pdf',
            'size'           => 1234,
        ]);

        $this->assertInstanceOf(User::class, $file->fresh()->fileable);
        $this->assertSame($user->id, $file->fileable->id);
    }
}

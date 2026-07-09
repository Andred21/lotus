<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OwenIt\Auditing\Contracts\Auditable;
use Tests\TestCase;

class RedatorDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_enum_tem_os_quatro_tipos(): void
    {
        $this->assertSame(
            ['CV', 'REUF', 'TITULO', 'POSTGRADO'],
            array_map(fn (RedatorDocumentType $t) => $t->value, RedatorDocumentType::cases()),
        );
    }

    public function test_file_e_auditavel_e_esta_no_morph_map(): void
    {
        $this->assertInstanceOf(Auditable::class, new File);
        $this->assertSame('file', (new File)->getMorphClass());
        $this->assertArrayHasKey('file', Relation::$morphMap);
    }
}

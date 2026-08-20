<?php

namespace Tests\Feature\Shared;

use App\Shared\Data\WritableAttributes;
use Spatie\LaravelData\Optional;
use Tests\TestCase;

class WritableAttributesTest extends TestCase
{
    public function test_chave_optional_sai_do_array(): void
    {
        $attrs = WritableAttributes::from([
            'name' => 'Ana',
            'phone' => new Optional,
        ]);

        $this->assertSame(['name' => 'Ana'], $attrs);
    }

    public function test_null_explicito_fica_e_apaga(): void
    {
        $attrs = WritableAttributes::from(['phone' => null]);

        $this->assertArrayHasKey('phone', $attrs);
        $this->assertNull($attrs['phone']);
    }

    /**
     * `array_filter` sem callback derrubaria `false`, `0` e `''` — e
     * `is_active => false` é o caso vivo (revogar acesso).
     */
    public function test_valores_falsy_sobrevivem(): void
    {
        $attrs = WritableAttributes::from([
            'is_active' => false,
            'student_count' => 0,
            'phone' => '',
        ]);

        $this->assertSame(['is_active' => false, 'student_count' => 0, 'phone' => ''], $attrs);
    }
}

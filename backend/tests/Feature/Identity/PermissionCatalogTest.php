<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Support\PermissionCatalog;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PermissionCatalogTest extends TestCase
{
    public function test_to_data_marca_grupo_e_segregada(): void
    {
        $data = collect(PermissionCatalog::toData())->keyBy('name');

        $this->assertCount(count(PermissionCatalog::descriptions()), $data);
        $this->assertSame('identity', $data['identity.user.view']->group);
        $this->assertFalse($data['identity.user.view']->segregated);
        $this->assertTrue($data['identity.access.manage']->segregated);
    }

    public function test_assert_assignable_aceita_permissoes_comuns(): void
    {
        PermissionCatalog::assertAssignable(['identity.user.view', 'catalog.course.create']);
        $this->assertTrue(true); // não lançou
    }

    public function test_assert_assignable_rejeita_segregada(): void
    {
        $this->expectException(ValidationException::class);
        PermissionCatalog::assertAssignable(['identity.access.manage']);
    }

    public function test_assert_assignable_rejeita_desconhecida(): void
    {
        $this->expectException(ValidationException::class);
        PermissionCatalog::assertAssignable(['nao.existe.perm']);
    }
}

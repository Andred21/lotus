<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Models\Enrollment;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * A coluna marcadora dá IDENTIDADE à cascata (spec D2 do molde). As cinco
 * primeiras tabelas vieram na migration de 2026-08-18; estas três são as que os
 * roots deste bloco cascateiam. `files` é POLIMÓRFICA: a coluna vale de uma vez
 * para budget, quote, redator e turma.
 */
class ArchivedWithParentColumnsTest extends TestCase
{
    use RefreshDatabase;

    public function test_as_tres_tabelas_novas_tem_a_coluna(): void
    {
        foreach (['quotes', 'files', 'enrollments'] as $tabela) {
            $this->assertTrue(
                Schema::hasColumn($tabela, 'archived_with_parent'),
                "$tabela sem archived_with_parent",
            );
        }
    }

    public function test_a_coluna_nasce_falsa_e_nao_e_massa_atribuivel(): void
    {
        // Quem escreve a marca é hook, nunca payload: fora do `$fillable` em
        // todos os models (constraint global).
        $quote = new Quote;
        $file = new File;
        $enrollment = new Enrollment;

        foreach ([$quote, $file, $enrollment] as $model) {
            $this->assertNotContains('archived_with_parent', $model->getFillable(), $model::class);
        }
    }
}

<?php

namespace Tests\Unit\Shared;

use App\Shared\Validation\ValidationMessages;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ValidationMessagesTest extends TestCase
{
    public function test_uma_mensagem_sai_igual_ao_texto_original(): void
    {
        $e = ValidationException::withMessages([
            'enrollment' => 'Ya existe un certificado vigente para esta matrícula.',
        ]);

        $this->assertSame(
            'Ya existe un certificado vigente para esta matrícula.',
            ValidationMessages::squash($e),
        );
    }

    /**
     * O ponto do seam: `->first()` escondia a segunda razão da recusa. Um
     * relatório de lote que nomeia só metade do motivo é pior que verboso —
     * o operador corrige o primeiro problema e o item falha de novo.
     */
    public function test_duas_mensagens_saem_unidas_por_um_espaco(): void
    {
        $e = ValidationException::withMessages([
            'enrollment' => 'La clase no está concluida.',
            'redator_id' => 'El relator no está designado en esta clase.',
        ]);

        $this->assertSame(
            'La clase no está concluida. El relator no está designado en esta clase.',
            ValidationMessages::squash($e),
        );
    }

    public function test_campo_com_duas_mensagens_tambem_achata(): void
    {
        $e = ValidationException::withMessages([
            'enrollment' => ['Primera razón.', 'Segunda razón.'],
        ]);

        $this->assertSame('Primera razón. Segunda razón.', ValidationMessages::squash($e));
    }
}

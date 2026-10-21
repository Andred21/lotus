<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\MotivoInidoneidade;
use App\Domains\Operation\Services\RedatorIdoneidadeService;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class RedatorIdoneidadeServiceTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function service(): RedatorIdoneidadeService
    {
        return app(RedatorIdoneidadeService::class);
    }

    private function makeRedator(): Redator
    {
        return Redator::create(['user_id' => User::factory()->redator()->create()->id]);
    }

    private function reuf(Redator $r, ?string $validUntil): void
    {
        File::create([
            'fileable_type' => 'redator', 'fileable_id' => $r->id, 'type' => 'REUF',
            'path' => 'docs/reuf.pdf', 'original_name' => 'reuf.pdf',
            'mime' => 'application/pdf', 'size' => 100, 'valid_until' => $validUntil,
        ]);
    }

    public function test_habilitado_com_reuf_futuro_nao_tem_motivo(): void
    {
        $course = $this->makeCourse();
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, '2030-01-01');

        $this->assertSame([], $this->service()->motivos($r, $course));
        $this->assertTrue($this->service()->isEligible($r, $course));
    }

    public function test_reuf_com_validade_nula_vale_sempre(): void
    {
        $course = $this->makeCourse();
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, null);

        $this->assertSame([], $this->service()->motivos($r, $course));
    }

    public function test_sem_reuf_tem_o_motivo_reuf_invalido(): void
    {
        $course = $this->makeCourse();
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);

        $this->assertSame([MotivoInidoneidade::ReufInvalido], $this->service()->motivos($r, $course));
    }

    public function test_reuf_vencido_tem_o_motivo_reuf_invalido(): void
    {
        $course = $this->makeCourse();
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, '2020-01-01');

        $this->assertSame([MotivoInidoneidade::ReufInvalido], $this->service()->motivos($r, $course));
        $this->assertFalse($this->service()->isEligible($r, $course));
    }

    public function test_nao_habilitado_ao_curso_tem_o_motivo_nao_habilitado(): void
    {
        $course = $this->makeCourse();
        $r = $this->makeRedator();
        $this->reuf($r, '2030-01-01');   // REUF ok, mas sem course_redator

        $this->assertSame([MotivoInidoneidade::NaoHabilitado], $this->service()->motivos($r, $course));
    }

    public function test_os_dois_motivos_vem_na_ordem_nao_habilitado_reuf_invalido(): void
    {
        $course = $this->makeCourse();
        $r = $this->makeRedator();

        $this->assertSame(
            [MotivoInidoneidade::NaoHabilitado, MotivoInidoneidade::ReufInvalido],
            $this->service()->motivos($r, $course),
        );
    }
}

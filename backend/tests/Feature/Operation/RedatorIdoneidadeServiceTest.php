<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Exceptions\RedatorNaoElegivelException;
use App\Domains\Operation\Services\RedatorIdoneidadeService;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedatorIdoneidadeServiceTest extends TestCase
{
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

    public function test_habilitado_com_reuf_futuro_e_elegivel(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, '2030-01-01');

        $this->assertTrue($this->service()->isEligible($r, $course));
        $this->service()->assertEligible($r, $course);   // não lança
    }

    public function test_reuf_com_validade_nula_vale_sempre(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, null);

        $this->assertTrue($this->service()->isEligible($r, $course));
    }

    public function test_sem_reuf_reprova(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);

        $this->expectException(RedatorNaoElegivelException::class);
        $this->service()->assertEligible($r, $course);
    }

    public function test_reuf_vencido_reprova(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $course->redatores()->attach($r->id);
        $this->reuf($r, '2020-01-01');

        $this->assertFalse($this->service()->isEligible($r, $course));
        $this->expectException(RedatorNaoElegivelException::class);
        $this->service()->assertEligible($r, $course);
    }

    public function test_nao_habilitado_ao_curso_reprova(): void
    {
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $r = $this->makeRedator();
        $this->reuf($r, '2030-01-01');   // REUF ok, mas sem course_redator

        $this->expectException(RedatorNaoElegivelException::class);
        $this->service()->assertEligible($r, $course);
    }
}

<?php

namespace Tests\Feature\Shared;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Audit\PivotAudit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O helper é a fonte única da escrita de pivot auditada (spec D1/D12).
 * O pacote audita o pivot, mas grava linha VAZIA quando o sync não muda nada;
 * o helper compara antes e só delega quando há diferença.
 */
class PivotAuditTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->course = $this->makeCourse();
    }

    private function redator(string $rut = '12.345.678-5'): Redator
    {
        return Redator::create([
            'user_id' => User::factory()->redator()->create(['rut' => $rut])->id,
        ]);
    }

    /**
     * @return int quantas audits de PIVOT o curso tem hoje.
     *
     * Exclui `created`: `makeCourse()` já grava uma audit de ciclo de vida do
     * próprio Course ao criá-lo em `setUp()` — ruído alheio ao que este teste
     * mede (o que o `PivotAudit` grava), que inflaria toda asserção de
     * contagem em +1.
     */
    private function auditsDoCurso(): int
    {
        return DB::table('audits')
            ->where('auditable_type', 'course')
            ->where('auditable_id', $this->course->id)
            ->where('event', '!=', 'created')
            ->count();
    }

    public function test_sync_grava_audit_com_o_diff(): void
    {
        $r = $this->redator();

        PivotAudit::sync($this->course, 'redatores', [$r->id]);

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course',
            'auditable_id' => $this->course->id,
            'event' => 'sync',
        ]);

        $audit = DB::table('audits')->where('auditable_type', 'course')->latest('id')->first();
        $this->assertNotEmpty(json_decode((string) $audit->new_values, true));
    }

    public function test_sync_sem_diferenca_nao_grava_segunda_audit(): void
    {
        $r = $this->redator();

        PivotAudit::sync($this->course, 'redatores', [$r->id]);
        PivotAudit::sync($this->course, 'redatores', [$r->id]);

        $this->assertSame(1, $this->auditsDoCurso());
    }

    public function test_sync_ignora_ordem_e_repeticao_do_payload(): void
    {
        $r1 = $this->redator('12.345.678-5');
        $r2 = $this->redator('20.347.878-K');

        PivotAudit::sync($this->course, 'redatores', [$r1->id, $r2->id]);
        PivotAudit::sync($this->course, 'redatores', [$r2->id, $r1->id, $r2->id]);

        $this->assertSame(1, $this->auditsDoCurso());
    }

    public function test_sync_without_detaching_grava_so_o_primeiro(): void
    {
        $r = $this->redator();

        PivotAudit::syncWithoutDetaching($this->course, 'redatores', [$r->id]);
        PivotAudit::syncWithoutDetaching($this->course, 'redatores', [$r->id]);

        $this->assertSame(1, $this->auditsDoCurso());
        $this->assertSame(1, $this->course->redatores()->count());
    }

    public function test_detach_grava_audit_com_evento_detach(): void
    {
        $r = $this->redator();
        PivotAudit::sync($this->course, 'redatores', [$r->id]);

        PivotAudit::detach($this->course, 'redatores', $r->id);

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course',
            'auditable_id' => $this->course->id,
            'event' => 'detach',
        ]);
        $this->assertDatabaseMissing('course_redator', [
            'course_id' => $this->course->id, 'redator_id' => $r->id,
        ]);
    }

    public function test_detach_de_quem_nao_esta_ligado_nao_grava(): void
    {
        $r = $this->redator();

        PivotAudit::detach($this->course, 'redatores', $r->id);

        $this->assertSame(0, $this->auditsDoCurso());
    }
}

<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Dashboard\Enums\AgendaBucket;
use App\Domains\Dashboard\Services\AgendaClassifier;
use App\Domains\Operation\Models\Turma;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Tests\TestCase;

class AgendaClassifierTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    /** @return list<array{0: string, 1: string, 2: AgendaBucket}> */
    private function casos(): array
    {
        return [
            ['2026-08-01', '2026-08-13', AgendaBucket::Overdue],
            ['2026-08-15', '2026-08-30', AgendaBucket::Upcoming],
            ['2026-08-24', '2026-09-10', AgendaBucket::Upcoming],
            ['2026-08-14', '2026-08-14', AgendaBucket::EndingSoon],
            ['2026-08-10', '2026-08-14', AgendaBucket::EndingSoon],
            ['2026-08-10', '2026-08-21', AgendaBucket::EndingSoon],
            ['2026-08-10', '2026-08-22', AgendaBucket::InProgress],
            ['2026-08-14', '2026-09-30', AgendaBucket::InProgress],
        ];
    }

    private function turma(int $id, string $start, string $end): Turma
    {
        $turma = new Turma(['start_date' => $start, 'end_date' => $end]);
        $turma->id = $id;

        return $turma;
    }

    public function test_cada_turma_cai_no_balde_da_borda(): void
    {
        foreach ($this->casos() as [$start, $end, $esperado]) {
            $this->assertSame(
                $esperado,
                AgendaClassifier::bucketOf($this->turma(1, $start, $end)),
                "{$start}..{$end}",
            );
        }
    }

    public function test_classify_particiona_sem_sobra_nem_repeticao(): void
    {
        $turmas = new Collection;
        foreach ($this->casos() as $i => [$start, $end]) {
            $turmas->push($this->turma($i + 1, $start, $end));
        }

        $baldes = AgendaClassifier::classify($turmas);

        $this->assertSame(1, $baldes->overdue->count());
        $this->assertSame(2, $baldes->upcoming->count());
        $this->assertSame(3, $baldes->endingSoon->count());
        $this->assertSame(2, $baldes->inProgress->count());

        $ids = collect([$baldes->overdue, $baldes->upcoming, $baldes->endingSoon, $baldes->inProgress])
            ->flatMap(fn (Collection $c) => $c->pluck('id'));
        $this->assertCount(8, $ids);
        $this->assertCount(8, $ids->unique());
        $this->assertSame(6, $baldes->startedCount());
    }
}

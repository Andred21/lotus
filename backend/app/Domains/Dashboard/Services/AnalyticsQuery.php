<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Data\MonthlyAmountData;
use App\Domains\Dashboard\Data\MonthlyCountData;
use App\Domains\Dashboard\Data\RankingRowData;
use App\Domains\Dashboard\Data\RankingsData;
use App\Domains\Dashboard\Data\SeriesData;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Carbon\CarbonImmutable;

class AnalyticsQuery
{
    public function series(CarbonImmutable $start, CarbonImmutable $end): SeriesData
    {
        $turmasIniciadas = Turma::query()
            ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
            ->get(['start_date']);
        $turmasConcluidas = Turma::query()
            ->whereBetween('concluded_at', [$start, $end])
            ->get(['concluded_at']);
        $certificadosEmitidos = Certificate::query()
            ->whereBetween('created_at', [$start, $end])
            ->get(['created_at']);
        $matriculas = Enrollment::query()
            ->whereBetween('created_at', [$start, $end])
            ->get(['created_at']);
        $ufAprovada = Quote::query()
            ->where('status', QuoteStatus::Approved)
            ->whereBetween('approved_at', [$start, $end])
            ->get(['approved_at', 'value_uf']);

        return new SeriesData(
            turmas_iniciadas: $this->monthlyCounts($turmasIniciadas, 'start_date'),
            turmas_concluidas: $this->monthlyCounts($turmasConcluidas, 'concluded_at'),
            certificados_emitidos: $this->monthlyCounts($certificadosEmitidos, 'created_at'),
            matriculas: $this->monthlyCounts($matriculas, 'created_at'),
            uf_aprovada: $this->monthlyAmounts($ufAprovada, 'approved_at'),
        );
    }

    public function rankings(
        CarbonImmutable $start,
        CarbonImmutable $end,
        bool $includeUf,
    ): RankingsData {
        $courseTurmas = Turma::query()
            ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('course_id AS entity_id, COUNT(*) AS aggregate')
            ->groupBy('course_id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        $courseEnrollments = Enrollment::query()
            ->join('turmas', 'turmas.id', '=', 'enrollments.turma_id')
            ->whereNull('turmas.deleted_at')
            ->whereBetween('enrollments.created_at', [$start, $end])
            ->selectRaw('turmas.course_id AS entity_id, COUNT(enrollments.id) AS aggregate')
            ->groupBy('turmas.course_id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        $courseCertificates = Certificate::query()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('course_id AS entity_id, COUNT(*) AS aggregate')
            ->groupBy('course_id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        $courseUf = $this->ufTotals(
            Quote::query()
                ->where('status', QuoteStatus::Approved)
                ->whereBetween('approved_at', [$start, $end])
                ->get(['course_id AS entity_id', 'value_uf']),
        );

        $clientTurmas = Client::query()
            ->join('budgets', 'budgets.client_id', '=', 'clients.id')
            ->join('quotes', 'quotes.budget_id', '=', 'budgets.id')
            ->join('turmas', 'turmas.quote_id', '=', 'quotes.id')
            ->whereNull('budgets.deleted_at')
            ->whereNull('quotes.deleted_at')
            ->whereNull('turmas.deleted_at')
            ->whereBetween('turmas.start_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('clients.id AS entity_id, COUNT(DISTINCT turmas.id) AS aggregate')
            ->groupBy('clients.id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        $clientEnrollments = Client::query()
            ->join('budgets', 'budgets.client_id', '=', 'clients.id')
            ->join('quotes', 'quotes.budget_id', '=', 'budgets.id')
            ->join('turmas', 'turmas.quote_id', '=', 'quotes.id')
            ->join('enrollments', 'enrollments.turma_id', '=', 'turmas.id')
            ->whereNull('budgets.deleted_at')
            ->whereNull('quotes.deleted_at')
            ->whereNull('turmas.deleted_at')
            ->whereNull('enrollments.deleted_at')
            ->whereBetween('enrollments.created_at', [$start, $end])
            ->selectRaw('clients.id AS entity_id, COUNT(DISTINCT enrollments.id) AS aggregate')
            ->groupBy('clients.id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        $clientCertificates = Client::query()
            ->join('budgets', 'budgets.client_id', '=', 'clients.id')
            ->join('quotes', 'quotes.budget_id', '=', 'budgets.id')
            ->join('turmas', 'turmas.quote_id', '=', 'quotes.id')
            ->join('enrollments', 'enrollments.turma_id', '=', 'turmas.id')
            ->join('certificates', 'certificates.enrollment_id', '=', 'enrollments.id')
            ->whereNull('budgets.deleted_at')
            ->whereNull('quotes.deleted_at')
            ->whereNull('turmas.deleted_at')
            ->whereNull('enrollments.deleted_at')
            ->whereBetween('certificates.created_at', [$start, $end])
            ->selectRaw('clients.id AS entity_id, COUNT(DISTINCT certificates.id) AS aggregate')
            ->groupBy('clients.id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        $clientUf = $this->ufTotals(
            Client::query()
                ->join('budgets', 'budgets.client_id', '=', 'clients.id')
                ->join('quotes', 'quotes.budget_id', '=', 'budgets.id')
                ->whereNull('budgets.deleted_at')
                ->whereNull('quotes.deleted_at')
                ->where('quotes.status', QuoteStatus::Approved)
                ->whereBetween('quotes.approved_at', [$start, $end])
                ->get(['clients.id AS entity_id', 'quotes.value_uf']),
        );

        $courseIds = $this->entityIds(
            $courseTurmas,
            $courseEnrollments,
            $courseCertificates,
            $courseUf,
        );
        $clientIds = $this->entityIds(
            $clientTurmas,
            $clientEnrollments,
            $clientCertificates,
            $clientUf,
        );

        return new RankingsData(
            courses: $this->rankingRows(
                Course::query()->whereIn('id', $courseIds)->pluck('name', 'id')->all(),
                $courseTurmas,
                $courseEnrollments,
                $courseCertificates,
                $courseUf,
                $includeUf,
            ),
            clients: $this->rankingRows(
                Client::query()->whereIn('id', $clientIds)->pluck('legal_name', 'id')->all(),
                $clientTurmas,
                $clientEnrollments,
                $clientCertificates,
                $clientUf,
                $includeUf,
            ),
        );
    }

    /**
     * @param  iterable<int, object>  $rows
     * @return MonthlyCountData[]
     */
    private function monthlyCounts(iterable $rows, string $dateAttribute): array
    {
        $counts = [];

        foreach ($rows as $row) {
            $month = $row->{$dateAttribute}->format('Y-m');
            $counts[$month] = ($counts[$month] ?? 0) + 1;
        }

        ksort($counts, SORT_STRING);

        return array_map(
            fn (string $month, int $count): MonthlyCountData => new MonthlyCountData($month, $count),
            array_keys($counts),
            array_values($counts),
        );
    }

    /**
     * @param  iterable<int, object>  $rows
     * @return MonthlyAmountData[]
     */
    private function monthlyAmounts(iterable $rows, string $dateAttribute): array
    {
        $totals = [];

        foreach ($rows as $row) {
            $month = $row->{$dateAttribute}->format('Y-m');
            $totals[$month] = bcadd($totals[$month] ?? '0.0000', (string) $row->value_uf, 4);
        }

        ksort($totals, SORT_STRING);

        return array_map(
            fn (string $month, string $total): MonthlyAmountData => new MonthlyAmountData($month, $total),
            array_keys($totals),
            array_values($totals),
        );
    }

    /** @param iterable<int, object> $rows */
    private function ufTotals(iterable $rows): array
    {
        $totals = [];

        foreach ($rows as $row) {
            $id = (int) $row->entity_id;
            $totals[$id] = bcadd($totals[$id] ?? '0.0000', (string) $row->value_uf, 4);
        }

        return $totals;
    }

    private function entityIds(array ...$metrics): array
    {
        $ids = [];

        foreach ($metrics as $metric) {
            $ids = [...$ids, ...array_keys($metric)];
        }

        $ids = array_values(array_unique(array_map(intval(...), $ids)));
        sort($ids, SORT_NUMERIC);

        return $ids;
    }

    /** @return RankingRowData[] */
    private function rankingRows(
        array $names,
        array $turmas,
        array $enrollments,
        array $certificates,
        array $ufTotals,
        bool $includeUf,
    ): array {
        $rows = [];

        foreach ($names as $id => $name) {
            $entityId = (int) $id;
            $rows[] = new RankingRowData(
                id: $entityId,
                name: $name,
                turmas: $turmas[$entityId] ?? 0,
                matriculas: $enrollments[$entityId] ?? 0,
                certificados: $certificates[$entityId] ?? 0,
                uf_aprovada: $includeUf ? ($ufTotals[$entityId] ?? '0.0000') : null,
            );
        }

        usort($rows, fn (RankingRowData $left, RankingRowData $right): int => $right->turmas <=> $left->turmas
            ?: $right->matriculas <=> $left->matriculas
            ?: $right->certificados <=> $left->certificados
            ?: $left->id <=> $right->id);

        return $rows;
    }
}

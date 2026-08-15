<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
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
    /**
     * Série que o chamador não vai mostrar não é lida. Os flags dizem O QUE
     * calcular — quem PODE ver segue sendo decisão do assembler (D7); o que
     * muda aqui é não pagar a leitura para depois anular o campo (Q-9).
     */
    public function series(
        CarbonImmutable $start,
        CarbonImmutable $end,
        bool $includeOperation,
        bool $includeCertification,
        bool $includeUf,
    ): SeriesData {
        return new SeriesData(
            turmas_iniciadas: $includeOperation
                ? $this->monthlyCounts(
                    Turma::query()
                        ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
                        ->get(['start_date']),
                    'start_date',
                )
                : null,
            turmas_concluidas: $includeOperation
                ? $this->monthlyCounts(
                    Turma::query()->whereBetween('concluded_at', [$start, $end])->get(['concluded_at']),
                    'concluded_at',
                )
                : null,
            certificados_emitidos: $includeCertification
                ? $this->monthlyCounts(
                    Certificate::query()->emitidos()->whereBetween('created_at', [$start, $end])->get(['created_at']),
                    'created_at',
                )
                : null,
            matriculas: $includeOperation
                ? $this->monthlyCounts(
                    Enrollment::query()->whereBetween('created_at', [$start, $end])->get(['created_at']),
                    'created_at',
                )
                : null,
            uf_aprovada: $includeUf
                ? $this->monthlyAmounts(
                    Quote::query()
                        ->where('status', QuoteStatus::Approved)
                        ->whereBetween('approved_at', [$start, $end])
                        ->get(['approved_at', 'value_uf']),
                    'approved_at',
                )
                : null,
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
            ->emitidos()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('course_id AS entity_id, COUNT(*) AS aggregate')
            ->groupBy('course_id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        // Sem gate comercial a coluna de UF sai `null` linha a linha — então a
        // cotação nem chega a ser lida. Carregar sob gate fechado é trabalho
        // que ninguém vai ver (Q-9).
        $courseUf = $includeUf
            ? $this->ufTotals(
                Quote::query()
                    ->where('status', QuoteStatus::Approved)
                    ->whereBetween('approved_at', [$start, $end])
                    ->get(['course_id AS entity_id', 'value_uf']),
            )
            : [];

        // `withTrashed()` nos agregados de cliente pelo mesmo motivo do nome: a
        // query nasce em `clients`, então o escopo de soft delete apagaria a
        // linha antes mesmo de haver nome para resolver. As tabelas do caminho
        // (`budgets`, `quotes`, `turmas`) seguem com o `whereNull` explícito —
        // ali o arquivado deve mesmo sumir.
        $clientTurmas = Client::query()
            ->withTrashed()
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
            ->withTrashed()
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
            ->withTrashed()
            ->join('budgets', 'budgets.client_id', '=', 'clients.id')
            ->join('quotes', 'quotes.budget_id', '=', 'budgets.id')
            ->join('turmas', 'turmas.quote_id', '=', 'quotes.id')
            ->join('enrollments', 'enrollments.turma_id', '=', 'turmas.id')
            ->join('certificates', 'certificates.enrollment_id', '=', 'enrollments.id')
            ->whereNull('budgets.deleted_at')
            ->whereNull('quotes.deleted_at')
            ->whereNull('turmas.deleted_at')
            ->whereNull('enrollments.deleted_at')
            // Mesma definição de "emitido" do `Certificate::scopeEmitidos()` —
            // aqui qualificada pela tabela porque a query nasce em `clients`.
            ->where('certificates.status', CertificateStatus::Emitido)
            ->whereBetween('certificates.created_at', [$start, $end])
            ->selectRaw('clients.id AS entity_id, COUNT(DISTINCT certificates.id) AS aggregate')
            ->groupBy('clients.id')
            ->pluck('aggregate', 'entity_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
        $clientUf = $includeUf
            ? $this->ufTotals(
                Client::query()
                    ->withTrashed()
                    ->join('budgets', 'budgets.client_id', '=', 'clients.id')
                    ->join('quotes', 'quotes.budget_id', '=', 'budgets.id')
                    ->whereNull('budgets.deleted_at')
                    ->whereNull('quotes.deleted_at')
                    ->where('quotes.status', QuoteStatus::Approved)
                    ->whereBetween('quotes.approved_at', [$start, $end])
                    ->get(['clients.id AS entity_id', 'quotes.value_uf']),
            )
            : [];

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

        // `withTrashed()` porque o nome é PROJEÇÃO de uma linha que já existe:
        // `rankingRows()` itera os nomes, então curso ou cliente arquivado
        // apagaria a linha inteira do ranking enquanto a série do mesmo payload
        // segue contando a turma dele. Soft delete é arquivamento, não
        // desaparecimento (`.claude/rules/backend-ddd.md`; Q-4).
        return new RankingsData(
            courses: $this->rankingRows(
                Course::query()->withTrashed()->whereIn('id', $courseIds)->pluck('name', 'id')->all(),
                $courseTurmas,
                $courseEnrollments,
                $courseCertificates,
                $courseUf,
                $includeUf,
            ),
            clients: $this->rankingRows(
                Client::query()->withTrashed()->whereIn('id', $clientIds)->pluck('legal_name', 'id')->all(),
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

    /**
     * Soma em `bcadd`, não `SUM()` no banco, e a razão é medível: `value_uf` é
     * DECIMAL de 4 casas; MySQL soma DECIMAL exato, sqlite (a suíte) devolve
     * float e arredonda. Somar no banco daria dois resultados diferentes para o
     * mesmo dado conforme o ambiente — em cifra com peso contratual. A projeção
     * carrega uma coluna só e a leitura já vem escopada pelo período (D9).
     *
     * @param  iterable<int, object>  $rows
     */
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

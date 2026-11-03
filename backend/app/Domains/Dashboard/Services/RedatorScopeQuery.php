<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Certification\Models\Certificate;
use App\Domains\Dashboard\Data\AlertData;
use App\Domains\Dashboard\Data\RedatorAgendaData;
use App\Domains\Dashboard\Data\RedatorAgendaTurmaData;
use App\Domains\Dashboard\Data\RedatorHistoricoData;
use App\Domains\Dashboard\Data\RedatorResumoData;
use App\Domains\Dashboard\Data\RedatorTurmaPendenciaData;
use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Shared\Files\Models\File;
use App\Shared\Support\FusoDoNegocio;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

/**
 * Tudo que o dashboard do redator lê, já escopado ao próprio redator.
 *
 * O escopo entra ANTES de qualquer agregação (Drive §7.4): não existe aqui
 * método que consulte a base inteira e filtre depois, porque é justamente aí
 * que o dado do outro redator vaza. A porta única é `scoped()`, e todo método
 * público passa por ela.
 *
 * Ownership é `turma_redator` e nada mais — sem inferência por curso, por
 * cliente ou por quem assinou o certificado. Turma compartilhada pertence aos
 * dois: aparecer para um não a tira do outro.
 *
 * Zero UF, zero nome de cliente, zero dado de outro redator em qualquer
 * retorno. A agenda usa o par dedicado `RedatorAgendaData`/
 * `RedatorAgendaTurmaData` — o admin tem o seu, com `client_name`, e os dois
 * não se encontram (D5: vazamento é erro de tipo, não de runtime).
 */
class RedatorScopeQuery
{
    /** @var array<int, Collection<int, Turma>> */
    private array $emAndamento = [];

    public function __construct(
        private readonly TurmaHabilitacaoService $habilitacao,
    ) {}

    public function resumo(Redator $redator): RedatorResumoData
    {
        $baldes = $this->baldes($redator);

        // Os números são o tamanho dos baldes da agenda: mesma classificação,
        // uma definição só (D-72). `turmas_em_andamento` soma atrasadas,
        // encerrando e em curso; `proximas_turmas` é o balde das futuras, sem
        // corte de horizonte — o que o card promete é o que a lista mostra.
        return new RedatorResumoData(
            turmas_em_andamento: $baldes->startedCount(),
            proximas_turmas: $baldes->upcoming->count(),
            pendencias_documentais: count($this->pendenciasDocumentais($redator)),
            documentos_vencendo: count($this->alertasDocumentos($redator)),
        );
    }

    public function agenda(Redator $redator): RedatorAgendaData
    {
        $baldes = $this->baldes($redator);

        return new RedatorAgendaData(
            starting_soon: $this->agendaBucket($baldes->upcoming),
            ending_soon: $this->agendaBucket($baldes->endingSoon),
            in_progress: $this->agendaBucket($baldes->inProgress),
            overdue: $this->agendaBucket($baldes->overdue),
        );
    }

    /** @return RedatorTurmaPendenciaData[] */
    public function pendenciasDocumentais(Redator $redator): array
    {
        return $this->turmasEmAndamento($redator)
            ->map(fn (Turma $turma): array => [
                'turma' => $turma,
                'missing' => $this->habilitacao->for($turma)->missingTypes(),
            ])
            ->filter(fn (array $row): bool => $row['missing'] !== [])
            ->map(fn (array $row): RedatorTurmaPendenciaData => new RedatorTurmaPendenciaData(
                turma_id: $row['turma']->id,
                course_name: $row['turma']->course->name,
                end_date: $row['turma']->end_date->toDateString(),
                missing_types: $row['missing'],
            ))
            ->values()
            ->all();
    }

    /** @return AlertData[] */
    public function alertasDocumentos(Redator $redator): array
    {
        $today = FusoDoNegocio::hoje();

        return $redator->documents()
            ->whereIn('type', RedatorDocumentType::values())
            ->whereNotNull('valid_until')
            // `where`, não `whereDate`: `date(valid_until)` é função sobre a
            // coluna e cega `files_valid_until_index` (Task 12). A coluna é
            // `date` e o horizonte é `endOfDay()`, então a comparação por
            // instante seleciona exatamente as mesmas linhas.
            ->where('valid_until', '<=', DashboardWindows::expiryHorizon())
            ->orderBy('valid_until')
            ->orderBy('id')
            ->get(['id', 'type', 'valid_until'])
            ->map(function (File $document) use ($redator, $today): AlertData {
                $expired = $document->valid_until->isBefore($today);

                return new AlertData(
                    type: $expired
                        ? DashboardAlertType::RedatorDocumentExpired
                        : DashboardAlertType::RedatorDocumentExpiringSoon,
                    severity: $expired
                        ? DashboardSeverity::High
                        : DashboardSeverity::Medium,
                    entity_id: $document->id,
                    description: $expired
                        ? __('dashboard.alert.document_expired', ['tipo' => __('identity.document_type.'.$document->type)])
                        : __('dashboard.alert.document_expiring', ['tipo' => __('identity.document_type.'.$document->type)]),
                    date: $document->valid_until->toDateString(),
                    navigation: ['redator_id' => $redator->id],
                );
            })
            ->all();
    }

    public function historico(Redator $redator): RedatorHistoricoData
    {
        // Certificado escopado pela TURMA do redator, não por
        // `certificates.redator_id`: `redator_id` guarda quem assinou aquele
        // documento, que é outra pergunta. O eixo de ownership deste dashboard
        // é `turma_redator`, o mesmo dos outros quatro métodos.
        //
        // Conta só `Emitido`: revogado deixou de ser um certificado emitido —
        // é o próprio enum do domínio que responde isso, não uma regra nova. O
        // `where` mora no `Certificate::scopeEmitidos()`, uma definição só para
        // as três leituras que contam emissão (Q-5).
        $certificados = Certificate::query()
            ->emitidos()
            ->whereIn(
                'enrollment_id',
                Enrollment::query()
                    ->select('id')
                    ->whereIn('turma_id', $this->scoped($redator)->select('turmas.id')),
            )
            ->count();

        return new RedatorHistoricoData(
            turmas_concluidas: $this->scoped($redator)
                ->where('status', TurmaStatus::Concluida)
                ->count(),
            certificados_emitidos: $certificados,
        );
    }

    /**
     * @param  SupportCollection<int, Turma>  $turmas
     * @return RedatorAgendaTurmaData[]
     */
    private function agendaBucket(SupportCollection $turmas): array
    {
        return $turmas
            ->map(fn (Turma $turma): RedatorAgendaTurmaData => new RedatorAgendaTurmaData(
                turma_id: $turma->id,
                course_name: $turma->course->name,
                start_date: $turma->start_date->toDateString(),
                end_date: $turma->end_date->toDateString(),
            ))
            ->values()
            ->all();
    }

    /**
     * Os baldes saem sempre de `turmasEmAndamento()`, a porta única do escopo:
     * não há caminho de leitura de turma aqui que não passe por `scoped()`.
     */
    private function baldes(Redator $redator): AgendaBuckets
    {
        return AgendaClassifier::classify($this->turmasEmAndamento($redator));
    }

    /** @return Collection<int, Turma> */
    private function turmasEmAndamento(Redator $redator): Collection
    {
        return $this->emAndamento[$redator->id] ??= $this->scoped($redator)
            ->where('status', TurmaStatus::EmAndamento)
            ->with(['documentacaoObrigatoria', 'redatores', 'course'])
            ->orderBy('start_date')
            ->orderBy('id')
            ->get();
    }

    /**
     * A porta única do escopo. Todo caminho de leitura desta classe nasce
     * aqui, para que "só as turmas dele" seja uma propriedade da query e não
     * uma disciplina de quem escreve o método seguinte.
     *
     * @return Builder<Turma>
     */
    private function scoped(Redator $redator): Builder
    {
        return Turma::query()->whereHas(
            'redatores',
            fn (Builder $query): Builder => $query->whereKey($redator->id),
        );
    }
}

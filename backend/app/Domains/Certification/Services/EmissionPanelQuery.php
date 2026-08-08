<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Data\EmissionPanelTurmaData;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Collection;

/**
 * A projeção de LISTAGEM da tela de emissão: toda turma concluída, com todos os
 * alunos e o motivo de bloqueio quando existe.
 *
 * Não é uma segunda fonte de verdade sobre quem pode receber certificado — as
 * portas do `CertificateEligibility` continuam donas disso, e o POST continua
 * sendo quem decide. O que este serviço faz é REPORTAR o mesmo motivo, pelo
 * mesmo colaborador (`CertificateTemplateResolver`), para a tela não precisar
 * re-derivar nada: cidade de emissão (porta 5) e redator designado (porta 6)
 * não são deriváveis do payload, e derivá-los no cliente é exatamente o bug que
 * as portas fecharam — a lista promete o que o POST recusa.
 */
class EmissionPanelQuery
{
    public function __construct(
        private readonly CertificateTemplateResolver $templates,
    ) {}

    /** @return array<EmissionPanelTurmaData> */
    public function get(): array
    {
        $templates = $this->templates->latestByCourse();

        $turmas = Turma::query()
            ->where('status', TurmaStatus::Concluida)
            ->with([
                'course',
                // `.client.user`, não só `.client`: o seam `Turma::contratante()`
                // lê o RUT do User do contratante (B4). Parar em `.client` deixa
                // um SELECT por turma — guarda em `ContratanteEagerLoadTest`.
                'quote.budget.client.user',
                'redatores.user',
                // `withListingData()` e não `with('student.user')`: a lista do
                // que a projeção de matrícula carrega é do `EnrollmentQueryBuilder`.
                'enrollments' => fn ($query) => $query->withListingData(),
            ])
            ->orderByDesc('end_date')
            ->get();

        $vigentes = $this->certificadosVigentes($turmas);

        return $turmas
            ->map(function (Turma $turma) use ($templates, $vigentes): EmissionPanelTurmaData {
                $template = $templates->get($turma->course_id);

                return EmissionPanelTurmaData::fromModel(
                    $turma,
                    $template,
                    $this->emissionBlockedFor($turma, $template),
                    $vigentes,
                );
            })
            ->all();
    }

    /**
     * Por que a emissão recusaria esta turma inteira, ou `null`. A ordem é a das
     * portas 4→5→6: sem template não há cidade que valha, e sem cidade o redator
     * não salva o documento.
     *
     * As portas por MATRÍCULA (aprovação, certificado vigente) não entram aqui —
     * elas são visíveis linha a linha, em `approval_status` e `certificate`.
     */
    private function emissionBlockedFor(Turma $turma, ?CourseCertificateTemplate $template): ?string
    {
        if ($template === null) {
            return 'sin_plantilla';
        }

        if ($this->templates->emissionCityFor($turma, $template) === null) {
            return 'plantilla_sin_ciudad';
        }

        if ($turma->redatores->isEmpty()) {
            return 'sin_redactor';
        }

        return null;
    }

    /**
     * Os certificados vigentes de TODAS as matrículas da página, numa consulta
     * só. Resolver por turma devolveria o N+1 numa tela que lista o histórico
     * inteiro de turmas concluídas.
     *
     * @param  Collection<int, Turma>  $turmas
     * @return Collection<int, Certificate> keyBy `enrollment_id`
     */
    private function certificadosVigentes(Collection $turmas): Collection
    {
        $enrollmentIds = $turmas
            ->flatMap(fn (Turma $turma) => $turma->enrollments->pluck('id'))
            ->all();

        return Certificate::query()
            ->where('status', CertificateStatus::Emitido)
            ->whereIn('enrollment_id', $enrollmentIds)
            ->get()
            ->keyBy('enrollment_id');
    }
}

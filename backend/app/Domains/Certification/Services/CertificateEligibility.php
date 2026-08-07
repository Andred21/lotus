<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Quem pode receber certificado — as SEIS portas, num lugar só.
 *
 * As portas existem em duas formas porque o produto pergunta de dois jeitos: a
 * emissão pergunta "esta matrícula pode?" e a lista pergunta "quais podem?".
 * Enquanto as duas moravam em arquivos diferentes — guardas em PHP na Action,
 * restrições em Eloquent no controller — nada obrigava as respostas a
 * concordarem, e a classe de bug era sempre a mesma: **a lista promete um
 * certificado que o POST recusa com 422**. Já aconteceu duas vezes (A-2 e
 * D-P8), e é documento de peso legal.
 *
 * Aqui cada porta aparece como um par adjacente — `assert*` e `constrain*` —
 * com a mensagem escrita uma vez. Porta nova entra num lugar; divergir passa a
 * exigir editar duas linhas vizinhas em vez de dois arquivos.
 *
 * 1. turma concluída (RN-08)
 * 2. matrícula aprovada
 * 3. sem certificado vigente para a matrícula
 * 4. curso com template de certificado disponível
 * 5. template/turma com cidade de emissão válida
 * 6. redator designado na turma — a lista exige algum, a emissão exige AQUELE
 */
class CertificateEligibility
{
    public function __construct(
        private readonly CertificateTemplateResolver $templates,
    ) {}

    /**
     * Face 1 — a emissão. Estoura 422 na primeira porta fechada e devolve o
     * contexto já resolvido. Roda dentro da transação da Action: a porta 3 usa
     * `lockForUpdate`, e fora de transação o lock não vale nada.
     */
    public function assert(Enrollment $enrollment, Redator $redator): IssuanceContext
    {
        $turma = $enrollment->turma;

        $this->assertTurmaConcluida($turma);
        $this->assertMatriculaAprovada($enrollment);
        $this->assertSemCertificadoVigente($enrollment);
        $template = $this->assertTemplateDisponivel($turma);
        $ciudad = $this->assertCidadeDeEmissao($turma, $template);
        $this->assertRedatorDesignado($turma, $redator);

        return new IssuanceContext($turma, $template, $ciudad);
    }

    /**
     * Face 2 — a lista. Turmas com ao menos uma matrícula emitível, já com as
     * relações que a projeção lê e com as matrículas filtradas: matrícula que
     * não passa nas portas não pode aparecer na tela de emissão.
     *
     * @return Collection<int, Turma>
     */
    public function issuableTurmas(): Collection
    {
        $templates = $this->templates->latestByCourse();

        // Resolvido UMA vez: o mesmo closure filtra o `whereHas` e o
        // eager-load, e recalcular a lista entre os dois consultava
        // `certificates` duas vezes por chamada — e abria a janela para a
        // turma aparecer na tela com `enrollments` vazio, se um certificado
        // fosse emitido no meio.
        $comCertificadoVigente = $this->enrollmentsComCertificadoVigente();

        $enrollments = function (Builder|Relation $query) use ($comCertificadoVigente): Builder|Relation {
            $this->constrainMatriculaAprovada($query);

            return $this->constrainSemCertificadoVigente($query, $comCertificadoVigente);
        };

        return Turma::query()
            ->tap(fn (Builder $query) => $this->constrainTurmaConcluida($query))
            ->tap(fn (Builder $query) => $this->constrainTemplateDisponivel($query, $templates->keys()->all()))
            ->tap(fn (Builder $query) => $this->constrainRedatorDesignado($query))
            ->whereHas('enrollments', $enrollments)
            ->with([
                'course',
                'quote.budget.client',
                'redatores.user',
                'enrollments' => fn ($query) => $enrollments($query)->with('student.user'),
            ])
            ->get()
            ->filter(fn (Turma $turma) => $this->constrainCidadeDeEmissao(
                $turma,
                $templates[$turma->course_id],
            ))
            ->values();
    }

    // ── PORTA 1 — turma concluída (RN-08) ────────────────────────────────

    private function assertTurmaConcluida(Turma $turma): void
    {
        if ($turma->status !== TurmaStatus::Concluida) {
            $this->refuse('turma', 'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).');
        }
    }

    private function constrainTurmaConcluida(Builder $turmas): Builder
    {
        return $turmas->where('status', TurmaStatus::Concluida);
    }

    // ── PORTA 2 — matrícula aprovada ─────────────────────────────────────

    private function assertMatriculaAprovada(Enrollment $enrollment): void
    {
        if ($enrollment->approval_status !== EnrollmentApprovalStatus::Aprobado) {
            $this->refuse('enrollment', 'El alumno no fue aprobado: no se puede emitir el certificado.');
        }
    }

    private function constrainMatriculaAprovada(Builder|Relation $enrollments): Builder|Relation
    {
        return $enrollments->where('approval_status', EnrollmentApprovalStatus::Aprobado);
    }

    // ── PORTA 3 — sem certificado vigente ────────────────────────────────

    private function assertSemCertificadoVigente(Enrollment $enrollment): void
    {
        $vigente = Certificate::where('enrollment_id', $enrollment->id)
            ->where('status', CertificateStatus::Emitido)
            ->lockForUpdate()
            ->exists();

        if ($vigente) {
            $this->refuse('enrollment', 'Ya existe un certificado vigente para esta matrícula.');
        }
    }

    /** @param  Collection<int, int>  $comCertificadoVigente */
    private function constrainSemCertificadoVigente(
        Builder|Relation $enrollments,
        Collection $comCertificadoVigente,
    ): Builder|Relation {
        return $enrollments->whereNotIn('id', $comCertificadoVigente);
    }

    // ── PORTA 4 — curso com template disponível ──────────────────────────

    private function assertTemplateDisponivel(Turma $turma): CourseCertificateTemplate
    {
        $template = $this->templates->latestForCourse($turma->course_id);

        if ($template === null) {
            $this->refuse('template', 'El curso no tiene una plantilla de certificado aprobada.');
        }

        return $template;
    }

    /** @param  list<int>  $courseIdsComTemplate */
    private function constrainTemplateDisponivel(Builder $turmas, array $courseIdsComTemplate): Builder
    {
        return $turmas->whereIn('course_id', $courseIdsComTemplate);
    }

    // ── PORTA 5 — cidade de emissão válida ───────────────────────────────

    private function assertCidadeDeEmissao(
        Turma $turma,
        CourseCertificateTemplate $template,
    ): string {
        $ciudad = $this->templates->emissionCityFor($turma, $template);

        if ($ciudad === null) {
            $this->refuse('template', 'La plantilla del curso no define una ciudad de emisión válida.');
        }

        return $ciudad;
    }

    private function constrainCidadeDeEmissao(
        Turma $turma,
        CourseCertificateTemplate $template,
    ): bool {
        return $this->templates->emissionCityFor($turma, $template) !== null;
    }

    // ── PORTA 6 — redator designado ──────────────────────────────────────

    private function assertRedatorDesignado(Turma $turma, Redator $redator): void
    {
        if (! $turma->redatores()->whereKey($redator->id)->exists()) {
            $this->refuse('redator_id', 'El redactor no está designado en esta clase.');
        }
    }

    /**
     * A lista exige ALGUM redator, não um específico: sem nenhum designado não
     * existe assinatura possível (D11) e a emissão recusaria qualquer
     * `redator_id` que a tela mandasse.
     */
    private function constrainRedatorDesignado(Builder $turmas): Builder
    {
        return $turmas->whereHas('redatores');
    }

    /** @return Collection<int, int> */
    private function enrollmentsComCertificadoVigente(): Collection
    {
        return Certificate::query()
            ->where('status', CertificateStatus::Emitido)
            ->pluck('enrollment_id');
    }

    private function refuse(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}

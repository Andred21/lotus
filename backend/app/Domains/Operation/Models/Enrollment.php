<?php

namespace App\Domains\Operation\Models;

use App\Domains\Identity\Models\Student;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\QueryBuilders\EnrollmentQueryBuilder;
use App\Domains\Operation\Services\AcademicResult;
use App\Domains\Operation\Services\ResultLock;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;

/**
 * Matrícula: entidade associativa forte aluno↔turma; carrega o resultado
 * acadêmico e origina o certificado (1:0..1). Notas/presença são escritas no 6d.
 */
class Enrollment extends Model implements AuditableContract
{
    use Auditable;
    use SoftDeletes;

    protected $fillable = ['turma_id', 'student_id', 'grades', 'attendance_pct', 'approval_status'];

    protected $auditInclude = ['turma_id', 'student_id', 'grades', 'attendance_pct', 'approval_status'];

    // Eloquent não refaz SELECT após o insert; sem isto, o default do banco
    // ('pendiente') não aparece no atributo em memória logo após create().
    protected $attributes = [
        'approval_status' => 'pendiente',
    ];

    protected $casts = [
        'grades' => 'array',
        'attendance_pct' => 'decimal:2',
        'approval_status' => EnrollmentApprovalStatus::class,
        // Marca da cascata (spec D8). FORA do `$fillable`.
        'archived_with_parent' => 'boolean',
    ];

    public function turma(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Turma::class)->withTrashed();
    }

    public function student(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Student::class)->withTrashed();
    }

    /**
     * Projeção "esta matrícula tem o resultado trancado por certificado?".
     * Propriedade PHP, NÃO atributo Eloquent: não vai para `save()`, nem para a
     * auditoria, nem para `toArray()`. Quem monta `EnrollmentData` lê por
     * `resultLocked()`, que recusa a instância que ninguém projetou — "falso por
     * omissão" numa matrícula com certificado emitido seria a tela oferecendo
     * uma correção que a API vai recusar.
     */
    private ?bool $resultLocked = null;

    public function markResultLocked(bool $locked): void
    {
        $this->resultLocked = $locked;
    }

    public function resultLocked(): bool
    {
        return $this->resultLocked
            ?? throw new \LogicException('Enrollment sem a projeção result_locked: carregue por withListingData() ou loadListingData().');
    }

    /**
     * Marca a coleção inteira com UMA consulta à vigência (`ResultLock`), o que
     * mantém o custo da lista constante em N.
     *
     * @param  Collection<int, Enrollment>  $enrollments
     */
    public static function markResultLocks(Collection $enrollments): void
    {
        if ($enrollments->isEmpty()) {
            return;
        }

        $locked = array_flip(app(ResultLock::class)->lockedAmong($enrollments->modelKeys()));

        foreach ($enrollments as $enrollment) {
            $enrollment->markResultLocked(isset($locked[$enrollment->id]));
        }
    }

    public function loadListingData(): static
    {
        $this->load(EnrollmentQueryBuilder::LISTING);
        static::markResultLocks(new Collection([$this]));

        return $this;
    }

    /**
     * O resultado acadêmico com dono (B6) — quem lê a nota/presença/status
     * para além da própria matrícula (ex.: CertificateSnapshotBuilder) passa
     * por aqui, não pelas colunas cruas.
     */
    public function academicResult(): AcademicResult
    {
        return AcademicResult::fromEnrollment($this);
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): EnrollmentQueryBuilder
    {
        return new EnrollmentQueryBuilder($query);
    }
}

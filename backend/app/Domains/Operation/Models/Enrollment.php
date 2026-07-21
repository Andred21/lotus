<?php

namespace App\Domains\Operation\Models;

use App\Domains\Identity\Models\Student;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
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
    ];

    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}

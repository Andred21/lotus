<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato da matrícula. Entrada (individual): rut+name obrigatórios, email
 * opcional (o Action exige email só p/ aluno NOVO — D9). Resultado acadêmico
 * (grades/attendance/approval) é read-only aqui; escrita é 6d.
 */
#[TypeScript]
class EnrollmentData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int|Optional $turma_id,
        public int|Optional $student_id,
        public string $name,
        public string $rut,
        public ?string $email,
        public ?string $phone,
        public EnrollmentApprovalStatus|Optional $approval_status,
        public string|Optional|null $attendance_pct,
        public array|Optional|null $grades,
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ];
    }

    public static function fromModel(Enrollment $e): self
    {
        return new self(
            id: $e->id,
            turma_id: $e->turma_id,
            student_id: $e->student_id,
            name: $e->student->user->name,
            rut: $e->student->user->rut,
            email: $e->student->user->email,
            phone: $e->student->user->phone,
            approval_status: $e->approval_status,
            attendance_pct: $e->attendance_pct,
            grades: $e->grades,
        );
    }
}

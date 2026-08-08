<?php

namespace App\Domains\Operation\QueryBuilders;

use App\Domains\Identity\Models\Student;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção de matrícula: `EnrollmentData::fromModel` achata `student.user`,
 * e a lista do que carregar mora AQUI, não em cada caller — o `result` já
 * esqueceu uma vez (lazy load silencioso, B5).
 */
class EnrollmentQueryBuilder extends Builder
{
    public const LISTING = ['student.user'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /**
     * Ordem de leitura humana da lista de alunos: o nome. Sem ORDER BY a
     * relação vinha na ordem que o banco quisesse, e a tabela da tela mudava de
     * ordem entre dois requests.
     *
     * Sub-select correlacionado, não join: o `join` num eager-load colide as
     * colunas de `enrollments` com as de `users`, e o sub-select no ORDER BY
     * não custa consulta nenhuma a mais. Mora aqui, e não no caller, porque a
     * travessia matrícula→aluno→user é de Operation (o mesmo motivo do
     * `withListingData`).
     */
    public function orderByStudentName(): static
    {
        return $this->orderBy(
            // `withTrashed` pelo mesmo motivo do `Enrollment::student()`:
            // arquivamento não apaga, e o aluno arquivado continua na lista da
            // turma — sem isto ele perderia a chave de ordenação e iria parar
            // num canto arbitrário.
            Student::withTrashed()
                ->select('users.name')
                ->join('users', 'users.id', '=', 'students.user_id')
                ->whereColumn('students.id', 'enrollments.student_id')
                ->limit(1)
        );
    }
}

<?php

namespace App\Domains\Operation\QueryBuilders;

use App\Domains\Identity\Models\Student;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção de matrícula: `EnrollmentData::fromModel` achata `student.user`,
 * e a lista do que carregar mora AQUI, não em cada caller — o `result` já
 * esqueceu uma vez (lazy load silencioso, B5).
 */
class EnrollmentQueryBuilder extends Builder
{
    public const LISTING = ['student.user'];

    /**
     * Além do eager-load, marca `result_locked` nos models hidratados
     * (`afterQuery`, uma consulta à vigência por lista, não por linha). O
     * `afterQuery` roda no `get()` do Eloquent Builder — inclusive quando a
     * chamada vem de uma relação (`$turma->enrollments()`), de `onlyTrashed()`
     * e do eager-load aninhado do painel de emissão (`Relation::getEager()`
     * termina em `get()`); os testes de listagem, arquivados e orçamento de
     * queries provam. Por isso o controller NÃO marca à mão.
     */
    public function withListingData(): static
    {
        return $this->withStudentData()
            ->afterQuery(fn ($enrollments) => Enrollment::markResultLocks($enrollments));
    }

    /**
     * Só o eager-load do aluno, SEM a marca `result_locked`: para quem projeta
     * a matrícula em outro DTO e não lê o trancamento (o painel de emissão já
     * resolve a vigência por conta própria; marcar de novo custaria uma
     * consulta a `certificates` a mais, que `CertificateListingTest` proíbe).
     */
    public function withStudentData(): static
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

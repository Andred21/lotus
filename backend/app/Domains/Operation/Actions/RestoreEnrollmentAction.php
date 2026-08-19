<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Enrollment;
use Illuminate\Support\Facades\DB;

/**
 * Restaura a matrícula arquivada.
 *
 * A RN-15 se aplica, e a spec não precisava dizer: `RemoveEnrollmentAction`
 * chama `assertAcademicallyWritable()` antes de remover, e restaurar é escrita
 * acadêmica pela MESMA definição. Sem o gate, uma turma concluída ganharia aluno
 * de volta depois do certificado emitido — a contradição documento↔banco que a
 * RN-15 existe para impedir.
 *
 * SEM cascata e SEM lock: `Enrollment` é folha do arquivamento. Quem cascateia
 * PARA ela é `Turma` (spec D2), e essa volta acontece pelo hook `restored` da
 * turma, não por aqui. A transação fica porque `restore()` escreve a linha E a
 * audit `restored` (ADR-08), e as duas ou entram juntas ou não entram.
 *
 * A marca `archived_with_parent` é limpa aqui do mesmo jeito que
 * `RestoreQuoteAction` limpa a de `Quote` (Task 4, fc8e5a0): a matrícula pode
 * ter sido arquivada em cascata pela turma (Task 11 marca `true`). Restaurada
 * sozinha sem apagar a marca, ela ficaria etiquetada como "arquivada junto com
 * o pai" enquanto está viva, e uma cascata futura da turma (arquivar →
 * restaurar) a trataria como filha a restaurar por engano. `saveQuietly()` não
 * emite evento; o evento que importa é o `restored` que `restore()` já audita.
 *
 * SEM gate de unicidade: `enrollments_turma_student_unique` cobre também as
 * soft-deletadas, então existe no máximo uma linha por par turma+aluno — a que
 * está voltando. Contraste com `Turma`, onde o índice enxerga só as vivas (D1).
 */
class RestoreEnrollmentAction
{
    public function execute(Enrollment $enrollment): Enrollment
    {
        return DB::transaction(function () use ($enrollment) {
            $enrollment->turma->assertAcademicallyWritable();

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e esta linha.
            if ($enrollment->trashed()) {
                $enrollment->restore();
                $enrollment->archived_with_parent = false;
                $enrollment->saveQuietly();
            }

            return $enrollment->loadListingData();
        });
    }
}

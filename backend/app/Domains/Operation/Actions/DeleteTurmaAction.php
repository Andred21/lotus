<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\DB;

/**
 * Soft delete da turma, cascateando para matrículas e documentos — o que o hook
 * `deleting` do model faz (spec D2).
 *
 * Guarda do 6d aplicada (RN-15): turma concluída não se arquiva — o certificado
 * emitido aponta para o registro, e esconder o registro cria contradição entre
 * documento e banco. Financeiro segue sem bloquear (lei §7).
 *
 * A TRANSAÇÃO é nova, e é consequência da cascata (spec D9): o enumera-e-apaga
 * sem transação é check-then-act — uma matrícula criada entre o `get()` e o
 * commit sobreviveria ATIVA sob uma turma arquivada.
 *
 * O `lockRow` serializa ARQUIVAR contra ARQUIVAR (e contra restaurar) — é ele
 * que sustenta o no-op idempotente abaixo. Ele NÃO fecha a janela contra quem
 * escreve filho: no molde `Client` os escritores de filho tomam o mesmo lock, e
 * aqui `EnrollStudentAction`, `ImportStudentsAction` e `StoreTurmaDocumentAction`
 * ainda não tomam. Enquanto for assim, uma matrícula ou um documento criado em
 * concorrência pode sobreviver ativo sob turma arquivada (pendência P-47).
 *
 * A guarda roda DENTRO da transação, depois do lock, pelo mesmo motivo da
 * `DeleteStaffUserAction`: leitura de guarda solta no autocommit não protege
 * nada.
 */
class DeleteTurmaAction
{
    public function execute(Turma $turma): void
    {
        DB::transaction(function () use ($turma) {
            $locked = Turma::lockRow($turma->id);

            // No-op idempotente: arquivar duas vezes não é erro, e o `deleting`
            // não roda de novo sobre registro já soft-deletado.
            if ($locked->trashed()) {
                return;
            }

            $locked->assertAcademicallyWritable();

            $locked->delete();
        });
    }
}

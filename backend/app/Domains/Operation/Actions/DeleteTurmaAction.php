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
 * commit sobreviveria ATIVA sob uma turma arquivada. O `lockRow` fecha a outra
 * ponta, entre duas requisições concorrentes.
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

<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Arquiva o redator (soft-delete), cascateando para documentos e User — o que o
 * hook `deleting` do model faz.
 *
 * Nasce com transação porque a cascata ENUMERA-E-APAGA (spec D9): sem ela, um
 * documento criado entre o `get()` e o commit sobrevive ATIVO sob um redator
 * arquivado. O `lockRow` fecha a outra ponta, entre duas requisições concorrentes.
 *
 * O GATE recusa redator com turma em andamento: trabalho pendente não some da
 * operação sem aviso (spec D3). Turma CONCLUÍDA não bloqueia — arquivar quem já
 * terminou é o caso normal, e é o `withTrashed()` de `Turma::redatores()` que
 * garante que o certificado dela continua emitindo.
 *
 * A mensagem é es-CL pelo mesmo precedente de `Turma::assertAcademicallyWritable()`:
 * a UI do cliente é es-CL e mensagem de validação chega à tela.
 */
class ArchiveRedatorAction
{
    public function execute(Redator $redator): void
    {
        DB::transaction(function () use ($redator) {
            $locked = Redator::lockRow($redator->id);

            // No-op idempotente: arquivar duas vezes não é erro, e o `deleting`
            // não roda de novo sobre registro já soft-deletado.
            if ($locked->trashed()) {
                return;
            }

            if ($locked->turmas()->where('status', TurmaStatus::EmAndamento)->exists()) {
                throw ValidationException::withMessages([
                    'redator' => 'El redactor tiene clases en curso: concluye o reasigna antes de archivarlo.',
                ]);
            }

            $locked->delete();
        });
    }
}

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
 * arquivado.
 *
 * O `lockRow` serializa ARQUIVAR contra ARQUIVAR — é ele que sustenta o no-op
 * idempotente abaixo. Ele NÃO fecha a janela contra quem escreve filho: no molde
 * `Client` os escritores de filho tomam o mesmo lock, e aqui
 * `StoreRedatorDocumentAction`, `UpdateRedatorAction` e `DesignateRedatorAction`
 * ainda não tomam. Enquanto for assim, um documento criado em concorrência pode
 * sobreviver ativo sob redator arquivado (pendência P-47).
 *
 * O GATE recusa redator com turma em andamento: trabalho pendente não some da
 * operação sem aviso (spec D3). Turma CONCLUÍDA não bloqueia — arquivar quem já
 * terminou é o caso normal, e o certificado dela continua emitindo por DOIS
 * mecanismos: o `withTrashed()` de `Turma::redatores()` (a porta 6 do
 * `CertificateEligibility` enxerga a designação) e o `Redator::withTrashed()`
 * dos dois lookups de Certification, sem o qual o `findOrFail` recusa com 404
 * antes de qualquer porta rodar.
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

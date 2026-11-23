<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Exceptions\TurmaDocumentoProibidoException;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;

/**
 * Quem anexa e quem remove cada tipo de documento da turma (spec §4.6).
 *
 * | Tipo                        | Em andamento             | Concluída                                        |
 * |-----------------------------|--------------------------|--------------------------------------------------|
 * | MANUAL, EVALUACION_REDATOR  | submit_docs              | manage_concluded_docs (demais: concluded_locked) |
 * | EVALUACION_ALUNO            | submit_docs              | submit_docs ou manage_concluded_docs             |
 * | EVALUACION_CLIENTE          | submit_client_evaluation | submit_client_evaluation                         |
 *
 * Remover: em andamento segue a linha do tipo do arquivo; em concluída exige
 * `manage_concluded_docs` para todos os tipos.
 *
 * Ordem das recusas: primeiro o PAPEL (403 `document_type_forbidden`: o ator
 * nunca tocaria este tipo), depois o ESTADO (422 `concluded_locked`: poderia,
 * mas a turma trancou). É o gate, não o middleware de rota, que fecha a regra:
 * o middleware só confere que o ator tem ALGUMA das duas permissões.
 *
 * Os nomes de permissão ficam literais nos `->can('...')` (sem constante):
 * o `PermissionCatalogOrphanTest` só reconhece consumidor por literal.
 */
class TurmaDocumentGate
{
    public function assertPodeAnexar(Turma $turma, TurmaDocumentType $type, User $actor): void
    {
        $this->assertPapel($type, $actor);

        if ($turma->status === TurmaStatus::Concluida) {
            $this->assertConcluidaPermiteAnexar($turma, $type, $actor);

            return;
        }

        $turma->assertAcademicallyWritable();
    }

    public function assertPodeRemover(Turma $turma, File $file, User $actor): void
    {
        $this->assertPapel(TurmaDocumentType::tryFrom((string) $file->type), $actor);

        if ($turma->status === TurmaStatus::Concluida) {
            if (! $actor->can('operation.turma.manage_concluded_docs')) {
                $turma->assertAcademicallyWritable();
            }

            return;
        }

        $turma->assertAcademicallyWritable();
    }

    /** O ator tem a permissão-base do tipo? `null` = tipo legado/desconhecido, tratado como os do redator. */
    private function assertPapel(?TurmaDocumentType $type, User $actor): void
    {
        $pode = $type === TurmaDocumentType::EVALUACION_CLIENTE
            ? $actor->can('operation.turma.submit_client_evaluation')
            : $actor->can('operation.turma.submit_docs') || $actor->can('operation.turma.manage_concluded_docs');

        if (! $pode) {
            throw new TurmaDocumentoProibidoException;
        }
    }

    private function assertConcluidaPermiteAnexar(Turma $turma, TurmaDocumentType $type, User $actor): void
    {
        $liberado = match ($type) {
            TurmaDocumentType::EVALUACION_CLIENTE, TurmaDocumentType::EVALUACION_ALUNO => true,
            default => $actor->can('operation.turma.manage_concluded_docs'),
        };

        if (! $liberado) {
            // Mesma recusa de sempre da turma trancada (422).
            $turma->assertAcademicallyWritable();
        }
    }
}

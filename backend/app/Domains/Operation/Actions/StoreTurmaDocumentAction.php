<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Illuminate\Http\UploadedFile;

/**
 * Anexa um documento à turma (RN-16). Append puro — N docs por tipo (D8),
 * sem replace: as provas dos alunos são plural real. Doc de turma não vence
 * (sem valid_until).
 */
class StoreTurmaDocumentAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(Turma $turma, TurmaDocumentType $type, UploadedFile $file): File
    {
        $turma->assertAcademicallyWritable();   // RN-15

        return $this->uploads->execute($turma, $file, $type->value);
    }
}

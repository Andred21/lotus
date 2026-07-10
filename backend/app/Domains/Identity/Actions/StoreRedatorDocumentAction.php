<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Adiciona ou substitui um documento do redator. Se já existe um doc ativo do
 * mesmo tipo, ele é soft-deletado antes (replace) — o binário fica no bucket,
 * rastreável pela auditoria.
 */
class StoreRedatorDocumentAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(Redator $redator, RedatorDocumentType $type, UploadedFile $file, ?CarbonInterface $validUntil = null): File
    {
        return DB::transaction(function () use ($redator, $type, $file, $validUntil) {
            // Soft-delete por instância, não pelo query builder: `->delete()` no
            // builder emite um UPDATE direto, sem eventos de model — e sem
            // eventos o owen-it não grava a linha em `audits`. A rastreabilidade
            // do documento removido é requisito (o binário fica no bucket).
            $redator->documents()->where('type', $type->value)->get()
                ->each(fn (File $antigo) => $antigo->delete());

            return $this->uploads->execute($redator, $file, $type->value, $validUntil);
        });
    }
}

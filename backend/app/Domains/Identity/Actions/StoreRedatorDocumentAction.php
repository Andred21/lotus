<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

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
        // Escrita no disco ANTES da transação (spec D1/D3): dentro dela, um
        // rollback derrubaria a linha e deixaria o binário no bucket — documento
        // sem rastro. Aqui, o que sobra em caso de falha é objeto órfão, que o
        // `discard` abaixo apaga.
        $meta = $this->uploads->metadataOf($file);
        $path = $this->uploads->put($redator, $file);

        try {
            return DB::transaction(function () use ($redator, $type, $path, $meta, $validUntil) {
                // Mutex do pai (P-49) guardando o INSERT, não o upload: o
                // binário fora da transação é decisão registrada (D3 da spec do
                // redator) e não se reabre. A janela que a ficha mede é entre
                // "o binding resolveu um redator vivo" e "INSERT em `files`" —
                // é essa que este lock fecha.
                Redator::lockForWrite($redator->id);

                return $this->registerUploaded($redator, $type, $path, $meta, $validUntil);
            });
        } catch (Throwable $e) {
            $this->uploads->discard($path);

            throw $e;
        }
    }

    /**
     * Para quem JÁ segura a transação e JÁ fez o `put` — hoje, o
     * `CreateRedatorAction`. Faz o replace do documento ativo do mesmo tipo e
     * registra o novo.
     *
     * @param  array{original_name: string, mime: string, size: int}  $meta
     */
    public function registerUploaded(Redator $redator, RedatorDocumentType $type, string $path, array $meta, ?CarbonInterface $validUntil = null): File
    {
        // Soft-delete por instância, não pelo query builder: `->delete()` no
        // builder emite um UPDATE direto, sem eventos de model — e sem
        // eventos o owen-it não grava a linha em `audits`. A rastreabilidade
        // do documento removido é requisito (o binário fica no bucket).
        $redator->documents()->where('type', $type->value)->get()
            ->each(fn (File $antigo) => $antigo->delete());

        return $this->uploads->register($redator, $path, $meta, $type->value, $validUntil);
    }
}

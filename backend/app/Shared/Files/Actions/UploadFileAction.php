<?php

namespace App\Shared\Files\Actions;

use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Sobe um arquivo para o disco (S3 em prod; MinIO/local em dev) e registra
 * em `files` (polimórfico). O binário NÃO passa a ser servido pela app — o
 * acesso é por URL pré-assinada temporária (ADR-11).
 */
class UploadFileAction
{
    public function execute(Model $owner, UploadedFile $file, string $type, ?string $disk = null): File
    {
        $disk ??= config('filesystems.default');

        $morphType = $owner->getMorphClass();
        $path = $file->store("{$morphType}/{$owner->getKey()}", $disk);

        return $owner->morphMany(File::class, 'fileable')->create([
            'type'          => $type,
            'path'          => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime'          => $file->getClientMimeType(),
            'size'          => $file->getSize(),
        ]);
    }

    /**
     * URL pré-assinada temporária. Funciona no driver s3 (S3 real ou MinIO);
     * o driver `local` NÃO suporta — nesse caso o teste de expiração fica
     * pendente para o ambiente com MinIO (ver spec §8).
     */
    public function temporaryUrl(File $file, int $minutes = 10, ?string $disk = null): string
    {
        $disk ??= config('filesystems.default');

        return Storage::disk($disk)->temporaryUrl($file->path, now()->addMinutes($minutes));
    }
}

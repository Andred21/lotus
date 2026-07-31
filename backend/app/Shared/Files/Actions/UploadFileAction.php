<?php

namespace App\Shared\Files\Actions;

use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Sobe um arquivo para o disco (S3 em prod; MinIO/local em dev) e registra
 * em `files` (polimórfico). O binário NÃO passa a ser servido pela app — o
 * acesso é por URL pré-assinada temporária (ADR-11).
 */
class UploadFileAction
{
    public function execute(Model $owner, UploadedFile $file, string $type, ?CarbonInterface $validUntil = null, ?string $disk = null): File
    {
        $disk ??= config('filesystems.default');

        $morphType = $owner->getMorphClass();
        $path = $file->store("{$morphType}/{$owner->getKey()}", $disk);

        return $owner->morphMany(File::class, 'fileable')->create([
            'type' => $type,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'valid_until' => $validUntil,
        ]);
    }

    /**
     * URL pré-assinada temporária. Funciona no driver s3 (S3 real ou MinIO);
     * o driver `local` NÃO suporta — nesse caso o teste de expiração fica
     * pendente para o ambiente com MinIO (ver spec §8).
     *
     * Assina contra {@see publicDiskFor()}, não contra `$disk` — em dev, o
     * disco de escrita aponta pro hostname interno do Docker (`minio`),
     * inalcançável pelo navegador; presign é assinatura local, não depende
     * de conectividade real com o endpoint assinado.
     */
    public function temporaryUrl(File $file, int $minutes = 10, ?string $disk = null): string
    {
        $disk ??= config('filesystems.default');

        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk(self::publicDiskFor($disk));

        return $storage->temporaryUrl($file->path, now()->addMinutes($minutes));
    }

    /**
     * Disco usado SÓ para assinar URLs de leitura devolvidas ao navegador —
     * nunca para gravar/apagar. Achado real (2026-07-31): `AWS_ENDPOINT`
     * precisa ser o hostname interno do Docker (`minio:9000`) pra escrita
     * funcionar de dentro do container; assinar a URL pré-assinada contra
     * esse mesmo host quebra a leitura, porque o navegador não resolve
     * `minio`. Quando existe `{disco}_public` na config (endpoint alcançável
     * pelo navegador, mesmas credenciais), assina contra ele; senão, cai no
     * mesmo disco — comportamento inalterado em prod, onde não há esse
     * hostname interno de container.
     */
    public static function publicDiskFor(string $disk): string
    {
        return config("filesystems.disks.{$disk}_public") ? "{$disk}_public" : $disk;
    }
}

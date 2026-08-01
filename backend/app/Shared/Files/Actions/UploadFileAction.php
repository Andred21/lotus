<?php

namespace App\Shared\Files\Actions;

use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Sobe um arquivo para o disco (S3 em prod; MinIO/local em dev) e registra
 * em `files` (polimórfico). O binário NÃO passa a ser servido pela app — o
 * acesso é por URL pré-assinada temporária (ADR-11).
 */
class UploadFileAction
{
    /**
     * Sobe e registra numa chamada. Continua servindo os chamadores que NÃO
     * estão dentro de transação (`StoreTurmaDocumentAction`, `QuoteFileController`,
     * `BudgetFileController`). Quem abre transação usa `put`/`register`/`discard`
     * separados — ver `StoreRedatorDocumentAction`.
     */
    public function execute(Model $owner, UploadedFile $file, string $type, ?CarbonInterface $validUntil = null, ?string $disk = null): File
    {
        $meta = $this->metadataOf($file);
        $path = $this->put($owner, $file, $disk);

        return $this->register($owner, $path, $meta, $type, $validUntil);
    }

    /**
     * Metadados do upload, capturados ANTES da escrita: depois dela o arquivo
     * temporário já cumpriu seu papel e ler dele de novo é dependência
     * desnecessária do driver.
     *
     * @return array{original_name: string, mime: string, size: int}
     */
    public function metadataOf(UploadedFile $file): array
    {
        return [
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ];
    }

    /**
     * Grava o binário e devolve o path. NUNCA chame isto dentro de uma
     * transação: rollback derruba a linha e deixa o objeto no bucket —
     * documento sem linha em `files` é documento sem auditoria e sem rastro,
     * e aqui o dado tem peso legal.
     *
     * `putFile()` devolve `false` em vez de lançar quando o disco não está
     * configurado com `throw`. Tratar `false` como path faria o sistema seguir
     * como se tivesse gravado (achado real de 2026-08-01 no `UserPhotoService`).
     */
    public function put(Model $owner, UploadedFile $file, ?string $disk = null): string
    {
        return $this->putTo("{$owner->getMorphClass()}/{$owner->getKey()}", $file, $disk);
    }

    /**
     * Grava num diretório explícito. Serve a quem sobe o binário ANTES de o
     * dono existir — `CreateRedatorAction` sobe os documentos fora da
     * transação que cria o redator, então ainda não há id para compor
     * `redator/{id}`. O vínculo real do arquivo é a linha em `files`, não o
     * caminho; o caminho é só organização de bucket.
     */
    public function putTo(string $directory, UploadedFile $file, ?string $disk = null): string
    {
        $disk ??= config('filesystems.default');

        $path = Storage::disk($disk)->putFile($directory, $file);

        if ($path === false) {
            throw new RuntimeException("Falha ao gravar arquivo em {$directory} no disco {$disk}.");
        }

        return $path;
    }

    /**
     * Só o insert em `files`. Roda DENTRO da transação do chamador — é a parte
     * que o rollback pode desfazer sem deixar lixo.
     *
     * @param  array{original_name: string, mime: string, size: int}  $meta
     */
    public function register(Model $owner, string $path, array $meta, string $type, ?CarbonInterface $validUntil = null): File
    {
        return $owner->morphMany(File::class, 'fileable')->create([
            'type' => $type,
            'path' => $path,
            'original_name' => $meta['original_name'],
            'mime' => $meta['mime'],
            'size' => $meta['size'],
            'valid_until' => $validUntil,
        ]);
    }

    /**
     * Compensação: apaga um objeto que ficou sem dono porque a transação do
     * chamador não commitou. Loga e NUNCA propaga — quem chama isto já está
     * lançando o erro que interessa.
     */
    public function discard(string $path, ?string $disk = null): void
    {
        $disk ??= config('filesystems.default');

        try {
            Storage::disk($disk)->delete($path);
        } catch (Throwable $e) {
            Log::warning('Falha ao descartar objeto órfão de upload', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
        }
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

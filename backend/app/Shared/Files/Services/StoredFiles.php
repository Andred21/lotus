<?php

namespace App\Shared\Files\Services;

use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * Os binários que o `FileUploader::store` já gravou no disco, à mão da closure
 * de escrita, que roda DENTRO da transação. Imutável: guarda `chave => [path,
 * meta]`, e a chave é a que o chamador escolheu ao entregar os arquivos.
 *
 * Só expõe o que a closure precisa — o path (para quem grava o nome em outra
 * coluna) e o insert em `files`. Gravar e apagar binário é do `FileUploader`.
 */
final class StoredFiles
{
    /**
     * @param  array<string, array{path: string, meta: array{original_name: string, mime: string, size: int}}>  $stored
     */
    public function __construct(
        private readonly FileStorage $storage,
        private readonly array $stored,
    ) {}

    public function path(string $key): string
    {
        return $this->entry($key)['path'];
    }

    /** Só o insert em `files`, sob o `$owner`. */
    public function register(Model $owner, string $key, string $type, ?CarbonInterface $validUntil = null): File
    {
        $entry = $this->entry($key);

        return $this->storage->register($owner, $entry['path'], $entry['meta'], $type, $validUntil);
    }

    /**
     * Mantém UM arquivo vivo por tipo: soft-deleta os do mesmo tipo e registra
     * o novo. Soft-delete por instância, não pelo query builder: sem eventos de
     * model o owen-it não grava a linha em `audits`, e a rastreabilidade do
     * arquivo substituído é requisito. O binário antigo fica no bucket.
     */
    public function replace(Model $owner, string $key, string $type, ?CarbonInterface $validUntil = null): File
    {
        $owner->morphMany(File::class, 'fileable')->where('type', $type)->get()
            ->each(fn (File $antigo) => $antigo->delete());

        return $this->register($owner, $key, $type, $validUntil);
    }

    /**
     * Chave que o chamador não entregou ao `FileUploader::store` é erro de
     * programação: o `Undefined array key` do PHP (ErrorException no Laravel)
     * já falha alto e dentro da transação, então não há exceção própria — que,
     * com frase literal, entraria na dívida do `MensagemLiteralTest`.
     *
     * @return array{path: string, meta: array{original_name: string, mime: string, size: int}}
     */
    private function entry(string $key): array
    {
        return $this->stored[$key];
    }
}

<?php

namespace App\Shared\Files\Services;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Única entrada de upload do Lotus: grava o(s) binário(s) no disco, roda a
 * escrita em `files` numa transação e, se ela falhar, apaga o que subiu.
 *
 * A regra que isto carrega (ex-`UploadFileAction`, P-49, Q-5 do bloco 47): o
 * binário vai FORA da transação e o insert DENTRO. Rollback derruba a linha e
 * deixa o objeto no bucket — documento sem linha em `files` é documento sem
 * auditoria e sem rastro, e aqui o dado tem peso legal. Por isso o `put` roda
 * antes, o `$write` roda em `DB::transaction` (é onde cabe o
 * `<Pai>::lockForWrite()`), e qualquer falha compensa com `discard` de TODOS os
 * paths já gravados — inclusive o primeiro quando o segundo `put` falha.
 *
 * Os arquivos chegam já validados pelo Data do sítio (a política é do
 * `ContentClass`); aqui só se escreve. O `discard` loga e nunca propaga: quem
 * o chama já está relançando o erro que interessa.
 */
class FileUploader
{
    public function __construct(private readonly FileStorage $storage) {}

    /**
     * @param  array<string, UploadedFile>  $files  chave escolhida pelo chamador => arquivo
     * @param  Model|string  $destination  o dono (`<morph>/<id>`) ou um diretório explícito,
     *                                     para quem sobe antes de o dono existir
     * @param  Closure(StoredFiles): mixed  $write  roda dentro de `DB::transaction`
     * @return mixed o retorno de `$write`
     */
    public function store(array $files, Model|string $destination, Closure $write): mixed
    {
        $paths = [];

        try {
            $stored = [];

            foreach ($files as $key => $file) {
                $meta = $this->storage->metadataOf($file);

                $path = $destination instanceof Model
                    ? $this->storage->put($destination, $file)
                    : $this->storage->putTo($destination, $file);

                $paths[] = $path;
                $stored[$key] = ['path' => $path, 'meta' => $meta];
            }

            $storedFiles = new StoredFiles($this->storage, $stored);

            return DB::transaction(fn () => $write($storedFiles));
        } catch (Throwable $e) {
            foreach ($paths as $path) {
                $this->storage->discard($path);
            }

            throw $e;
        }
    }
}

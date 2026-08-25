<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Mime\MimeTypes;

/**
 * D5 do bloco de hardening. Até `UploadFileAction::metadataOf()` passar a usar
 * `getMimeType()`, a coluna `files.mime` guardava o MIME que o CLIENTE
 * declarou no multipart. Migration, e não seeder, pelo mesmo motivo da P-47:
 * seeder não alcança linha que já existe no banco.
 *
 * Sem este backfill a coluna passaria a significar duas coisas conforme a data
 * da linha, e quem lê não teria como saber qual.
 *
 * Lê o BINÁRIO, nunca o metadado do bucket: `Storage::mimeType()` devolve o
 * Content-Type que a própria escrita gravou — ou seja, a mesma declaração do
 * cliente. Só os bytes desmentem os bytes.
 *
 * `withTrashed` por construção (query builder cru, sem escopo de model):
 * documento substituído continua no bucket e continua sendo rastro de
 * auditoria; o metadado dele mentir é o mesmo problema.
 *
 * `down()` é no-op declarado: restaurar um valor que sabidamente mentia não é
 * reversão útil, e esta migration não guarda o valor antigo justamente porque
 * ele não vale nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        $disco = Storage::disk(config('filesystems.default'));
        $tipos = MimeTypes::getDefault();

        $corrigidas = 0;
        $ausentes = 0;
        $total = 0;

        DB::table('files')->chunkById(100, function ($linhas) use ($disco, $tipos, &$corrigidas, &$ausentes, &$total) {
            foreach ($linhas as $linha) {
                $total++;

                try {
                    if (! $disco->exists($linha->path)) {
                        $ausentes++;

                        continue;
                    }

                    // Arquivo temporário porque `guessMimeType()` recebe um
                    // caminho: é a MESMA chamada que `UploadedFile::getMimeType()`
                    // faz, então o valor gravado aqui e o gravado num upload novo
                    // vêm do mesmo lugar.
                    $temporario = tempnam(sys_get_temp_dir(), 'lotus-backfill-');
                    file_put_contents($temporario, $disco->get($linha->path));
                    $real = $tipos->guessMimeType($temporario);
                    @unlink($temporario);

                    if ($real === null || $real === $linha->mime) {
                        continue;
                    }

                    DB::table('files')->where('id', $linha->id)->update(['mime' => $real]);
                    $corrigidas++;
                } catch (Throwable $e) {
                    // Objeto ilegível não pode derrubar a migration: o resto das
                    // linhas continua valendo a correção, e o que ficou de fora
                    // sai no log com o id.
                    $ausentes++;
                    Log::warning('Backfill de files.mime não conseguiu ler o objeto', [
                        'file_id' => $linha->id,
                        'path' => $linha->path,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        });

        // A contagem é a evidência do DoD 7. Vai para o log e para a saída do
        // `artisan migrate`, porque quem roda em produção precisa ler o número.
        $resumo = "Backfill de files.mime: {$total} linhas lidas, {$corrigidas} corrigidas, {$ausentes} sem objeto legível.";
        Log::info($resumo);

        if (app()->runningInConsole()) {
            echo $resumo.PHP_EOL;
        }
    }

    public function down(): void
    {
        // No-op declarado: o valor antigo era a declaração do cliente, e
        // restaurá-lo devolveria a mentira. Não há reversão útil a fazer.
    }
};

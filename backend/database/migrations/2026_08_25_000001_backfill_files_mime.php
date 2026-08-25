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
 *
 * Objeto ilegível NÃO derruba a migration — um binário corrompido no bucket não
 * pode travar o deploy para sempre. Mas nenhum objeto legível DERRUBA (achado
 * Q-6 do review de 2026-08-25): S3 fora do ar durante o deploy jogaria todas as
 * linhas no `catch`, a migration terminaria marcada como aplicada e o histórico
 * ficaria com o MIME do cliente para sempre, sem caminho de re-execução — que é
 * exatamente o que este backfill existe para impedir. Falha transitória tem de
 * falhar alto, para o deploy repetir.
 */
return new class extends Migration
{
    public function up(): void
    {
        $disco = Storage::disk(config('filesystems.default'));
        $tipos = MimeTypes::getDefault();

        $corrigidas = 0;
        $ausentes = 0;
        $ilegiveis = 0;
        $lidas = 0;
        $total = 0;

        DB::table('files')->chunkById(100, function ($linhas) use ($disco, $tipos, &$corrigidas, &$ausentes, &$ilegiveis, &$lidas, &$total) {
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

                    $lidas++;

                    if ($real === null || $real === $linha->mime) {
                        continue;
                    }

                    DB::table('files')->where('id', $linha->id)->update(['mime' => $real]);
                    $corrigidas++;
                } catch (Throwable $e) {
                    // Objeto ilegível não pode derrubar a migration sozinho: o
                    // resto das linhas continua valendo a correção, e o que
                    // ficou de fora sai no log com o id. O corte coletivo vem
                    // depois do laço.
                    $ilegiveis++;
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
        $resumo = "Backfill de files.mime: {$total} linhas, {$lidas} lidas, {$corrigidas} corrigidas, "
            ."{$ausentes} sem objeto no bucket, {$ilegiveis} ilegíveis.";
        Log::info($resumo);

        if (app()->runningInConsole()) {
            echo $resumo.PHP_EOL;
        }

        // Havia objeto para ler, nenhum foi lido e todos falharam por erro: isso
        // não é bucket com lixo, é bucket fora do alcance. Falhar aqui deixa a
        // migration PENDENTE, e o deploy seguinte a repete.
        if ($lidas === 0 && $ilegiveis > 0) {
            throw new RuntimeException(
                'Backfill de files.mime abortado: nenhum dos '.$ilegiveis
                .' objetos pôde ser lido. O armazenamento parece indisponível — '
                .'a migration fica pendente de propósito, para o próximo deploy repeti-la.',
            );
        }
    }

    public function down(): void
    {
        // No-op declarado: o valor antigo era a declaração do cliente, e
        // restaurá-lo devolveria a mentira. Não há reversão útil a fazer.
    }
};

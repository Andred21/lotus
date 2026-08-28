<?php

namespace App\Shared\Files;

use Throwable;

/**
 * Adapter do daemon `clamav` do compose, protocolo INSTREAM em TCP 3310.
 * Verificado contra `clamav/clamav:1.4` em 2026-08-25:
 *
 *   -> "zINSTREAM\0", depois cada pedaço como <tamanho 4 bytes big-endian><bytes>,
 *      e quatro zeros para fechar
 *   <- "stream: OK\0"                            arquivo limpo
 *   <- "stream: <assinatura> FOUND\0"            arquivo infectado
 *
 * Cliente próprio e não pacote: não há nenhum no composer.json e o protocolo
 * cabe aqui — mesma proporção que o resto do projeto usa.
 *
 * Custo medido: 17 ms para 100 KB, 72 ms para 1 MB, 551 ms para o teto de
 * 10 MB. É o que sustenta o scan SÍNCRONO (spec D1) num projeto sem worker.
 */
class ClamAvScanner implements MalwareScanner
{
    /** 8 KB por pedaço: abaixo de qualquer `StreamMaxLength` e acima do custo de syscall. */
    private const PEDACO = 8192;

    public function infected(string $path): bool
    {
        $resposta = $this->stream($path);

        if (str_contains($resposta, 'FOUND')) {
            return true;
        }

        if (str_contains($resposta, 'OK')) {
            return false;
        }

        // Resposta que não é nem OK nem FOUND é daemon em estado que não
        // sabemos ler. Fail closed: não afirmamos "limpo" sem ter lido "limpo".
        throw new ScannerUnavailableException;
    }

    /**
     * `fwrite` num socket pode escrever MENOS do que se pediu, e o retorno era
     * descartado (achado Q-7 do review de 2026-08-25). Escrita curta engelha o
     * enquadramento do INSTREAM — o daemon passa a ler o tamanho do pedaço
     * seguinte como se fosse conteúdo — e o veredicto vira ruído. Continuar até
     * o fim, ou desistir: `false`/`0` viram `ScannerUnavailableException`, que é
     * recusa, nunca "limpo".
     *
     * @param  resource  $socket
     *
     * @throws ScannerUnavailableException
     */
    private function escreve($socket, string $bytes): void
    {
        for ($escrito = 0; $escrito < strlen($bytes);) {
            $agora = @fwrite($socket, substr($bytes, $escrito));

            if ($agora === false || $agora === 0) {
                throw new ScannerUnavailableException;
            }

            $escrito += $agora;
        }
    }

    private function stream(string $path): string
    {
        $socket = @stream_socket_client(
            'tcp://'.config('services.clamav.host').':'.config('services.clamav.port'),
            $errno,
            $errstr,
            (float) config('services.clamav.timeout'),
        );

        if ($socket === false) {
            throw new ScannerUnavailableException;
        }

        try {
            stream_set_timeout($socket, (int) config('services.clamav.timeout'));

            $this->escreve($socket, "zINSTREAM\0");

            $arquivo = @fopen($path, 'rb');

            if ($arquivo === false) {
                throw new ScannerUnavailableException;
            }

            try {
                while (! feof($arquivo)) {
                    $pedaco = (string) fread($arquivo, self::PEDACO);

                    if ($pedaco === '') {
                        continue;
                    }

                    $this->escreve($socket, pack('N', strlen($pedaco)));
                    $this->escreve($socket, $pedaco);
                }
            } finally {
                fclose($arquivo);
            }

            // Quatro zeros fecham o stream e disparam o veredicto.
            $this->escreve($socket, pack('N', 0));

            $resposta = '';

            while (! feof($socket)) {
                $resposta .= (string) fread($socket, 4096);

                // `stream_get_meta_data` é o único jeito de distinguir "acabou"
                // de "o daemon parou de responder": sem isto, um timeout viraria
                // resposta vazia, e resposta vazia não pode virar "limpo".
                if (stream_get_meta_data($socket)['timed_out']) {
                    throw new ScannerUnavailableException;
                }
            }

            return trim($resposta, "\0\n ");
        } catch (ScannerUnavailableException $e) {
            throw $e;
        } catch (Throwable $e) {
            throw new ScannerUnavailableException($e);
        } finally {
            if (is_resource($socket)) {
                fclose($socket);
            }
        }
    }
}

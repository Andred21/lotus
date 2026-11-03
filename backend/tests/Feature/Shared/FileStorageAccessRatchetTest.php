<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * Catraca do D8 (bloco 52): o `FileStorage` são os PRIMITIVOS de disco e de
 * `files` (`metadataOf`, `put`, `register`, `discard`). Quem sobe arquivo entra
 * por `FileUploader::store`, que garante binário fora da transação, insert
 * dentro e descarte de tudo o que foi gravado se algo lançar. Um sítio que
 * chame `put`/`discard` direto reabre os dois defeitos que o módulo fechou:
 * objeto órfão no bucket depois do rollback e compensação feita à mão.
 *
 * Varre `codigoSemComentarios` porque citar `FileStorage` num docblock que
 * EXPLICA a regra (`ScannedForMalware`, `CertificateSignatures`,
 * `UserPhotoService` fazem isso) não pode reprovar a regra. Silêncio reprova:
 * uma varredura que não acha nenhum arquivo não prova nada.
 */
class FileStorageAccessRatchetTest extends TestCase
{
    use ScansPhpSource;

    private const PECA = 'app/Shared/Files/Services/FileStorage.php';

    /**
     * Quem pode nomear `FileStorage` e, por consequência, chamar `->discard(`,
     * e por quê. Entrada nova aqui é escrita explícita, com motivo: silêncio
     * reprova.
     *
     * @var array<string,string>
     */
    private const PERMITIDOS = [
        'app/Shared/Files/Services/FileUploader.php' => 'É o módulo: compõe os primitivos na ordem do D6 (metadados antes, binário fora da transação, insert dentro) e é o único que descarta dentro do envelope do módulo, o que gravou quando algo lança; a carga inicial é a exceção do D6.',
        'app/Shared/Files/Services/StoredFiles.php' => 'É o registrador que o `FileUploader` entrega à closure do dono: `register` delega ao primitivo `FileStorage::register` a linha em `files`, e `replace` soft-deleta (auditado) o anterior do tipo antes, tudo dentro da transação do módulo. Não toca o disco.',
        'app/Shared/Files/Transformers/SignedUrlTransformer.php' => 'Só chama `FileStorage::publicDiskFor()` para assinar a URL contra o disco público certo na leitura; não escreve nem descarta nada.',
        'app/Console/Commands/CarregarCargaInicial.php' => 'D6, decisão do João em 2026-11-03: a carga inicial abre uma transação para a carga inteira e, depois do rollback, descarta e lista ao operador o que não conseguiu apagar. É operação de console em lote com relatório próprio, não o envelope do módulo; fica nos primitivos baixos, e é a única exceção.',
        'app/Console/CargaInicial/CarregadorDeCadastros.php' => 'D6, decisão do João em 2026-11-03: grava o binário DENTRO da transação da carga e pula o documento que já existe; o descarte e o relatório são do comando. Mesma exceção declarada da `CarregarCargaInicial`, a única fora do módulo.',
    ];

    /**
     * Quem chama `->discard(` hoje, e por quê. É lista própria e mais curta que
     * `PERMITIDOS`: nomear `FileStorage` (o `StoredFiles` registra, o
     * `SignedUrlTransformer` só assina URL) não é licença para descartar.
     *
     * @var array<string,string>
     */
    private const DESCARTADORES = [
        'app/Shared/Files/Services/FileUploader.php' => 'Descarta, no envelope do módulo, todo objeto que já gravou quando o put de outro arquivo, a closure do dono ou o commit lança, e nunca deixa o erro do descarte engolir o original.',
        'app/Console/Commands/CarregarCargaInicial.php' => 'D6, decisão do João em 2026-11-03: depois do rollback da transação da carga inteira, descarta o que a carga gravou e lista ao operador o que não conseguiu apagar. Operação de console em lote com relatório próprio, a única exceção fora do módulo.',
    ];

    /**
     * Os primitivos de escrita só são visíveis a quem os recebe por injeção; o
     * nome da própria peça não conta como consumidor dela.
     *
     * @return list<string> paths relativos (a `backend/`) dos arquivos que casam o padrão
     */
    private function quemUsa(string $padrao): array
    {
        $achados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $relativo = ltrim(str_replace(base_path(), '', $arquivo), '/');

            if ($relativo === self::PECA) {
                continue;
            }

            if (str_contains($this->codigoSemComentarios($arquivo), $padrao)) {
                $achados[] = $relativo;
            }
        }

        return $achados;
    }

    public function test_so_o_modulo_a_carga_e_o_transformer_usam_file_storage(): void
    {
        $usuarios = $this->quemUsa('FileStorage');

        // Silêncio reprova: se nem o módulo aparece, a varredura está olhando o lugar errado.
        $this->assertContains(
            'app/Shared/Files/Services/FileUploader.php',
            $usuarios,
            'A varredura não achou o `FileUploader` entre os usuários de `FileStorage`.',
        );

        $fora = array_values(array_diff($usuarios, array_keys(self::PERMITIDOS)));

        $this->assertSame([], $fora, implode("\n", array_merge(
            [
                '`FileStorage` fora do módulo de upload. Suba o arquivo por `FileUploader::store`',
                '(binário fora da transação, insert dentro, descarte no erro). Arquivos:',
            ],
            $fora,
        )));
    }

    public function test_ninguem_compensa_a_mao(): void
    {
        $chamadores = $this->quemUsa('->discard(');

        $this->assertContains(
            'app/Shared/Files/Services/FileUploader.php',
            $chamadores,
            'A varredura não achou o `->discard(` do `FileUploader`.',
        );

        $fora = array_values(array_diff($chamadores, array_keys(self::DESCARTADORES)));

        $this->assertSame([], $fora, implode("\n", array_merge(
            [
                'Compensação feita à mão (`->discard(`) fora do módulo. Quem descarta é o',
                '`FileUploader`: ele sabe o que já foi gravado e nunca deixa o erro do descarte',
                'engolir o erro original. Arquivos:',
            ],
            $fora,
        )));
    }

    public function test_a_lista_de_permitidos_esta_declarada_e_atual(): void
    {
        foreach (self::PERMITIDOS as $relativo => $motivo) {
            $this->assertFileExists(
                base_path($relativo),
                "Permitido `{$relativo}` não existe mais — tire-o da lista em vez de deixar a exceção órfã.",
            );
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Permitido {$relativo} com motivo curto demais para ser um motivo.",
            );
        }

        foreach (self::DESCARTADORES as $relativo => $motivo) {
            $this->assertFileExists(base_path($relativo), "Descartador `{$relativo}` não existe mais — tire-o da lista.");
            $this->assertGreaterThan(40, strlen(trim($motivo)), "Descartador {$relativo} com motivo curto demais para ser um motivo.");
        }

        $sobrandoDescarte = array_values(array_diff(array_keys(self::DESCARTADORES), $this->quemUsa('->discard(')));

        $this->assertSame([], $sobrandoDescarte, implode("\n", array_merge(
            ['Descartador que já não chama `->discard(` — tire-o da lista:'],
            $sobrandoDescarte,
        )));

        // Permitido que já não nomeia `FileStorage` é exceção sobrando: a
        // próxima regressão nele passaria calada.
        $usuarios = $this->quemUsa('FileStorage');
        $sobrando = array_values(array_diff(array_keys(self::PERMITIDOS), $usuarios));

        $this->assertSame([], $sobrando, implode("\n", array_merge(
            ['Permitido que já não usa `FileStorage` — tire-o da lista:'],
            $sobrando,
        )));
    }
}

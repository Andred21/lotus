<?php

namespace Tests\Support\Certification;

/** O que o Poppler lê de um PDF de certificado. Páginas são 1-based nos métodos e 0-based nas listas. */
final class MedicaoDePdf
{
    /**
     * @param  list<string>  $textoPorPagina  `pdftotext -layout`, para ler a página como o olho lê
     * @param  list<string>  $textoBrutoPorPagina  `pdftotext -raw`, na ordem de pintura: cada elemento é contíguo
     * @param  list<list<array{type: string, width: int, height: int}>>  $imagensPorPagina  `pdfimages -list`
     * @param  list<list<array{id: int, texto: string}>>  $linhasPorPagina  `pdftotext -bbox-layout`: cada linha visual com o texto dela
     */
    public function __construct(
        public readonly int $paginas,
        public readonly array $textoPorPagina,
        public readonly array $textoBrutoPorPagina,
        public readonly array $imagensPorPagina,
        private readonly array $linhasPorPagina,
    ) {}

    /** Quantas linhas visuais a PRIMEIRA ocorrência do trecho ocupa (0 = o trecho não está no PDF). */
    public function linhasDe(string $trecho): int
    {
        $alvo = self::semEspacos($trecho);

        foreach ($this->linhasPorPagina as $linhas) {
            $corrido = '';
            $dono = [];

            foreach ($linhas as $linha) {
                $texto = self::semEspacos($linha['texto']);

                foreach (mb_str_split($texto) as $_) {
                    $dono[] = $linha['id'];
                }

                $corrido .= $texto;
            }

            $posicao = mb_strpos($corrido, $alvo);

            if ($posicao !== false) {
                return count(array_unique(array_slice($dono, $posicao, mb_strlen($alvo))));
            }
        }

        return 0;
    }

    /** A página (1-based) onde o trecho aparece primeiro, ou `null`. */
    public function paginaDe(string $trecho): ?int
    {
        $alvo = self::semEspacos($trecho);

        foreach ($this->textoBrutoPorPagina as $indice => $texto) {
            if (str_contains(self::semEspacos($texto), $alvo)) {
                return $indice + 1;
            }
        }

        return null;
    }

    /** O trecho inteiro está no PDF? Compara sem espaços, porque a quebra de linha os troca. */
    public function contem(string $trecho): bool
    {
        return str_contains($this->textoSemEspacos(), self::semEspacos($trecho));
    }

    /** Todo o texto do PDF, sem nenhum espaço: a forma de provar que nada se perdeu. */
    public function textoSemEspacos(): string
    {
        return self::semEspacos(implode('', $this->textoBrutoPorPagina));
    }

    /** O texto da página (1-based) em ordem de leitura, para `assertStringContainsString`. */
    public function pagina(int $numero): string
    {
        return $this->textoPorPagina[$numero - 1] ?? '';
    }

    private static function semEspacos(string $texto): string
    {
        return (string) preg_replace('/[\s\x{00A0}\x{200B}]+/u', '', $texto);
    }
}

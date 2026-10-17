<?php

namespace App\Console\Commands;

use App\Console\CargaInicial\ArquivoDeCarga;
use App\Console\CargaInicial\CargaInvalidaException;
use App\Console\CargaInicial\Extracao\Documentos;
use App\Console\CargaInicial\Extracao\LeitorDeRegistros;
use App\Console\CargaInicial\Extracao\Normalizador;
use App\Console\CargaInicial\Extracao\Relatorio;
use Illuminate\Console\Command;
use JsonException;

/**
 * O extrator da carga inicial (spec §4): lê a planilha da v1 e o
 * `complemento.json` e grava, na pasta de dados, o `carga.json`, os PDFs dos
 * redatores e o `relatorio.md`.
 *
 * A pasta de dados guarda dado pessoal de aluno e de redator, e `backend/`
 * atravessa o espelho corporativo e entra na imagem: o comando recusa uma
 * pasta de dados sob `base_path()`. Nada vai para a saída além de contagens e
 * códigos de certificado; a coluna `CLAVE` nem é lida (`LeitorDeRegistros`).
 *
 * Só grava o `carga.json` depois de a carga passar no contrato
 * (`ArquivoDeCarga::validar`) com os documentos já na pasta.
 */
class ExtrairCargaInicial extends Command
{
    protected $signature = 'lotus:extrair-carga-inicial
        {origem : pasta do levantamento da v1}
        {dados : pasta de dados, com o complemento.json}';

    protected $description = 'Extrai a carga inicial (carga.json, documentos e relatório) da planilha da v1 e do complemento curado.';

    private const CHAVES_DO_COMPLEMENTO = [
        'planilha', 'recorte_prefixo', 'dominio_email_sintetico', 'cliente',
        'instrutores', 'cursos', 'redatores', 'cotacoes',
    ];

    public function handle(): int
    {
        $origem = rtrim((string) $this->argument('origem'), '/');
        $dados = $this->pastaDeDados();

        if ($dados === null) {
            return self::FAILURE;
        }

        $complemento = $this->complemento($dados);

        if ($complemento === null) {
            return self::FAILURE;
        }

        try {
            $linhas = (new LeitorDeRegistros)->ler($origem.'/'.$complemento['planilha']);
        } catch (CargaInvalidaException $e) {
            return $this->falhar($e->erros());
        }

        $normalizacao = (new Normalizador)->normalizar($linhas, $complemento);

        if ($normalizacao->erros !== []) {
            return $this->falhar($normalizacao->erros);
        }

        $erros = Documentos::preparar($complemento['redatores'], $origem, $dados);

        if ($erros !== []) {
            return $this->falhar($erros);
        }

        $erros = ArquivoDeCarga::validar($normalizacao->carga, $dados);

        if ($erros !== []) {
            return $this->falhar($erros);
        }

        file_put_contents(
            $dados.'/'.ArquivoDeCarga::ARQUIVO,
            json_encode($normalizacao->carga, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n",
        );
        file_put_contents($dados.'/relatorio.md', Relatorio::markdown($normalizacao));

        $this->info("Carga extraída em {$dados}.");
        foreach (Relatorio::contagens($normalizacao) as $rotulo => $total) {
            $this->line("  {$rotulo}: {$total}");
        }

        return self::SUCCESS;
    }

    /** A pasta de dados já resolvida, ou nulo (com a recusa impressa). */
    private function pastaDeDados(): ?string
    {
        $dados = realpath((string) $this->argument('dados'));

        if ($dados === false || ! is_dir($dados)) {
            $this->error('A pasta de dados não existe.');

            return null;
        }

        $base = realpath(base_path()) ?: base_path();

        if ($dados === $base || str_starts_with($dados, $base.DIRECTORY_SEPARATOR)) {
            $this->error("A pasta de dados guarda dado pessoal e não pode ficar dentro do repositório ({$base}).");

            return null;
        }

        return $dados;
    }

    /** @return array<string, mixed>|null */
    private function complemento(string $dados): ?array
    {
        $caminho = $dados.'/complemento.json';

        if (! is_file($caminho)) {
            $this->error("O complemento.json não existe em {$dados}.");

            return null;
        }

        try {
            $complemento = json_decode((string) file_get_contents($caminho), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            $this->error('O complemento.json não é JSON válido: '.$e->getMessage());

            return null;
        }

        $ausentes = is_array($complemento) ? array_diff(self::CHAVES_DO_COMPLEMENTO, array_keys($complemento)) : self::CHAVES_DO_COMPLEMENTO;

        if ($ausentes !== []) {
            $this->error('O complemento.json não tem a(s) chave(s): '.implode(', ', $ausentes).'.');

            return null;
        }

        return $complemento;
    }

    /** @param  list<string>  $erros */
    private function falhar(array $erros): int
    {
        $this->error('A carga não foi gerada. Corrija a origem ou o complemento:');

        foreach ($erros as $erro) {
            $this->line("  - {$erro}");
        }

        return self::FAILURE;
    }
}

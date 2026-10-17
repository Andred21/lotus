<?php

namespace App\Console\Commands;

use App\Console\CargaInicial\ArquivoDeCarga;
use App\Console\CargaInicial\CargaComConflitoException;
use App\Console\CargaInicial\CargaInvalidaException;
use App\Console\CargaInicial\CarregadorDeCadastros;
use App\Console\CargaInicial\CarregadorDeHistorico;
use App\Console\CargaInicial\Contagem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * A carga inicial de produção (spec §5, §7): lê o `carga.json` e grava
 * cadastros e histórico, sem e-mail, sem notificação e com a auditoria ligada.
 *
 * Antes de gravar de verdade, o comando ensaia a carga inteira numa transação
 * que SEMPRE desfaz, sem subir documento ao disco: um conflito aparece ali e
 * não deixa arquivo órfão. `--simular` para depois do ensaio. A carga real
 * roda numa transação só; qualquer exceção desfaz as linhas, e o que já subiu
 * ao disco é reportado, porque a transação do banco não o alcança.
 */
class CarregarCargaInicial extends Command
{
    protected $signature = 'lotus:carga-inicial
        {pasta : pasta com carga.json e documentos/}
        {--simular : valida e conta sem gravar}';

    protected $description = 'Carrega a carga inicial (cadastros e histórico) a partir de uma pasta com carga.json.';

    private CarregadorDeCadastros $cadastros;

    private CarregadorDeHistorico $historico;

    public function handle(): int
    {
        $pasta = rtrim((string) $this->argument('pasta'), '/');

        // Resolvidos aqui, não no construtor: o Artisan instancia todo comando
        // a cada invocação, e esta carga é de uso único.
        $this->cadastros = app(CarregadorDeCadastros::class);
        $this->historico = app(CarregadorDeHistorico::class);

        try {
            $carga = ArquivoDeCarga::ler($pasta);
        } catch (CargaInvalidaException $e) {
            $this->error('O arquivo de carga é inválido:');
            foreach ($e->erros() as $erro) {
                $this->line("  - {$erro}");
            }

            return self::FAILURE;
        }

        $this->info('Simulação (nada é gravado):');

        try {
            $simulada = $this->simular($carga, $pasta);
        } catch (Throwable $e) {
            $this->error('A simulação falhou: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->imprimir($simulada);

        if ($simulada->temConflito()) {
            return self::FAILURE;
        }

        if ($this->option('simular')) {
            return self::SUCCESS;
        }

        return $this->carregar($carga, $pasta);
    }

    /** @param  array<string, mixed>  $carga */
    private function simular(array $carga, string $pasta): Contagem
    {
        $contagem = new Contagem;

        DB::beginTransaction();

        try {
            $cadastros = $this->cadastros->carregar($carga, $pasta, false, $contagem);
            $this->historico->carregar($carga, $cadastros, $contagem);
        } finally {
            DB::rollBack();
        }

        return $contagem;
    }

    /** @param  array<string, mixed>  $carga */
    private function carregar(array $carga, string $pasta): int
    {
        $contagem = new Contagem;

        try {
            DB::transaction(function () use ($carga, $pasta, $contagem): void {
                $cadastros = $this->cadastros->carregar($carga, $pasta, true, $contagem);
                $this->historico->carregar($carga, $cadastros, $contagem);

                if ($contagem->temConflito()) {
                    throw new CargaComConflitoException($contagem->conflitos());
                }
            });
        } catch (Throwable $e) {
            $this->error('A carga foi desfeita: '.$e->getMessage());

            if ($contagem->arquivosGravados() !== []) {
                $this->warn('Arquivos gravados no disco sem linha no banco:');
                foreach ($contagem->arquivosGravados() as $path) {
                    $this->line("  - {$path}");
                }
            }

            return self::FAILURE;
        }

        $this->info('Carga gravada:');
        $this->imprimir($contagem);

        return self::SUCCESS;
    }

    private function imprimir(Contagem $contagem): void
    {
        $this->table(['Entidade', 'A criar', 'Já existe'], $contagem->linhas());

        foreach ($contagem->conflitos() as $conflito) {
            $this->error($conflito);
        }
    }
}

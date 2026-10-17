<?php

namespace Tests\Feature\CargaInicial;

use App\Console\CargaInicial\ArquivoDeCarga;
use App\Console\CargaInicial\CargaInvalidaException;
use App\Console\CargaInicial\Instante;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CargaInicial\CargaSintetica;
use Tests\TestCase;

/**
 * O `carga.json` é o contrato entre o extrator da planilha e o seeder: o que
 * ele não prova, o seeder só descobre no meio da gravação em produção.
 */
class ArquivoDeCargaTest extends TestCase
{
    /** @var list<string> */
    private array $pastas = [];

    protected function tearDown(): void
    {
        foreach ($this->pastas as $pasta) {
            $this->apagar($pasta);
        }

        parent::tearDown();
    }

    private function pastaTemporaria(): string
    {
        $pasta = sys_get_temp_dir().'/carga-'.bin2hex(random_bytes(6));
        mkdir($pasta, 0777, true);

        return $this->pastas[] = $pasta;
    }

    private function apagar(string $caminho): void
    {
        if (is_dir($caminho)) {
            foreach (scandir($caminho) as $item) {
                if ($item !== '.' && $item !== '..') {
                    $this->apagar($caminho.'/'.$item);
                }
            }
            rmdir($caminho);
        } elseif (file_exists($caminho)) {
            unlink($caminho);
        }
    }

    public function test_carga_sintetica_e_valida(): void
    {
        $this->assertSame([], ArquivoDeCarga::validar(CargaSintetica::payload()));
    }

    public function test_ler_recusa_schema_version_desconhecida(): void
    {
        $p = CargaSintetica::payload();
        $p['schema_version'] = 2;
        CargaSintetica::gravarEm($pasta = $this->pastaTemporaria(), $p);

        try {
            ArquivoDeCarga::ler($pasta);
            $this->fail('esperava CargaInvalidaException');
        } catch (CargaInvalidaException $e) {
            $this->assertStringContainsString('schema_version', implode("\n", $e->erros()));
        }
    }

    public function test_validar_acusa_curso_inexistente_codigo_repetido_rut_invalido_e_turma_nao_aprovada(): void
    {
        $p = CargaSintetica::payload();
        $p['orcamentos'][0]['cotacao']['curso'] = 'Z#';
        $p['orcamentos'][1]['turma']['matriculas'][0]['certificado']['codigo'] = 'LOT-2026-001';
        $p['alunos'][0]['rut'] = '11.111.111-2';
        $p['orcamentos'][1]['cotacao']['status'] = 'pending';
        $erros = implode("\n", ArquivoDeCarga::validar($p));

        $this->assertStringContainsString('Z#', $erros);
        $this->assertStringContainsString('LOT-2026-001', $erros);
        $this->assertStringContainsString('11.111.111-2', $erros);
        $this->assertStringContainsString('180', $erros); // a SCAP da turma em cotação pendente
    }

    public function test_ler_acusa_documento_ausente_na_pasta(): void
    {
        CargaSintetica::gravarEm($pasta = $this->pastaTemporaria());
        unlink("{$pasta}/documentos/R1-CV.pdf");

        $this->expectException(CargaInvalidaException::class);
        ArquivoDeCarga::ler($pasta);
    }

    public function test_instante_e_meio_dia_de_santiago_em_utc(): void
    {
        $this->assertTrue(Instante::meioDia('2026-07-10')->equalTo(
            CarbonImmutable::parse('2026-07-10 12:00:00', 'America/Santiago')->utc()
        ));
    }

    public function test_ler_devolve_o_arquivo_quando_valido(): void
    {
        CargaSintetica::gravarEm($pasta = $this->pastaTemporaria());

        $this->assertSame(CargaSintetica::payload(), ArquivoDeCarga::ler($pasta));
    }

    /** @return array<string, array{callable(array<string, mixed>): array<string, mixed>, string}> */
    public static function alteracoesInvalidas(): array
    {
        return [
            'data fora do formato' => [function (array $p) {
                $p['orcamentos'][0]['data'] = '13/02/2026';

                return $p;
            }, 'orcamentos.0.data'],
            'value_uf negativo' => [function (array $p) {
                $p['orcamentos'][0]['cotacao']['value_uf'] = '-1';

                return $p;
            }, 'value_uf'],
            'tipo de documento fora do enum' => [function (array $p) {
                $p['redatores'][0]['documentos'][0]['type'] = 'LIBRE';

                return $p;
            }, 'documentos.0.type'],
            'status de cotação fora do enum' => [function (array $p) {
                $p['orcamentos'][0]['cotacao']['status'] = 'draft';

                return $p;
            }, 'cotacao.status'],
            'approval_status fora do enum' => [function (array $p) {
                $p['orcamentos'][0]['turma']['matriculas'][0]['approval_status'] = 'otro';

                return $p;
            }, 'approval_status'],
            'nota não numérica' => [function (array $p) {
                $p['orcamentos'][0]['turma']['matriculas'][0]['nota'] = 'siete';

                return $p;
            }, 'nota'],
            'campo obrigatório ausente' => [function (array $p) {
                unset($p['cliente']['legal_name']);

                return $p;
            }, 'cliente.legal_name'],
            'turma termina antes de começar' => [function (array $p) {
                $p['orcamentos'][0]['turma']['end_date'] = '2026-02-12';

                return $p;
            }, 'end_date'],
            'approved sem approved_on' => [function (array $p) {
                $p['orcamentos'][0]['cotacao']['approved_on'] = null;

                return $p;
            }, 'approved_on'],
            'pending com approved_on' => [function (array $p) {
                $p['orcamentos'][2]['cotacao']['approved_on'] = '2026-03-10';

                return $p;
            }, 'approved_on'],
            'chave de curso repetida' => [function (array $p) {
                $p['cursos'][1]['chave'] = 'A#';

                return $p;
            }, 'cursos.chave'],
            'SCAP repetida' => [function (array $p) {
                $p['orcamentos'][1]['scap'] = 176;

                return $p;
            }, 'orcamentos.scap'],
            'e-mail de aluno repetido' => [function (array $p) {
                $p['alunos'][1]['email'] = $p['alunos'][0]['email'];

                return $p;
            }, 'alunos.email'],
            'RUT de aluno repetido com outra formatação' => [function (array $p) {
                $p['alunos'][1]['rut'] = str_replace('.', '', $p['alunos'][0]['rut']);

                return $p;
            }, 'alunos.rut'],
            'tipo de documento repetido no redator' => [function (array $p) {
                $p['redatores'][0]['documentos'][1]['type'] = 'CV';

                return $p;
            }, 'documentos.type'],
            'aluno repetido na turma' => [function (array $p) {
                $p['orcamentos'][0]['turma']['matriculas'][1]['aluno'] = $p['orcamentos'][0]['turma']['matriculas'][0]['aluno'];

                return $p;
            }, 'matriculas.aluno'],
            'redator da turma inexistente' => [function (array $p) {
                $p['orcamentos'][0]['turma']['redator'] = 'XX';

                return $p;
            }, 'turma.redator XX'],
            'curso habilitado inexistente' => [function (array $p) {
                $p['redatores'][0]['cursos'][] = 'Q#';

                return $p;
            }, 'Q#'],
            'matrícula de aluno fora de alunos' => [function (array $p) {
                $p['orcamentos'][0]['turma']['matriculas'][0]['aluno'] = CargaSintetica::rut(16999999);

                return $p;
            }, 'não existe em alunos'],
            'turma de curso diferente da cotação' => [function (array $p) {
                $p['orcamentos'][0]['turma']['curso'] = 'B#';

                return $p;
            }, 'difere de cotacao.curso'],
            'RUT de cliente inválido' => [function (array $p) {
                $p['cliente']['rut'] = '76.111.111-0';

                return $p;
            }, 'cliente: RUT'],
            'RUT de redator inválido' => [function (array $p) {
                $p['redatores'][0]['rut'] = '15.111.111-0';

                return $p;
            }, 'redator R1: RUT'],
        ];
    }

    /** @param callable(array<string, mixed>): array<string, mixed> $alterar */
    #[DataProvider('alteracoesInvalidas')]
    public function test_validar_acusa_a_alteracao_invalida(callable $alterar, string $esperado): void
    {
        $erros = implode("\n", ArquivoDeCarga::validar($alterar(CargaSintetica::payload())));

        $this->assertStringContainsString($esperado, $erros);
    }

    public function test_ler_recusa_json_malformado_e_pasta_sem_carga(): void
    {
        $pasta = $this->pastaTemporaria();

        try {
            ArquivoDeCarga::ler($pasta);
            $this->fail('esperava CargaInvalidaException para pasta sem carga.json');
        } catch (CargaInvalidaException $e) {
            $this->assertStringContainsString('carga.json', $e->getMessage());
        }

        file_put_contents($pasta.'/carga.json', '{ nao e json');

        $this->expectException(CargaInvalidaException::class);
        ArquivoDeCarga::ler($pasta);
    }
}

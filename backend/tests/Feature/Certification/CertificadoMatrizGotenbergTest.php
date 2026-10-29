<?php

namespace Tests\Feature\Certification;

use App\Shared\Support\TetosImpressos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\Certification\MedicaoDePdf;
use Tests\Support\Certification\MedidorDeCertificado;
use Tests\Support\Certification\TextoRealista;
use Tests\Support\ProbesGotenberg;
use Tests\TestCase;

/**
 * A matriz do certificado no Gotenberg REAL (spec D11, D15 e D17). Cada linha do
 * provider é um perfil de dado que pode quebrar o layout, e a asserção é a
 * promessa da spec para ele: 2 páginas com assinaturas na primeira para texto
 * realista dentro dos tetos, 1 sem temário, e NUNCA texto perdido — nem com o
 * adversário (sem espaço, glifo largo), que pode levar as assinaturas à página 2.
 *
 * É pulado fora do container (sem Gotenberg). Trocar a tag do Gotenberg nos
 * composes obriga a rodar esta matriz de novo (D17), e o `matriz.md` do bloco
 * guarda a última saída conferida.
 */
class CertificadoMatrizGotenbergTest extends TestCase
{
    use ProbesGotenberg;
    use RefreshDatabase;

    /** Um temário de 3 itens por módulo é o tamanho do aprovado: cabe numa página com folga. */
    private const MODULOS_APROVADO = 8;

    private const MODULOS_GRANDE = 16;

    /** A gerente e o instrutor do cenário-base: valores curtos e reais. */
    private const BASE = [
        'aluno' => 'SEBASTIÁN GALLARDO',
        'curso' => 'MANTENIMIENTO DE SUBESTACIONES',
        'tecnico' => 'MANTENIMIENTO PREVENTIVO Y CORRECTIVO DE SUBESTACIONES ELÉCTRICAS',
        'razao' => 'TRANSELEC S.A.',
        'redator' => 'PEDRO SOTO',
        'gerente' => 'MARCIA DE BATALHA',
        'cargo' => 'Gerente OTEC',
        'desc' => 'Mantenimiento preventivo y correctivo de subestaciones: inspección de equipos, ensayos y puesta en servicio.',
    ];

    public function test_o_certificado_da_referencia_ocupa_duas_paginas(): void
    {
        $this->skipUnlessGotenberg();

        $caso = self::caso();
        $medicao = $this->app->make(MedidorDeCertificado::class)
            ->medir(self::snapshot($caso), self::validoAte($caso), self::gerente($caso));

        $this->assertSame(2, $medicao->paginas);
    }

    /** @param array<string, mixed> $caso */
    #[DataProvider('casos')]
    public function test_a_matriz(array $caso): void
    {
        $this->skipUnlessGotenberg();

        $caso = self::caso($caso);
        $medicao = $this->app->make(MedidorDeCertificado::class)
            ->medir(self::snapshot($caso), self::validoAte($caso), self::gerente($caso));

        $this->assertCadaPaginaTemRodapeELogo($medicao);
        $this->assertSemReticencias($medicao);
        $this->assertNenhumTextoPerdido($medicao, $caso);

        match ($caso['tipo']) {
            'realista' => $this->assertDuasPaginas($medicao, $caso),
            'sem_temario' => $this->assertUmaPagina($medicao, $caso),
            'sem_temario_no_limite' => $this->assertAssinaturasNaPrimeiraPagina($medicao, $caso),
            'temario_grande' => $this->assertTituloColadoAoPrimeiroMarcador($medicao, $caso),
            'adversario' => null,
        };
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function casos(): array
    {
        $nome = fn (int $teto): string => TextoRealista::nome($teto);
        $largo = fn (int $teto): string => TextoRealista::adversario($teto);

        $tetos = [
            'aluno' => TetosImpressos::NOME_ALUNO,
            'curso' => TetosImpressos::NOME_CURSO,
            'tecnico' => TetosImpressos::NOME_TECNICO,
            'razao' => TetosImpressos::RAZAO_SOCIAL,
            'cargo' => TetosImpressos::CARGO_ASSINANTE,
        ];

        $casos = [];

        foreach ($tetos as $campo => $teto) {
            $casos["{$campo} no teto, sozinho"] = [['campos' => [$campo => $nome($teto)]]];
        }

        $casos['assinantes no teto, sozinhos'] = [['campos' => [
            'redator' => $nome(TetosImpressos::NOME_ASSINANTE),
            'gerente' => $nome(TetosImpressos::NOME_ASSINANTE),
        ]]];
        $casos['todos os nomes no teto juntos, com nota, asistencia e vigencia'] = [['campos' => self::nomesNoTeto()]];
        $casos['descricao no teto'] = [['campos' => ['desc' => TextoRealista::prosa(TetosImpressos::DESCRICAO_CURSO)]]];
        $casos['todos os nomes e a descricao no teto'] = [['campos' => self::nomesNoTeto() + [
            'desc' => TextoRealista::prosa(TetosImpressos::DESCRICAO_CURSO),
        ]]];
        $casos['temario do tamanho do aprovado (8 modulos)'] = [['modulos' => self::MODULOS_APROVADO]];
        $casos['temario do tamanho do aprovado, com tudo no teto'] = [[
            'modulos' => self::MODULOS_APROVADO,
            'campos' => self::nomesNoTeto() + ['desc' => TextoRealista::prosa(TetosImpressos::DESCRICAO_CURSO)],
        ]];
        $casos['temario grande (16 modulos)'] = [['modulos' => self::MODULOS_GRANDE, 'tipo' => 'temario_grande']];
        $casos['sem campos opcionais'] = [['opcionais' => false]];
        $casos['sem temario'] = [['modulos' => 0, 'tipo' => 'sem_temario']];
        // Achado da Task 6: sem temário, o aviso legal divide a página 1 com as assinaturas, e com TUDO
        // no teto ele desce sozinho para a página 2 (a descrição só cabe com ~280 caracteres para 1 página).
        // Está dentro da D15 (as assinaturas ficam na 1 e nada se perde) e o caso fixa isso.
        $casos['sem temario, com tudo no teto'] = [[
            'modulos' => 0,
            'tipo' => 'sem_temario_no_limite',
            'campos' => self::nomesNoTeto() + ['desc' => TextoRealista::prosa(TetosImpressos::DESCRICAO_CURSO)],
        ]];

        foreach ($tetos as $campo => $teto) {
            $casos["adversario no teto: {$campo}"] = [['tipo' => 'adversario', 'campos' => [$campo => $largo($teto)]]];
        }

        $casos['adversario no teto: assinantes'] = [['tipo' => 'adversario', 'campos' => [
            'redator' => $largo(TetosImpressos::NOME_ASSINANTE),
            'gerente' => $largo(TetosImpressos::NOME_ASSINANTE),
        ]]];
        $casos['adversario no teto: descricao'] = [['tipo' => 'adversario', 'campos' => [
            'desc' => $largo(TetosImpressos::DESCRICAO_CURSO),
        ]]];
        $casos['adversario no teto: todos os campos'] = [['tipo' => 'adversario', 'campos' => [
            'aluno' => $largo(TetosImpressos::NOME_ALUNO),
            'curso' => $largo(TetosImpressos::NOME_CURSO),
            'tecnico' => $largo(TetosImpressos::NOME_TECNICO),
            'razao' => $largo(TetosImpressos::RAZAO_SOCIAL),
            'redator' => $largo(TetosImpressos::NOME_ASSINANTE),
            'gerente' => $largo(TetosImpressos::NOME_ASSINANTE),
            'cargo' => $largo(TetosImpressos::CARGO_ASSINANTE),
            'desc' => $largo(TetosImpressos::DESCRICAO_CURSO),
        ]]];

        return $casos;
    }

    // ── asserções ────────────────────────────────────────────────────────────

    private function assertCadaPaginaTemRodapeELogo(MedicaoDePdf $medicao): void
    {
        [$larguraDoLogo, $alturaDoLogo] = getimagesize(resource_path('images/lotus-logo.png'));

        for ($pagina = 1; $pagina <= $medicao->paginas; $pagina++) {
            $this->assertStringContainsString(
                MedidorDeCertificado::CODIGO." · Página {$pagina} de {$medicao->paginas}",
                $medicao->pagina($pagina),
                "a página {$pagina} perdeu o rodapé numerado",
            );

            $logos = array_filter(
                $medicao->imagensPorPagina[$pagina - 1],
                fn (array $imagem) => $imagem['type'] === 'image'
                    && $imagem['width'] === $larguraDoLogo
                    && $imagem['height'] === $alturaDoLogo,
            );
            $this->assertNotEmpty($logos, "a página {$pagina} perdeu o logo");
        }
    }

    private function assertSemReticencias(MedicaoDePdf $medicao): void
    {
        for ($pagina = 1; $pagina <= $medicao->paginas; $pagina++) {
            $this->assertStringNotContainsString('…', $medicao->pagina($pagina), "reticências na página {$pagina}: o PDF elidiu texto");
        }
    }

    /** O PDF nunca corta texto: toda entrada impressa está inteira no PDF, sem contar espaços. */
    private function assertNenhumTextoPerdido(MedicaoDePdf $medicao, array $caso): void
    {
        $campos = $caso['campos'] + self::BASE;

        foreach (['aluno', 'curso', 'tecnico', 'razao', 'redator', 'gerente', 'cargo', 'desc'] as $campo) {
            $this->assertTrue($medicao->contem($campos[$campo]), "o campo {$campo} perdeu texto no PDF");
        }
    }

    private function assertDuasPaginas(MedicaoDePdf $medicao, array $caso): void
    {
        $campos = $caso['campos'] + self::BASE;

        $this->assertSame(2, $medicao->paginas);
        $this->assertSame(1, $medicao->paginaDe('Instructor'), 'o instrutor saiu da página 1');
        $this->assertSame(1, $medicao->paginaDe($campos['redator']), 'o nome do instrutor saiu da página 1');
        $this->assertSame(1, $medicao->paginaDe($campos['gerente']), 'o nome da gerente saiu da página 1');
        $this->assertSame(1, $medicao->paginaDe($campos['cargo']), 'o cargo da gerente saiu da página 1');
        $this->assertSame(2, $medicao->paginaDe('Temario del curso'));
    }

    private function assertUmaPagina(MedicaoDePdf $medicao, array $caso): void
    {
        $campos = $caso['campos'] + self::BASE;

        $this->assertSame(1, $medicao->paginas);
        $this->assertSame(1, $medicao->paginaDe('Instructor'));
        $this->assertSame(1, $medicao->paginaDe($campos['cargo']));
        $this->assertNull($medicao->paginaDe('Temario del curso'));
    }

    private function assertAssinaturasNaPrimeiraPagina(MedicaoDePdf $medicao, array $caso): void
    {
        $campos = $caso['campos'] + self::BASE;

        $this->assertLessThanOrEqual(2, $medicao->paginas);
        $this->assertSame(1, $medicao->paginaDe('Instructor'));
        $this->assertSame(1, $medicao->paginaDe($campos['redator']));
        $this->assertSame(1, $medicao->paginaDe($campos['gerente']));
        $this->assertSame(1, $medicao->paginaDe($campos['cargo']));
    }

    private function assertTituloColadoAoPrimeiroMarcador(MedicaoDePdf $medicao, array $caso): void
    {
        $this->assertGreaterThan(2, $medicao->paginas, 'o temário grande tem de passar de uma página');

        foreach (self::modulos($caso['modulos']) as $modulo) {
            $primeiroMarcador = strtok($modulo['contents'], "\n");

            $this->assertNotNull($medicao->paginaDe($modulo['name']), "o título «{$modulo['name']}» sumiu");
            $this->assertSame(
                $medicao->paginaDe($modulo['name']),
                $medicao->paginaDe($primeiroMarcador),
                "o título «{$modulo['name']}» ficou separado do primeiro marcador",
            );
        }
    }

    // ── cenário ──────────────────────────────────────────────────────────────

    /**
     * @param  array<string, mixed>  $caso
     * @return array<string, mixed>
     */
    private static function caso(array $caso = []): array
    {
        return $caso + ['campos' => [], 'modulos' => self::MODULOS_APROVADO, 'opcionais' => true, 'tipo' => 'realista'];
    }

    /** @return array<string, string> */
    private static function nomesNoTeto(): array
    {
        return [
            'aluno' => TextoRealista::nome(TetosImpressos::NOME_ALUNO),
            'curso' => TextoRealista::nome(TetosImpressos::NOME_CURSO),
            'tecnico' => TextoRealista::nome(TetosImpressos::NOME_TECNICO),
            'razao' => TextoRealista::nome(TetosImpressos::RAZAO_SOCIAL),
            'redator' => TextoRealista::nome(TetosImpressos::NOME_ASSINANTE),
            'gerente' => TextoRealista::nome(TetosImpressos::NOME_ASSINANTE),
            'cargo' => TextoRealista::nome(TetosImpressos::CARGO_ASSINANTE),
        ];
    }

    /**
     * Módulos de 3 marcadores, com título e primeiro marcador únicos no PDF, para
     * a página de cada um ser lida pelo texto.
     *
     * @return list<array{sort_order: int, name: string, contents: string}>
     */
    private static function modulos(int $quantidade): array
    {
        $modulos = [];

        for ($i = 1; $i <= $quantidade; $i++) {
            $modulos[] = [
                'sort_order' => $i,
                'name' => "{$i}. Módulo {$i} de seguridad en instalaciones eléctricas de alta tensión",
                'contents' => "Módulo {$i}, punto uno: reglamento de seguridad para trabajos en líneas energizadas\n"
                    ."Módulo {$i}, punto dos: normativa SEC aplicable a instalaciones\n"
                    ."Módulo {$i}, punto tres: responsabilidades del jefe de faena",
            ];
        }

        return $modulos;
    }

    /**
     * @param  array<string, mixed>  $caso
     * @return array<string, mixed>
     */
    private static function snapshot(array $caso): array
    {
        $campos = $caso['campos'] + self::BASE;

        return [
            'schema_version' => 2,
            'aluno' => ['name' => $campos['aluno'], 'rut' => '16.200.019-5'],
            'curso' => [
                'name' => $campos['curso'],
                'technical_name' => $campos['tecnico'],
                'workload_hours' => 32,
                'description' => $campos['desc'],
                'modules' => self::modulos($caso['modulos']),
            ],
            'turma' => ['id' => null, 'start_date' => '2026-07-13', 'end_date' => '2026-08-07', 'modalidade' => 'presencial'],
            'cliente' => ['name' => $campos['razao'], 'rut' => '78.987.654-1'],
            'emissor' => ['name' => 'OTEC LOTUS SpA', 'rut' => '77.510.327-2'],
            'redator' => ['name' => $campos['redator'], 'rut' => '9.876.543-3'],
            'resultado' => [
                'grades' => $caso['opcionais'] ? ['final' => 6.5] : null,
                'approval_status' => 'aprobado',
                'attendance_pct' => $caso['opcionais'] ? '95.00' : null,
            ],
            'template' => ['version' => 2, 'city' => null],
            'ciudad_emision' => 'Santiago',
            'emitido_em' => '2026-10-28',
        ];
    }

    /** @param array<string, mixed> $caso */
    private static function validoAte(array $caso): ?string
    {
        return $caso['opcionais'] ? '2028-10-28' : null;
    }

    /**
     * @param  array<string, mixed>  $caso
     * @return array{nome: string, cargo: string}
     */
    private static function gerente(array $caso): array
    {
        $campos = $caso['campos'] + self::BASE;

        return ['nome' => $campos['gerente'], 'cargo' => $campos['cargo']];
    }
}

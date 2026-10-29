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
 * Cada campo tem o SEU texto (passo de palavras no realista, glifo no adversário):
 * um texto que fosse substring do de outro campo deixaria um corte passar. O
 * `test_as_entradas_de_cada_caso_sao_distinguiveis` guarda isso.
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

    private const TETOS = [
        'aluno' => TetosImpressos::NOME_ALUNO,
        'curso' => TetosImpressos::NOME_CURSO,
        'tecnico' => TetosImpressos::NOME_TECNICO,
        'razao' => TetosImpressos::RAZAO_SOCIAL,
        'redator' => TetosImpressos::NOME_ASSINANTE,
        'gerente' => TetosImpressos::NOME_ASSINANTE,
        'cargo' => TetosImpressos::CARGO_ASSINANTE,
        'desc' => TetosImpressos::DESCRICAO_CURSO,
    ];

    /** De quantas em quantas palavras do corpus cada nome anda: sequências distintas, sem substring entre campos. */
    private const PASSOS = ['aluno' => 1, 'curso' => 2, 'tecnico' => 4, 'razao' => 5, 'redator' => 7, 'gerente' => 8, 'cargo' => 10];

    /** O glifo largo de cada campo adversário: nenhum run é substring de outro. */
    private const GLIFOS = ['aluno' => 'W', 'curso' => 'M', 'tecnico' => 'Q', 'razao' => 'O', 'redator' => 'D', 'gerente' => 'H', 'cargo' => 'N', 'desc' => 'X'];

    /** O cenário-base: valores curtos e reais. */
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

    /** Os campos que a regra dos tetos mede em linhas (a descrição não: ela é medida pela página das assinaturas). */
    private const NOMES = ['aluno', 'curso', 'tecnico', 'razao', 'redator', 'gerente', 'cargo'];

    /**
     * O certificado de `referencia-layout-p1.png` e `-p2.png` (v5 aprovada), com o
     * temário DELA: 5 módulos e 16 marcadores, no máximo 4 por módulo. A referência
     * mostra no quadro do temário o nome de OUTRO curso (um mock); aqui o nome é o
     * da página 1, o único que o snapshot tem.
     */
    public function test_o_certificado_da_referencia_ocupa_duas_paginas(): void
    {
        $this->skipUnlessGotenberg();

        $caso = self::caso([
            'campos' => [
                'aluno' => 'Sebastián Gallardo',
                'curso' => 'Mantenimiento de subestaciones',
                'tecnico' => 'Mantenimiento preventivo y correctivo de subestaciones eléctricas',
                'razao' => 'Transelec',
                'redator' => 'Pedro Soto',
                'gerente' => 'Marcia de Batalha',
            ],
            'modulos' => self::modulosDaReferencia(),
            'opcionais' => false,
        ]);
        $medicao = $this->medir($caso);

        $this->assertSame(2, $medicao->paginas);
        $this->assertSame(1, $medicao->paginaDe('Instructor'));
        $this->assertSame(2, $medicao->paginaDe('Temario del curso'));
        $this->assertNenhumTextoPerdido($medicao, $caso);
    }

    /** @param array<string, mixed> $caso */
    #[DataProvider('casos')]
    public function test_a_matriz(array $caso): void
    {
        $this->skipUnlessGotenberg();

        $caso = self::caso($caso);
        $medicao = $this->medir($caso);

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

        if ($caso['tipo'] !== 'adversario') {
            $this->assertNomesEmNoMaximoDuasLinhas($medicao, $caso);
        }
    }

    /**
     * Se o texto de um campo fosse substring do de outro, cortar o primeiro passaria
     * despercebido pela busca no PDF inteiro. Não precisa do Gotenberg.
     *
     * @param  array<string, mixed>  $caso
     */
    #[DataProvider('casos')]
    public function test_as_entradas_de_cada_caso_sao_distinguiveis(array $caso): void
    {
        $campos = self::caso($caso)['campos'] + self::BASE;
        $entradas = array_map(MedicaoDePdf::semEspacos(...), $campos);

        foreach ($entradas as $a => $textoA) {
            foreach ($entradas as $b => $textoB) {
                if ($a !== $b) {
                    $this->assertFalse(str_contains($textoA, $textoB), "o campo {$b} é substring do campo {$a}");
                }
            }
        }
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function casos(): array
    {
        $casos = [];

        foreach (['aluno', 'curso', 'tecnico', 'razao', 'cargo'] as $campo) {
            $casos["{$campo} no teto, sozinho"] = [['campos' => [$campo => self::nome($campo)]]];
        }

        $casos['assinantes no teto, sozinhos'] = [['campos' => [
            'redator' => self::nome('redator'),
            'gerente' => self::nome('gerente'),
        ]]];
        $casos['todos os nomes no teto juntos, com nota, asistencia e vigencia'] = [['campos' => self::nomesNoTeto()]];
        $casos['descricao no teto'] = [['campos' => ['desc' => self::prosaNoTeto()]]];
        $casos['todos os nomes e a descricao no teto'] = [['campos' => self::nomesNoTeto() + ['desc' => self::prosaNoTeto()]]];
        $casos['temario do tamanho do aprovado (8 modulos)'] = [['modulos' => self::MODULOS_APROVADO]];
        $casos['temario do tamanho do aprovado, com tudo no teto'] = [[
            'modulos' => self::MODULOS_APROVADO,
            'campos' => self::nomesNoTeto() + ['desc' => self::prosaNoTeto()],
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
            'campos' => self::nomesNoTeto() + ['desc' => self::prosaNoTeto()],
        ]];

        foreach (['aluno', 'curso', 'tecnico', 'razao', 'cargo'] as $campo) {
            $casos["adversario no teto: {$campo}"] = [['tipo' => 'adversario', 'campos' => [$campo => self::largo($campo)]]];
        }

        $casos['adversario no teto: assinantes'] = [['tipo' => 'adversario', 'campos' => [
            'redator' => self::largo('redator'),
            'gerente' => self::largo('gerente'),
        ]]];
        $casos['adversario no teto: descricao'] = [['tipo' => 'adversario', 'campos' => ['desc' => self::largo('desc')]]];
        $casos['adversario no teto: todos os campos'] = [['tipo' => 'adversario', 'campos' => array_combine(
            array_keys(self::TETOS),
            array_map(self::largo(...), array_keys(self::TETOS)),
        )]];

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

    /**
     * O PDF nunca corta texto: toda entrada impressa está inteira no PDF, sem contar
     * espaços. O nome do curso sai duas vezes (página 1 e cabeçalho do temário), então
     * a presença dele é conferida na página 1 SOZINHA: um corte lá passaria pelo
     * cabeçalho.
     */
    private function assertNenhumTextoPerdido(MedicaoDePdf $medicao, array $caso): void
    {
        $campos = $caso['campos'] + self::BASE;

        foreach (array_keys(self::TETOS) as $campo) {
            $this->assertTrue($medicao->contem($campos[$campo]), "o campo {$campo} perdeu texto no PDF");
        }

        $this->assertTrue($medicao->contemNaPagina(1, $campos['curso']), 'o nome do curso perdeu texto na página 1');
    }

    /** A regra que define os tetos: cada nome, na própria caixa, ocupa no máximo 2 linhas. */
    private function assertNomesEmNoMaximoDuasLinhas(MedicaoDePdf $medicao, array $caso): void
    {
        $campos = $caso['campos'] + self::BASE;

        foreach (self::NOMES as $campo) {
            // A caixa do técnico leva o " · N horas cronológicas" na mesma linha.
            $trecho = $campo === 'tecnico' ? $campos[$campo].' · 32 horas cronológicas' : $campos[$campo];
            $linhas = $medicao->linhasDe($trecho);

            $this->assertGreaterThan(0, $linhas, "não achei o campo {$campo} no PDF para contar linhas");
            $this->assertLessThanOrEqual(2, $linhas, "o campo {$campo} ocupa {$linhas} linhas, acima das 2 da regra dos tetos");
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

    /** @param array<string, mixed> $caso */
    private function medir(array $caso): MedicaoDePdf
    {
        return $this->app->make(MedidorDeCertificado::class)
            ->medir(self::snapshot($caso), self::validoAte($caso), self::gerente($caso));
    }

    /**
     * @param  array<string, mixed>  $caso
     * @return array<string, mixed>
     */
    private static function caso(array $caso = []): array
    {
        return $caso + ['campos' => [], 'modulos' => self::MODULOS_APROVADO, 'opcionais' => true, 'tipo' => 'realista'];
    }

    private static function nome(string $campo): string
    {
        return TextoRealista::nome(self::TETOS[$campo], self::PASSOS[$campo]);
    }

    private static function largo(string $campo): string
    {
        return TextoRealista::adversario(self::TETOS[$campo], self::GLIFOS[$campo]);
    }

    private static function prosaNoTeto(): string
    {
        return TextoRealista::prosa(TetosImpressos::DESCRICAO_CURSO);
    }

    /** @return array<string, string> */
    private static function nomesNoTeto(): array
    {
        return array_combine(self::NOMES, array_map(self::nome(...), self::NOMES));
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
     * O temário de `referencia-layout-p2.png`: 5 módulos, 16 marcadores.
     *
     * @return list<array{sort_order: int, name: string, contents: string}>
     */
    private static function modulosDaReferencia(): array
    {
        $temario = [
            '1. Introducción y marco normativo' => ['Reglamento de seguridad para trabajos en líneas energizadas', 'Normativa SEC aplicable', 'Responsabilidades del jefe de faena'],
            '2. Métodos de trabajo en tensión' => ['Método a distancia', 'Método a potencial', 'Método de contacto', 'Selección del método según nivel de tensión'],
            '3. Equipos y herramientas' => ['Pértigas aislantes y accesorios', 'Equipos de protección personal dieléctricos', 'Ensayos dieléctricos y mantenimiento de herramientas'],
            '4. Procedimientos y control de riesgos' => ['Análisis de riesgos antes del trabajo', 'Charla de 5 minutos', 'Distancias mínimas de seguridad', 'Plan de rescate en altura'],
            '5. Práctica supervisada en terreno' => ['Maniobras en estructura de 220 kV', 'Evaluación práctica individual'],
        ];
        $modulos = [];

        foreach ($temario as $titulo => $marcadores) {
            $modulos[] = ['sort_order' => count($modulos) + 1, 'name' => $titulo, 'contents' => implode("\n", $marcadores)];
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
        $modulos = is_array($caso['modulos']) ? $caso['modulos'] : self::modulos($caso['modulos']);

        return [
            'schema_version' => 2,
            'aluno' => ['name' => $campos['aluno'], 'rut' => '16.200.019-5'],
            'curso' => [
                'name' => $campos['curso'],
                'technical_name' => $campos['tecnico'],
                'workload_hours' => 32,
                'description' => $campos['desc'],
                'modules' => $modulos,
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

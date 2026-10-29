<?php

namespace Tests\Unit\Shared;

use App\Shared\Support\FrontendPath;
use App\Shared\Support\TetosImpressos;
use Tests\TestCase;

/**
 * Os tetos de caracteres dos campos impressos moram em `TetosImpressos` (backend
 * recusa) e em `shared/config/tetosImpressos.ts` (o front limita a digitação).
 * Dois números por campo, sem nada que os ligasse: este teste os iguala.
 *
 * Sem `markTestSkipped`: se o `.ts` não for achado, REPROVA (lição 10). O
 * caminho sai de `FrontendPath`, como em `PermissionI18nParityTest`.
 */
class TetosImpressosParityTest extends TestCase
{
    /** chave do `.ts` => constante PHP */
    private const CAMPOS = [
        'nomeAluno' => TetosImpressos::NOME_ALUNO,
        'nomeCurso' => TetosImpressos::NOME_CURSO,
        'nomeTecnico' => TetosImpressos::NOME_TECNICO,
        'descricaoCurso' => TetosImpressos::DESCRICAO_CURSO,
        'razaoSocial' => TetosImpressos::RAZAO_SOCIAL,
        'nomeAssinante' => TetosImpressos::NOME_ASSINANTE,
        'cargoAssinante' => TetosImpressos::CARGO_ASSINANTE,
    ];

    public function test_o_front_tem_os_mesmos_tetos_do_backend(): void
    {
        $path = FrontendPath::de('src/shared/config/tetosImpressos.ts');
        $this->assertFileExists($path, "Tetos do front não encontrados em {$path}");

        $fonte = (string) file_get_contents($path);

        preg_match_all('/^\s*(\w+):\s*(\d+),?\s*$/m', $fonte, $m);
        $front = array_map('intval', array_combine($m[1], $m[2]));

        ksort($front);
        $esperado = self::CAMPOS;
        ksort($esperado);

        $this->assertSame(
            $esperado,
            $front,
            'tetosImpressos.ts diverge de TetosImpressos.php (chaves ou números).',
        );
    }
}

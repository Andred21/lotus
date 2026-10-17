<?php

namespace Tests\Support\CargaInicial;

use App\Shared\Support\Rut;
use LogicException;
use Tests\Support\Files\BuildsRealUploads;

/**
 * Um `carga.json` inventado: RUTs fictícios com DV válido, gerados aqui, e
 * PDFs reais de poucos bytes. Dado pessoal de verdade nunca entra no repo
 * (spec §4); os testes da carga afirmam sobre ESTES valores.
 */
final class CargaSintetica
{
    /** O RUT formatado cujo DV faz `Rut::parse()->isValid()` ser verdadeiro. */
    public static function rut(int $numero): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $rut = Rut::parse($numero.$dv);

            if ($rut->isValid()) {
                return $rut->format();
            }
        }

        throw new LogicException(sprintf('nenhum DV valida o número %d', $numero));
    }

    /** `<RUT sem pontos nem hífen>@sin-correo.invalid` (spec §5.1). */
    public static function email(string $rut): string
    {
        $r = Rut::parse($rut);

        return strtolower($r->number.$r->dv).'@sin-correo.invalid';
    }

    /** @return array<string, mixed> */
    public static function payload(): array
    {
        $cliente = self::rut(76111111);
        $uno = self::rut(16111111);
        $dos = self::rut(16222222);
        $tres = self::rut(16333333);

        $certificado = fn (string $codigo, string $emitido, string $validoAte, string $aluno, string $curso, int $horas, string $cidade) => [
            'codigo' => $codigo,
            'emitido_em' => $emitido,
            'valido_ate' => $validoAte,
            'aluno_impresso' => $aluno,
            'curso_impresso' => $curso,
            'horas_impressas' => $horas,
            'cliente_impresso' => 'EMPRESA PRUEBA LTDA.',
            'cliente_rut_impresso' => $cliente,
            'redator_impresso' => 'Relator P.',
            'cidade' => $cidade,
        ];

        return [
            'schema_version' => 1,
            'cliente' => [
                'rut' => $cliente,
                'name' => 'EMPRESA PRUEBA LTDA.',
                'legal_name' => 'Empresa Prueba Servicios Ltda.',
                'business_activity' => 'Servicios',
                'email' => self::email($cliente),
                'desde' => '2026-02-13',
                'endereco' => [
                    'line1' => 'Calle Uno',
                    'line2' => null,
                    'number' => '100',
                    'commune' => 'Talca',
                    'city' => 'Talca',
                    'region' => 'Maule',
                    'zip_code' => null,
                ],
                'contato' => [
                    'name' => 'Contacto Prueba',
                    'email' => null,
                    'phone' => null,
                    'job_title' => null,
                ],
            ],
            'cursos' => [
                [
                    'chave' => 'A#',
                    'name' => 'Curso A (16 h)',
                    'technical_name' => 'Nombre Técnico A',
                    'description' => null,
                    'workload_hours' => 16,
                    'modulos' => [
                        ['name' => 'Módulo 1', 'learnings' => null, 'contents' => 'Contenido 1', 'theory_hours' => 0, 'practice_hours' => 0],
                        ['name' => 'Módulo 2', 'learnings' => null, 'contents' => 'Contenido 2', 'theory_hours' => 0, 'practice_hours' => 0],
                    ],
                ],
                [
                    'chave' => 'B#',
                    'name' => 'Curso B',
                    'technical_name' => null,
                    'description' => 'Descripción B',
                    'workload_hours' => 4,
                    'modulos' => [],
                ],
            ],
            'redatores' => [
                [
                    'chave' => 'R1',
                    'name' => 'Relator Prueba',
                    'rut' => self::rut(15111111),
                    'email' => 'relator@prueba.test',
                    'phone' => null,
                    'cursos' => ['A#', 'B#'],
                    'documentos' => [
                        ['type' => 'CV', 'arquivo' => 'documentos/R1-CV.pdf', 'original_name' => 'R1-CV.pdf', 'valid_until' => null],
                        ['type' => 'REUF', 'arquivo' => 'documentos/R1-REUF.pdf', 'original_name' => 'R1-REUF.pdf', 'valid_until' => null],
                    ],
                ],
            ],
            'alunos' => [
                ['rut' => $uno, 'name' => 'Alumno Uno', 'email' => self::email($uno), 'desde' => '2026-02-13'],
                ['rut' => $dos, 'name' => 'Alumno Dos', 'email' => self::email($dos), 'desde' => '2026-02-13'],
                ['rut' => $tres, 'name' => 'Alumno Tres', 'email' => self::email($tres), 'desde' => '2026-03-02'],
            ],
            'orcamentos' => [
                [
                    'scap' => 176,
                    'data' => '2026-02-13',
                    'cotacao' => ['curso' => 'A#', 'student_count' => 2, 'value_uf' => '122.3200', 'status' => 'approved', 'approved_on' => '2026-02-13'],
                    'turma' => [
                        'curso' => 'A#',
                        'local_aplicacao' => 'Talca',
                        'start_date' => '2026-02-13',
                        'end_date' => '2026-02-14',
                        'redator' => 'R1',
                        'matriculas' => [
                            [
                                'aluno' => $uno,
                                'nota' => 7,
                                'approval_status' => 'aprobado',
                                'certificado' => $certificado('LOT-2026-001', '2026-02-20', '2028-01-13', 'ALUMNO UNO', 'Nombre Técnico A', 16, 'Talca'),
                            ],
                            [
                                'aluno' => $dos,
                                'nota' => null,
                                'approval_status' => 'aprobado',
                                'certificado' => $certificado('LOT-2026-002', '2026-02-20', '2028-01-13', 'ALUMNO DOS', 'Nombre Técnico A', 16, 'Talca'),
                            ],
                        ],
                    ],
                ],
                [
                    'scap' => 180,
                    'data' => '2026-03-02',
                    'cotacao' => ['curso' => 'B#', 'student_count' => 1, 'value_uf' => '16.4700', 'status' => 'approved', 'approved_on' => '2026-03-02'],
                    'turma' => [
                        'curso' => 'B#',
                        'local_aplicacao' => 'Santiago',
                        'start_date' => '2026-03-02',
                        'end_date' => '2026-03-02',
                        'redator' => 'R1',
                        'matriculas' => [
                            [
                                'aluno' => $tres,
                                'nota' => 6,
                                'approval_status' => 'aprobado',
                                'certificado' => $certificado('LOT-2026-003', '2026-03-05', '2028-02-02', 'ALUMNO TRES', 'Curso B', 4, 'Santiago'),
                            ],
                        ],
                    ],
                ],
                [
                    'scap' => 177,
                    'data' => '2026-03-10',
                    'cotacao' => ['curso' => 'B#', 'student_count' => 10, 'value_uf' => '0.0000', 'status' => 'pending', 'approved_on' => null],
                    'turma' => null,
                ],
            ],
        ];
    }

    /**
     * Grava `carga.json` e um PDF real em cada `documentos.*.arquivo`.
     *
     * @param  array<string, mixed>|null  $payload
     */
    public static function gravarEm(string $pasta, ?array $payload = null): void
    {
        $payload ??= self::payload();

        if (! is_dir($pasta)) {
            mkdir($pasta, 0777, true);
        }

        file_put_contents(
            $pasta.'/carga.json',
            json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        );

        foreach ($payload['redatores'] as $redator) {
            foreach ($redator['documentos'] as $documento) {
                $destino = $pasta.'/'.$documento['arquivo'];

                if (! is_dir(dirname($destino))) {
                    mkdir(dirname($destino), 0777, true);
                }

                file_put_contents($destino, self::pdf());
            }
        }
    }

    /** Os bytes de `BuildsRealUploads::pdfReal()`, sem exigir um TestCase para usá-los. */
    private static function pdf(): string
    {
        return (new class
        {
            use BuildsRealUploads;

            public function bytes(): string
            {
                return $this->pdfReal();
            }
        })->bytes();
    }
}

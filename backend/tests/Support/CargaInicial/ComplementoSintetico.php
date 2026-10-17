<?php

namespace Tests\Support\CargaInicial;

/**
 * Um `complemento.json` inventado, coerente com as linhas de
 * `PlanilhaSintetica::linha()`: o curso `200#` de 16 h e dois dias, o `201#`
 * de 8 h, uma SCAP com turma (176), outra (178) que as linhas do teste de
 * contrato podem usar, e a SCAP 177 sem turma. Nada aqui é dado real.
 */
final class ComplementoSintetico
{
    /** @return array<string, mixed> */
    public static function dados(): array
    {
        return [
            'planilha' => 'Certificados/PLANILHA SINTETICA.xlsx',
            'recorte_prefixo' => 'LOT-2026-',
            'dominio_email_sintetico' => 'sin-correo.invalid',
            'excluir' => [
                ['codigo' => 'LOT-2026-020', 'motivo' => 'Curso de 2024 fora do recorte'],
            ],
            'cliente' => [
                'rut' => CargaSintetica::rut(76111111),
                'name' => 'EMPRESA PRUEBA LTDA.',
                'legal_name' => 'Empresa Prueba Servicios Ltda.',
                'business_activity' => 'Servicios',
                'endereco' => [
                    'line1' => 'Calle Uno',
                    'number' => '100',
                    'commune' => 'Talca',
                    'city' => 'Talca',
                    'region' => 'Maule',
                ],
                'contato' => ['name' => 'Contacto Prueba'],
            ],
            'instrutores' => ['Relator P.' => 'R1'],
            'cursos' => [
                [
                    'chave' => '200#',
                    'name' => 'Curso A (16 h)',
                    'technical_name' => 'Nombre Técnico A',
                    'description' => null,
                    'workload_hours' => 16,
                    'dias_de_turma' => 2,
                    'modulos' => [
                        ['name' => 'Módulo 1', 'learnings' => null, 'contents' => 'Contenido 1', 'theory_hours' => 0, 'practice_hours' => 0],
                    ],
                ],
                [
                    'chave' => '201#',
                    'name' => 'Curso B',
                    'technical_name' => null,
                    'description' => 'Descripción B',
                    'workload_hours' => 8,
                    'modulos' => [],
                ],
            ],
            'redatores' => [
                [
                    'chave' => 'R1',
                    'name' => 'Relator Prueba',
                    'rut' => CargaSintetica::rut(15111111),
                    'email' => 'relator@prueba.test',
                    'phone' => null,
                    'cursos' => ['200#', '201#'],
                    'documentos' => [
                        ['type' => 'CV', 'origem' => 'Instructores/R1/cv-r1.pdf', 'paginas' => null, 'valid_until' => null],
                        ['type' => 'TITULO', 'origem' => 'Instructores/R1/Copia de CV R1.pdf', 'paginas' => [6, 6], 'valid_until' => null],
                        ['type' => 'REUF', 'origem' => 'Instructores/R1/registro.zip#interno/reuf-r1.pdf', 'paginas' => null, 'valid_until' => '2027-12-31'],
                    ],
                ],
            ],
            'cotacoes' => [
                ['scap' => 176, 'value_uf' => 122.32, 'data' => '2026-07-01', 'sem_turma' => null],
                ['scap' => 177, 'value_uf' => 0, 'data' => '2026-08-01', 'sem_turma' => ['curso' => '201#', 'student_count' => 5]],
                ['scap' => 178, 'value_uf' => '16.47', 'data' => '2026-07-20', 'sem_turma' => null],
            ],
        ];
    }
}

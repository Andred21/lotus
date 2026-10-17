<?php

namespace App\Console\CargaInicial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;

/**
 * O que a carga dos cadastros devolve para as etapas seguintes: os registros
 * que elas referenciam, por chave do arquivo. Entidade em conflito NÃO entra
 * no mapa (o `cliente` fica nulo): quem depende dela a pula, porque a carga
 * real já está recusada pelo conflito.
 */
final readonly class Cadastros
{
    /**
     * @param  array<string, Student>  $alunos  chave = RUT formatado
     * @param  array<string, Course>  $cursos  chave = `chave` do curso no arquivo
     * @param  array<string, Redator>  $redatores  chave = `chave` do redator no arquivo
     */
    public function __construct(
        public ?Client $cliente,
        public array $alunos,
        public array $cursos,
        public array $redatores,
    ) {}
}

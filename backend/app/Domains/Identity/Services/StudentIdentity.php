<?php

namespace App\Domains\Identity\Services;

use App\Shared\Rules\ValidRut;
use App\Shared\Support\TetosDeColuna;
use App\Shared\Support\TetosImpressos;

/**
 * A identidade de um aluno como o cadastro a grava: RUT, nome, e-mail e telefone.
 * É o valor que o cadastro, a matrícula individual e a importação passam adiante,
 * e `rules()` é a fonte única da FORMA dela — `StudentData`, `EnrollStudentData` e
 * o `StudentResolver` (linha da planilha) espalham a mesma lista, em vez de cada
 * um repetir tetos e regras.
 *
 * Só a forma mora aqui. Colisão de RUT/e-mail contra o banco é do
 * `UserProvisioner`, e a obrigatoriedade do e-mail do aluno NOVO (D9) é do
 * `StudentResolver::assertCanCreate`.
 */
final readonly class StudentIdentity
{
    public function __construct(
        public string $rut,
        public string $name,
        public ?string $email,
        public ?string $phone,
    ) {}

    /**
     * @param  bool  $emailRequired  o cadastro exige e-mail; a matrícula e a planilha só o
     *                               exigem do aluno novo, e isso é decidido mais adiante
     * @return array<string, array<int, mixed>>
     */
    public static function rules(bool $emailRequired = false): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
            // Teto do que o certificado imprime (D15).
            'name' => ['required', 'string', 'max:'.TetosImpressos::NOME_ALUNO],
            'email' => [$emailRequired ? 'required' : 'nullable', 'email', 'max:'.TetosDeColuna::EMAIL],
            'phone' => ['nullable', 'string', 'max:'.TetosDeColuna::TELEFONE],
        ];
    }
}

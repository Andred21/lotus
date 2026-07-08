<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Redator;
use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de redator (professor). Campos do usuário-redator.
 * Documentos de idoneidade sobem em multipart, tratados no controller.
 */
#[TypeScript]
class RedatorData extends Data
{
    public function __construct(
        public int|Optional $id,
        #[Required]
        public string $name,
        #[Required]
        public string $rut,
        #[Required, Email]
        public string $email,
        public string|Optional|null $phone,
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
        ];
    }

    /**
     * Hidrata o DTO do model, achatando os campos do user (name/rut/email/
     * phone) para o topo. Usado nas respostas do RedatorController.
     */
    public static function fromModel(Redator $redator): self
    {
        return new self(
            id: $redator->id,
            name: $redator->user->name,
            rut: $redator->user->rut,
            email: $redator->user->email,
            phone: $redator->user->phone,
        );
    }
}

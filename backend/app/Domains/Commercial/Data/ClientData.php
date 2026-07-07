<?php

namespace App\Domains\Commercial\Data;

use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\In;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de cliente. Carrega os campos do usuário-empresa
 * (name/rut/email/phone) + os do próprio client + nested addresses/contacts.
 * A unicidade do RUT é checada na Action (não aqui — ver nota no plano).
 */
#[TypeScript]
class ClientData extends Data
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
        #[Required]
        public string $legal_name,
        #[In('client', 'provider', 'other')]
        public string $type = 'client',
        public string|Optional|null $business_activity = null,
        /** @var array<ClientAddressData> */
        #[DataCollectionOf(ClientAddressData::class)]
        public array $addresses = [],
        /** @var array<ClientContactData> */
        #[DataCollectionOf(ClientContactData::class)]
        public array $contacts = [],
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
        ];
    }

    /**
     * Hidrata o DTO do model, achatando os campos do user (name/rut/email/
     * phone) para o topo. Usado nas respostas do ClientController.
     */
    public static function fromModel(\App\Domains\Commercial\Models\Client $client): self
    {
        return new self(
            id: $client->id,
            name: $client->user->name,
            rut: $client->user->rut,
            email: $client->user->email,
            phone: $client->user->phone,
            legal_name: $client->legal_name,
            type: $client->type,
            business_activity: $client->business_activity,
            addresses: ClientAddressData::collect($client->addresses->all()),
            contacts: ClientContactData::collect($client->contacts->all()),
        );
    }
}

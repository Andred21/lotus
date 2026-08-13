<?php

namespace App\Domains\Commercial\Data;

use App\Domains\Commercial\Models\Client;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\In;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de cliente. Carrega os campos do usuário-empresa
 * (name/rut/email/phone) + os do próprio client + nested addresses/contacts.
 * A unicidade do RUT é checada na Action (não aqui — ver nota no plano).
 *
 * `addresses` e `contacts` são `Optional` na ENTRADA: ausente = não mexe na
 * coleção; `[]` = apaga tudo (explícito). A saída (`fromModel`) sempre preenche
 * as duas.
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
        /** @var array<ClientAddressData>|Optional */
        #[DataCollectionOf(ClientAddressData::class)]
        public array|Optional $addresses = new Optional,
        /** @var array<ClientContactData>|Optional */
        #[DataCollectionOf(ClientContactData::class)]
        public array|Optional $contacts = new Optional,
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
            // `sometimes`, não `required`: a coleção é `Optional`, e omitir a
            // chave num PUT significa "não mexi nos contatos" — antes apagava
            // todos em silêncio. `min:1` segue valendo quando a chave VEM, e a
            // obrigatoriedade do create mora na CreateClientAction, porque
            // rules() é estático e não distingue verbo (Drive
            // `entidade-contato-cliente.md`, ratificado em 2026-07-31).
            'contacts' => ['sometimes', 'array', 'min:1'],
        ];
    }

    /**
     * Hidrata o DTO do model, achatando os campos do user (name/rut/email/
     * phone) para o topo. Usado nas respostas do ClientController.
     */
    public static function fromModel(Client $client): self
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
            photo_url: $client->user->photo_path,
        );
    }
}

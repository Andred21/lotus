<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use App\Shared\Rules\ValidRut;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de usuário staff (type=admin). A distinção superadmin vs
 * admin é a ROLE Spatie (nunca o type). `password` é entrada-opcional (obrigatória
 * no create, validada na CreateStaffUserAction; ausente no update mantém a atual).
 * `type`/`roles`/`uuid`/`id` são só de saída (Optional na entrada).
 */
#[TypeScript]
class UserData extends Data
{
    /**
     * @param  string[]  $roles
     */
    public function __construct(
        public int|Optional $id,
        public string|Optional $uuid,
        #[Required]
        public string $name,
        #[Required, Email]
        public string $email,
        public string|Optional|null $rut,
        public string|Optional|null $phone,
        public string $role,
        public bool $is_active = true,
        public string|Optional $password = new Optional,
        public string|Optional $type = new Optional,
        public array|Optional $roles = new Optional,
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
        /**
         * Último acesso, DERIVADO de `login_logs` — não existe coluna
         * `users.last_login`. ISO 8601 ou `null` para quem nunca acessou.
         */
        #[Computed]
        public ?string $last_login = null,
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['nullable', 'string', new ValidRut],
            'password' => ['sometimes', 'string', 'min:8'],
            'role' => ['required', 'string', 'exists:roles,name', Rule::notIn(['redator'])],
        ];
    }

    /**
     * Saída: achata os campos do User e projeta o RBAC. `role` traz a role atual
     * (staff tem uma), usada para pré-preencher o select de edição no front.
     */
    public static function fromModel(User $user): self
    {
        // Uma chamada só. A segunda não custava SELECT (a relação já vem de
        // `loadMissing`), custava um `pluck` — e escondia que as duas
        // projeções vêm da MESMA fonte.
        $roles = $user->getRoleNames();

        return new self(
            id: $user->id,
            uuid: $user->uuid,
            name: $user->name,
            email: $user->email,
            rut: $user->rut,
            phone: $user->phone,
            role: $roles->first() ?? '',
            is_active: $user->is_active,
            type: $user->type,
            roles: $roles->all(),
            photo_url: $user->photo_path,
            last_login: $user->latestLogin?->created_at?->toISOString(),
        );
    }
}

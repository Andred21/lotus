<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Perfil do próprio usuário autenticado. Recurso PRÓPRIO (spec D4):
 * `SessionUserData` e `/api/me` continuam servindo a sessão e não engordam —
 * sessão e perfil têm formas e ciclos de vida diferentes.
 *
 * `email`, `rut`, `type` e o RBAC saem aqui como LEITURA. Escrevê-los é
 * administrativo, e a recusa está em `ProfileUpdateData::rules()`.
 */
#[TypeScript]
class ProfileData extends Data
{
    public function __construct(
        public int $id,
        public string $uuid,
        public string $name,
        public string $email,
        public ?string $rut,
        public ?string $phone,
        public string $type,
        public ?string $role,
        /**
         * Só SAÍDA: `ProfileData` nasce sempre de `fromUser()` (`show`/`update`
         * de `/api/profile`), nunca de request body — a entrada de escrita é
         * `ProfileUpdateData`, que já recusa `photo_url` em `rules()`.
         * `#[Computed]` aqui não muda comportamento de runtime, só fecha o arch
         * test de D-12 (mesmo raciocínio do precedente `SessionUserData::$photo_url`).
         */
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url,
        public ?RedatorProfileData $redator,
    ) {}

    /**
     * O `loadMissing` mora aqui, e não no controller, porque é o único jeito
     * de a projeção ser não-N+1 para TODO chamador — `show` e `update`
     * devolvem o mesmo DTO. Guarda: `test_perfil_nao_faz_n_mais_um`.
     */
    public static function fromUser(User $user): self
    {
        $user->loadMissing(['redator.documents', 'redator.courses']);

        return new self(
            id: $user->id,
            uuid: $user->uuid,
            name: $user->name,
            email: $user->email,
            rut: $user->rut,
            phone: $user->phone,
            type: $user->type,
            role: $user->getRoleNames()->first(),
            photo_url: $user->photo_path,
            redator: $user->redator === null ? null : RedatorProfileData::fromRedator($user->redator),
        );
    }
}

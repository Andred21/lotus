<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\ProfileUpdateData;
use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Edição self-service dos campos de texto do próprio usuário. A transação
 * cobre o UPDATE e a auditoria síncrona do owen-it, que dispara dentro da
 * mesma chamada (mesma razão de `UserPhotoService::store`).
 */
class UpdateProfileAction
{
    public function execute(User $user, ProfileUpdateData $data): User
    {
        $campos = ['name' => $data->name];

        // Ausente não é nulo: `Optional` significa "não mandou", e apagar o
        // telefone de quem só omitiu o campo seria perda silenciosa.
        if (! $data->phone instanceof Optional) {
            $campos['phone'] = $data->phone;
        }

        DB::transaction(fn () => $user->update($campos));

        return $user->refresh();
    }
}

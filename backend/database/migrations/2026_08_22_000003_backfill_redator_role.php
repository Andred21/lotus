<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * P-47. `CreateRedatorAction` atribui a role `redator` desde `e3490d84`
 * (RF-ROL-05) e `SendRedatorAccessInvitationAction` a atribui no reenvio de
 * convite — mas nenhum dos dois alcança linha que já existe no banco sem
 * convite reenviado. Medido no MySQL de dev em 2026-08-22: dos 7 redatores do
 * `OperationDemoSeeder`, só o user 2 tem a role, e só porque a prova e2e de
 * 2026-08-19 reenviou o convite dele.
 *
 * A ficha era cosmética enquanto o gate do redator fosse `user->type`. Com o
 * ownership deste bloco a ROLE decide acesso, e redator sem role vira conta sem
 * permissão nenhuma — é o gatilho literal da ficha ("o primeiro gate aplicado
 * sobre rota de redator").
 *
 * `is_active` NÃO entra: redator desativado de propósito existe, e reativá-lo em
 * massa seria a P-51 ao contrário. Role é capacidade; `is_active` é acesso.
 *
 * `model_type = 'user'` porque o morph map está enforced
 * (`AppServiceProvider::boot`); ler `config('auth.providers.users.model')` aqui
 * gravaria o FQCN e produziria linha que o Spatie não encontra.
 *
 * `down()` é no-op declarado: reverter não pode TIRAR a role de quem a ganhou
 * por cadastro ou por convite, e esta migration não sabe distinguir os dois.
 */
return new class extends Migration
{
    public function up(): void
    {
        $roleId = DB::table(config('permission.table_names.roles'))
            ->where('name', 'redator')
            ->where('guard_name', 'web')
            ->value('id');

        if ($roleId === null) {
            return;   // banco sem a role: o `RolePermissionSeeder` a cria, e o cadastro a atribui
        }

        $pivot = config('permission.table_names.model_has_roles');

        $semRole = DB::table('users')
            ->where('type', 'redator')
            ->whereNotExists(fn ($q) => $q
                ->selectRaw(1)
                ->from($pivot)
                ->whereColumn($pivot.'.model_id', 'users.id')
                ->where($pivot.'.model_type', 'user')
                ->where($pivot.'.role_id', $roleId)
            )
            ->pluck('id');

        foreach ($semRole as $userId) {
            DB::table($pivot)->insert([
                'role_id' => $roleId,
                'model_type' => 'user',
                'model_id' => $userId,
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // No-op declarado: não há como distinguir a role que ESTA migration deu
        // da que veio do cadastro ou do convite. Tirar as duas revogaria acesso
        // legítimo; tirar nenhuma é a escolha conservadora e é esta.
    }
};

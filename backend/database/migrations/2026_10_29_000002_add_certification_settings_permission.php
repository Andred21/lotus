<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * `certification.settings.manage` guarda Configuración › Certificados (spec D3
 * do bloco 40): é a assinatura impressa em todo certificado, e só o superadmin
 * a recebe. O seeder já a cria a partir do catálogo, mas seeder só corrige quem
 * o roda — e o deploy não roda `db:seed`. Banco já provisionado ficaria sem a
 * permissão e o superadmin levaria 403 nas quatro rotas (não há `Gate::before`).
 *
 * Vincula SÓ à role `superadmin`: admin e redator nunca a recebem, então ao
 * contrário da `record_result` aqui não há capacidade pré-existente a preservar.
 *
 * Filtro `guard_name = 'web'` em toda consulta: é o único guard da aplicação, e
 * sem o filtro a migration alcançaria linha de outro guard se um dia existir.
 *
 * `down()` apaga a permissão — o FK de `role_has_permissions` é
 * `onDelete('cascade')` (ver `create_permission_tables`), então o vínculo cai
 * junto e reverter não devolve capacidade a role nenhuma.
 */
return new class extends Migration
{
    private const PERMISSAO = 'certification.settings.manage';

    private const ROLE = 'superadmin';

    public function up(): void
    {
        $permissoes = config('permission.table_names.permissions');
        $roles = config('permission.table_names.roles');
        $pivot = config('permission.table_names.role_has_permissions');
        $agora = now();

        $id = DB::table($permissoes)
            ->where('name', self::PERMISSAO)
            ->where('guard_name', 'web')
            ->value('id');

        if ($id === null) {
            $id = DB::table($permissoes)->insertGetId([
                'name' => self::PERMISSAO,
                'guard_name' => 'web',
                'created_at' => $agora,
                'updated_at' => $agora,
            ]);
        }

        $roleId = DB::table($roles)->where('name', self::ROLE)->where('guard_name', 'web')->value('id');

        // Banco sem a role de sistema: o seeder a cria com a permissão junto.
        if ($roleId !== null) {
            $vinculado = DB::table($pivot)
                ->where('permission_id', $id)
                ->where('role_id', $roleId)
                ->exists();

            if (! $vinculado) {
                DB::table($pivot)->insert(['permission_id' => $id, 'role_id' => $roleId]);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        DB::table(config('permission.table_names.permissions'))
            ->where('name', self::PERMISSAO)
            ->where('guard_name', 'web')
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * `operation.enrollment.record_result` separa lançar nota/presença do resto do
 * Fluxo 3 (RN-02, spec D6). O seeder já a cria a partir do catálogo, mas seeder
 * só corrige quem o roda: banco já provisionado ficaria com o `result` atrás de
 * uma permissão que ninguém tem — inclusive o admin, que HOJE consegue lançar
 * pelo `enrollment.manage`. Perder capacidade numa migration seria regressão,
 * então o `up()` vincula às três roles de sistema.
 *
 * Filtro `guard_name = 'web'` em toda consulta: é o único guard da aplicação, e
 * sem o filtro a migration alcançaria linha de outro guard se um dia existir.
 *
 * `down()` apaga a permissão — o FK de `role_has_permissions` é
 * `onDelete('cascade')` (ver `create_permission_tables`), então os vínculos caem
 * junto e reverter não devolve capacidade a role nenhuma.
 */
return new class extends Migration
{
    private const PERMISSAO = 'operation.enrollment.record_result';

    private const ROLES = ['superadmin', 'admin', 'redator'];

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

        foreach (self::ROLES as $nome) {
            $roleId = DB::table($roles)->where('name', $nome)->where('guard_name', 'web')->value('id');

            if ($roleId === null) {
                continue;   // banco sem essa role de sistema: o seeder a cria com a permissão junto
            }

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

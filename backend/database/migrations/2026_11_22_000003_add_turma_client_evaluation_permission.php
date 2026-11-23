<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * `operation.turma.submit_client_evaluation` libera subir (e remover, em turma
 * em andamento) a evaluación do cliente da turma (spec §4.6 do bloco 60). O
 * seeder já a cria a partir do catálogo, mas seeder só corrige quem o roda — e
 * o deploy não roda `db:seed`. Banco já provisionado ficaria sem a permissão e
 * o admin continuaria recusado.
 *
 * Vincula a `admin` e `superadmin`; o `redator` nunca a recebe (a evaluación do
 * cliente é do admin). Não é segregada: o admin a tem por ser operação diária,
 * então não há capacidade pré-existente a preservar.
 *
 * Filtro `guard_name = 'web'` em toda consulta: é o único guard da aplicação.
 *
 * `down()` apaga a permissão — o FK de `role_has_permissions` é
 * `onDelete('cascade')`, então os vínculos caem junto.
 */
return new class extends Migration
{
    private const PERMISSAO = 'operation.turma.submit_client_evaluation';

    private const ROLES = ['superadmin', 'admin'];

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

            // Banco sem a role de sistema: o seeder a cria com a permissão junto.
            if ($roleId === null) {
                continue;
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

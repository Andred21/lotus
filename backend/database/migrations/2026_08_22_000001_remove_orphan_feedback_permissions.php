<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * `feedback.feedback.view` e `feedback.feedback.manage` foram semeadas em
 * 2026-07 para um domínio que nunca existiu: RF-FBK-01/02/04 rodam como
 * documentação de turma (`files` + `TurmaDocumentType` + RN-16), e a decisão de
 * 2026-08-22 é que não haverá `Domains/Feedback` nem tabela `feedbacks`.
 *
 * O seeder já não as cria, mas seeder só corrige quem o roda: banco já
 * provisionado guarda a linha e o vínculo com a role `redator`. Escrita
 * destrutiva LIMITADA aos dois nomes literais — nenhuma outra permissão, role
 * ou usuário é tocado. O FK de `role_has_permissions` é `onDelete('cascade')`
 * (ver `create_permission_tables`), então o vínculo cai junto.
 *
 * `down()` recria as duas linhas, sem vínculo: reverter a migration não deve
 * devolver capacidade a role nenhuma.
 */
return new class extends Migration
{
    private const ORFAS = ['feedback.feedback.view', 'feedback.feedback.manage'];

    public function up(): void
    {
        DB::table(config('permission.table_names.permissions'))
            ->whereIn('name', self::ORFAS)
            ->where('guard_name', 'web')
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $tabela = config('permission.table_names.permissions');
        $agora = now();

        foreach (self::ORFAS as $nome) {
            $existe = DB::table($tabela)->where('name', $nome)->where('guard_name', 'web')->exists();

            if (! $existe) {
                DB::table($tabela)->insert([
                    'name' => $nome,
                    'guard_name' => 'web',
                    'created_at' => $agora,
                    'updated_at' => $agora,
                ]);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
